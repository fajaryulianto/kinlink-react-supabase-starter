-- Complete Database Setup for KinLink Family Tree App
-- This file contains all SQL commands needed to set up the database

-- Run migrations first
\i migrations.sql

-- Enable RLS and create policies
\i rls-policies.sql

-- Set up storage buckets and policies
\i storage-policies.sql

-- Create some helper functions for the application

-- Function to get family tree statistics
CREATE OR REPLACE FUNCTION get_tree_stats(tree_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_members', (SELECT COUNT(*) FROM members WHERE tree_id = tree_uuid),
    'total_generations', (
      WITH RECURSIVE generations AS (
        SELECT m.id, m.birth_date, 1 as generation
        FROM members m
        WHERE m.tree_id = tree_uuid
        AND NOT EXISTS (
          SELECT 1 FROM relationships r
          WHERE r.to_member_id = m.id AND r.relationship_type = 'child'
        )

        UNION ALL

        SELECT m.id, m.birth_date, g.generation + 1
        FROM members m
        JOIN relationships r ON r.from_member_id = m.id
        JOIN generations g ON r.to_member_id = g.id
        WHERE r.relationship_type = 'child'
        AND m.tree_id = tree_uuid
      )
      SELECT MAX(generation) FROM generations
    ),
    'living_members', (SELECT COUNT(*) FROM members WHERE tree_id = tree_uuid AND is_living = true),
    'deceased_members', (SELECT COUNT(*) FROM members WHERE tree_id = tree_uuid AND is_living = false),
    'total_relationships', (SELECT COUNT(*) FROM relationships WHERE tree_id = tree_uuid),
    'collaborators', (SELECT COUNT(*) FROM collaborations WHERE tree_id = tree_uuid AND status = 'accepted')
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has access to a tree
CREATE OR REPLACE FUNCTION user_has_tree_access(user_uuid UUID, tree_uuid UUID, required_role TEXT DEFAULT 'viewer')
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is the owner
  IF EXISTS (SELECT 1 FROM trees WHERE id = tree_uuid AND owner_id = user_uuid) THEN
    RETURN TRUE;
  END IF;

  -- Check collaboration based on required role
  IF required_role = 'viewer' THEN
    RETURN EXISTS (
      SELECT 1 FROM collaborations
      WHERE tree_id = tree_uuid AND user_id = user_uuid AND status = 'accepted'
    );
  ELSIF required_role = 'editor' THEN
    RETURN EXISTS (
      SELECT 1 FROM collaborations
      WHERE tree_id = tree_uuid AND user_id = user_uuid
      AND status = 'accepted' AND role IN ('owner', 'editor')
    );
  ELSIF required_role = 'owner' THEN
    RETURN EXISTS (
      SELECT 1 FROM collaborations
      WHERE tree_id = tree_uuid AND user_id = user_uuid
      AND status = 'accepted' AND role = 'owner'
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to log activity (called by application or triggers)
CREATE OR REPLACE FUNCTION log_tree_activity(
  tree_uuid UUID,
  user_uuid UUID,
  action action_type,
  target target_type,
  target_uuid UUID DEFAULT NULL,
  metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (tree_id, user_id, action_type, target_type, target_id, metadata, ip_address)
  VALUES (tree_uuid, user_uuid, action, target, target_uuid, metadata, inet_client_addr())
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically log member changes
CREATE OR REPLACE FUNCTION log_member_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_tree_activity(
      NEW.tree_id,
      NEW.created_by,
      'create',
      'member',
      NEW.id,
      json_build_object('first_name', NEW.first_name, 'last_name', NEW.last_name)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_tree_activity(
      NEW.tree_id,
      NEW.updated_by,
      'update',
      'member',
      NEW.id,
      json_build_object('changes',
        json_build_object(
          'first_name', CASE WHEN NEW.first_name <> OLD.first_name THEN NEW.first_name ELSE NULL END,
          'last_name', CASE WHEN NEW.last_name <> OLD.last_name THEN NEW.last_name ELSE NULL END,
          'is_living', CASE WHEN NEW.is_living <> OLD.is_living THEN NEW.is_living ELSE NULL END
        )
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_tree_activity(
      OLD.tree_id,
      auth.uid(),
      'delete',
      'member',
      OLD.id,
      json_build_object('first_name', OLD.first_name, 'last_name', OLD.last_name)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic activity logging
CREATE TRIGGER log_member_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON members
  FOR EACH ROW EXECUTE FUNCTION log_member_activity();

-- Function to find siblings (members with same parents)
CREATE OR REPLACE FUNCTION get_siblings(member_uuid UUID)
RETURNS TABLE(sibling_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT m.id
  FROM members m
  JOIN relationships r1 ON m.id = r1.to_member_id
  JOIN relationships r2 ON r1.from_member_id = r2.from_member_id
  WHERE r2.to_member_id = member_uuid
  AND r1.relationship_type = 'child'
  AND r2.relationship_type = 'child'
  AND m.id != member_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get family members with relationships
CREATE OR REPLACE FUNCTION get_family_tree(tree_uuid UUID, max_depth INT DEFAULT 5)
RETURNS TABLE(
  member_id UUID,
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  is_living BOOLEAN,
  photo_url TEXT,
  relationship_type relationship_type,
  related_to UUID,
  depth_level INT
) AS $$
WITH RECURSIVE family_tree AS (
  -- Base case: start with all members in the tree
  SELECT
    m.id,
    m.first_name,
    m.last_name,
    m.birth_date,
    m.is_living,
    m.photo_url,
    NULL::relationship_type,
    NULL::UUID,
    0 as depth_level
  FROM members m
  WHERE m.tree_id = tree_uuid

  UNION ALL

  -- Recursive case: get relationships
  SELECT
    CASE
      WHEN r.from_member_id = ft.member_id THEN m_to.id
      ELSE m_from.id
    END as member_id,
    CASE
      WHEN r.from_member_id = ft.member_id THEN m_to.first_name
      ELSE m_from.first_name
    END as first_name,
    CASE
      WHEN r.from_member_id = ft.member_id THEN m_to.last_name
      ELSE m_from.last_name
    END as last_name,
    CASE
      WHEN r.from_member_id = ft.member_id THEN m_to.birth_date
      ELSE m_from.birth_date
    END as birth_date,
    CASE
      WHEN r.from_member_id = ft.member_id THEN m_to.is_living
      ELSE m_from.is_living
    END as is_living,
    CASE
      WHEN r.from_member_id = ft.member_id THEN m_to.photo_url
      ELSE m_from.photo_url
    END as photo_url,
    r.relationship_type,
    ft.member_id as related_to,
    ft.depth_level + 1
  FROM family_tree ft
  JOIN relationships r ON (
    r.from_member_id = ft.member_id OR r.to_member_id = ft.member_id
  )
  JOIN members m_from ON r.from_member_id = m_from.id
  JOIN members m_to ON r.to_member_id = m_to.id
  WHERE ft.depth_level < max_depth
  AND r.tree_id = tree_uuid
)
SELECT * FROM family_tree;
END;
$$ LANGUAGE plpgsql;

-- Create a view for recent activity across all accessible trees
CREATE OR REPLACE VIEW recent_activity AS
SELECT
  al.id,
  al.created_at,
  al.action_type,
  al.target_type,
  al.target_id,
  al.metadata,
  u.display_name as user_name,
  u.photo_url as user_photo,
  t.name as tree_name,
  CASE
    WHEN al.target_type = 'member' THEN
      (SELECT first_name || ' ' || last_name FROM members WHERE id = al.target_id)
    WHEN al.target_type = 'tree' THEN
      (SELECT name FROM trees WHERE id = al.target_id)
    ELSE NULL
  END as target_name
FROM activity_logs al
JOIN users u ON al.user_id = u.id
JOIN trees t ON al.tree_id = t.id
WHERE al.created_at >= NOW() - INTERVAL '7 days'
ORDER BY al.created_at DESC;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT INSERT ON trees, members, relationships, life_events, collaborations, activity_logs, notifications TO authenticated;
GRANT UPDATE ON trees, members, relationships, life_events, collaborations, notifications TO authenticated;
GRANT DELETE ON trees, members, relationships, life_events, collaborations, notifications TO authenticated;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Set up proper search path for the application
ALTER ROLE authenticated SET search_path = public, extensions;