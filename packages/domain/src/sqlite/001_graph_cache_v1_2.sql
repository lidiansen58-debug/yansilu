CREATE TABLE IF NOT EXISTS subgraph_snapshots (
  cache_key TEXT PRIMARY KEY,
  center_note_id TEXT NOT NULL,
  directory_id TEXT NOT NULL,
  depth INTEGER NOT NULL,
  filters_json TEXT,
  nodes_json TEXT NOT NULL,
  edges_json TEXT NOT NULL,
  layout_json TEXT,
  node_count INTEGER NOT NULL,
  edge_count INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subgraph_center ON subgraph_snapshots(center_note_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_subgraph_directory ON subgraph_snapshots(directory_id, updated_at DESC);

