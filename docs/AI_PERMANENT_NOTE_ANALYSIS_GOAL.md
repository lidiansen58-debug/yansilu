# AI 辅助永久笔记分析系统 Goal

> Status: goal handoff
> Date: 2026-05-15
> Worktree: `codex/wt-ai-harness`
> Related: `AI_PERMANENT_NOTE_ANALYSIS_PLAN.md`

## Goal

让研思录具备一套可审阅、可追溯、可本地优先运行的 AI 分析能力，帮助用户发现永久笔记之间的关联、主题结构、浓缩观点、原创度风险和原则偏离，并在写作阶段按需调用远程强模型做深度综合。

核心原则：

1. AI 只生成候选，不直接拥有用户判断。
2. 本地模型做日常初判。
3. 远程强模型只在用户确认后用于写作和深度分析。
4. 所有 AI 输出都必须可追溯、可忽略、可审阅、可回滚。

## 当前状态

已完成：

1. 建立 `codex/wt-ai-harness` worktree。
2. 记录计划文档：`docs/AI_PERMANENT_NOTE_ANALYSIS_PLAN.md`。
3. 新增本地规则初判模块：`packages/ai-orchestrator/src/note-analysis.mjs`。
4. 已覆盖单元测试：永久笔记浓缩缺口、原创度风险、原则检查、关系候选。
5. 新增本地分析候选化出口：`buildPermanentNoteAnalysisReviewItems` 和 `analyzePermanentNoteForReview`。
6. 新增 API：`POST /api/v1/notes/:id/ai-analysis` 和 `GET /api/v1/notes/:id/ai-analysis`。
7. API 会把 reviewable artifacts 写入 AI Inbox，但不会确认关系或改写笔记。
8. 全量测试通过：`npm.cmd test`，410 tests，0 failed。

## 阶段 1: 分析结果候选化

目标：把本地初判结果转成用户可审阅的候选对象。

Status: implemented in pure logic and covered by unit tests.

交付：

1. 可能关联转成 `LinkSuggestion`。
2. 原创度风险转成 `SourceGap` 或 `InsightCard`。
3. 原则检查 warning 转成 AI Inbox 可见项。
4. 观点浓缩建议转成 `suggestion`。
5. 所有输出保持 `pending_review` 或 `suggested`。

验收：

1. AI 不直接写入永久笔记正文。
2. AI 不直接创建 confirmed relation。
3. 用户可以忽略所有候选，核心流程不受影响。

## 阶段 2: API 接入

目标：提供稳定后端入口。

Status: implemented for local-rule analysis and covered by integration tests.

优先接口：

```text
POST /api/v1/notes/:id/ai-analysis
GET /api/v1/notes/:id/ai-analysis
```

第一版只运行本地规则，不调用真实模型。

验收：

1. 永久笔记可以请求 AI 初判。
2. 返回结构包含 `distillation`、`originality`、`principleChecks`、`relationCandidates`、`recommendedActions`。
3. API 测试覆盖成功、非永久笔记、缺失 note、候选不越权等场景。

## 阶段 3: AI Inbox 接入

目标：让用户集中审阅 AI 发现的问题和候选。

Status: implemented for stored analysis artifacts. `POST /api/v1/notes/:id/ai-analysis` stores generated artifacts in the existing AI Inbox, including field-level distillation suggestions wrapped as reviewable `InsightCard` artifacts. The editor can open the AI Inbox filtered to the current note after a local analysis run. Richer review actions remain open.

交付：

1. AI Inbox 展示关联候选。
2. AI Inbox 展示原创度 warning。
3. AI Inbox 展示原则检查 warning。
4. 支持忽略、采纳为草稿、跳转到笔记。
5. 关系候选确认后才进入正式图谱。

验收：

1. `LinkSuggestion` 必须显式确认后才创建 relation。
2. 原创度和原则检查不能自动改写笔记。
3. 用户决策被记录。

## 阶段 4: 永久笔记右侧 AI 初判面板

目标：把 AI 分析放进永久笔记主工作流。

Status: partially implemented. The editor relation/inspector area now exposes an `AI 初判` card with an `AI 分析` action for permanent notes, saves dirty content first, runs local-rule analysis, stores reviewable artifacts, opens the filtered AI Inbox, and keeps a local right-panel summary of relation candidates, topic candidates, distillation status, originality status, principle warnings, field suggestions, and next actions. Field suggestions are persisted as reviewable `InsightCard` artifacts, while direct ignore/regenerate shortcuts remain open.

交付：

1. 永久笔记详情右侧增加 `AI 初判` 入口。
2. 显示待补 `thesis`。
3. 显示待补三句话压缩。
4. 显示可能关联。
5. 显示原创度风险。
6. 显示原则检查。
7. 用户可以跳转处理或忽略。

验收：

1. 不打断编辑体验。
2. 不把 AI 做成主入口。
3. 面板只是辅助判断，不替用户确认。

## 阶段 5: 本地模型接入

目标：从规则初判升级到本地模型辅助判断。

Status: partially implemented. `buildPermanentNoteLocalModelRequest` creates a local-only, review-only structured request for permanent-note analysis using the local-rule baseline plus bounded related/literature context. `mergePermanentNoteLocalModelResponse` now parses local model JSON, merges distilled viewpoint, relation candidates, topic candidates, and principle warnings with the local-rule baseline, and emits only `pending_review` artifacts / `suggested` field suggestions. `runPermanentNoteLocalModelAnalysis` can execute the request through a provider adapter and blocks non-local adapters for `local_only` privacy. `POST /api/v1/notes/:id/ai-analysis` can return the request via `prepareLocalModelRequest` or merge caller-supplied `localModelResponse`. API-level provider execution and runtime fallback wiring remain open.

优先模型路径：

1. `ollama_local`
2. `minicpm_local`
3. `privacy_first`

交付：

1. 本地模型生成 `thesis` 候选。
2. 本地模型解释关系理由。
3. 本地模型提出主题候选。
4. 本地模型补开放问题和边界问题。
5. 模型失败时回退规则初判。

验收：

1. 没有本地模型时系统仍可用。
2. 本地模型输出仍然是候选。
3. 不触发云端模型 fallback，除非用户确认。

## 阶段 6: 主题与图谱分析

目标：从单条永久笔记扩展到主题网络。

Status: partially implemented. `analyzePermanentNoteGraphLocally` scans multiple permanent notes with local rules for shared topic candidates, unconfirmed relation candidates, bridge candidates across graph components, and isolated notes. `buildPermanentNoteGraphReviewItems` converts those findings into `InsightCard`, `LinkSuggestion`, `BridgeCard`, and `QuestionCard` artifacts, all `pending_review`. `POST /api/v1/graph/ai-analysis` exposes the scan for directory scopes or explicit note/relation inputs; it does not create relations or index cards. The graph panel now includes an `AI 图谱初判` card that runs the scan and points review back to AI Inbox.

交付：

1. 批量扫描永久笔记。
2. 生成主题候选。
3. 发现孤岛笔记。
4. 发现弱关系、冲突关系、桥接关系。
5. 图谱显示候选关系和正式关系的区别。

验收：

1. 候选边和 confirmed 边视觉/状态分离。
2. 主题候选不自动创建 index card。
3. 用户确认后才写入主题或关系。

## 阶段 7: 写作前远程强模型分析

目标：在写作阶段连接远程强模型做高价值综合。

Status: partially implemented. `buildWritingStrongModelRequest` creates a remote-after-confirmation request package only when the caller supplies explicit user confirmation. `mergeWritingStrongModelResponse` normalizes remote model JSON into review-only `WritingMove`, `OutlineDraft`, and `SourceGap` artifacts. `runWritingStrongModelAnalysis` can execute a confirmed request through a provider adapter and still normalizes everything as review-only artifacts. `POST /api/v1/writing/ai-analysis` exposes the request/merge flow without executing a remote provider. The writing center now has a confirmed strong-model analysis entry that prepares the request package without directly calling a provider; API-level provider execution remains open.

适用场景：

1. 多主题写作。
2. 重要文章、报告、课程。
3. 原创度复核。
4. 论证结构检查。
5. 反方、边界、缺口分析。

交付：

1. 写作前检查入口。
2. 用户确认后调用远程强模型。
3. 输出 `WritingMove`、`OutlineDraft`、`SourceGap`。
4. 所有输出进入审阅流程。

验收：

1. 隐私模式下不能自动使用云模型。
2. 用户明确确认模型升级。
3. 输出可追溯到永久笔记、主题和来源。

## 红线

1. 不做 AI 自动生成 confirmed 永久笔记。
2. 不做默认全库云端扫描。
3. 不让 AI 直接确认关系、主题或写作判断。
4. 不让本地模型失败阻塞主流程。
5. 不把原创度做成惩罚式评分。
6. 不绕过用户隐私和预算策略。

## 成功标准

短期成功：

1. 用户能看到这条永久笔记哪里还没想清楚。
2. 用户能看到哪些笔记可能相关，以及为什么相关。
3. 用户能选择忽略或采纳 AI 候选。

中期成功：

1. 永久笔记网络开始自动浮现主题、张力和缺口。
2. AI Inbox 成为低噪声的思考辅助队列。
3. 用户写作前能看到材料准备度。

长期成功：

1. 研思录从笔记管理工具变成观点提纯与知识创作系统。
2. AI 成为思考陪练，而不是代写者。
