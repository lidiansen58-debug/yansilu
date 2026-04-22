# API 说明（占位）

## 当前实现真相表（2026-04-23）

以下路由已在 `apps/api/src/server.mjs` 实现并有自动化测试覆盖：

- `GET /health`
- `GET /api/v1/directories`
- `POST /api/v1/directories`
- `PATCH /api/v1/directories/:id`
- `DELETE /api/v1/directories/:id`
- `GET /api/v1/directories/:id/notes`
- `POST /api/v1/notes`
- `GET /api/v1/notes/:id`
- `PUT /api/v1/notes/:id`
- `POST /api/v1/notes/:id/move`
- `DELETE /api/v1/notes/:id`
- `POST /api/v1/imports/preview`
- `POST /api/v1/imports/:connector` (`markdown|obsidian|zotero|readwise|notebooklm`)
- `GET /api/v1/imports/:id`
- `POST /api/v1/imports/:id/confirm`
- `POST /api/v1/imports/:id/rollback`
- `POST /api/v1/originality/check`
- `POST /api/v1/exports/markdown`

以下仍属于规划接口（本文档后续章节中的部分内容），当前代码尚未实现：

- `/api/v1/notes/fleeting|literature|permanent` 分类型写入接口
- `/api/v1/index-cards` 与 `/api/v1/links` 系列
- `/api/v1/graph/*` 图谱系列
- `/api/v1/writing-projects` 与 `/api/v1/draft-scaffolds` 系列

使用建议：

1. 若要联调前后端，请优先以上面“当前实现真相表”为准。
2. 若要推进规划接口，请先更新契约并标注为 `planned`，避免与已实现路由混淆。

P0 API 建议资源：
- /fleeting-notes
- /sources
- /literature-notes
- /permanent-notes
- /index-cards
- /links
- /writing-projects
- /draft-scaffolds
- /imports

后续补充：
- 请求/响应 JSON 示例
- 错误码
- 幂等与分页策略

## 连接器 MVP（已确认）

导入接口：
- `POST /api/v1/imports/markdown`
- `POST /api/v1/imports/obsidian`
- `POST /api/v1/imports/zotero`
- `POST /api/v1/imports/readwise`
- `POST /api/v1/imports/notebooklm`

统一流程：
- `POST /api/v1/imports/preview`
- `GET /api/v1/imports/:id`
- `POST /api/v1/imports/:id/confirm`
- `POST /api/v1/imports/:id/rollback`
- `POST /api/v1/originality/check`

导出接口：
- `POST /api/v1/exports/markdown`

约束：
- 导入必须 `预览 -> 确认 -> 落库`
- 必须生成 `ImportRecord`
- 默认不覆盖用户二次编辑内容
- 支持 `originalityPlan`（预览与确认阶段）

## 笔记 CRUD 与转换接口（P0）

笔记对象 CRUD（统一）：

- `POST /api/v1/notes/fleeting`
- `POST /api/v1/notes/literature`
- `POST /api/v1/notes/permanent`
- `GET /api/v1/notes/:id`
- `PATCH /api/v1/notes/:id`
- `DELETE /api/v1/notes/:id`
- `GET /api/v1/notes?type=fleeting|literature|permanent|project&page=1&pageSize=20`

随笔记转换：

- `POST /api/v1/notes/fleeting/:id/convert`

转换请求示例：

```json
{
  "targetType": "permanent_note",
  "mode": "create_new",
  "preserveSourceTrace": true
}
```

转换响应示例（200）：

```json
{
  "sourceFleetingId": "fn_001",
  "targetType": "permanent_note",
  "targetId": "pn_122",
  "status": "converted",
  "convertedAt": "2026-04-14T15:00:00+08:00"
}
```

## 图谱交互接口（10k 永久笔记）

默认局部图优先：

- `GET /api/v1/graph/local?center=pn_001&depth=1&limit=120`

邻居渐进展开：

- `GET /api/v1/graph/neighbors?center=pn_001&hop=2&cursor=...`

路径高亮：

- `GET /api/v1/graph/path?from=pn_001&to=pn_701`

过滤查询：

- `GET /api/v1/graph/filter?center=pn_001&depth=2&relation=supports&tag=writing`

## 图谱与索引服务（MVP 已实现）

### 1) IndexCard

- `POST /api/v1/index-cards`（兼容：`POST /api/v1/indexes`）
- `GET /api/v1/index-cards`（兼容：`GET /api/v1/indexes`）
- `GET /api/v1/index-cards/:id`（兼容：`GET /api/v1/indexes/:id`）

说明：
- `indexType`：`topic | nearby | logic_chain | free_link`
- `free_link` 必须提供 `description/rationale`
- `noteIds` 至少包含 1 个永久笔记 ID

### 2) Link

- `POST /api/v1/links`
- `GET /api/v1/links?from=...&to=...&relation=...&page=1&pageSize=20`
- `DELETE /api/v1/links/:id`

说明：
- `relationType`：`supports | contradicts | extends | questions | references`
- 同一 `from + to + relationType` 组合不可重复创建

### 3) 图谱服务

本地图：
- `GET /api/v1/graph/local?center=pn_001&depth=2&limit=120&relation=all`

主题图：
- `GET /api/v1/graph/topic?indexId=idx_001&depth=1&limit=120`

写作图：
- `GET /api/v1/graph/writing?noteIds=pn_001,pn_002&depth=1&limit=120`

### 4) 路径与冲突接口

路径：
- `GET /api/v1/graph/path?from=pn_001&to=pn_701&relation=all`

冲突：
- `GET /api/v1/graph/conflicts?center=pn_001&depth=2`

说明：
- 冲突接口返回 `relation_type=contradicts` 的边与涉及节点，可用于“论证冲突面板”。

## 导入预览/确认 API 示例（MVP）

## 1. 预览导入

`POST /api/v1/imports/preview`

说明：

- 输入一个连接器和原始载荷（文件路径、导出 JSON 或解析参数）
- 仅解析，不落库主内容
- 返回候选统计、样例和 `importRecordId`
- 完整候选对象写入 `imports/{connector}/{importRecordId}.preview.json`，用于确认、调试与回放

请求示例：

```json
{
  "connector": "obsidian",
  "payload": {
    "path": "D:/notes-vault",
    "includeAttachments": true
  },
  "options": {
    "detectWikilinks": true,
    "detectAliases": true
  }
}
```

响应示例（200）：

```json
{
  "importRecordId": "imp_20260414_001",
  "status": "preview",
  "summary": {
    "sources": 128,
    "literatureNotes": 93,
    "permanentNotes": 21,
    "attachments": 54,
    "warnings": 7
  },
  "samples": {
    "sourceIds": ["src_001", "src_002"],
    "literatureNoteIds": ["ln_001", "ln_002"],
    "permanentNoteIds": ["pn_001"]
  },
  "warnings": [
    {
      "code": "IMPORT_MISSING_LOCATOR",
      "message": "部分条目缺少 locator，已降级为待补全候选。",
      "count": 5
    },
    {
      "code": "IMPORT_UNSUPPORTED_FRONTMATTER_KEY",
      "message": "发现未支持的 frontmatter 字段，已放入扩展字段。",
      "count": 2
    }
  ],
  "createdAt": "2026-04-14T10:20:00+08:00"
}
```

Markdown / Obsidian 候选字段：

`Source` 候选可包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| aliases | string[] | 从 `aliases` / `alias` frontmatter 解析出的 Obsidian 别名 |
| original_frontmatter | object | 原始 frontmatter 字段映射，未知字段必须保留 |

`LiteratureNote` 候选可包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| aliases | string[] | 从 `aliases` / `alias` frontmatter 解析出的 Obsidian 别名 |
| wikilinks | string[] | 去重后的原始 wikilink 内容，不含外层 `[[...]]`；如 `Target#Heading|Alias` |
| parsed_wikilinks | object[] | 结构化 wikilink 列表 |
| wikilink_targets | string[] | 去重后的可解析目标笔记或资源名；本页 heading 链接不进入该列表 |
| original_frontmatter | object | 原始 frontmatter 字段映射，未知字段必须保留 |

`parsed_wikilinks[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| raw | string | 原始 wikilink 内容，不含外层 `[[...]]` |
| target | string \| null | 目标笔记或资源名；`[[#Heading]]` 为 `null` |
| heading | string \| null | `#` 后的 heading |
| block | string \| null | `^` 后的 block id |
| alias | string \| null | `|` 后的显示别名 |
| display | string \| null | 当前等同于 `alias`，预留给显示名策略 |
| embed | boolean | 是否来自 `![[...]]` |

示例：

```json
{
  "aliases": ["First alias", "Second alias"],
  "wikilinks": [
    "Target Note|Readable title",
    "Target Note#Section^block-id|Block title",
    "#Local heading|Local title",
    "Image.png"
  ],
  "parsed_wikilinks": [
    {
      "raw": "Target Note#Section^block-id|Block title",
      "target": "Target Note",
      "heading": "Section",
      "block": "block-id",
      "alias": "Block title",
      "display": "Block title",
      "embed": false
    }
  ],
  "wikilink_targets": ["Target Note", "Image.png"]
}
```

## 2. 确认导入

`POST /api/v1/imports/:id/confirm`

说明：

- 对预览结果进行确认后写入 `notes/` 与结构索引
- 默认不覆盖用户二次编辑内容

请求示例：

```json
{
  "confirm": true,
  "writeMode": "non_destructive",
  "originalityPlan": {
    "warnThreshold": 0.6,
    "blockThreshold": 0.8,
    "requireCitationLocator": true,
    "allowDraftOnWarning": true,
    "blockOnBlocked": true
  },
  "createAs": {
    "literature": true,
    "permanent": "candidate_only"
  }
}
```

响应示例（200）：

```json
{
  "importRecordId": "imp_20260414_001",
  "status": "completed",
  "result": {
    "created": {
      "sources": 128,
      "literatureNotes": 93,
      "permanentNotes": 21
    },
    "skipped": {
      "conflicted": 4,
      "invalid": 2
    },
    "writtenPaths": [
      "yansilu-vault/notes/literature/",
      "yansilu-vault/notes/permanent/",
      "yansilu-vault/imports/obsidian/"
    ]
  },
  "finishedAt": "2026-04-14T10:23:00+08:00"
}
```

## 3. 取消确认（不落库）

`POST /api/v1/imports/:id/confirm`

请求示例：

```json
{
  "confirm": false
}
```

响应示例（200）：

```json
{
  "importRecordId": "imp_20260414_001",
  "status": "cancelled",
  "message": "导入已取消，未写入主内容。"
}
```

## 3.1 查询导入记录

`GET /api/v1/imports/:id`

说明：

- 返回一次导入的状态、统计、警告、原创性检查结果、确认结果与回滚结果
- `status/state` 枚举：`preview`、`cancelled`、`completed`、`rolled_back`
- `preview`：候选已生成但尚未写入 vault，`confirmResult` 与 `rollbackResult` 均为 `null`
- `completed`：确认已写入 vault，`confirmResult` 必须包含 `created`、`skipped`、`writtenPaths`、`createdFiles`、`finishedAt`
- `rolled_back`：本次导入已执行回滚，`rollbackResult` 必须包含 `rolledBack`、`skipped`、`finishedAt`
- `confirmResult.createdFiles` 只记录本次确认实际创建的文件，用于安全回滚；`rollbackResult.rolledBack/skipped` 复用该文件条目结构，`skipped` 额外包含 `reason`

状态字段契约：

| 状态 | `confirmResult` | `rollbackResult` | 说明 |
| --- | --- | --- | --- |
| `preview` | `null` | `null` | 仅生成预览与候选统计，不写入主内容 |
| `completed` | object | `null` | 已确认写入，允许继续调用 rollback |
| `rolled_back` | object | object | 已按 `createdFiles` 尝试删除本次创建的文件 |

响应示例（200，`preview`）：

```json
{
  "importRecord": {
    "importRecordId": "imp_20260414_001",
    "connector": "obsidian",
    "status": "preview",
    "state": "preview",
    "summary": {
      "sources": 1,
      "literatureNotes": 1,
      "permanentNotes": 0,
      "warnings": 0
    },
    "warnings": [],
    "confirmResult": null,
    "rollbackResult": null,
    "createdAt": "2026-04-14T10:20:00+08:00",
    "updatedAt": "2026-04-14T10:20:00+08:00"
  }
}
```

响应示例（200，`completed`）：

```json
{
  "importRecord": {
    "importRecordId": "imp_20260414_001",
    "connector": "obsidian",
    "status": "completed",
    "state": "completed",
    "summary": {
      "sources": 1,
      "literatureNotes": 1,
      "permanentNotes": 0,
      "warnings": 0
    },
    "warnings": [],
    "confirmResult": {
      "created": {
        "sources": 1,
        "literatureNotes": 1,
        "permanentNotes": 0
      },
      "skipped": {
        "conflicted": 0,
        "invalid": 0
      },
      "writtenPaths": ["notes/sources", "notes/literature"],
      "createdFiles": [
        {
          "noteId": "src_abc",
          "noteType": "source",
          "path": "notes/sources/src_abc.md",
          "hash": "sha1..."
        }
      ],
      "finishedAt": "2026-04-14T10:23:00+08:00"
    },
    "rollbackResult": null,
    "createdAt": "2026-04-14T10:20:00+08:00",
    "updatedAt": "2026-04-14T10:23:00+08:00"
  }
}
```

响应示例（200，`rolled_back`）：

```json
{
  "importRecord": {
    "importRecordId": "imp_20260414_001",
    "connector": "obsidian",
    "status": "rolled_back",
    "state": "rolled_back",
    "summary": {
      "sources": 1,
      "literatureNotes": 1,
      "permanentNotes": 0,
      "warnings": 0
    },
    "warnings": [],
    "confirmResult": {
      "created": {
        "sources": 1,
        "literatureNotes": 1,
        "permanentNotes": 0
      },
      "skipped": {
        "conflicted": 0,
        "invalid": 0
      },
      "writtenPaths": ["notes/sources", "notes/literature"],
      "createdFiles": [
        {
          "noteId": "src_abc",
          "noteType": "source",
          "path": "notes/sources/src_abc.md",
          "hash": "sha1..."
        }
      ],
      "finishedAt": "2026-04-14T10:23:00+08:00"
    },
    "rollbackResult": {
      "rolledBack": [
        {
          "noteId": "src_abc",
          "noteType": "source",
          "path": "notes/sources/src_abc.md",
          "hash": "sha1..."
        }
      ],
      "skipped": [],
      "finishedAt": "2026-04-14T10:30:00+08:00"
    },
    "createdAt": "2026-04-14T10:20:00+08:00",
    "updatedAt": "2026-04-14T10:30:00+08:00"
  }
}
```

## 3.2 回滚导入

`POST /api/v1/imports/:id/rollback`

说明：

- 仅允许回滚 `completed` 状态的导入
- 只删除 `confirmResult.createdFiles` 中记录的本次创建文件
- 删除前会校验当前文件 hash；如果用户确认后修改过文件，则跳过并返回 `reason=modified`

响应示例（200）：

```json
{
  "importRecordId": "imp_20260414_001",
  "status": "rolled_back",
  "result": {
    "rolledBack": 2,
    "skipped": 1,
    "rolledBackPaths": [
      "notes/sources/src_abc.md",
      "notes/literature/ln_abc.md"
    ],
    "skippedFiles": [
      {
        "noteId": "ln_modified",
        "noteType": "literature",
        "path": "notes/literature/ln_modified.md",
        "reason": "modified"
      }
    ]
  },
  "finishedAt": "2026-04-14T10:30:00+08:00"
}
```

## 3.3 原创性计划（originalityPlan）

可在 `POST /api/v1/imports/preview` 的 `options.originalityPlan` 传入，或在 `POST /api/v1/imports/:id/confirm` 的请求体传入覆盖。

字段：

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| warnThreshold | number | `0.6` | 达到后标记 `warning` |
| blockThreshold | number | `0.8` | 达到后标记 `blocked` |
| requireCitationLocator | boolean | `true` | 缺少 locator 至少 `warning` |
| allowDraftOnWarning | boolean | `true` | warning 是否允许保存 draft |
| blockOnBlocked | boolean | `true` | confirm 阶段是否硬阻断 |

当 `blockOnBlocked=true` 且存在 blocked 候选时，`confirm` 返回 `409`：
- `error.code = IMPORT_ORIGINALITY_BLOCKED`
- `error.details.blockedPermanentIds` 返回被阻断的永久笔记候选 ID

当 `allowDraftOnWarning=false` 时：
- `warning` 候选在确认导入时会被跳过（计入 `result.skipped.invalid`）

若业务上需要人工放行，可在确认时传：

```json
{
  "confirm": true,
  "overrideOriginality": true
}
```

独立检测接口（不导入）：

`POST /api/v1/originality/check`

请求示例：

```json
{
  "originalityPlan": {
    "warnThreshold": 0.6,
    "blockThreshold": 0.8
  },
  "literature": [
    { "source_id": "src_001", "quote_text": "..." }
  ],
  "permanent": [
    {
      "id": "pn_001",
      "core_claim": "...",
      "citations": [{ "source_id": "src_001", "locator": "p.12" }]
    }
  ]
}
```

## 4. 导出 Markdown

`POST /api/v1/exports/markdown`

请求示例：

```json
{
  "scope": "project",
  "projectId": "wp_001",
  "targetPath": "D:/exports/yansilu-2026-04-14",
  "compatibility": "obsidian"
}
```

响应示例（202）：

```json
{
  "exportJobId": "exp_20260414_001",
  "status": "queued"
}
```

## 5. 最小错误码约定（MVP）

- `IMPORT_RECORD_NOT_FOUND`：导入记录不存在
- `IMPORT_STATUS_INVALID`：当前状态不允许执行该操作
- `IMPORT_PREVIEW_REQUIRED`：未预览不能确认
- `IMPORT_CONFIRM_REQUIRED`：需要显式确认
- `IMPORT_WRITE_CONFLICT`：写入冲突（默认跳过不覆盖）
- `IMPORT_PAYLOAD_INVALID`：请求参数不合法
- `EXPORT_SCOPE_INVALID`：导出范围非法
- `INTERNAL_ERROR`：内部错误

## 6. 字段级约束表（MVP）

## 6.1 `POST /api/v1/imports/preview`

请求字段：

| 字段 | 类型 | 必填 | 默认值 | 约束 |
|---|---|---|---|---|
| connector | string | 是 | - | 枚举：`markdown` `obsidian` `zotero` `readwise` `notebooklm` |
| payload | object | 是 | - | 与连接器类型绑定 |
| payload.path | string | 否 | - | 本地路径，`markdown/obsidian` 推荐提供 |
| payload.includeAttachments | boolean | 否 | `false` | 是否纳入附件扫描 |
| options | object | 否 | `{}` | 解析选项 |
| options.detectWikilinks | boolean | 否 | `true` | 仅 `markdown/obsidian` 生效 |
| options.detectAliases | boolean | 否 | `true` | 仅 `markdown/obsidian` 生效 |

响应字段（200）：

| 字段 | 类型 | 必有 | 说明 |
|---|---|---|---|
| importRecordId | string | 是 | 导入记录 ID |
| status | string | 是 | 固定为 `preview` |
| summary | object | 是 | 预览统计 |
| summary.sources | number | 是 | 预计创建 Source 数 |
| summary.literatureNotes | number | 是 | 预计创建 LiteratureNote 数 |
| summary.permanentNotes | number | 是 | 预计创建 PermanentNote 候选数 |
| summary.attachments | number | 否 | 预计扫描附件数 |
| summary.warnings | number | 是 | 警告数量 |
| samples | object | 否 | 样例 ID 列表 |
| warnings | array | 否 | 预览警告列表 |
| originalityGuard | object | 否 | 原创性检查计划、评估与 blocked/warning 候选 |
| createdAt | string | 是 | ISO 时间 |

## 6.2 `POST /api/v1/imports/:id/confirm`

请求字段：

| 字段 | 类型 | 必填 | 默认值 | 约束 |
|---|---|---|---|---|
| confirm | boolean | 是 | - | `true` 执行写入，`false` 取消导入 |
| writeMode | string | 否 | `non_destructive` | MVP 仅允许 `non_destructive` |
| createAs | object | 否 | `{}` | 对象创建策略 |
| createAs.literature | boolean | 否 | `true` | 是否创建文献笔记 |
| createAs.permanent | string | 否 | `candidate_only` | MVP 枚举：`candidate_only` |

响应字段（200，确认写入）：

| 字段 | 类型 | 必有 | 说明 |
|---|---|---|---|
| importRecordId | string | 是 | 导入记录 ID |
| status | string | 是 | 固定为 `completed` |
| result | object | 是 | 导入结果统计 |
| result.created | object | 是 | 创建数量 |
| result.skipped | object | 否 | 跳过数量 |
| result.writtenPaths | string[] | 否 | 实际写入目录 |
| finishedAt | string | 是 | ISO 时间 |

响应字段（200，取消导入）：

| 字段 | 类型 | 必有 | 说明 |
|---|---|---|---|
| importRecordId | string | 是 | 导入记录 ID |
| status | string | 是 | 固定为 `cancelled` |
| message | string | 是 | 取消说明 |

## 6.3 `POST /api/v1/exports/markdown`

请求字段：

| 字段 | 类型 | 必填 | 默认值 | 约束 |
|---|---|---|---|---|
| scope | string | 是 | - | 枚举：`project` `notes` `index` |
| projectId | string | 条件必填 | - | `scope=project` 时必填 |
| noteIds | string[] | 条件必填 | - | `scope=notes` 时必填 |
| indexId | string | 条件必填 | - | `scope=index` 时必填 |
| targetPath | string | 是 | - | 本地导出目录 |
| compatibility | string | 否 | `obsidian` | MVP 枚举：`obsidian` `plain_markdown` |

响应字段（202）：

| 字段 | 类型 | 必有 | 说明 |
|---|---|---|---|
| exportJobId | string | 是 | 导出任务 ID |
| status | string | 是 | 固定为 `queued` |

## 6.4 通用字段规范

- 所有时间字段使用 ISO 8601 字符串
- 所有 ID 字段使用字符串（建议 `ulid` 或 `uuidv7`）
- 未知字段默认拒绝（`additionalProperties=false`）
- 错误响应统一包含：`code`、`message`、`requestId`

## 6.5 永久笔记关联（Obsidian 风格）接口草案

用于承接编辑器中的 `[[wikilink]]` 输入、关系标注与反向链接查询。

推荐接口：

- `GET /api/v1/notes/suggest-links?q=...&limit=20&cursor=...`
- `POST /api/v1/notes/:id/links:sync-from-content`
- `GET /api/v1/notes/:id/backlinks?groupBy=mention|relation`
- `GET /api/v1/tags/suggest?q=...&boxId=...&noteType=permanent&limit=20`
- `GET /api/v1/tags/:tag/notes?boxId=...&noteType=permanent&page=1&pageSize=20&sortBy=updatedAt&sortOrder=desc`

说明：

1. `suggest-links`：用于 `[[` 触发后的联想候选，支持标题/别名/标签/索引检索。
2. `links:sync-from-content`：将正文中的 `[[...]]` 解析为显式 `Link` 对象并增量同步。
3. `backlinks`：返回反向链接，至少支持“提及 / 明确关系”分组。
4. 当关系类型为 `free_link` 且缺失 `rationale` 时，返回 `422`。
5. 标签相关接口默认要求 `boxId`，用于限制在当前卡片盒范围内检索。

`POST /api/v1/notes/:id/links:sync-from-content` 请求示例：

```json
{
  "content": "...... [[pn_001]] ......",
  "linkAnnotations": [
    {
      "targetNoteId": "pn_001",
      "relationType": "supports",
      "rationale": "该观点作为论证前提"
    }
  ]
}
```

响应示例（200）：

```json
{
  "noteId": "pn_010",
  "parsedWikilinks": 3,
  "createdLinks": 2,
  "updatedLinks": 1,
  "skippedLinks": 0
}
```

`GET /api/v1/tags/:tag/notes` 响应示例（200）：

```json
{
  "tag": "写作",
  "boxId": "box_original_default",
  "items": [
    {
      "noteId": "pn_001",
      "title": "写作应从原创笔记中生长",
      "updatedAt": "2026-04-18T12:00:00+08:00"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

## 7. 统一错误响应与状态码规范

## 7.1 错误响应 JSON 结构

```json
{
  "error": {
    "code": "IMPORT_PAYLOAD_INVALID",
    "message": "connector=obsidian 时 payload.path 为必填字段。",
    "details": {
      "field": "payload.path",
      "reason": "required"
    }
  },
  "requestId": "req_20260414_001",
  "timestamp": "2026-04-14T11:00:00+08:00"
}
```

字段说明：

| 字段 | 类型 | 必有 | 说明 |
|---|---|---|---|
| error.code | string | 是 | 机器可读错误码 |
| error.message | string | 是 | 面向用户/开发者的错误说明 |
| error.details | object | 否 | 字段级诊断信息 |
| requestId | string | 是 | 请求追踪 ID |
| timestamp | string | 是 | 错误发生时间（ISO） |

## 7.2 推荐 HTTP 状态码映射

| HTTP 状态码 | 使用场景 |
|---|---|
| 200 | 同步成功（如 preview/confirm 结果） |
| 202 | 异步任务已受理（如 export queued） |
| 400 | 参数错误、状态非法（如未 preview 直接 confirm） |
| 404 | 资源不存在（如 importRecordId 不存在） |
| 409 | 写入冲突（non_destructive 模式下冲突） |
| 422 | 业务校验失败（结构合法但业务规则不满足） |
| 500 | 服务端内部错误 |

## 8. 分页规范（列表接口）

适用接口（示例）：`GET /api/v1/notes`、`GET /api/v1/imports`

请求参数：

| 参数 | 类型 | 必填 | 默认值 | 约束 |
|---|---|---|---|---|
| page | number | 否 | `1` | 最小 1 |
| pageSize | number | 否 | `20` | 建议 1..100 |
| sortBy | string | 否 | `updatedAt` | 由接口定义可选字段 |
| sortOrder | string | 否 | `desc` | `asc` / `desc` |

响应示例：

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  },
  "requestId": "req_20260414_002"
}
```

## 9. 幂等规范（写接口）

适用接口（示例）：

- `POST /api/v1/imports/preview`
- `POST /api/v1/imports/:id/confirm`
- `POST /api/v1/exports/markdown`

请求头：

- `Idempotency-Key`（推荐，客户端生成 UUID）

规则：

1. 同一个 `Idempotency-Key` + 同一路径 + 同一请求体，在幂等窗口内只执行一次。  
2. 重复请求返回首次结果（含相同状态码与主体）。  
3. 若请求体不同但 `Idempotency-Key` 相同，返回 `409` 与 `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD`。  
4. 幂等窗口建议 24 小时（MVP 可配置）。  

错误示例（409）：

```json
{
  "error": {
    "code": "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
    "message": "相同 Idempotency-Key 对应的请求体不一致。"
  },
  "requestId": "req_20260414_003",
  "timestamp": "2026-04-14T11:05:00+08:00"
}
```

## 10. 请求头约定（MVP）

| Header | 必填 | 说明 |
|---|---|---|
| Content-Type: application/json | 是 | 请求体格式 |
| X-Request-Id | 否 | 客户端透传追踪 ID，服务端可回显 |
| Idempotency-Key | 写接口推荐 | 防止重复提交 |
