# 论文工作台实现对齐检查 V1

## 1. 检查目标

本检查用于判断当前代码实现能否承接 `论文工作台 / NotebookLM 辅助论文工作流`。

它回答 4 个问题：

1. 哪些能力已经存在，可以直接复用。
2. 哪些能力只需要轻量扩展。
3. 哪些能力需要新增。
4. 哪些实现路径应避免，以免重复造系统或破坏当前边界。

相关产品文档：

1. [NOTEBOOKLM_ASSISTED_PAPER_WORKFLOW_V1.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/NOTEBOOKLM_ASSISTED_PAPER_WORKFLOW_V1.md)
2. [PAPER_WORKSPACE_UI_INTERACTION_V1.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/PAPER_WORKSPACE_UI_INTERACTION_V1.md)
3. [PAPER_WORKSPACE_LOFI_AND_COPY_V1.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/PAPER_WORKSPACE_LOFI_AND_COPY_V1.md)
4. [PAPER_WORKSPACE_MVP_BREAKDOWN_V1.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/PAPER_WORKSPACE_MVP_BREAKDOWN_V1.md)

## 2. 总体结论

当前实现已经具备论文工作台 MVP 的大部分底座。

可以复用的能力包括：

1. `Source / LiteratureNote / PermanentNote` 三层对象。
2. NotebookLM 最小外部候选生成。
3. 导入预览、确认、记录、回滚。
4. 原创性守卫。
5. Markdown 落盘与本地 Vault 结构。
6. 前端导入候选预览、选择、确认模型。

缺口集中在一个地方：

当前实现有“外部内容 -> Source/Literature 候选 -> 确认写入”的导入管线，但还没有“文献候选 -> 用户转述 -> 永久笔记候选”的论文加工中间层。

所以建议不要重建导入系统，而是在现有导入管线之外，增加一个轻量 `paper workspace draft` 层。

## 3. 已有能力映射

## 3.1 Source / Literature / Permanent 已存在

已有 schema：

1. [source.schema.json](/E:/Projects/Thinking%20in%20Notes/yansilu/schemas/source.schema.json)
2. [literature_note.schema.json](/E:/Projects/Thinking%20in%20Notes/yansilu/schemas/literature_note.schema.json)
3. [permanent_note.schema.json](/E:/Projects/Thinking%20in%20Notes/yansilu/schemas/permanent_note.schema.json)

对论文工作台的意义：

1. 论文可以先作为 `Source`。
2. NotebookLM 输出可以先作为 `LiteratureNote` 候选。
3. 用户确认后的判断可以落为 `PermanentNote`。

当前 `source_type` 已包含 `article`、`pdf`、`note`，可以承接论文来源。

轻量缺口：

1. `Source` schema 还没有专门的 `doi`、`arxiv_id`、`pdf_asset_path` 字段。
2. 可以先放在 `url_or_path`、`locator`、`description` 或 `original_frontmatter` 中，但如果要做论文工作台，建议补显式字段。

## 3.2 NotebookLM 外部候选已存在

相关实现：

1. [external-candidates.mjs](/E:/Projects/Thinking%20in%20Notes/yansilu/packages/connectors/src/external-candidates.mjs)
2. [connectors-external-candidates.test.mjs](/E:/Projects/Thinking%20in%20Notes/yansilu/tests/unit/connectors-external-candidates.test.mjs)
3. [notebooklm-basic.json](/E:/Projects/Thinking%20in%20Notes/yansilu/tests/fixtures/imports/notebooklm-basic.json)

当前行为：

1. `connector = notebooklm` 时读取 `payload.notes`。
2. 每条 note 生成一个 `Source` 候选。
3. 每条 note 生成一个 `LiteratureNote` 候选。
4. `literature.notebook` 会保留 `payload.notebookName`。

对论文工作台的意义：

这已经能支撑最小入口：

`NotebookLM notes -> Source + LiteratureNote candidates`

轻量缺口：

1. 当前只识别 `notes`，还没有区分 `summary / qa / study_guide / note`。
2. 当前候选没有 `kind`: claim / method / result / limitation / question / quote。
3. 当前不会把一段长文本拆成多个候选，只是一条 input item 对应一条 literature candidate。

## 3.3 导入预览 / 确认 / 记录 / 回滚已存在

相关实现：

1. [server.mjs](/E:/Projects/Thinking%20in%20Notes/yansilu/apps/api/src/server.mjs)
2. [import-record-store.mjs](/E:/Projects/Thinking%20in%20Notes/yansilu/packages/connectors/src/import-record-store.mjs)
3. [api-import-confirm.test.mjs](/E:/Projects/Thinking%20in%20Notes/yansilu/tests/integration/api-import-confirm.test.mjs)

当前能力：

1. `POST /api/v1/imports/preview`
2. `GET /api/v1/imports/:id`
3. `POST /api/v1/imports/:id/confirm`
4. `POST /api/v1/imports/:id/rollback`
5. `selectedCandidateIds` 支持部分确认。
6. `createdFiles` 记录写入文件与 hash。
7. 回滚会跳过已被用户修改过的文件。

对论文工作台的意义：

论文工作台第一段可以复用导入管线：

`NotebookLM text -> preview -> selected literature candidates -> confirm`

但论文工作台不应该只停在导入页，因为它还需要转述和永久笔记候选生成。

## 3.4 原创性守卫已存在

相关实现：

1. [originality-guard.mjs](/E:/Projects/Thinking%20in%20Notes/yansilu/packages/originality-guard/src/originality-guard.mjs)
2. [originality-guard.test.mjs](/E:/Projects/Thinking%20in%20Notes/yansilu/tests/unit/originality-guard.test.mjs)

当前能力：

1. 对 `PermanentNote` candidates 检查 `core_claim` 与 literature `quote_text` 相似度。
2. 支持 warning / blocked。
3. 支持引用 locator 缺失提醒。
4. import confirm 阶段也会重新运行守卫。

对论文工作台的意义：

这正好支撑“NotebookLM 文本不能直接越级为永久笔记”的边界。

轻量缺口：

1. 目前 similarity 主要比较 permanent `core_claim` 与 literature `quote_text`。
2. 对 NotebookLM 场景，还应把 `paraphrase_text` 和 `raw NotebookLM text` 都纳入风险提示。
3. 应增加“没有用户转述时不能生成永久笔记候选”的业务规则，这不是单纯相似度问题。

## 3.5 前端导入候选模型已存在

相关实现：

1. [import-toolbar-model.js](/E:/Projects/Thinking%20in%20Notes/yansilu/apps/web/src/import-toolbar-model.js)
2. [import-candidate-preview-model.js](/E:/Projects/Thinking%20in%20Notes/yansilu/apps/web/src/import-candidate-preview-model.js)
3. `apps/web/src/import-*`

当前能力：

1. connector 选项已包含 `notebooklm`。
2. candidatePreview 已支持 Source / LiteratureNote / PermanentNote 分组。
3. 支持 candidate 选择、排除、风险过滤。

对论文工作台的意义：

可以复用候选预览模型，但不建议直接复用导入页 UI 作为论文工作台最终界面。

原因：

1. 现有导入页强调“预览 -> 确认写入”。
2. 论文工作台强调“候选 -> 转述 -> 永久笔记候选 -> 关联”。
3. 它们的底层对象可以复用，页面心智应分开。

## 4. 主要缺口

## 4.1 缺少 Paper Workspace 状态层

当前系统有 import record，但没有专门记录论文加工进度的对象。

需要新增或模拟：

1. Paper Source 当前阶段。
2. NotebookLM raw input。
3. 候选状态：new / selected / skipped / converted。
4. 用户转述草稿。
5. 永久笔记候选草稿。

建议：

先不要做复杂项目模型，可以增加轻量 JSON 记录：

`vault/papers/{paperId}/workspace.json`

或在 `.yansilu` 中增加一个 SQLite 表。

如果优先快速原型，JSON 更快；如果要和目录/搜索/图谱深度联动，SQLite 更稳。

## 4.2 缺少“转述完成”业务规则

当前 `LiteratureNote` schema 已有 `paraphrase_text`，但导入确认时允许空转述写入 draft。

论文工作台需要更细的规则：

1. 可以保存 draft 文献笔记。
2. 但不能把无转述候选标记为完成。
3. 不能基于无转述候选生成永久笔记候选。

这应作为 paper workspace 自己的校验，不必改变全局导入行为。

## 4.3 缺少永久笔记候选生成层

当前 import 管线可以写入 PermanentNote candidates，但 NotebookLM connector 默认不会生成 permanent candidates。

这很符合产品边界。

缺口是：

1. 用户完成转述后，需要生成 PermanentNote candidate。
2. candidate 应是结构骨架，不是完整正文。
3. 保存前需要用户确认并通过原创性检查。

建议：

新增一个 domain 层函数，例如：

`buildPermanentCandidateFromLiteratureTranslation({ source, literatureNote, translation })`

先用规则生成骨架，未来再接 AI 建议。

## 4.4 缺少论文工作台前端页面

当前只有导入页面。

需要新增页面或模块：

1. `PaperWorkspacePage`
2. `PaperSourcePanel`
3. `NotebookLmInputPanel`
4. `PaperCandidateList`
5. `TranslationEditor`
6. `PermanentCandidatePanel`
7. `PaperNextActionsPanel`

可以复用 import candidate 的模型函数，但 UI 不应直接套 import page。

## 5. 建议实现路线

## 5.1 Slice 1：复用导入底座做最小 NotebookLM 文献候选

目标：

让用户粘贴 NotebookLM notes，生成 Source + LiteratureNote candidates。

复用：

1. `buildExternalCandidates("notebooklm", payload)`
2. `/api/v1/imports/preview`
3. import candidate preview model

需要补：

1. 支持 `inputType`: summary / qa / study_guide / note。
2. 支持从单段文本拆成多个 notes。
3. 单测覆盖 NotebookLM inputType 和候选 kind。

## 5.2 Slice 2：增加转述层

目标：

让用户把 candidate 转成自己的 literature note draft。

复用：

1. `LiteratureNote` schema 的 `paraphrase_text`
2. `writeLiteratureNoteIfAbsent`

需要补：

1. paper workspace draft 记录。
2. paraphrase validation。
3. 保存文献笔记时保留 NotebookLM raw text 与 notebook context。

## 5.3 Slice 3：增加永久笔记候选层

目标：

基于用户转述生成 PermanentNote candidate，并允许保存为永久笔记。

复用：

1. `PermanentNote` schema。
2. `writePermanentNoteIfAbsent`。
3. `originalityGuard`。

需要补：

1. `from_literature_note_ids` 绑定。
2. `citations.source_id` 绑定。
3. `authorship.user_confirmed = true` 的确认动作。
4. 阻止无转述候选生成永久笔记候选。

## 5.4 Slice 4：接入结构化下一步

目标：

保存永久笔记后，进入现有关系、索引、写作流程。

复用：

1. 目录笔记列表。
2. 图谱/关联逻辑。
3. 写作项目与写作篮。

需要补：

1. 保存成功后的 next actions。
2. 从新 permanent note 进入索引或写作的 UI 入口。

## 6. 不建议的路线

## 6.1 不建议另建一套“NotebookLM 笔记系统”

原因：

1. 会和 Source/Literature/Permanent 三层模型重复。
2. 会削弱当前产品主线。
3. 后续图谱、写作、索引都会多一套适配成本。

## 6.2 不建议先做 NotebookLM API 或页面自动化

原因：

1. 当前最小价值不依赖 API。
2. 粘贴导入已经能验证核心流程。
3. 页面自动化维护成本高。

## 6.3 不建议直接让 NotebookLM connector 生成 PermanentNote

原因：

1. 这会绕过用户转述。
2. 容易把摘要包装成原创。
3. 和现有原创性边界冲突。

当前 `buildExternalCandidates("notebooklm")` 只生成 Source 和 LiteratureNote，这个方向是对的。

## 7. 测试建议

## 7.1 单元测试

建议新增或扩展：

1. NotebookLM summary / qa / study_guide input 解析。
2. 长文本拆分为多个 literature candidates。
3. candidate kind 标注。
4. 无 paraphrase 时禁止生成 permanent candidate。
5. 有 paraphrase 时生成 permanent candidate 骨架。

## 7.2 集成测试

建议新增：

1. `POST /api/v1/imports/preview` 支持 NotebookLM 扩展 payload。
2. paper workspace 保存 paraphrase draft。
3. paper workspace 生成 permanent candidate。
4. permanent confirm 后写入 `notes/permanent`，并绑定 `from_literature_note_ids`。

## 7.3 前端单测

建议新增：

1. Paper candidate list selection。
2. Translation editor validation。
3. Permanent candidate risk display。
4. Save success next actions。

## 8. 当前可复用清单

| 能力 | 可复用程度 | 说明 |
| --- | --- | --- |
| Source schema | 高 | 需要补论文显式字段 |
| LiteratureNote schema | 高 | 已有 `paraphrase_text` |
| PermanentNote schema | 高 | 已有核心判断、边界、引用、authorship |
| NotebookLM connector | 中 | 已有 notes -> literature，需扩 input types 和拆分 |
| import record | 高 | 可复用预览/确认/回滚 |
| originality guard | 高 | 需加无转述业务规则 |
| import candidate UI model | 中 | 可复用模型，不建议直接复用页面 |
| writing project handoff | 中 | 保存永久笔记后可复用 |

## 9. 一句话结论

论文工作台不需要推倒重来。正确路线是复用现有导入、笔记、原创性守卫和写作底座，在中间补一个“论文加工状态层”，专门承接 `NotebookLM 输出 -> 用户转述 -> 永久笔记候选`。

如需进入工程排期，请参考 [PAPER_WORKSPACE_ENGINEERING_TASKS_V1.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/PAPER_WORKSPACE_ENGINEERING_TASKS_V1.md)。
