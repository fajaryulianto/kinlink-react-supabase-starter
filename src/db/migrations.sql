-- Create Enums
CREATE TYPE gender AS ENUM ('male', 'female', 'other');
CREATE TYPE relationship_type AS ENUM ('parent', 'child', 'spouse', 'sibling');
CREATE TYPE parent_role AS ENUM ('father', 'mother', 'neutral');
CREATE TYPE verification_level AS ENUM ('verified', 'relationship', 'unknown');
CREATE TYPE event_type AS ENUM (
  'graduation',
  'job',
  'marriage',
  'birth',
  'death',
  'retirement',
  'military',
  'relocation',
  'education',
  'religious',
  'other'
);
CREATE TYPE collaboration_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE collaboration_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE action_type AS ENUM ('view', 'create', 'update', 'delete');
CREATE TYPE target_type AS ENUM ('member', 'tree', 'relationship');
CREATE TYPE notification_type AS ENUM ('invitation', 'member_added', 'sharing', 'update', 'reminder');

-- Create Tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  nickname TEXT,
  maiden_name TEXT,
  gender gender,
  birth_date DATE NOT NULL,
  birth_place TEXT NOT NULL,
  death_date DATE,
  death_place TEXT,
  is_living BOOLEAN DEFAULT TRUE NOT NULL,
  photo_url TEXT,
  occupation TEXT,
  education TEXT,
  biography TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  from_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  relationship_type relationship_type NOT NULL,
  parent_role parent_role,
  verification_level verification_level DEFAULT 'unknown' NOT NULL,
  marriage_place TEXT,
  marriage_date DATE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE life_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  title TEXT NOT NULL,
  event_date DATE,
  location TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role collaboration_role NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status collaboration_status DEFAULT 'pending' NOT NULL
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type action_type NOT NULL,
  target_type target_type NOT NULL,
  target_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create Indexes for better performance
CREATE INDEX idx_trees_owner_id ON trees(owner_id);
CREATE INDEX idx_members_tree_id ON members(tree_id);
CREATE INDEX idx_members_created_by ON members(created_by);
CREATE INDEX idx_relationships_tree_id ON relationships(tree_id);
CREATE INDEX idx_relationships_from_member_id ON relationships(from_member_id);
CREATE INDEX idx_relationships_to_member_id ON relationships(to_member_id);
CREATE INDEX idx_life_events_member_id ON life_events(member_id);
CREATE INDEX idx_collaborations_tree_id ON collaborations(tree_id);
CREATE INDEX idx_collaborations_user_id ON collaborations(user_id);
CREATE INDEX idx_activity_logs_tree_id ON activity_logs(tree_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Create Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trees_updated_at BEFORE UPDATE ON trees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraints to prevent duplicate relationships
ALTER TABLE relationships ADD CONSTRAINT unique_relationship
  UNIQUE (tree_id, from_member_id, to_member_id, relationship_type);

-- Add constraint to prevent self-relationships
ALTER TABLE relationships ADD CONSTRAINT no_self_relationship
  CHECK (from_member_id != to_member_id);

-- Add constraint for valid dates
ALTER TABLE members ADD CONSTRAINT valid_death_date
  CHECK (death_date IS NULL OR death_date >= birth_date);

-- Add constraint for reasonable dates
ALTER TABLE members ADD CONSTRAINT reasonable_birth_date
  CHECK (birth_date <= CURRENT_DATE AND birth_date > '1900-01-01'::date);