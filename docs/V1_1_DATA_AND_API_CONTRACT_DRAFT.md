# 研思录 V1.1 数据模型与 API Contract 草案

## 1. 文档目标

本文档用于把 V1.1 的可执行需求继续下沉到数据模型和 API contract 层。

它是规划草案，不代表当前 API 已经实现。
当前已实现 API 仍以 [API.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/API.md) 为准。

本文档解决的问题：

1. V1.1 需要哪些字段？
2. 哪些状态必须显式建模？
3. 哪些 API 可以支持提纯主链路？
4. AI 候选如何保存、确认和拒绝？
5. 哪些保存语义必须禁止？

---

## 2. V1.1 数据设计原则

## 2.1 提纯字段是高密度语义字段

`thesis`、`three_line_summary`、`central_question`、`intent` 不是普通备注。

它们代表用户对笔记、主题或写作目标的压缩理解。

因此，它们必须支持：

1. 草稿态
2. 确认态
3. 用户确认记录
4. AI 候选来源记录

## 2.2 AI 候选和用户确认字段必须分离

AI 生成内容不能直接等同于用户确认内容。

建议区分：

1. `suggestion`
2. `draft`
3. `confirmed`

## 2.3 Markdown 与 SQLite 继续双轨

建议：

1. Markdown frontmatter 保存用户确认后的核心字段
2. SQLite 保存结构化状态、队列、候选、审计信息
3. AI 候选可以仅存 SQLite，除非用户确认

---

## 3. 核心枚举

## 3.1 DistillationStatus

```ts
type DistillationStatus = "missing" | "draft" | "confirmed";
```

含义：

| 状态 | 含义 |
|---|---|
| `missing` | 尚未形成提纯字段 |
| `draft` | 已有草稿，但用户尚未确认 |
| `confirmed` | 用户确认该字段代表自己的判断 |

## 3.2 SuggestionStatus

```ts
type SuggestionStatus =
  | "suggested"
  | "adopted_as_draft"
  | "edited"
  | "confirmed"
  | "rejected"
  | "regenerated";
```

含义：

| 状态 | 含义 |
|---|---|
| `suggested` | AI 已生成候选，但未进入字段 |
| `adopted_as_draft` | 用户采纳为草稿 |
| `edited` | 用户已改写 |
| `confirmed` | 用户确认进入正式字段 |
| `rejected` | 用户拒绝 |
| `regenerated` | 用户请求换一版 |

## 3.3 SuggestionType

```ts
type SuggestionType =
  | "permanent_note_distillation"
  | "index_card_distillation"
  | "writing_intent"
  | "quality_check";
```

---

## 4. PermanentNote V1.1 字段

现有 `permanent_note_meta` 已有：

1. `thesis`
2. `three_line_summary_json`
3. `distillation_status`
4. `boundary_or_counterpoint`

V1.1 建议补充语义规则：

```ts
interface PermanentNoteDistillation {
  note_id: string;
  thesis?: string;
  three_line_summary?: [string, string, string];
  distillation_status: DistillationStatus;
  confirmed_at?: string;
  confirmed_by: "user";
  ai_assisted: boolean;
}
```

## 4.1 保存规则

1. `three_line_summary` 如存在，必须恰好 3 项。
2. `confirmed` 只能由用户动作触发。
3. AI 候选不能直接进入 `confirmed`。
4. 用户可以手写并保存为 `draft`。
5. 用户点击确认后，才进入 `confirmed`。

## 4.2 Frontmatter 建议

确认后的 Markdown frontmatter 可包含：

```yaml
thesis: "..."
three_line_summary:
  - "..."
  - "..."
  - "..."
distillation_status: confirmed
```

---

## 5. IndexCard V1.1 字段

现有 `index_cards` 已有：

1. `thesis`
2. `three_line_summary_json`
3. `central_question`

V1.1 建议语义结构：

```ts
interface IndexCardDistillation {
  index_id: string;
  thesis?: string;
  three_line_summary?: [string, string, string];
  central_question?: string;
  distillation_status?: DistillationStatus;
  confirmed_at?: string;
  ai_assisted?: boolean;
}
```

## 5.1 保存规则

1. `central_question` 应由用户确认。
2. AI 可以建议中心问题，但不得自动确认。
3. 主题一句话和三句话可以先作为 draft。
4. 写作项目引用主题时，应读取已确认字段；未确认字段应标记为 draft。

---

## 6. WritingProject V1.1 字段

现有 `writing_projects` 已有：

1. `intent`
2. `desired_reader_takeaway`

V1.1 建议语义结构：

```ts
interface WritingIntent {
  project_id: string;
  intent?: string;
  desired_reader_takeaway?: string;
  intent_status: DistillationStatus;
  confirmed_at?: string;
  ai_assisted?: boolean;
}
```

## 6.1 保存规则

1. 写作意图可以缺失，但生成脚手架前应提示。
2. AI 可以建议写作意图，但不得自动确认。
3. 生成脚手架时，应返回写作意图摘要或缺失项。

---

## 7. AI Suggestion 结构

建议新增通用候选对象：

```ts
interface AiSuggestion {
  id: string;
  suggestion_type: SuggestionType;
  target_type: "permanent_note" | "index_card" | "writing_project";
  target_id: string;
  scope_type: "current_note" | "current_index_card" | "current_writing_project" | "selected_notes";
  input_object_ids: string[];
  content_json: object;
  rationale: string;
  evidence_refs: EvidenceRef[];
  status: SuggestionStatus;
  created_by_agent?: string;
  created_at: string;
  updated_at: string;
}
```

## 7.1 EvidenceRef

```ts
interface EvidenceRef {
  object_type: "source" | "literature_note" | "permanent_note" | "index_card" | "link";
  object_id: string;
  locator?: string;
  quote?: string;
}
```

## 7.2 content_json 示例

### permanent_note_distillation

```json
{
  "thesis": "A permanent note should capture a reusable judgment, not just store material.",
  "three_line_summary": [
    "Permanent notes should store judgments rather than excerpts.",
    "That makes them reusable in later writing and indexing.",
    "This matters because note systems fail when they optimize storage over thinking."
  ],
  "quality_checks": ["clear"]
}
```

### index_card_distillation

```json
{
  "thesis": "This theme is about turning note accumulation into explicit thought compression.",
  "three_line_summary": [
    "The theme centers on thought compression rather than note storage.",
    "Its value comes from forcing judgment, structure, and better questions.",
    "It connects directly to future writing quality."
  ],
  "central_question": "How can a note system force clearer compression before writing begins?"
}
```

### writing_intent

```json
{
  "intent": "Clarify why AI should assist thinking without owning the user's final judgment.",
  "desired_reader_takeaway": "The reader should understand that AI-native knowledge tools need authorship boundaries."
}
```

---

## 8. SQLite 草案

当前表已有较多 V1.1 字段。

如需支持 AI 候选生命周期，建议新增：

```sql
CREATE TABLE ai_suggestions (
  id TEXT PRIMARY KEY,
  suggestion_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  input_object_ids_json TEXT NOT NULL,
  content_json TEXT NOT NULL,
  rationale TEXT,
  evidence_refs_json TEXT,
  status TEXT NOT NULL,
  created_by_agent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_ai_suggestions_target ON ai_suggestions(target_type, target_id, status);
CREATE INDEX idx_ai_suggestions_type ON ai_suggestions(suggestion_type, status);
```

可选增加审计表：

```sql
CREATE TABLE ai_suggestion_events (
  id TEXT PRIMARY KEY,
  suggestion_id TEXT NOT NULL REFERENCES ai_suggestions(id),
  event_type TEXT NOT NULL,
  event_payload_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_ai_suggestion_events_suggestion ON ai_suggestion_events(suggestion_id, created_at);
```

事件类型建议：

1. `viewed`
2. `adopted_as_draft`
3. `edited`
4. `confirmed`
5. `rejected`
6. `regenerated`

---

## 9. API 草案

以下 API 均为规划 contract，不代表已实现。

## 9.1 获取提纯队列

### `GET /api/v1/distillation/queue`

Query:

| 参数 | 类型 | 说明 |
|---|---|---|
| `targetType` | string | `permanent_note | index_card | writing_project` |
| `status` | string | `missing | draft | confirmed` |
| `limit` | number | 返回数量 |

Response:

```json
{
  "items": [
    {
      "targetType": "permanent_note",
      "targetId": "pn_001",
      "title": "AI should not own user judgment",
      "missing": ["thesis", "three_line_summary"],
      "distillationStatus": "missing",
      "updatedAt": "2026-05-09T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

## 9.2 更新永久笔记提纯字段

### `PATCH /api/v1/permanent-notes/:id/distillation`

Request:

```json
{
  "thesis": "AI should assist thinking without owning the user's final judgment.",
  "threeLineSummary": [
    "AI can help users see structure and missing evidence.",
    "But the final judgment must still be confirmed by the user.",
    "This boundary protects Yansilu from becoming an AI writing substitute."
  ],
  "distillationStatus": "draft"
}
```

Response:

```json
{
  "item": {
    "noteId": "pn_001",
    "thesis": "AI should assist thinking without owning the user's final judgment.",
    "threeLineSummary": [
      "AI can help users see structure and missing evidence.",
      "But the final judgment must still be confirmed by the user.",
      "This boundary protects Yansilu from becoming an AI writing substitute."
    ],
    "distillationStatus": "draft",
    "updatedAt": "2026-05-09T00:00:00.000Z"
  }
}
```

Validation:

1. `threeLineSummary` must contain exactly 3 non-empty strings.
2. `distillationStatus=confirmed` requires explicit confirm endpoint or `confirm: true`.

---

## 9.3 确认永久笔记提纯字段

### `POST /api/v1/permanent-notes/:id/distillation/confirm`

Request:

```json
{
  "confirm": true,
  "sourceSuggestionId": "sug_001"
}
```

Response:

```json
{
  "item": {
    "noteId": "pn_001",
    "distillationStatus": "confirmed",
    "confirmedAt": "2026-05-09T00:00:00.000Z",
    "aiAssisted": true
  }
}
```

Rule:

确认动作必须来自用户。

---

## 9.4 更新 IndexCard 提纯字段

### `PATCH /api/v1/index-cards/:id/distillation`

Request:

```json
{
  "thesis": "This theme is about protecting user judgment in AI-assisted knowledge work.",
  "threeLineSummary": [
    "The theme focuses on authorship boundaries.",
    "It matters because AI fluency can create false ownership.",
    "It supports product decisions around suggestions and confirmation."
  ],
  "centralQuestion": "How can AI help thinking without owning the user's judgment?",
  "distillationStatus": "draft"
}
```

Response:

```json
{
  "item": {
    "indexId": "idx_001",
    "centralQuestion": "How can AI help thinking without owning the user's judgment?",
    "distillationStatus": "draft"
  }
}
```

---

## 9.5 更新 WritingProject 意图

### `PATCH /api/v1/writing-projects/:id/intent`

Request:

```json
{
  "intent": "Clarify the product philosophy behind AI suggestions.",
  "desiredReaderTakeaway": "The reader should understand why confirmation protects original thought.",
  "intentStatus": "draft"
}
```

Response:

```json
{
  "item": {
    "projectId": "wp_001",
    "intent": "Clarify the product philosophy behind AI suggestions.",
    "desiredReaderTakeaway": "The reader should understand why confirmation protects original thought.",
    "intentStatus": "draft"
  }
}
```

---

## 9.6 请求 AI 候选

### `POST /api/v1/ai-suggestions`

Request:

```json
{
  "suggestionType": "permanent_note_distillation",
  "targetType": "permanent_note",
  "targetId": "pn_001",
  "scopeType": "current_note",
  "includeQualityChecks": true
}
```

Response:

```json
{
  "item": {
    "id": "sug_001",
    "suggestionType": "permanent_note_distillation",
    "targetType": "permanent_note",
    "targetId": "pn_001",
    "content": {
      "thesis": "AI should assist thinking without owning the user's final judgment.",
      "threeLineSummary": [
        "AI can help users see structure and missing evidence.",
        "But final judgment must still be confirmed by the user.",
        "This boundary protects Yansilu from becoming an AI writing substitute."
      ]
    },
    "rationale": "The note contrasts AI assistance with authorship transfer.",
    "evidenceRefs": [
      {
        "objectType": "permanent_note",
        "objectId": "pn_001"
      }
    ],
    "status": "suggested",
    "needsUserConfirmation": true
  }
}
```

---

## 9.7 更新 AI 候选状态

### `PATCH /api/v1/ai-suggestions/:id`

Request:

```json
{
  "status": "adopted_as_draft"
}
```

Response:

```json
{
  "item": {
    "id": "sug_001",
    "status": "adopted_as_draft",
    "updatedAt": "2026-05-09T00:00:00.000Z"
  }
}
```

Allowed transitions:

1. `suggested -> adopted_as_draft`
2. `suggested -> rejected`
3. `suggested -> regenerated`
4. `adopted_as_draft -> edited`
5. `adopted_as_draft -> confirmed`
6. `edited -> confirmed`

Forbidden:

1. `suggested -> confirmed`

---

## 10. Error codes 草案

| Code | Meaning |
|---|---|
| `DISTILLATION_PAYLOAD_INVALID` | 提纯字段格式错误 |
| `DISTILLATION_CONFIRM_REQUIRED` | confirmed 需要用户确认 |
| `THREE_LINE_SUMMARY_INVALID` | 三句话压缩必须恰好 3 项 |
| `AI_SUGGESTION_NOT_FOUND` | 候选不存在 |
| `AI_SUGGESTION_TRANSITION_INVALID` | 候选状态流转非法 |
| `AI_SUGGESTION_CONFIRM_FORBIDDEN` | 候选不能直接确认 |
| `WRITING_INTENT_INVALID` | 写作意图字段无效 |

---

## 11. API 保存语义红线

以下行为必须禁止：

1. AI 候选直接写入 confirmed 字段
2. AI 候选直接改写 `markdown_body`
3. `three_line_summary` 非 3 项仍保存
4. 未经用户确认把 `distillation_status` 设为 `confirmed`
5. 写作意图由 AI 自动确认
6. AI 候选无法追溯其输入范围

---

## 12. 与当前 API 的关系

当前 [API.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/API.md) 中已明确：

1. thought-distillation routes 尚未实现
2. IndexCard CRUD API 尚未实现
3. 显式 Link CRUD API 尚未实现

因此，V1.1 实施时应先分清：

1. 当前已实现 API
2. V1.1 规划 API
3. 未来 Phase 2/3 才需要的 API

---

## 13. 最小实施顺序建议

如果进入实现，建议先做：

1. `PATCH /api/v1/permanent-notes/:id/distillation`
2. `POST /api/v1/permanent-notes/:id/distillation/confirm`
3. `GET /api/v1/distillation/queue`
4. `PATCH /api/v1/writing-projects/:id/intent`
5. `POST /api/v1/ai-suggestions`
6. `PATCH /api/v1/ai-suggestions/:id`

IndexCard 相关接口可以在主题工作区进入实现时再补。

---

## 14. 核心判断

V1.1 的数据与 API 设计必须体现同一个原则：

`AI 可以进入候选、草稿和检查流程，但只有用户能把内容确认为自己的判断。`
