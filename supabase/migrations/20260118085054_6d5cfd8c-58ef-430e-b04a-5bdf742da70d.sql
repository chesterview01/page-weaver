-- Add thumbnail_url column to builds table
ALTER TABLE public.builds ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Create storage bucket for thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public access to thumbnails
CREATE POLICY "Thumbnails are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

-- Create policy for authenticated users to upload thumbnails
CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'thumbnails' AND auth.uid() IS NOT NULL);

-- Create policy for users to update their own thumbnails
CREATE POLICY "Users can update own thumbnails"
ON storage.objects FOR UPDATE
USING (bucket_id = 'thumbnails' AND auth.uid() IS NOT NULL);

-- Create policy for users to delete their own thumbnails
CREATE POLICY "Users can delete own thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'thumbnails' AND auth.uid() IS NOT NULL);