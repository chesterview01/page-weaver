import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteRequest {
  projectId: string;
  deploymentId: string;
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

    const { projectId, deploymentId }: DeleteRequest = await req.json();

    // Get deployment config
    const { data: config, error: configError } = await supabase
      .from('deployment_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config?.vercel_token) {
      return new Response(
        JSON.stringify({ error: 'Vercel deployment not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete deployment from Vercel
    let deleteUrl = `https://api.vercel.com/v13/deployments/${deploymentId}`;
    if (config.vercel_team_id) {
      deleteUrl += `?teamId=${config.vercel_team_id}`;
    }

    const vercelResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${config.vercel_token}`,
      },
    });

    // Update project to remove deployment info
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        is_published: false,
        published_domain: null,
        deployment_url: null,
        deployment_id: null,
        domain_status: 'none',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      action: 'project_unpublished',
      entity_type: 'project',
      entity_id: projectId,
      details: { deployment_id: deploymentId },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Delete error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});