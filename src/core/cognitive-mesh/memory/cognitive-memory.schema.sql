-- Batch-10 foundation schema sketch (optional persistence model).
-- In-memory repository remains the active runtime implementation.

CREATE TABLE IF NOT EXISTS cognitive_conversation_sessions (
  session_id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NULL,
  metadata_json TEXT NULL
);

CREATE TABLE IF NOT EXISTS cognitive_conversation_messages (
  message_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  tags_json TEXT NULL,
  metadata_json TEXT NULL
);

CREATE TABLE IF NOT EXISTS cognitive_memory_items (
  memory_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  layer TEXT NOT NULL,
  content TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  links_json TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  scores_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  metadata_json TEXT NULL
);

CREATE TABLE IF NOT EXISTS cognitive_recall_events (
  recall_event_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  query TEXT NULL,
  selected_memory_ids_json TEXT NOT NULL,
  threshold_used REAL NOT NULL,
  advisory_only INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  metadata_json TEXT NULL
);

CREATE TABLE IF NOT EXISTS cognitive_unresolved_items (
  unresolved_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT NULL
);
