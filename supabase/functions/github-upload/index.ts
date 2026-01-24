import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UploadRequest {
  repoName: string;
  isNewRepo?: boolean;
  buildId?: string;
  directCode?: {
    html: string;
    css: string;
    js: string;
    projectName?: string;
  };
}

async function getFileSha(owner: string, repo: string, path: string, token: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Chester-Code-IA",
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.sha;
    }
    return null;
  } catch {
    return null;
  }
}

async function uploadFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  token: string,
  commitMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sha = await getFileSha(owner, repo, path, token);
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    const body: Record<string, unknown> = {
      message: commitMessage,
      content: encodedContent,
    };
    
    if (sha) {
      body.sha = sha;
    }
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "Chester-Code-IA",
        },
        body: JSON.stringify(body),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || "Upload failed" };
    }
    
    return { success: true };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

async function createRepository(owner: string, repoName: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "Chester-Code-IA",
      },
      body: JSON.stringify({
        name: repoName,
        description: "Proyecto creado con Chester Code IA",
        private: false,
        auto_init: true,
      }),
    });

    if (response.ok) {
      return { success: true };
    }

    const data = await response.json();
    
    // If repo already exists, that's fine
    if (data.errors?.some((e: { message: string }) => e.message?.includes("name already exists"))) {
      return { success: true };
    }
    
    return { success: false, error: data.message || "Failed to create repository" };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("User ID:", userId);

    // Get GitHub connection using service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: githubConnection, error: connError } = await supabaseAdmin
      .from("github_connections")
      .select("personal_access_token, github_username")
      .eq("user_id", userId)
      .single();

    if (connError || !githubConnection?.personal_access_token) {
      console.error("GitHub connection error:", connError);
      return new Response(
        JSON.stringify({ error: "No GitHub connection found. Please connect your GitHub account first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const githubToken = githubConnection.personal_access_token;
    const githubUsername = githubConnection.github_username;

    console.log("GitHub username:", githubUsername);

    // Parse request
    const { repoName, isNewRepo, buildId, directCode }: UploadRequest = await req.json();

    if (!repoName) {
      return new Response(
        JSON.stringify({ error: "Missing repository name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create repository if requested
    if (isNewRepo) {
      console.log("Creating new repository:", repoName);
      const createResult = await createRepository(githubUsername, repoName, githubToken);
      if (!createResult.success) {
        console.log("Repo creation result (may already exist):", createResult.error);
      }
      // Wait a bit for GitHub to process
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Get code to upload
    let html = "";
    let css = "";
    let js = "";
    let projectName = repoName;

    if (directCode) {
      // Use directly provided code
      html = directCode.html || "";
      css = directCode.css || "";
      js = directCode.js || "";
      projectName = directCode.projectName || repoName;
    } else if (buildId && buildId !== "current") {
      // Fetch from builds table
      const { data: build, error: buildError } = await supabaseAdmin
        .from("builds")
        .select("html, css, js, label")
        .eq("id", buildId)
        .single();

      if (buildError || !build) {
        return new Response(
          JSON.stringify({ error: "Build not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      html = build.html || "";
      css = build.css || "";
      js = build.js || "";
      projectName = build.label || repoName;
    } else {
      // Get the latest build for this user
      const { data: latestBuild, error: latestError } = await supabaseAdmin
        .from("builds")
        .select("html, css, js, label, conversation_id")
        .order("created_at", { ascending: false })
        .limit(1);

      if (latestError || !latestBuild || latestBuild.length === 0) {
        return new Response(
          JSON.stringify({ error: "No code to upload. Generate a page first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      html = latestBuild[0].html || "";
      css = latestBuild[0].css || "";
      js = latestBuild[0].js || "";
      projectName = latestBuild[0].label || repoName;
    }

    // Build files to upload
    const files = [
      { 
        path: "index.html", 
        content: html || `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Proyecto: ${projectName}</h1>
  <script src="script.js"></script>
</body>
</html>` 
      },
      { path: "styles.css", content: css || "/* Styles */\n" },
      { path: "script.js", content: js || "// JavaScript\n" },
      { 
        path: "README.md", 
        content: `# ${projectName}

Proyecto creado con [Chester Code IA](https://chestercodeia.com)

## Archivos

- \`index.html\` - Página principal
- \`styles.css\` - Estilos CSS
- \`script.js\` - JavaScript

---
Generado el ${new Date().toLocaleDateString("es-ES")}
` 
      },
    ];

    // Upload files
    const commitMessage = `Update from Chester Code IA - ${new Date().toISOString()}`;
    const results = [];

    for (const file of files) {
      console.log("Uploading:", file.path);
      const result = await uploadFile(
        githubUsername,
        repoName,
        file.path,
        file.content,
        githubToken,
        commitMessage
      );
      results.push({ path: file.path, ...result });
    }

    const allSuccessful = results.every(r => r.success);
    const repoUrl = `https://github.com/${githubUsername}/${repoName}`;

    // Update github_connections with the repo info
    await supabaseAdmin
      .from("github_connections")
      .update({
        repository_name: repoName,
        repository_url: repoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // Log the action
    await supabaseAdmin.from("audit_logs").insert({
      action: "github_upload",
      entity_type: "github_repository",
      entity_id: userId,
      details: { 
        repository: repoName, 
        files_uploaded: results.filter(r => r.success).length,
        success: allSuccessful,
      },
    });

    return new Response(
      JSON.stringify({
        success: allSuccessful,
        repoUrl,
        message: allSuccessful 
          ? `Successfully uploaded ${files.length} files to GitHub` 
          : `Some files failed to upload`,
        results,
      }),
      { 
        status: allSuccessful ? 200 : 207, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
