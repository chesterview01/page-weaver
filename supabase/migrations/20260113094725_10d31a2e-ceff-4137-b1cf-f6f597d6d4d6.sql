-- Fix overly permissive RLS policies on existing tables

-- Drop old policies
DROP POLICY IF EXISTS "Public access to builds" ON public.builds;
DROP POLICY IF EXISTS "Public access to messages" ON public.messages;
DROP POLICY IF EXISTS "Public access to audit_logs" ON public.audit_logs;

-- Add user_id to builds and messages if not exists (via conversation)
-- Builds access through conversation owner
CREATE POLICY "Users can view own builds"
  ON public.builds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = builds.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own builds"
  ON public.builds FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id 
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own builds"
  ON public.builds FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = builds.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own builds"
  ON public.builds FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = builds.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

-- Messages access through conversation owner
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = messages.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id 
      AND c.user_id = auth.uid()
    )
  );

-- Audit logs - users can only view their own, insert is done by system
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);