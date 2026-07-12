-- Create migration for custom PostgreSQL RPC 'chat_with_gemini' with 60s timeout and chat history support

CREATE OR REPLACE FUNCTION public.chat_with_gemini(
  chat_history jsonb,
  model_name text DEFAULT 'gemini-3.1-flash-lite'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_api_key text;
  v_url text;
  v_request_body text;
  v_response extensions.http_response;
  v_contents jsonb := '[]'::jsonb;
  v_system_instruction jsonb := NULL;
  v_accumulated_system text := '';
  v_item jsonb;
  v_role text;
  v_content text;
  v_gemini_role text;
BEGIN
  -- 1. Retrieve the Gemini API key from public.ai_provider_config
  SELECT gemini_api_key INTO v_api_key
  FROM public.ai_provider_config
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_api_key IS NULL OR v_api_key = '' THEN
    RAISE EXCEPTION 'La API Key de Gemini no está configurada en ai_provider_config.';
  END IF;

  -- 2. Build the Gemini API URL
  v_url := 'https://generativelanguage.googleapis.com/v1beta/models/' || model_name || ':generateContent?key=' || v_api_key;

  -- 3. Parse and map chat_history to Gemini-compliant structures
  FOR v_item IN SELECT * FROM jsonb_array_elements(chat_history) LOOP
    v_role := v_item->>'role';
    v_content := v_item->>'content';

    IF v_role = 'system' THEN
      -- Accumulate all system instructions instead of overwriting them
      IF v_accumulated_system <> '' THEN
        v_accumulated_system := v_accumulated_system || E'\n\n' || v_content;
      ELSE
        v_accumulated_system := v_content;
      END IF;
    ELSE
      v_gemini_role := CASE WHEN v_role = 'assistant' OR v_role = 'model' THEN 'model' ELSE 'user' END;
      v_contents := v_contents || jsonb_build_object(
        'role', v_gemini_role,
        'parts', jsonb_build_array(jsonb_build_object('text', v_content))
      );
    END IF;
  END LOOP;

  -- Construct system instruction block if system messages were provided
  IF v_accumulated_system <> '' THEN
    v_system_instruction := jsonb_build_object(
      'parts', jsonb_build_array(jsonb_build_object('text', v_accumulated_system))
    );
  ELSE
    -- Default fallback system instruction
    v_system_instruction := jsonb_build_object(
      'parts', jsonb_build_array(jsonb_build_object('text', 'Eres un asistente experto en desarrollo web.'))
    );
  END IF;

  -- 4. Construct the final request body
  v_request_body := jsonb_build_object(
    'contents', v_contents,
    'systemInstruction', v_system_instruction
  )::text;

  -- 5. Set the HTTP request timeout to 60 seconds (60000 ms) inside transaction config
  PERFORM set_config('http.timeout_msec', '60000', true);

  -- 6. Perform the HTTP request using extensions.http
  SELECT * INTO v_response FROM extensions.http((
    'POST',
    v_url,
    ARRAY[extensions.http_header('Content-Type', 'application/json')],
    'application/json',
    v_request_body
  )::extensions.http_request);

  -- 7. Check response status and return content
  IF v_response.status >= 200 AND v_response.status < 300 THEN
    RETURN v_response.content::jsonb;
  ELSE
    RAISE EXCEPTION 'Error al conectar con la API de Gemini (Código %): %', v_response.status, v_response.content;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.chat_with_gemini(jsonb, text) TO authenticated;
