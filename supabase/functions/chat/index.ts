import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Different prompts based on narrative style
const getSystemPrompt = (narrativeStyle: string) => {
  const baseInstructions = `You are an expert web developer AI assistant that generates HTML, CSS, and JavaScript code to build web pages based on user requests.

CRITICAL: Your response must have TWO DISTINCT PARTS:

PART 1 - NARRATIVE (for the user to read):
Start with a friendly, conversational narrative explaining what you're building. DO NOT show any code in this part.
${narrativeStyle === 'minimal' ? 'Keep it brief - 1-2 sentences max.' : 
  narrativeStyle === 'technical' ? 'Include technical details about the implementation approach.' : 
  'Provide a clear, detailed explanation of what you\'re creating.'}

PART 2 - CODE (hidden from chat, rendered in preview):
After your narrative, include the actual code wrapped in code blocks. The user won't see this in chat, but it will be rendered.

IMPORTANT FORMATTING:
- Your narrative text should come FIRST, before any code blocks
- Then include the code in this exact format:
  \`\`\`html
  (your HTML here)
  \`\`\`
  
  \`\`\`css
  (your CSS here)
  \`\`\`
  
  \`\`\`javascript
  (your JavaScript here)
  \`\`\`

EXAMPLE RESPONSE:
"¡Perfecto! Estoy creando una landing page moderna para ti. Incluye un hero section con un gradiente llamativo, un título principal que captura la atención, y un botón de llamada a la acción con efectos hover suaves. El diseño es totalmente responsivo y se adaptará a cualquier dispositivo.

\`\`\`html
<div class="hero">
  <h1>Welcome</h1>
  <button>Get Started</button>
</div>
\`\`\`

\`\`\`css
.hero { display: flex; flex-direction: column; align-items: center; padding: 4rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
\`\`\`

\`\`\`javascript
document.querySelector('button').addEventListener('click', () => { alert('Welcome!'); });
\`\`\`
"

DESIGN GUIDELINES:
- Make code modern, responsive, and visually appealing
- Use modern CSS features like flexbox, grid, gradients, and animations
- Include hover effects and transitions for interactive elements
- Make designs mobile-responsive using media queries
- Build upon previous requests when asked to modify`;

  return baseInstructions;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, narrativeStyle = 'detailed', customApiUrl, customApiKey, useCustomAI } = await req.json();
    
    // Determine which API to use
    let apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let apiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (useCustomAI && customApiUrl && customApiKey) {
      apiUrl = customApiUrl;
      apiKey = customApiKey;
    }
    
    if (!apiKey) {
      throw new Error("API key is not configured");
    }

    const systemPrompt = getSystemPrompt(narrativeStyle);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: useCustomAI ? undefined : "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
