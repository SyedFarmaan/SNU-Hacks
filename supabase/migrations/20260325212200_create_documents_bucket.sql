-- Storage bucket used by Layer 1 document ingestion.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'documents',
  'documents',
  true,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
)
ON CONFLICT (id)
DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow upload/read/update/delete during hackathon with anon/authenticated keys.
DROP POLICY IF EXISTS documents_bucket_public_read ON storage.objects;
CREATE POLICY documents_bucket_public_read
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS documents_bucket_insert ON storage.objects;
CREATE POLICY documents_bucket_insert
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS documents_bucket_update ON storage.objects;
CREATE POLICY documents_bucket_update
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS documents_bucket_delete ON storage.objects;
CREATE POLICY documents_bucket_delete
  ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'documents');
