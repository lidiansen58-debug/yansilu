# 研思录数据库设计说明 v1.2

## 1. 目标

定义 v1.2 结构化存储层（SQLite/Postgres 等效），支持：

- 目录模型（根目录、默认目录、子目录、容量上限、隐藏）
- 全笔记 CRUD（随笔记录/书摘笔记/原创笔记/项目笔记）
- 原创笔记关联与反向链接（`[[标题]]` + `note_id`）
- 写作入口约束（仅原创目录）
- 索引提醒（每净增 15 条原创笔记）
- 原创性阈值阻断（相似度 `>= 80%`）

---

## 2. 存储分层

1. 主内容（事实源）：`notes/**/*.md`
2. 结构索引：`catalog.db`
3. 图谱缓存：`graph-cache.db`
4. 向量索引：`vectors.db`

说明：

- 目录树描述、索引笔记、全部笔记正文都存 Markdown。
- SQLite 保存结构化关系与查询加速，不替代 Markdown 主内容。

---

## 3. catalog.db（核心结构）

## 3.1 directories

```sql
CREATE TABLE directories (
  id TEXT PRIMARY KEY,
  parent_directory_id TEXT REFERENCES directories(id),
  directory_type TEXT NOT NULL,   -- fleeting_default | literature_default | original_default | custom
  title TEXT NOT NULL,
  fs_path TEXT NOT NULL,
  is_default INTEGER NOT NULL,    -- 0/1
  is_hidden INTEGER NOT NULL DEFAULT 0,
  max_notes INTEGER NOT NULL DEFAULT 500,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_directories_parent ON directories(parent_directory_id);
CREATE INDEX idx_directories_type ON directories(directory_type);
```

规则：

- 默认三目录不可误删。
- 子目录支持隐藏/删除。
- 新建目录必须记录 `fs_path`（来源于系统目录选择器）。

## 3.2 notes

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  note_type TEXT NOT NULL,        -- fleeting | literature | permanent | project
  title TEXT,
  status TEXT NOT NULL,
  markdown_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_notes_type_status ON notes(note_type, status);
```

规则：

- `title` 由 Markdown 第一行解析并同步。

## 3.3 note_directory_membership

```sql
CREATE TABLE note_directory_membership (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id),
  directory_id TEXT NOT NULL REFERENCES directories(id),
  created_at TEXT NOT NULL,
  UNIQUE(note_id, directory_id)
);
CREATE INDEX idx_note_directory_dir ON note_directory_membership(directory_id, note_id);
```

## 3.4 fleeting_note_meta（随笔记录）

```sql
CREATE TABLE fleeting_note_meta (
  note_id TEXT PRIMARY KEY REFERENCES notes(id),
  content_text TEXT,
  voice_asset_path TEXT,
  source_hint TEXT,
  is_new INTEGER NOT NULL DEFAULT 1,
  archived_at TEXT,
  converted_to_note_id TEXT
);
```

规则：

- `content_text` 与 `voice_asset_path` 至少一个非空。
- 超过 7 天隐藏由查询层按 `created_at` + 状态实现。
- 可转换为书摘或原创，转换后原随笔归档。

## 3.5 literature_note_meta（书摘笔记）

```sql
CREATE TABLE literature_note_meta (
  note_id TEXT PRIMARY KEY REFERENCES notes(id),
  author_name TEXT NOT NULL,
  publish_year TEXT NOT NULL,
  book_title TEXT NOT NULL,
  publisher TEXT NOT NULL,
  page_locator TEXT NOT NULL,
  edition_info TEXT,
  translator_or_editor TEXT,
  quote_text TEXT NOT NULL,
  paraphrase_text TEXT NOT NULL,
  user_question TEXT,
  topic_candidates_json TEXT,
  linked_permanent_note_ids_json TEXT
);
```

规则：

- 书摘笔记可长期独立存在。
- 从书摘新增原创后，书摘不自动归档，仅新增关联。

## 3.6 permanent_note_meta（原创笔记）

```sql
CREATE TABLE permanent_note_meta (
  note_id TEXT PRIMARY KEY REFERENCES notes(id),
  core_claim TEXT NOT NULL,
  rationale TEXT NOT NULL,
  boundary_or_counterpoint TEXT,
  originality_status TEXT NOT NULL,       -- pass | warning | blocked
  originality_similarity REAL,
  user_confirmed INTEGER NOT NULL,        -- 0/1
  ai_assisted INTEGER NOT NULL            -- 0/1
);
CREATE INDEX idx_perm_originality_status ON permanent_note_meta(originality_status);
CREATE INDEX idx_perm_originality_sim ON permanent_note_meta(originality_similarity);
```

规则：

- 相似度 `>= 0.8` 时必须标记 `blocked`，并禁止保存 Markdown 文件。

## 3.7 links（显式关系）

```sql
CREATE TABLE links (
  id TEXT PRIMARY KEY,
  from_note_id TEXT NOT NULL REFERENCES notes(id),
  to_note_id TEXT NOT NULL REFERENCES notes(id),
  relation_type TEXT NOT NULL,
  rationale TEXT,
  created_by TEXT NOT NULL,               -- user | ai_suggestion | import
  confidence REAL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_links_from ON links(from_note_id);
CREATE INDEX idx_links_to ON links(to_note_id);
CREATE UNIQUE INDEX idx_links_unique ON links(from_note_id, to_note_id, relation_type);
```

规则：

- 正文显示 `[[标题]]`，保存时解析为 `from_note_id -> to_note_id`。
- 重名标题必须通过候选选择绑定确定 `to_note_id`。

## 3.8 tags / note_tags

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE note_tags (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id),
  tag_id TEXT NOT NULL REFERENCES tags(id),
  source TEXT NOT NULL DEFAULT 'markdown_body',
  created_at TEXT NOT NULL,
  UNIQUE(note_id, tag_id)
);
CREATE INDEX idx_note_tags_note ON note_tags(note_id);
CREATE INDEX idx_note_tags_tag ON note_tags(tag_id);
```

规则：

- 标签来源于正文 `#标签` 解析。

## 3.9 index_cards / index_items

```sql
CREATE TABLE index_cards (
  id TEXT PRIMARY KEY,
  directory_id TEXT NOT NULL REFERENCES directories(id),
  index_type TEXT NOT NULL,               -- topic | nearby | logic_chain | free_link
  title TEXT NOT NULL,
  summary TEXT,
  ordering_strategy TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE index_items (
  id TEXT PRIMARY KEY,
  index_id TEXT NOT NULL REFERENCES index_cards(id),
  note_id TEXT NOT NULL REFERENCES notes(id),
  short_label TEXT,
  rationale TEXT,
  order_no INTEGER NOT NULL
);
CREATE INDEX idx_index_items_order ON index_items(index_id, order_no);
```

## 3.10 writing_projects / writing_basket_items

```sql
CREATE TABLE writing_projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  goal TEXT,
  audience TEXT,
  tone TEXT,
  status TEXT NOT NULL,
  scaffold_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE writing_basket_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES writing_projects(id),
  note_id TEXT NOT NULL REFERENCES notes(id),
  order_no INTEGER NOT NULL
);
CREATE INDEX idx_writing_basket_project_order ON writing_basket_items(project_id, order_no);
```

约束（服务层）：

- 添加写作篮时，`note_id` 必须属于原创目录且 `note_type = permanent`。

## 3.11 reminder_state（索引整理提醒）

```sql
CREATE TABLE reminder_state (
  id TEXT PRIMARY KEY,
  directory_id TEXT NOT NULL REFERENCES directories(id),
  reminder_type TEXT NOT NULL,            -- index_organize_every_15
  last_trigger_note_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TEXT
);
CREATE UNIQUE INDEX idx_reminder_unique ON reminder_state(directory_id, reminder_type);
```

---

## 4. graph-cache.db

```sql
CREATE TABLE subgraph_snapshots (
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
CREATE INDEX idx_subgraph_center ON subgraph_snapshots(center_note_id, updated_at DESC);
CREATE INDEX idx_subgraph_directory ON subgraph_snapshots(directory_id, updated_at DESC);
```

默认策略：

- MVP 仅缓存当前目录范围子图。
- 不在首页渲染全局全量图。

---

## 5. vectors.db

```sql
CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  object_type TEXT NOT NULL,              -- note | index_card | literature_summary
  object_id TEXT NOT NULL,
  model TEXT NOT NULL,
  vector BLOB NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_embeddings_object ON embeddings(object_type, object_id);
```

---

## 6. 一致性规则

1. Markdown 与 SQLite 必须双向同步。
2. 删除缓存不影响主内容，可重建。
3. 导入必须先预览再确认，并生成 ImportRecord。
4. 不覆盖用户二次编辑内容。
5. 所有转换关系必须可追溯：随笔 -> 书摘/原创，书摘 -> 原创。
