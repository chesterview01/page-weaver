import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Frontend URL for redirect after OAuth
const frontendUrl = "https://chestercodeia.vercel.app";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const userId = url.searchParams.get("state");

    console.log("GitHub OAuth callback received:", { 
      hasCode: !!code, 
      hasUserId: !!userId,
      url: req.url 
    });

    if (!code) {
      console.error("No code parameter received");
      return new Response(null, {
        status: 302,
        headers: { Location: `${frontendUrl}/settings?error=no_code` },
      });
    }

    if (!userId) {
      console.error("No state/userId parameter received");
      return new Response(null, {
        status: 302,
        headers: { Location: `${frontendUrl}/settings?error=no_state` },
      });
    }

    const clientId = Deno.env.get("GITHUB_CLIENT_ID");
    const clientSecret = Deno.env.get("GITHUB_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("Missing GitHub OAuth credentials");
      return new Response(null, {
        status: 302,
        headers: { Location: `${frontendUrl}/settings?error=config_error` },
      });
    }

    // Exchange code for access token
    console.log("Exchanging code for access token...");
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("Token response:", { hasAccessToken: !!tokenData.access_token });

    if (!tokenData.access_token) {
      console.error("Failed to get access token:", tokenData);
      return new Response(null, {
        status: 302,
        headers: { Location: `${frontendUrl}/settings?error=token_error` },
      });
    }

    // Get GitHub user info
    console.log("Fetching GitHub user info...");
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Chester-Code-IA",
      },
    });

    if (!userResponse.ok) {
      console.error("Failed to fetch user info");
      return new Response(null, {
        status: 302,
        headers: { Location: `${frontendUrl}/settings?error=user_fetch_error` },
      });
    }

    const userData = await userResponse.json();
    const cleanUsername = userData.login?.replace(/^@/, '') || '';
    console.log("GitHub user:", cleanUsername);

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if connection exists
    const { data: existingConnection } = await supabase
      .from("github_connections")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existingConnection) {
      await supabase
        .from("github_connections")
        .update({
          personal_access_token: tokenData.access_token,
          github_username: cleanUsername,
          repository_url: null,
          repository_name: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("github_connections")
        .insert({
          user_id: userId,
          personal_access_token: tokenData.access_token,
          github_username: cleanUsername,
        });
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      action: "github_oauth_connect",
      entity_type: "github_connection",
      entity_id: userId,
      details: { github_username: cleanUsername },
    });

    console.log("GitHub connection saved for:", cleanUsername);

    // Return HTML page that sends postMessage to opener and closes
    const successHtml = `<!DOCTYPE html>
<html>
<head>
  <title>GitHub Connected</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
    }
    .container { text-align: center; padding: 2rem; }
    .checkmark { font-size: 4rem; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
    p { margin: 0; opacity: 0.8; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">✓</div>
    <h1>¡GitHub conectado!</h1>
    <p>Cerrando ventana...</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'github-oauth-success', username: '${cleanUsername}' }, '*');
      setTimeout(function() { window.close(); }, 1500);
    } else {
      window.location.href = '${frontendUrl}/settings?github=connected';
    }
  </script>
</body>
</html>`;

    return new Response(successHtml, {
      status: 200,
      headers: { 
        "Content-Type": "text/html",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error in GitHub OAuth callback:", error);
    return new Response(null, {
      status: 302,
      headers: { Location: `${frontendUrl}/settings?error=server_error` },
    });
  }
});
