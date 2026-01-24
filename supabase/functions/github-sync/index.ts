import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  repoName: string;
  isNewRepo?: boolean;
  isPrivate?: boolean;
  files: Array<{ path: string; content: string }>;
  commitMessage?: string;
}

// Helper to get file SHA if it exists
async function getFileSHA(owner: string, repo: string, path: string, token: string): Promise<string | null> {
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

// Helper to upload a single file
async function uploadFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  token: string,
  commitMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get existing file SHA if it exists
    const sha = await getFileSHA(owner, repo, path, token);

    // Base64 encode the content
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const base64Content = btoa(String.fromCharCode(...data));

    const body: any = {
      message: commitMessage,
      content: base64Content,
    };

    // If file exists, include SHA to update it
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
      console.error(`Error uploading ${path}:`, errorData);
      return { success: false, error: errorData.message || "Unknown error" };
    }

    return { success: true };
  } catch (error: any) {
    console.error(`Exception uploading ${path}:`, error);
    return { success: false, error: error.message };
  }
}

// Helper to create repository
async function createRepository(
  owner: string,
  repoName: string,
  token: string,
  isPrivate: boolean = false
): Promise<{ success: boolean; error?: string }> {
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
        private: isPrivate,
        auto_init: false,
        description: "Created with Chester Code IA",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Handle "already exists" as success
      if (errorData.errors?.some((e: any) => e.message?.includes("already exists"))) {
        console.log(`Repository ${repoName} already exists, will update files`);
        return { success: true };
      }
      console.error("Error creating repository:", errorData);
      return { success: false, error: errorData.message || "Failed to create repository" };
    }

    console.log(`Repository ${repoName} created successfully`);
    // Wait a moment for GitHub to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true };
  } catch (error: any) {
    console.error("Exception creating repository:", error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Authenticate user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const requestBody: SyncRequest = await req.json();
    const { repoName, isNewRepo = false, isPrivate = false, files, commitMessage = "Update from Chester Code IA" } = requestBody;

    console.log(`Sync request for repo: ${repoName}, files: ${files?.length || 0}`);

    if (!repoName || !files || files.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing repoName or files" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get GitHub connection using service role
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: connection, error: connError } = await supabaseService
      .from("github_connections")
      .select("personal_access_token, github_username")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection?.personal_access_token || !connection?.github_username) {
      console.error("GitHub connection not found:", connError);
      return new Response(
        JSON.stringify({ success: false, error: "GitHub not connected. Please connect your GitHub account first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = connection.personal_access_token;
    const owner = connection.github_username;

    console.log(`Syncing to GitHub for user: ${owner}, repo: ${repoName}`);

    // Create repository if needed
    if (isNewRepo) {
      const createResult = await createRepository(owner, repoName, token, isPrivate);
      if (!createResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: createResult.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Upload all files
    const results: Array<{ path: string; success: boolean; error?: string }> = [];
    
    for (const file of files) {
      const result = await uploadFile(owner, repoName, file.path, file.content, token, commitMessage);
      results.push({ path: file.path, ...result });
    }

    const allSuccessful = results.every(r => r.success);
    const repoUrl = `https://github.com/${owner}/${repoName}`;

    // Update the connection with repository info
    if (allSuccessful) {
      await supabaseService
        .from("github_connections")
        .update({
          repository_name: repoName,
          repository_url: repoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      // Log the action
      await supabaseService.from("audit_logs").insert({
        action: "github_sync",
        entity_type: "github_repository",
        entity_id: user.id,
        details: { 
          repository: repoName, 
          files_count: files.length,
          owner,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: allSuccessful,
        repoUrl,
        results,
        message: allSuccessful 
          ? `Successfully synced ${files.length} files to ${repoUrl}` 
          : "Some files failed to sync",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in github-sync:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
