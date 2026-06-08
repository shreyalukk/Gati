-- Spatial indexes for fast geo queries
CREATE INDEX IF NOT EXISTS idx_projects_location ON projects USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_projects_corridor ON projects USING GIST (corridor);
CREATE INDEX IF NOT EXISTS idx_utility_assets_geometry ON utility_assets USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_road_warranties_geometry ON road_warranties USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_violations_location ON violations USING GIST (location);

-- B-tree indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_city ON projects (city);
CREATE INDEX IF NOT EXISTS idx_projects_work_type ON projects (work_type);
CREATE INDEX IF NOT EXISTS idx_projects_lead_org ON projects (lead_org_id);
CREATE INDEX IF NOT EXISTS idx_project_participants_project ON project_participants (project_id);
CREATE INDEX IF NOT EXISTS idx_project_participants_org ON project_participants (org_id);
CREATE INDEX IF NOT EXISTS idx_utility_assets_org ON utility_assets (org_id);
CREATE INDEX IF NOT EXISTS idx_utility_assets_city ON utility_assets (city);
CREATE INDEX IF NOT EXISTS idx_violations_project ON violations (project_id);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations (status);
CREATE INDEX IF NOT EXISTS idx_updates_project ON updates (project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages (project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users (org_id);
