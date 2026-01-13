import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are an expert web developer AI assistant that generates HTML, CSS, and JavaScript code to build web pages based on user requests.

CRITICAL INSTRUCTIONS:
1. When the user asks to build or create something, respond with working HTML/CSS/JS code.
2. Always wrap your code in these specific markers:
   - HTML code between \`\`\`html and \`\`\`
   - CSS code between \`\`\`css and \`\`\`
   - JavaScript code between \`\`\`javascript or \`\`\`js and \`\`\`
3. Make your code modern, responsive, and visually appealing.
4. Use inline styles or provide CSS that works standalone.
5. Remember previous requests and build upon them when asked to modify.
6. If the user asks for changes, modify the existing code rather than starting from scratch.
7. Always provide complete, working code that can be rendered immediately.
8. Use modern CSS features like flexbox, grid, gradients, and animations.
9. Include hover effects and transitions for interactive elements.
10. Make designs mobile-responsive using media queries when appropriate.

Example response format when building a landing page:
"Here's your landing page with a hero section:

\`\`\`html
<div class="hero">
  <h1>Welcome</h1>
  <button>Get Started</button>
</div>
\`\`\`

\`\`\`css
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
\`\`\`

\`\`\`javascript
document.querySelector('button').addEventListener('click', () => {
  alert('Welcome!');
});
\`\`\`
"`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
