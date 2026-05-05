-- ============================================================
-- Storage Buckets
-- ============================================================

-- Public bucket for client logos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-logos', 'client-logos', true, 5242880) -- 5MB
ON CONFLICT (id) DO NOTHING;

-- Public bucket for user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('avatars', 'avatars', true, 2097152) -- 2MB
ON CONFLICT (id) DO NOTHING;

-- Private bucket for task/client/content attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('attachments', 'attachments', false, 52428800) -- 50MB
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-logos
CREATE POLICY "client_logos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'client-logos');

CREATE POLICY "client_logos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-logos');

CREATE POLICY "client_logos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-logos');

-- Storage policies for avatars
CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for attachments (private)
CREATE POLICY "attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'attachments');

CREATE POLICY "attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'attachments');
