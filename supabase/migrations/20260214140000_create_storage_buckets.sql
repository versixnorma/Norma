-- ============================================
-- Create storage buckets for file uploads
-- ============================================

-- Bucket for general attachments (logos, documents, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'anexos',
  'anexos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for anexos bucket
CREATE POLICY "Authenticated users can upload to anexos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'anexos');

CREATE POLICY "Authenticated users can update own uploads in anexos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'anexos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view anexos (public bucket)"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'anexos');

CREATE POLICY "Superadmins can delete from anexos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'anexos'
    AND EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE auth_id = auth.uid() AND role = 'superadmin'
    )
  );
