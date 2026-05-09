# 论文工作台工程任务清单 V1

## 1. 文档用途

这份文档把实现对齐检查进一步拆成工程任务。

它用于回答：

1. 第一轮开发应该改哪些文件。
2. 每个 slice 应该补哪些测试。
3. 每个 slice 的完成标准是什么。

前置文档：

1. [PAPER_WORKSPACE_MVP_BREAKDOWN_V1.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/PAPER_WORKSPACE_MVP_BREAKDOWN_V1.md)
2. [PAPER_WORKSPACE_IMPLEMENTATION_ALIGNMENT_V1.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/PAPER_WORKSPACE_IMPLEMENTATION_ALIGNMENT_V1.md)

## 2. 总体实施原则

1. 复用现有 `Source / LiteratureNote / PermanentNote`。
2. 复用现有 import preview / confirm / rollback 管线。
3. NotebookLM 初期只做文本/导出内容导入，不做官方 API 或页面自动化。
4. 不允许 NotebookLM 输出直接生成 `PermanentNote`。
5. 新增能力优先落在 `packages/connectors`、`packages/domain` 或一个轻量 paper workspace 模块，避免把业务逻辑继续塞进 `apps/api/src/server.mjs`。

## 3. Slice 1：NotebookLM 文本候选增强

目标：

让 NotebookLM payload 支持 `summary / qa / study_guide / notes`，并能把较长文本拆成更小的文献候选。

### 3.1 代码任务

建议修改：

1. [packages/connectors/src/external-candidates.mjs](/E:/Projects/Thinking%20in%20Notes/yansilu/packages/connectors/src/external-candidates.mjs)
2. [tests/unit/connectors-external-candidates.test.mjs](/E:/Projects/Thinking%20in%20Notes/yansilu/tests/unit/connectors-external-candidates.test.mjs)
3. [tests/fixtures/imports/notebooklm-basic.json](/E:/Projects/Thinking%20in%20Notes/yansilu/tests/fixtures/imports/notebooklm-basic.json)

新增能力：

1. 支持 payload 字段：
   - `summary`
   - `qa`
   - `studyGuide`
   - `notes`
2. 每条候选增加：
   - `notebook`
   - `notebook_input_type`
   - `candidate_kind`
   - `external_id`
3. 对长文本做基础拆分：
   - 按空行拆段
   - 按列表项拆条
   - 保持最小规则，不做复杂 NLP

### 3.2 测试任务

新增或扩展单测：

1. summary 文本可以生成 literature candidates。
2. qa 数组可以生成 literature candidates。
3. studyGuide 文本可以生成 literature candidates。
4. notes 数组保持兼容。
5. 长文本会拆成多条候选。
6. 所有 NotebookLM 候选都不会生成 permanent candidates。

### 3.3 完成标准

1. `buildExternalCandidates("notebooklm", payload)` 支持多种输入形态。
2. 返回结果仍为 `{ sources, literature, permanent, warnings }`。
3. `permanent` 始终为空。
4. 现有 `/api/v1/imports/preview` 不需要新路由即可预览增强后的 NotebookLM 候选。

## 4. Slice 2：论文加工状态层

目标：

增加一个轻量状态层，记录 NotebookLM 候选、用户转述、候选状态，而不是直接把所有东西塞进 import record。

### 4.1 代码任务

建议新增：

1. `packages/paper-workspace/src/index.mjs`
2. `packages/paper-workspace/src/paper-workspace-store.mjs`
3. `tests/unit/paper-workspace-store.test.mjs`

建议先用 JSON 文件存储，路径：

`vault/papers/{paperId}/workspace.json`

最小结构：

```json
{
  "paperId": "paper_...",
  "sourceId": "src_...",
  "stage": "candidates",
  "candidates": [],
  "translations": [],
  "permanentCandidates": [],
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 4.2 API 任务

建议新增到 API，但保持路由薄：

1. `POST /api/v1/papers`
2. `GET /api/v1/papers/:id`
3. `POST /api/v1/papers/:id/notebooklm-drafts`
4. `POST /api/v1/papers/:id/translations`

路由只负责请求解析和响应 shaping，业务逻辑放在 `packages/paper-workspace`。

### 4.3 测试任务

新增单测：

1. 创建 workspace。
2. 写入 NotebookLM draft。
3. 更新 candidate status。
4. 保存 translation draft。
5. 重启后能从 JSON 恢复。

新增集成测试：

1. `POST /api/v1/papers` 创建 paper workspace。
2. `GET /api/v1/papers/:id` 能读回。
3. translation 没有 paraphrase 时返回校验错误。

### 4.4 完成标准

1. paper workspace 状态独立于 import record。
2. 可以记录用户转述草稿。
3. 可以阻止无转述进入原创候选生成。
4. 不影响现有 import preview / confirm 行为。

## 5. Slice 3：原创候选生成

目标：

基于用户转述生成 `PermanentNote` candidate，并用现有原创性守卫校验。

### 5.1 代码任务

建议新增：

1. `packages/paper-workspace/src/permanent-candidate-builder.mjs`
2. `tests/unit/paper-workspace-permanent-candidate-builder.test.mjs`

候选生成规则：

1. `core_claim` 来自用户转述的压缩版本。
2. `rationale` 使用 relation_to_question / paraphrase_text。
3. `boundary_or_counterpoint` 使用 boundary_or_condition。
4. `citations` 绑定 source_id。
5. `from_literature_note_ids` 绑定来源文献笔记。
6. `authorship.user_confirmed` 初始为 `false`。
7. `originality_status` 来自 guard 结果。

### 5.2 API 任务

建议新增：

1. `POST /api/v1/papers/:id/permanent-candidates`
2. `POST /api/v1/papers/:id/permanent-notes`

其中：

1. `permanent-candidates` 只生成候选，不写入 notes/permanent。
2. `permanent-notes` 需要用户确认后才写入。

### 5.3 测试任务

新增单测：

1. 无 paraphrase 时不能生成 permanent candidate。
2. 有 paraphrase 时能生成完整 candidate 骨架。
3. candidate 包含 source citation。
4. candidate 包含 `from_literature_note_ids`。
5. `authorship.user_confirmed` 默认为 false。

新增集成测试：

1. 生成 candidate 不写入 permanent note 文件。
2. 用户确认后才写入 permanent note 文件。
3. 高相似内容会被 originality guard warning/blocked。

### 5.4 完成标准

1. 原创候选不会绕过用户转述。
2. 原创候选不会直接自动落盘。
3. 保存成原创笔记前必须有用户确认。
4. 保存后的笔记可被现有目录/图谱/写作流程读取。

## 6. Slice 4：前端论文工作台原型

目标：

做最小可演示页面，验证用户能从 NotebookLM 内容进入原创笔记。

### 6.1 代码任务

建议新增：

1. `apps/web/src/paper-workspace-page.js`
2. `apps/web/src/paper-source-panel.js`
3. `apps/web/src/notebooklm-input-panel.js`
4. `apps/web/src/paper-candidate-list.js`
5. `apps/web/src/translation-editor.js`
6. `apps/web/src/permanent-candidate-panel.js`
7. `apps/web/src/paper-workspace-api.js`

如果当前原型主导航需要入口，再在 `prototype-app.js` 中加一个后续实验入口。

### 6.2 前端测试任务

新增单测：

1. NotebookLM input panel 空态/输入态。
2. candidate list 选择与跳过。
3. translation editor 无 paraphrase 时禁用生成原创候选。
4. permanent candidate panel 显示风险状态。

### 6.3 完成标准

1. 用户可以粘贴 NotebookLM 文本。
2. 用户可以看到候选列表。
3. 用户可以填写转述。
4. 用户可以生成原创候选。
5. 用户确认后可以保存为原创笔记。

## 7. 推荐开发顺序

建议顺序：

1. Slice 1：先增强 NotebookLM 候选生成。
2. Slice 2：再补 paper workspace 状态层。
3. Slice 3：再做原创候选生成。
4. Slice 4：最后接前端原型。

理由：

1. Slice 1 最小、风险最低，能马上复用现有导入测试。
2. Slice 2 决定状态边界，做稳后前端不会乱接。
3. Slice 3 是产品价值核心，但要依赖 Slice 2 的转述状态。
4. Slice 4 最容易受交互调整影响，放在后面更稳。

## 8. 首个 PR 建议范围

第一份 PR 建议只做 Slice 1。

包含：

1. 扩展 `buildExternalCandidates("notebooklm")` 输入支持。
2. 为 NotebookLM candidates 增加 input type 和 candidate kind。
3. 增加单元测试。
4. 更新 fixture。

不包含：

1. 新 API。
2. 新前端页面。
3. paper workspace 状态层。
4. permanent candidate 生成。

这样能先把入口数据形态打稳，避免一上来把状态层、页面和候选规则全部缠在一起。

## 9. 一句话结论

第一步不要急着做完整论文工作台，先把 NotebookLM 外部候选生成增强到足够表达 summary / Q&A / study guide / notes。这个 PR 小，但会把后面所有切片的输入基础铺稳。
