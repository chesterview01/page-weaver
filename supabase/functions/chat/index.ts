import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Static CORS headers defined specifically to cleanly handle all environments and bypass preflight blockages
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
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

// Create a TransformStream to convert Gemini native SSE format to standard OpenAI-compatible SSE format
const createGeminiToOpenAiTransformer = () => {
  let buffer = "";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      let lineIndex;
      while ((lineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, lineIndex).trim();
        buffer = buffer.slice(lineIndex + 1);

        if (!line) continue;
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const openAiChunk = {
                choices: [
                  {
                    delta: {
                      content: text
                    }
                  }
                ]
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAiChunk)}\n\n`));
            }
          } catch (e) {
            console.warn("Could not parse Gemini SSE line:", line, e);
          }
        }
      }
    },
    flush(controller) {
      if (buffer.trim()) {
        const line = buffer.trim();
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const openAiChunk = {
                choices: [
                  {
                    delta: {
                      content: text
                    }
                  }
                ]
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAiChunk)}\n\n`));
            }
          } catch (e) {
            console.warn("Could not parse Gemini SSE line in flush:", line, e);
          }
        }
      }
      // Send standard [DONE] signal to the frontend
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    }
  });
};

serve(async (req) => {
  // OPTIONS preflight request must return immediately with proper headers
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch (err) {
      throw new Error(`Failed to parse request JSON body: ${err.message}`);
    }

    const { messages = [], narrativeStyle = 'detailed', customApiUrl, customApiKey, useCustomAI } = body;

    // Define selected model configuration
    const SELECTED_MODEL = "gemini-3.1-flash-lite";
    const modelToUse = body.model || SELECTED_MODEL;

    // Determine credentials and provider pathways
    let apiKey = Deno.env.get("GOOGLE_API_KEY");
    let provider: "gemini" | "lovable" | "custom" = apiKey ? "gemini" : "lovable";

    // If GOOGLE_API_KEY env is not found, check fallback database config
    if (!apiKey) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && serviceKey) {
          const admin = createClient(supabaseUrl, serviceKey);
          const { data: cfg, error: cfgError } = await admin
            .from("ai_provider_config")
            .select("provider, gemini_api_key")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (cfgError) {
            console.error("ai_provider_config query failed:", cfgError);
          } else if (cfg?.provider === "gemini" && cfg.gemini_api_key) {
            apiKey = cfg.gemini_api_key;
            provider = "gemini";
          }
        } else {
          console.warn("Supabase database connection parameters are missing in env");
        }
      } catch (e) {
        console.warn("ai_provider_config read threw an exception, using default provider:", e);
      }
    }

    // User-level custom API override still wins and utilizes custom provider
    if (useCustomAI && customApiUrl && customApiKey) {
      provider = "custom";
    }

    const systemPrompt = getSystemPrompt(narrativeStyle);

    // 1. Custom Provider Flow
    if (provider === "custom") {
      const response = await fetch(customApiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${customApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({ error: `Custom AI error: ${response.status} ${errorText}` }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // 2. Native Gemini API Flow
    if (provider === "gemini") {
      if (!apiKey) {
        throw new Error("Gemini API key is not configured");
      }

      // Convert OpenAI messaging format to Gemini contents structure
      let systemInstructionText = systemPrompt;
      const contents: any[] = [];

      for (const msg of messages) {
        if (msg.role === "system") {
          systemInstructionText = msg.content;
          continue;
        }
        const role = msg.role === "assistant" ? "model" : "user";
        const lastContent = contents[contents.length - 1];
        if (lastContent && lastContent.role === role) {
          lastContent.parts[0].text += "\n" + msg.content;
        } else {
          contents.push({
            role,
            parts: [{ text: msg.content }]
          });
        }
      }

      // Ensure we have at least one user content to satisfy Gemini requirements
      if (contents.length === 0) {
        contents.push({
          role: "user",
          parts: [{ text: "Hello" }]
        });
      }

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:streamGenerateContent?key=${apiKey}&alt=sse`;

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstructionText }]
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);
        return new Response(JSON.stringify({ error: `Gemini API error: ${response.status} ${errorText}` }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!response.body) {
        throw new Error("Gemini response body is null");
      }

      const transformedStream = response.body.pipeThrough(createGeminiToOpenAiTransformer());

      return new Response(transformedStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // 3. Fallback: Lovable Gateway Provider Flow
    const lovApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovApiKey) {
      throw new Error("Lovable API key is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovApiKey}`,
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
      return new Response(JSON.stringify({ error: `AI gateway error: ${response.status} ${errorText}` }), {
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