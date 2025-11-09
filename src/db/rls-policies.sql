-- Enable Row Level Security on all tables
ALTER TABLE trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Trees Policies
-- Users can view trees they collaborate on or public trees
CREATE POLICY "Users can view accessible trees" ON trees
  FOR SELECT USING (
    is_public = TRUE OR
    id IN (
      SELECT tree_id FROM collaborations
      WHERE user_id = auth.uid() AND status = 'accepted'
    ) OR
    owner_id = auth.uid()
  );

-- Only tree owners can create trees
CREATE POLICY "Users can create trees" ON trees
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Only tree owners and editors can update trees
CREATE POLICY "Users can update their trees" ON trees
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT tree_id FROM collaborations
      WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
    )
  );

-- Only tree owners can delete trees
CREATE POLICY "Users can delete their trees" ON trees
  FOR DELETE USING (owner_id = auth.uid());

-- Members Policies
-- Users can view members from trees they collaborate on
CREATE POLICY "Users can view accessible members" ON members
  FOR SELECT USING (
    tree_id IN (
      SELECT tree_id FROM collaborations
      WHERE user_id = auth.uid() AND status = 'accepted'
    ) OR
    tree_id IN (
      SELECT id FROM trees WHERE owner_id = auth.uid()
    )
  );

-- Users with edit access can create members
CREATE POLICY "Users can create members" ON members
  FOR INSERT WITH CHECK (
    tree_id IN (
      SELECT tree_id FROM collaborations
      WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
    ) OR
    tree_id IN (
      SELECT id FROM trees WHERE owner_id = auth.uid()
    )
  );

-- Users with edit access can update members
CREATE POLICY "Users can update members" ON members
  FOR UPDATE USING (
    tree_id IN (
      SELECT tree_id FROM collaborations
      WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
    ) OR
    tree_id IN (
      SELECT id FROM trees WHERE owner_id = auth.uid()
    )
  );

-- Users with edit access can delete members
CREATE POLICY "Users can delete members" ON members
  FOR DELETE USING (
    tree_id IN (
      SELECT tree_id FROM collaborations
      WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
    ) OR
    tree_id IN (
      SELECT id FROM trees WHERE owner_id = auth.uid()
    )
  );

-- Relationships Policies
-- Users can view relationships from trees they collaborate on
CREATE POLICY "Users can view accessible relationships" ON relationships
  FOR SELECT USING (
    tree_id IN (
      SELECT tree_id FROM collaborations
      WHERE user_id = auth.uid() AND status = 'accepted'
    ) OR
    tree_id IN (
      SELECT id FROM trees WHERE owner_id = auth.uid()
    )
  );

-- Users with edit access can create relationships
CREATE POLICY "Users can create relationships" ON relationships
  FOR INSERT WITH CHECK (
    tree_id IN (
      SELECT tree_id FROM collaborations
      WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
    ) OR
    tree_id IN (
      SELECT id FROM trees WHERE owner_id = auth.uid()
    )
  );

-- Users with edit access can update relationships
CREATE POLICY "Users can update relationships" ON relationships
  FOR UPDATE USING (
    tree_id IN (
      SELECT tree_id FROM collaborations
      WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
    ) OR
    tree_id IN (
      SELECT id FROM trees WHERE owner_id = auth.uid()
    )
  );

-- Users with edit access can delete relationships
CREATE POLICY "Users can delete relationships" ON relationships
  FOR DELETE USING (
    tree_id IN (
      SELECT tree_id FROM collaborations
      WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
    ) OR
    tree_id IN (
      SELECT id FROM trees WHERE owner_id = auth.uid()
    )
  );

-- Life Events Policies
-- Users can view life events from trees they collaborate on
CREATE POLICY "Users can view accessible life events" ON life_events
  FOR SELECT USING (
    member_id IN (
      SELECT id FROM members WHERE tree_id IN (
        SELECT tree_id FROM collaborations
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    ) OR
    member_id IN (
      SELECT id FROM members WHERE tree_id IN (
        SELECT id FROM trees WHERE owner_id = auth.uid()
      )
    )
  );

-- Users with edit access can create life events
CREATE POLICY "Users can create life events" ON life_events
  FOR INSERT WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE tree_id IN (
        SELECT tree_id FROM collaborations
        WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
      )
    ) OR
    member_id IN (
      SELECT id FROM members WHERE tree_id IN (
        SELECT id FROM trees WHERE owner_id = auth.uid()
      )
    )
  );

-- Users with edit access can update life events
CREATE POLICY "Users can update life events" ON life_events
  FOR UPDATE USING (
    member_id IN (
      SELECT id FROM members WHERE tree_id IN (
        SELECT tree_id FROM collaborations
        WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
      )
    ) OR
    member_id IN (
      SELECT id FROM members WHERE tree_id IN (
        SELECT id FROM trees WHERE owner_id = auth.uid()
      )
    )
  );

-- Users with edit access can delete life events
CREATE POLICY "Users can delete life events" ON life_events
  FOR DELETE USING (
    member_id IN (
      SELECT id FROM members WHERE tree_id IN (
        SELECT tree_id FROM collaborations
        WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
      )
    ) OR
    member_id IN (
      SELECT id FROM members WHERE tree_id IN (
        SELECT id FROM trees WHERE owner_id = auth.uid()
      )
    )
  );

-- Collaborations Policies
-- Users can view their own collaborations
CREATE POLICY "Users can view their collaborations" ON collaborations
  FOR SELECT USING (user_id = auth.uid() OR invited_by = auth.uid());

-- Users can create collaborations for their trees
CREATE POLICY "Users can create collaborations" ON collaborations
  FOR INSERT WITH CHECK (
    tree_id IN (
      SELECT id FROM trees WHERE owner_id = auth.uid()
    )
  );

-- Users can update collaborations they invited
CREATE POLICY "Users can update collaborations" ON collaborations
  FOR UPDATE USING (invited_by = auth.uid());

-- Users can delete collaborations they invited
CREATE POLICY "Users can delete collaborations" ON collaborations
  FOR DELETE USING (invited_by = auth.uid());

-- Activity Logs Policies
-- Users can view activity logs from trees they collaborate on
CREATE POLICY "Users can view accessible activity logs" ON activity_logs
  FOR SELECT USING (
    tree_id IN (
      SELECT tree_id FROM collaborations
      WHERE user_id = auth.uid() AND status = 'accepted'
    ) OR
    tree_id IN (
      SELECT id FROM trees WHERE owner_id = auth.uid()
    )
  );

-- System creates activity logs (service role)
CREATE POLICY "System can create activity logs" ON activity_logs
  FOR INSERT WITH CHECK (true);

-- Notifications Policies
-- Users can view their own notifications
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their notifications
CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their notifications
CREATE POLICY "Users can delete their notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- System creates notifications (service role)
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);