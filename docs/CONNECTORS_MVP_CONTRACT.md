# 连接器 MVP 契约（当前版）

更新日期：2026-06-03

## 1. 当前范围

本契约描述当前代码库里真正受支持的导入导出能力。

当前发布门槛仅支持：

- 单次导入（one-shot import）
- 单次导出（one-shot export）
- `Obsidian` 预览后确认导入
- `Markdown` 导出

当前明确不支持：

- Markdown 导入
- Readwise / Zotero / Notion 导入
- 导入历史持久化
- 导入回滚
- 双向实时同步
- 自动增量同步
- 无确认自动写入

## 2. 连接器阶段

### 2.1 当前发布门槛

导入连接器：

- Obsidian

导出连接器：

- Markdown（优先保证 Obsidian vault 可直接消费）

### 2.2 规划中的后续连接器

以下来源目前只属于后续规划，不属于当前产品承诺：

- Markdown 导入
- Notion
- Readwise
- Zotero
- Evernote
- Logseq
- Roam
- OneNote / Apple Notes（待评估）

说明：

- 代码里若出现实验性解析器或占位接口，不代表已经进入当前发布范围。
- 新连接器只有在补齐自己的最小预览/确认体验，并被现行文档显式纳入后，才算正式支持。

## 3. 当前统一流程（导入）

当前所有正式支持的导入都必须遵循以下流程：

1. `解析`：读取 Obsidian vault 内容，生成内部候选对象
2. `预览`：返回将要创建的对象统计、警告和样例
3. `确认`：用户确认后才允许写入主内容
4. `写入`：写入 `notes/` 结构和必要的资源文件

约束：

- 任何导入都必须经过“预览 -> 确认”
- 当前导入不会生成持久化导入历史
- 当前不提供回滚
- 默认不覆盖用户二次编辑内容

## 4. 数据边界

主内容来源：

- `notes/`

附件与导入资源：

- `assets/` 存放导入附件和嵌入资源

缓存与索引：

- `.yansilu/` 存放缓存、索引、配置
- `.yansilu/` 不是主内容来源

## 5. 当前输入/输出契约

### 5.1 Obsidian

输入：

- Obsidian vault 目录
- Markdown 文件
- frontmatter（可选）
- wikilinks / tags / aliases（可选）
- 嵌入图片或附件（可选）

输出（候选）：

- Source
- LiteratureNote 候选
- PermanentNote 候选

特殊规则：

- 尽量保留 frontmatter 原字段
- 保留 wikilinks、tags、aliases 映射
- `aliases` / `alias` frontmatter 归一化为 `aliases: string[]`
- 支持 Obsidian 常见 wikilink 变体与嵌入资源复制
- 导入资源复制到 vault 内可消费的 `assets/imports/...` 路径

## 6. API 契约（当前版）

导入：

- `POST /api/v1/imports/preview`
- `GET /api/v1/imports`
- `GET /api/v1/imports/:id`
- `POST /api/v1/imports/:id/confirm`

导出：

- `POST /api/v1/exports/markdown`

当前导入请求要求：

- `connector` 必须为 `obsidian`

响应约定：

- 统一 JSON
- 错误码稳定
- 导入使用会话内 `importId`
- 导出返回 `exportJobId`

## 7. 失败处理

导入失败处理：

- 返回稳定错误码和人类可读消息
- 失败对象不进入 active 主内容
- 预览阶段发现的问题尽量以前置 warning / blocked 原因体现

当前不支持：

- 按 `importId` 回滚
- 导入历史恢复

## 8. Definition of Done（当前简化版）

- 有导入预览
- 有确认步骤
- 仅支持 Obsidian 导入
- 可导出 Markdown
- 不覆盖用户二次编辑内容
- 导入失败可定位

## 9. Legacy Note

如果你在其他旧文档里看到 `Markdown 导入`、`ImportRecord`、`rollback`、`Readwise` 或 `Zotero` 被当成当前能力，请以本文和 `docs/API.md` 为准。那些内容属于旧设计或未来规划，不再代表当前实现边界。
