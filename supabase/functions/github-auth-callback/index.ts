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

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const userId = url.searchParams.get("state"); // We pass user_id as state

    console.log("GitHub OAuth callback received", { code: !!code, userId: !!userId });

    if (!code) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${Deno.env.get("FRONTEND_URL") || "https://id-preview--67f19b4b-2350-4ef4-8e5c-d38ad52ce54d.lovable.app"}/settings?error=no_code`,
        },
      });
    }

    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${Deno.env.get("FRONTEND_URL") || "https://id-preview--67f19b4b-2350-4ef4-8e5c-d38ad52ce54d.lovable.app"}/settings?error=no_state`,
        },
      });
    }

    const clientId = Deno.env.get("GITHUB_CLIENT_ID");
    const clientSecret = Deno.env.get("GITHUB_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("Missing GitHub OAuth credentials");
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${Deno.env.get("FRONTEND_URL") || "https://id-preview--67f19b4b-2350-4ef4-8e5c-d38ad52ce54d.lovable.app"}/settings?error=config_error`,
        },
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
    console.log("Token response received", { hasAccessToken: !!tokenData.access_token });

    if (!tokenData.access_token) {
      console.error("Failed to get access token:", tokenData);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${Deno.env.get("FRONTEND_URL") || "https://id-preview--67f19b4b-2350-4ef4-8e5c-d38ad52ce54d.lovable.app"}/settings?error=token_error`,
        },
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

    const userData = await userResponse.json();
    console.log("GitHub user info received", { login: userData.login });

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
          github_username: userData.login,
          repository_url: `https://github.com/${userData.login}`,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating connection:", updateError);
        throw updateError;
      }
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from("github_connections")
        .insert({
          user_id: userId,
          personal_access_token: tokenData.access_token,
          github_username: userData.login,
          repository_url: `https://github.com/${userData.login}`,
        });

      if (insertError) {
        console.error("Error inserting connection:", insertError);
        throw insertError;
      }
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      action: "github_oauth_connect",
      entity_type: "github_connection",
      entity_id: userId,
      details: { github_username: userData.login },
    });

    console.log("GitHub connection saved successfully");

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${Deno.env.get("FRONTEND_URL") || "https://id-preview--67f19b4b-2350-4ef4-8e5c-d38ad52ce54d.lovable.app"}/settings?github=connected`,
      },
    });
  } catch (error) {
    console.error("Error in GitHub OAuth callback:", error);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${Deno.env.get("FRONTEND_URL") || "https://id-preview--67f19b4b-2350-4ef4-8e5c-d38ad52ce54d.lovable.app"}/settings?error=server_error`,
      },
    });
  }
});
