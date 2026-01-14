import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GitHubFile {
  path: string;
  content: string;
}

interface UploadRequest {
  owner: string;
  repo: string;
  token: string;
  files: GitHubFile[];
  commitMessage?: string;
}

async function getFileSha(owner: string, repo: string, path: string, token: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
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
    // Get existing file SHA if it exists (needed for update)
    const sha = await getFileSha(owner, repo, path, token);
    
    // Base64 encode the content
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    const body: any = {
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { owner, repo, token, files, commitMessage }: UploadRequest = await req.json();

    if (!owner || !repo || !token || !files || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: owner, repo, token, files" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = commitMessage || `Update from Chester Code IA - ${new Date().toISOString()}`;
    const results = [];

    for (const file of files) {
      const result = await uploadFile(owner, repo, file.path, file.content, token, `${message}: ${file.path}`);
      results.push({ path: file.path, ...result });
    }

    const allSuccessful = results.every(r => r.success);
    const failedFiles = results.filter(r => !r.success);

    return new Response(
      JSON.stringify({
        success: allSuccessful,
        message: allSuccessful 
          ? `Successfully uploaded ${files.length} files to GitHub` 
          : `Failed to upload some files`,
        results,
        failedFiles: failedFiles.length > 0 ? failedFiles : undefined,
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