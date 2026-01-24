import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Frontend URL for redirect after OAuth
  const frontendUrl = "https://chestercodeia.vercel.app";

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const userId = url.searchParams.get("state"); // We pass user_id as state

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
      console.error("Missing GitHub OAuth credentials in environment", { 
        hasClientId: !!clientId, 
        hasClientSecret: !!clientSecret 
      });
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
    console.log("Token response received:", { 
      hasAccessToken: !!tokenData.access_token,
      error: tokenData.error,
      errorDescription: tokenData.error_description 
    });

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
      console.error("Failed to fetch user info:", await userResponse.text());
      return new Response(null, {
        status: 302,
        headers: { Location: `${frontendUrl}/settings?error=user_fetch_error` },
      });
    }

    const userData = await userResponse.json();
    console.log("GitHub user info received:", { login: userData.login, id: userData.id });

    // Save to database using service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clean username (remove @ if present)
    const cleanUsername = userData.login?.replace(/^@/, '') || '';
    console.log("Saving GitHub connection for user:", cleanUsername);

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from("github_connections")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existingConnection) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from("github_connections")
        .update({
          personal_access_token: tokenData.access_token,
          github_username: cleanUsername,
          repository_url: null, // Reset repo URL, will be set on first sync
          repository_name: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating connection:", updateError);
        throw updateError;
      }
      console.log("Updated existing GitHub connection");
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from("github_connections")
        .insert({
          user_id: userId,
          personal_access_token: tokenData.access_token,
          github_username: cleanUsername,
        });

      if (insertError) {
        console.error("Error inserting connection:", insertError);
        throw insertError;
      }
      console.log("Created new GitHub connection");
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      action: "github_oauth_connect",
      entity_type: "github_connection",
      entity_id: userId,
      details: { github_username: cleanUsername },
    });

    console.log("GitHub connection saved successfully for:", cleanUsername);

    // Redirect to settings with success parameter
    return new Response(null, {
      status: 302,
      headers: { Location: `${frontendUrl}/settings?github=connected` },
    });
  } catch (error: unknown) {
    console.error("Error in GitHub OAuth callback:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", message);
    
    return new Response(null, {
      status: 302,
      headers: { Location: `${frontendUrl}/settings?error=server_error` },
    });
  }
});
