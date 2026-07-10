-- 1. Ensure Row Level Security is enabled on public.messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop any previous or conflicting policies on public.messages
DROP POLICY IF EXISTS "Public access to messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;

-- 3. Policy for Authenticated Users: SELECT (only their own messages via conversation ownership)
CREATE POLICY "Authenticated users can select own messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- 4. Policy for Authenticated Users: INSERT (only insert into conversations they own)
CREATE POLICY "Authenticated users can insert own messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- 5. Policy for Admins: Full Access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins have full access to messages"
  ON public.messages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Grant appropriate privileges to authenticated and service_role
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
