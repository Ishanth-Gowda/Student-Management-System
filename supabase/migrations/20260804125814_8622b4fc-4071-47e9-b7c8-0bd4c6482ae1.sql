CREATE POLICY "Signed-in users can view avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "Signed-in users can upload avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Owners or admins can update avatars" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Owners or admins can delete avatars" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));