CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY CHECK (version >= 0));

CREATE TABLE IF NOT EXISTS departments (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'incharge', 'admin')),
  department_id TEXT REFERENCES departments(id),
  faculty_guide_id TEXT REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS labs (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  department_id TEXT NOT NULL REFERENCES departments(id),
  location TEXT NOT NULL,
  in_charge_id TEXT NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS equipment (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL CHECK (json_valid(tags)),
  specs TEXT NOT NULL CHECK (json_valid(specs)),
  lab_id TEXT NOT NULL REFERENCES labs(id),
  status TEXT NOT NULL CHECK (status IN ('available', 'maintenance', 'retired')),
  access_type TEXT NOT NULL CHECK (access_type IN ('open', 'approval', 'dept_only')),
  requires_incharge_approval INTEGER NOT NULL DEFAULT 0 CHECK (requires_incharge_approval IN (0, 1)),
  max_booking_minutes INTEGER NOT NULL,
  advance_days INTEGER NOT NULL,
  open_time TEXT NOT NULL,
  close_time TEXT NOT NULL,
  weekdays TEXT NOT NULL CHECK (json_valid(weekdays)),
  image_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  guide_id TEXT NOT NULL REFERENCES users(id),
  deadline TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('normal', 'high', 'critical')),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL REFERENCES projects(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT NOT NULL PRIMARY KEY,
  equipment_id TEXT NOT NULL REFERENCES equipment(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT REFERENCES projects(id),
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_approval', 'changes_requested', 'faculty_approved', 'approved', 'checked_in', 'completed', 'rejected', 'cancelled', 'no_show', 'displaced')),
  justification TEXT NOT NULL,
  decision_note TEXT,
  incharge_approved_at TEXT,
  conflict_group_id TEXT REFERENCES conflict_groups(id),
  checked_in_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (start_at < end_at)
);

CREATE TABLE IF NOT EXISTS maintenance_blocks (
  id TEXT NOT NULL PRIMARY KEY,
  equipment_id TEXT NOT NULL REFERENCES equipment(id),
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  CHECK (start_at < end_at)
);

CREATE TABLE IF NOT EXISTS conflict_groups (
  id TEXT NOT NULL PRIMARY KEY,
  equipment_id TEXT NOT NULL REFERENCES equipment(id),
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
  resolved_by TEXT REFERENCES users(id),
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  CHECK (window_start < window_end)
);

CREATE TABLE IF NOT EXISTS allocation_decisions (
  id TEXT NOT NULL PRIMARY KEY,
  conflict_group_id TEXT NOT NULL REFERENCES conflict_groups(id),
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  rank INTEGER NOT NULL,
  score REAL NOT NULL,
  factors TEXT NOT NULL CHECK (json_valid(factors)),
  reason_text TEXT NOT NULL,
  ai_reason_text TEXT,
  source TEXT NOT NULL CHECK (source IN ('rules', 'ai_assisted')),
  recommended_outcome TEXT NOT NULL,
  final_outcome TEXT,
  overridden_by TEXT REFERENCES users(id),
  override_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT NOT NULL PRIMARY KEY,
  actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata TEXT NOT NULL CHECK (json_valid(metadata)),
  ip_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id_hash TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS policy_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  weights TEXT NOT NULL CHECK (json_valid(weights)),
  weekly_quota_hours REAL NOT NULL,
  version INTEGER NOT NULL,
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_equipment_id ON bookings (equipment_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings (user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status, start_at);
CREATE INDEX IF NOT EXISTS idx_equipment_lab_id ON equipment (lab_id);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment (category);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_blocks_equipment_id ON maintenance_blocks (equipment_id, start_at, end_at);
