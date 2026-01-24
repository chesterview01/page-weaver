import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Different prompts based on narrative style
const getSystemPrompt = (narrativeStyle: string) => {
  const baseInstructions = `You are an expert web developer AI assistant that generates complete web projects with proper file structure.

CRITICAL: Your response must have TWO DISTINCT PARTS:

PART 1 - NARRATIVE (for the user to read):
Start with a friendly, conversational narrative explaining what you're building. DO NOT show any code in this part.
${narrativeStyle === 'minimal' ? 'Keep it brief - 1-2 sentences max.' : 
  narrativeStyle === 'technical' ? 'Include technical details about the implementation approach.' : 
  'Provide a clear, detailed explanation of what you\'re creating.'}

PART 2 - PROJECT STRUCTURE (JSON format):
After your narrative, you MUST include a complete project structure in JSON format wrapped in a json code block.

The JSON must follow this EXACT structure:
\`\`\`json
{
  "projectName": "project-name-here",
  "files": [
    {
      "path": "src/pages/index.html",
      "content": "<!DOCTYPE html>..."
    },
    {
      "path": "src/styles/main.css",
      "content": "/* CSS content */"
    },
    {
      "path": "src/scripts/main.js",
      "content": "// JavaScript content"
    },
    {
      "path": "package.json",
      "content": "{ \\"name\\": \\"...\\" }"
    },
    {
      "path": "README.md",
      "content": "# Project Title..."
    }
  ]
}
\`\`\`

REQUIRED FILES (always include these):
1. src/pages/index.html - Main HTML file with the complete page structure
2. src/styles/main.css - All CSS styles
3. src/scripts/main.js - All JavaScript code
4. package.json - Basic project configuration
5. README.md - Project description

OPTIONAL FILES (include when appropriate):
- src/components/*.html - Reusable HTML components
- src/styles/variables.css - CSS custom properties
- src/styles/components/*.css - Component-specific styles
- public/images/ - Image placeholders references
- .gitignore - Git ignore file

DESIGN GUIDELINES:
- Make code modern, responsive, and visually appealing
- Use modern CSS features like flexbox, grid, gradients, and animations
- Include hover effects and transitions for interactive elements
- Make designs mobile-responsive using media queries
- Build upon previous requests when asked to modify
- The HTML in index.html should be a complete, valid HTML document

IMPORTANT:
- Always respond with the JSON structure, never with separate html/css/js code blocks
- Make sure the JSON is valid and properly escaped
- The content field should contain the actual file content as a string
- Use double backslashes for escaping quotes inside JSON strings`;

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
