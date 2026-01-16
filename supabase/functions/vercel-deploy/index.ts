import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeployRequest {
  projectId: string;
  projectName: string;
  html: string;
  css: string;
  js: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { projectId, projectName, html, css, js }: DeployRequest = await req.json();

    // Get deployment config
    const { data: config, error: configError } = await supabase
      .from('deployment_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config?.vercel_token) {
      return new Response(
        JSON.stringify({ error: 'Vercel deployment not configured. Please contact admin.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vercelToken = config.vercel_token;
    const mainDomain = config.main_domain || 'chestercodeia.com';
    
    // Generate subdomain from project name
    const subdomain = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    const fullDomain = `${subdomain}.${mainDomain}`;

    // Create complete HTML file with embedded CSS and JS
    const completeHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <style>
${css}
    </style>
</head>
<body>
${html}
    <script>
${js}
    </script>
</body>
</html>`;

    // Prepare files for Vercel deployment
    const files = [
      {
        file: 'index.html',
        data: btoa(unescape(encodeURIComponent(completeHtml))),
        encoding: 'base64'
      },
      {
        file: 'style.css',
        data: btoa(unescape(encodeURIComponent(css || '/* No styles */'))),
        encoding: 'base64'
      },
      {
        file: 'script.js',
        data: btoa(unescape(encodeURIComponent(js || '// No script'))),
        encoding: 'base64'
      }
    ];

    // Deploy to Vercel
    const deployPayload: Record<string, unknown> = {
      name: subdomain,
      files: files,
      projectSettings: {
        framework: null
      },
      target: 'production'
    };

    // Add team ID if configured
    if (config.vercel_team_id) {
      deployPayload.teamId = config.vercel_team_id;
    }

    const vercelResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deployPayload),
    });

    const vercelResult = await vercelResponse.json();

    if (!vercelResponse.ok) {
      console.error('Vercel error:', vercelResult);
      return new Response(
        JSON.stringify({ 
          error: vercelResult.error?.message || 'Failed to deploy to Vercel',
          details: vercelResult 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update project with deployment info
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        is_published: true,
        published_domain: fullDomain,
        deployment_url: vercelResult.url ? `https://${vercelResult.url}` : null,
        deployment_id: vercelResult.id,
        domain_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    // Log the deployment
    await supabase.from('audit_logs').insert({
      action: 'project_published',
      entity_type: 'project',
      entity_id: projectId,
      details: {
        subdomain: fullDomain,
        vercel_url: vercelResult.url,
        deployment_id: vercelResult.id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        subdomain: fullDomain,
        deploymentUrl: vercelResult.url ? `https://${vercelResult.url}` : null,
        deploymentId: vercelResult.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Deploy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});