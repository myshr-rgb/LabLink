-- Version zero identifies the empty scaffold database before domain migrations.
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY CHECK (version >= 0)
);
