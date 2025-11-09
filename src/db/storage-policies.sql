-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for member photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-photos',
  'member-photos',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for tree exports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tree-exports',
  'tree-exports',
  false,
  104857600, -- 100MB
  ARRAY['application/pdf', 'application/json', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Profile Photos Policies
-- Users can upload to their own folder
CREATE POLICY "Users can upload to their own profile folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own profile photos
CREATE POLICY "Users can view their own profile photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own profile photos
CREATE POLICY "Users can update their own profile photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own profile photos
CREATE POLICY "Users can delete their own profile photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Member Photos Policies
-- Users can upload member photos for trees they collaborate on
CREATE POLICY "Users can upload member photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'member-photos' AND
    (
      -- Tree owners can upload
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM trees WHERE owner_id = auth.uid()
      ) OR
      -- Collaborators with edit access can upload
      (storage.foldername(name))[1] IN (
        SELECT tree_id::text FROM collaborations
        WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
      )
    )
  );

-- Users can view member photos from accessible trees
CREATE POLICY "Users can view member photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'member-photos' AND
    (
      -- Tree owners can view
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM trees WHERE owner_id = auth.uid()
      ) OR
      -- Collaborators can view
      (storage.foldername(name))[1] IN (
        SELECT tree_id::text FROM collaborations
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

-- Users can update member photos for trees they collaborate on
CREATE POLICY "Users can update member photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'member-photos' AND
    (
      -- Tree owners can update
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM trees WHERE owner_id = auth.uid()
      ) OR
      -- Collaborators with edit access can update
      (storage.foldername(name))[1] IN (
        SELECT tree_id::text FROM collaborations
        WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
      )
    )
  );

-- Users can delete member photos for trees they collaborate on
CREATE POLICY "Users can delete member photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'member-photos' AND
    (
      -- Tree owners can delete
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM trees WHERE owner_id = auth.uid()
      ) OR
      -- Collaborators with edit access can delete
      (storage.foldername(name))[1] IN (
        SELECT tree_id::text FROM collaborations
        WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
      )
    )
  );

-- Tree Exports Policies
-- Users can upload exports for their trees
CREATE POLICY "Users can upload tree exports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tree-exports' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM trees WHERE owner_id = auth.uid()
    )
  );

-- Users can view their own tree exports
CREATE POLICY "Users can view their tree exports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'tree-exports' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM trees WHERE owner_id = auth.uid()
    )
  );

-- Users can update their tree exports
CREATE POLICY "Users can update their tree exports" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'tree-exports' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM trees WHERE owner_id = auth.uid()
    )
  );

-- Users can delete their tree exports
CREATE POLICY "Users can delete their tree exports" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tree-exports' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM trees WHERE owner_id = auth.uid()
    )
  );