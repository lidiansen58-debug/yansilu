# 连接器 MVP 契约（v1.0）

## 1. 目标与范围

本契约定义研思录与外部笔记/资料系统在 v1.0 的接口边界。

v1.0 发布门槛仅支持：

- 单次导入（one-shot import）
- 单次导出（one-shot export）

不包含：

- 双向实时同步
- 自动增量同步
- 无确认自动写入

## 2. 支持的连接器与阶段顺序

### 2.1 v1.0 / Phase 1 发布门槛

- Markdown
- Obsidian

导出连接器：

- Markdown（优先保证 Obsidian 兼容）

### 2.2 Phase 2 计划

- Notion
- Readwise
- Zotero

### 2.3 Phase 3 计划

- Evernote
- Logseq
- Roam
- 评估 OneNote / Apple Notes

说明：

- 代码中若提前出现某些连接器的实验性实现，不自动等于该连接器已经成为当前发布承诺。
- 只有进入对应阶段并补齐统一的预览、确认、记录、回滚流程后，才算正式进入连接器范围。

## 3. 统一流程（导入）

所有导入必须遵循以下流程：

1. `解析`：读取外部文件或导出内容，转为内部候选对象
2. `预览`：展示将要创建/更新的对象统计与样例
3. `确认`：用户确认后才允许写入主内容
4. `落库`：写入 `notes/` + 结构索引
5. `记录`：生成 `ImportRecord` 和导入映射

约束：

- 任何导入都必须有 `ImportRecord`
- 任何导入都必须经过“预览 -> 确认”
- 默认不覆盖用户二次编辑内容

## 4. 数据边界

主内容来源：

- `notes/`（事实来源）

附件与中间文件：

- `assets/` 存放附件
- `imports/` 存放导入中间文件与日志

缓存与索引：

- `.yansilu/` 存放缓存、索引、配置
- `.yansilu/` 不是主内容来源

## 5. 连接器输入/输出契约

## 5.1 Markdown / Obsidian

输入：

- Markdown 文件或目录
- frontmatter（可选）
- wikilinks/tags/aliases（可选）

输出（候选）：

- Source（若可解析来源）
- LiteratureNote 候选
- PermanentNote 候选（仅候选，不自动设为 active）

特殊规则：

- 尽量保留 frontmatter 原字段
- 保留 wikilinks、tags、aliases 映射
- `aliases` / `alias` frontmatter 必须归一化为 `aliases: string[]`
- wikilink 必须同时保留原始内容与结构化解析结果：
  - `wikilinks: string[]`：去重后的原始内容，不含外层 `[[...]]`
  - `parsed_wikilinks: object[]`：包含 `raw`、`target`、`heading`、`block`、`alias`、`display`、`embed`
  - `wikilink_targets: string[]`：去重后的可解析目标；本页 heading 链接不进入该列表
- 必须支持 Obsidian 常见变体：`[[Target]]`、`[[Target|Alias]]`、`[[Target#Heading]]`、`[[Target#Heading^block|Alias]]`、`[[#Local Heading|Alias]]`、`![[Embedded.png]]`

## 5.2 Zotero

输入：

- 条目元数据
- note/annotation
- citation locator

输出（候选）：

- Source
- LiteratureNote 候选（含 locator）

特殊规则：

- 必须保留引用定位信息

## 5.3 Readwise

输入：

- highlights
- notes/tags
- source metadata

输出（候选）：

- Source
- LiteratureNote 候选

特殊规则：

- 导入后默认标记为“待转述材料”

## 5.4 NotebookLM

输入：

- notebook 导出 notes/reports/docs 文本

输出（候选）：

- Source
- LiteratureNote 候选

特殊规则：

- 保留 notebook 名称、来源和上下文
- 禁止直接生成永久笔记正文

## 6. API 契约（MVP）

导入：

- `POST /api/v1/imports/markdown`
- `POST /api/v1/imports/obsidian`
- `POST /api/v1/imports/zotero`
- `POST /api/v1/imports/readwise`
- `POST /api/v1/imports/notebooklm`

导入预览与确认（推荐统一）：

- `POST /api/v1/imports/preview`
- `GET /api/v1/imports/:id`
- `POST /api/v1/imports/:id/confirm`
- `POST /api/v1/imports/:id/rollback`

导出：

- `POST /api/v1/exports/markdown`

响应约定：

- 统一 JSON
- 错误码稳定
- 返回 `importRecordId` / `exportJobId`

## 7. 失败处理与回滚

导入失败处理：

- 记录错误原因
- 失败对象不进入 active 主内容
- 支持按 `importRecordId` 回滚本次导入

最小回滚粒度：

- 以“单次导入任务”为单位回滚

## 8. Definition of Done（连接器 MVP）

- 有导入预览
- 有确认步骤
- 有 ImportRecord
- 不覆盖用户二次编辑内容
- 可导出 Markdown
- 导入失败可定位并可回滚
- 当前发布门槛只要求 Markdown / Obsidian 导入与 Markdown 导出满足以上标准

## 9. 非目标（v1.0 不做）

- 自动增量同步
- 冲突自动合并
- 双向实时同步
- 外部系统写回（除 Markdown 导出）
