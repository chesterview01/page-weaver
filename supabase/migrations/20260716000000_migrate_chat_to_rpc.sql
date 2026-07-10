-- Migration to synchronize production handle_constructor_chat RPC function with the repository
-- This function shift chat architecture to a database-centric RPC, resolving CORS and RLS issues,
-- and incorporating a robust exponential backoff retry mechanism for 503 errors with dynamic jitter.

-- 1. Ensure the http extension is enabled in the extensions schema
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Define the public.handle_constructor_chat RPC function with Security Definer and proper grants
CREATE OR REPLACE FUNCTION public.handle_constructor_chat(
    p_user_message TEXT,
    p_conversation_id TEXT DEFAULT NULL,
    p_use_custom_ai BOOLEAN DEFAULT FALSE,
    p_custom_api_key TEXT DEFAULT NULL,
    p_custom_api_url TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_conversation_id UUID;
    v_api_key TEXT;
    v_http_response extensions.http_response;
    v_request_body TEXT;
    v_ai_response TEXT;
    v_url TEXT;
    -- Retry / Backoff Variables
    v_attempts INT := 0;
    v_max_attempts INT := 3;
    v_delay_seconds NUMERIC := 2.0;
    v_call_success BOOLEAN := false;
BEGIN
    IF p_user_message IS NULL OR p_user_message = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mensaje vacío');
    END IF;

    IF p_conversation_id IS NOT NULL AND p_conversation_id != '' THEN
        v_conversation_id := p_conversation_id::UUID;
    ELSE
        v_conversation_id := gen_random_uuid();
    END IF;

    IF p_use_custom_ai = true AND p_custom_api_key IS NOT NULL AND p_custom_api_key != '' THEN
        v_api_key := p_custom_api_key;
    ELSE
        SELECT gemini_api_key INTO v_api_key
        FROM public.ai_provider_config
        WHERE gemini_api_key IS NOT NULL AND gemini_api_key != ''
        ORDER BY updated_at DESC
        LIMIT 1;
    END IF;

    v_url := COALESCE(p_custom_api_url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');

    v_request_body := json_build_object(
        'contents', json_build_array(
            json_build_object(
                'parts', json_build_array(
                    json_build_object('text', p_user_message)
                )
            )
        )
    )::text;

    -- Timeout increased to 50 seconds to support robust retries without hanging indefinitely
    SET LOCAL http.timeout_msec = 50000;

    WHILE v_attempts < v_max_attempts AND NOT v_call_success LOOP
        BEGIN
            SELECT * INTO v_http_response FROM extensions.http(
                (
                    'POST',
                    v_url,
                    ARRAY[
                        ('Content-Type', 'application/json'),
                        ('x-goog-api-key', v_api_key)
                    ]::extensions.http_header[],
                    'application/json',
                    v_request_body
                )::extensions.http_request
            );

            -- Consider HTTP 200 as successful
            IF v_http_response.status = 200 THEN
                v_call_success := true;
            ELSE
                v_attempts := v_attempts + 1;
                IF v_attempts < v_max_attempts THEN
                    -- Exponential backoff with random jitter: (delay_seconds * attempts) + random number between 0 and 1
                    PERFORM pg_sleep((v_delay_seconds * v_attempts) + random());
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_attempts := v_attempts + 1;
            IF v_attempts = v_max_attempts THEN
                RETURN jsonb_build_object('success', false, 'error', 'Error al conectar con la API de Gemini desde PostgreSQL después de ' || v_attempts || ' intentos: ' || SQLERRM);
            ELSE
                PERFORM pg_sleep((v_delay_seconds * v_attempts) + random());
            END IF;
        END;
    END LOOP;

    IF NOT v_call_success THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fallo al obtener respuesta de la API de Gemini tras ' || v_attempts || ' intentos. Status HTTP: ' || COALESCE(v_http_response.status::text, 'N/A'));
    END IF;

    BEGIN
        v_ai_response := (jsonb_path_query_first(
            v_http_response.content::jsonb,
            '$.candidates[0].content.parts[0].text'
        )#>>'{}');
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fallo al procesar respuesta tras ' || v_attempts || ' intentos. Detalle: ' || COALESCE(v_http_response.content, 'Respuesta nula'));
    END;

    IF v_ai_response IS NULL OR v_ai_response = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'El servicio de IA está experimentando alta demanda o devolvió una respuesta vacía. Por favor, intenta de nuevo en unos minutos.');
    END IF;

    -- Store conversation history atomically in database
    INSERT INTO public.messages (conversation_id, role, content)
    VALUES (v_conversation_id, 'user', p_user_message);

    -- Insert assistant reply and capture its newly generated UUID to return to client
    -- We can retrieve this message's ID using INSERT ... RETURNING id
    DECLARE
        v_assistant_msg_id UUID;
    BEGIN
        INSERT INTO public.messages (conversation_id, role, content)
        VALUES (v_conversation_id, 'assistant', v_ai_response)
        RETURNING id INTO v_assistant_msg_id;

        RETURN jsonb_build_object(
            'success', true,
            'reply', v_ai_response,
            'conversation_id', v_conversation_id,
            'message_id', v_assistant_msg_id
        );
    END;
END;
$$;

-- 3. Grant EXECUTE privileges to authenticated and anon roles so the client can query it directly
GRANT EXECUTE ON FUNCTION public.handle_constructor_chat(TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO authenticated, anon;
