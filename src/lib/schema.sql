-- HolaBusiness Agency Core Database Schema (Turso / LibSQL / SQLite)

-- 1. Users Table (Founders & Admins)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  is_main_admin INTEGER NOT NULL DEFAULT 0,
  is_disabled INTEGER NOT NULL DEFAULT 0,
  password TEXT NOT NULL DEFAULT 'admin123',
  title TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  start_date TEXT,
  target_end_date TEXT,
  actual_end_date TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  draft_reason TEXT,
  draft_source_stage TEXT,
  remainder_next_date TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users (id)
);

-- 3. Project Contacts
CREATE TABLE IF NOT EXISTS project_contacts (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  company_name TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  can_access_portal INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- 4. Meetings & Discovery
CREATE TABLE IF NOT EXISTS project_meetings (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  is_general_session INTEGER NOT NULL DEFAULT 0,
  pain_points TEXT,
  solution_notes TEXT,
  expectations_goals TEXT,
  general_notes TEXT,
  outcome TEXT NOT NULL DEFAULT 'scheduled',
  outcome_notes TEXT,
  outcome_recorded_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- 5. Client Talk (Communication Logs)
CREATE TABLE IF NOT EXISTS client_talks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- 6. Commercial Proposals
CREATE TABLE IF NOT EXISTS project_proposals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  executive_summary TEXT NOT NULL,
  scope_of_work TEXT NOT NULL,
  total_one_time_cost REAL NOT NULL,
  monthly_recurring_cost REAL NOT NULL DEFAULT 0,
  pricing_items_json TEXT NOT NULL DEFAULT '[]',
  milestones_json TEXT NOT NULL DEFAULT '[]',
  outcome TEXT NOT NULL DEFAULT 'draft',
  outcome_notes TEXT,
  outcome_recorded_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- 7. Asset Repository (4-Field Cloud Link Model)
CREATE TABLE IF NOT EXISTS project_assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  drive_link TEXT NOT NULL,
  notes TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- 8. Credential Vault (AES-256 Encrypted)
CREATE TABLE IF NOT EXISTS project_credentials (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  category TEXT,
  login_url TEXT,
  username TEXT NOT NULL,
  encrypted_secret TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- 9. Renewals & Retainers
CREATE TABLE IF NOT EXISTS project_renewals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  renewal_date TEXT NOT NULL,
  cost REAL NOT NULL,
  billing_cycle TEXT NOT NULL,
  renewed INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- 10. Execution Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  assignee_id TEXT,
  status TEXT NOT NULL DEFAULT 'To Do',
  priority TEXT NOT NULL DEFAULT 'Medium',
  due_date TEXT NOT NULL,
  completed_at TEXT,
  is_delayed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- 11. Activity Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  change_summary TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed Initial Main Admin
INSERT OR IGNORE INTO users (id, name, email, role, is_main_admin, password, title)
VALUES ('usr-admin-1', 'Ram Maruri', 'ram@holabusiness.in', 'admin', 1, 'admin123', 'Primary Founder & Managing Partner');
