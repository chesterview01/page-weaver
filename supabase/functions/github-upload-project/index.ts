import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UploadRequest {
  buildId: string;
  repoName: string;
  isNewRepo?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's token
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: UploadRequest = await req.json();
    const { buildId, repoName, isNewRepo } = body;

    console.log("Upload request:", { buildId, repoName, isNewRepo, userId: user.id });

    // Get GitHub connection using service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("github_connections")
      .select("personal_access_token, github_username")
      .eq("user_id", user.id)
      .single();

    if (connectionError || !connection) {
      console.error("No GitHub connection found:", connectionError);
      return new Response(
        JSON.stringify({ error: "GitHub not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { personal_access_token: accessToken, github_username } = connection;

    // Clean the username - remove @ if present
    const owner = github_username?.replace(/^@/, '') || '';

    if (!accessToken || !owner) {
      console.error("GitHub connection incomplete:", { hasToken: !!accessToken, hasOwner: !!owner });
      return new Response(
        JSON.stringify({ error: "GitHub connection incomplete. Please reconnect your GitHub account." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Using GitHub account:", owner);

    // Get build data
    const { data: build, error: buildError } = await supabaseAdmin
      .from("builds")
      .select("html, css, js, label")
      .eq("id", buildId)
      .single();

    if (buildError || !build) {
      console.error("Build not found:", buildError);
      return new Response(
        JSON.stringify({ error: "Build not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create repository if new
    if (isNewRepo) {
      console.log("Creating new repository:", repoName);
      const createRepoResponse = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "Chester-Code-IA",
        },
        body: JSON.stringify({
          name: repoName,
          description: `Proyecto creado con Chester Code IA: ${build.label}`,
          private: false,
          auto_init: true,
        }),
      });

      if (!createRepoResponse.ok) {
        const errorData = await createRepoResponse.json();
        console.error("Error creating repo:", errorData);
        
        // Check if repo already exists
        if (errorData.errors?.[0]?.message?.includes("name already exists")) {
          console.log("Repository already exists, continuing with upload...");
        } else {
          return new Response(
            JSON.stringify({ error: "Failed to create repository", details: errorData }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Wait a bit for GitHub to initialize the repo
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Prepare files to upload
    const files = [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${build.label}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
${build.html || '<div id="app"></div>'}
  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        content: build.css || "/* Styles generated by Chester Code IA */",
      },
      {
        path: "script.js",
        content: build.js || "// JavaScript generated by Chester Code IA",
      },
      {
        path: "README.md",
        content: `# ${build.label}

Proyecto creado con [Chester Code IA](https://chestercodeia.com)

## Archivos

- \`index.html\` - Estructura HTML
- \`styles.css\` - Estilos CSS
- \`script.js\` - Lógica JavaScript

## Despliegue

Este proyecto puede ser desplegado en cualquier servidor web estático como:
- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting

---

*Generado automáticamente por Chester Code IA*
`,
      },
    ];

    // Upload each file
    const results = [];
    for (const file of files) {
      console.log(`Uploading ${file.path}...`);
      
      // First, try to get the file's SHA (if it exists)
      let sha: string | undefined;
      try {
        const getFileResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`,
          {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "Chester-Code-IA",
            },
          }
        );
        
        if (getFileResponse.ok) {
          const fileData = await getFileResponse.json();
          sha = fileData.sha;
        }
      } catch (e) {
        // File doesn't exist, that's fine
      }

      // Upload or update the file
      const uploadResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "Chester-Code-IA",
          },
          body: JSON.stringify({
            message: `${sha ? 'Actualizar' : 'Crear'} ${file.path} desde Chester Code IA`,
            content: btoa(unescape(encodeURIComponent(file.content))),
            sha: sha,
          }),
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error(`Error uploading ${file.path}:`, errorData);
        results.push({ path: file.path, success: false, error: errorData.message });
      } else {
        results.push({ path: file.path, success: true });
      }
    }

    const allSuccess = results.every(r => r.success);
    const repoUrl = `https://github.com/${owner}/${repoName}`;

    // Update github_connection with repo info
    await supabaseAdmin
      .from("github_connections")
      .update({
        repository_name: repoName,
        repository_url: repoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    // Log the action
    await supabaseAdmin.from("audit_logs").insert({
      action: "github_upload",
      entity_type: "build",
      entity_id: buildId,
      details: { 
        repo_name: repoName, 
        repo_url: repoUrl,
        files_uploaded: results.filter(r => r.success).length,
      },
    });

    console.log("Upload complete:", { allSuccess, results });

    return new Response(
      JSON.stringify({
        success: allSuccess,
        repoUrl,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in github-upload-project:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
