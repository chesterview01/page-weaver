-- Migration to shift chat architecture from Edge Functions to database RPC
-- and resolve the 409 Conflict error on messages table inserts.

-- 1. Ensure the extensions schema and http extension are enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Ensure messages table ID has default gen_random_uuid() to avoid manual duplication/conflict errors
ALTER TABLE public.messages ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Define the handle_constructor_chat RPC function
CREATE OR REPLACE FUNCTION public.handle_constructor_chat(
  p_conversation_id UUID,
  p_messages JSONB,
  p_user_message TEXT,
  p_narrative_style TEXT DEFAULT 'detailed',
  p_custom_api_url TEXT DEFAULT NULL,
  p_custom_api_key TEXT DEFAULT NULL,
  p_use_custom_ai BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_msg_id UUID;
  v_assistant_msg_id UUID;
  v_api_url TEXT;
  v_api_key TEXT;
  v_model TEXT := 'gemini-2.5-flash';
  v_system_prompt TEXT;
  v_messages_payload JSONB;
  v_request_body TEXT;
  v_headers extensions.http_header[];
  v_request extensions.http_request;
  v_response extensions.http_response;
  v_response_json JSONB;
  v_response_text TEXT;
  v_result JSONB;
  v_provider TEXT;
BEGIN
  -- A. Generate UUIDs for both messages early
  v_user_msg_id := gen_random_uuid();
  v_assistant_msg_id := gen_random_uuid();

  -- B. Resolve API Credentials (Custom AI or stored Gemini config)
  IF p_use_custom_ai AND p_custom_api_key IS NOT NULL AND p_custom_api_key != '' THEN
    v_api_url := COALESCE(p_custom_api_url, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    v_api_key := p_custom_api_key;
    v_model := 'gemini-2.5-flash';
  ELSE
    -- Fetch configured credentials from public.ai_provider_config
    SELECT provider, gemini_api_key INTO v_provider, v_api_key
    FROM public.ai_provider_config
    ORDER BY updated_at DESC
    LIMIT 1;

    IF v_api_key IS NULL OR v_api_key = '' THEN
      RAISE EXCEPTION 'La API Key de Gemini no está configurada en la base de datos.';
    END IF;

    v_api_url := 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    v_model := 'gemini-2.5-flash';
  END IF;

  -- C. Construct System Prompt
  v_system_prompt := 'You are an expert web developer AI assistant that generates complete web projects with proper file structure.

CRITICAL: Your response must have TWO DISTINCT PARTS:

PART 1 - NARRATIVE (for the user to read):
Start with a friendly, conversational narrative explaining what you''re building. DO NOT show any code in this part.
' || CASE
    WHEN p_narrative_style = 'minimal' THEN 'Keep it brief - 1-2 sentences max.'
    WHEN p_narrative_style = 'technical' THEN 'Include technical details about the implementation approach.'
    ELSE 'Provide a clear, detailed explanation of what you''re creating.'
  END || '

PART 2 - PROJECT STRUCTURE (JSON format):
After your narrative, you MUST include a complete project structure in JSON format wrapped in a json code block.

The JSON must follow this EXACT structure:
```json
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
      "content": "{ \"name\": \"...\" }"
    },
    {
      "path": "README.md",
      "content": "# Project Title..."
    }
  ]
}
```

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
- Use double backslashes for escaping quotes inside JSON strings';

  -- D. Prepare Payload (prepend system prompt and append the new user message)
  v_messages_payload := jsonb_build_array(
    jsonb_build_object('role', 'system', 'content', v_system_prompt)
  ) || p_messages || jsonb_build_array(
    jsonb_build_object('role', 'user', 'content', p_user_message)
  );

  -- E. Insert User Message to Database
  INSERT INTO public.messages (id, conversation_id, role, content, created_at)
  VALUES (v_user_msg_id, p_conversation_id, 'user', p_user_message, now());

  -- F. Construct HTTP Request details
  v_request_body := jsonb_build_object(
    'model', v_model,
    'messages', v_messages_payload
  )::text;

  v_headers := ARRAY[
    ROW('Content-Type', 'application/json')::extensions.http_header,
    ROW('Authorization', 'Bearer ' || v_api_key)::extensions.http_header
  ];

  -- http_request type mapping: (method, uri, headers, content_type, content)
  v_request := ROW(
    'POST',
    v_api_url,
    v_headers,
    'application/json',
    v_request_body
  )::extensions.http_request;

  -- G. Execute Fetch Synchronously via http extension
  BEGIN
    v_response := extensions.http(v_request);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al conectar con la API de Gemini desde PostgreSQL: %', SQLERRM;
  END;

  -- H. Parse Response
  IF v_response.status != 200 THEN
    RAISE EXCEPTION 'La API de Gemini retornó un código de error %: %', v_response.status, v_response.content;
  END IF;

  BEGIN
    v_response_json := v_response.content::jsonb;
    v_response_text := v_response_json->'choices'->0->'message'->>'content';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'No se pudo parsear el formato de respuesta de la API de Gemini: %', v_response.content;
  END;

  IF v_response_text IS NULL OR v_response_text = '' THEN
    RAISE EXCEPTION 'La API de Gemini devolvió una respuesta vacía.';
  END IF;

  -- I. Insert Assistant Response into public.messages
  INSERT INTO public.messages (id, conversation_id, role, content, created_at)
  VALUES (v_assistant_msg_id, p_conversation_id, 'assistant', v_response_text, now());

  -- J. Return result JSONB with content and assistant message ID
  v_result := jsonb_build_object(
    'content', v_response_text,
    'message_id', v_assistant_msg_id
  );

  RETURN v_result;
END;
$$;

-- 4. Grant Execute privileges to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.handle_constructor_chat(UUID, JSONB, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, anon;
