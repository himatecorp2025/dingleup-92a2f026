-- Create storage bucket for creator video thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('creator-thumbnails', 'creator-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own thumbnails
CREATE POLICY "Users can upload their own thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'creator-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to thumbnails
CREATE POLICY "Thumbnails are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'creator-thumbnails');

-- Allow users to update their own thumbnails
CREATE POLICY "Users can update their own thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'creator-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own thumbnails
CREATE POLICY "Users can delete their own thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'creator-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);