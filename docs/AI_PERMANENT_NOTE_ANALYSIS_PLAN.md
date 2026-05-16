# AI 永久笔记分析计划

> Status: implementation plan
> Date: 2026-05-15
> Worktree: `codex/wt-ai-harness`

## 1. 目标

研思录需要用 AI 帮助用户自动看见永久笔记之间的可能关联、主题结构、浓缩观点、原创度风险，以及笔记是否符合产品设计原则。

这个能力的定位不是让 AI 替用户整理知识库，而是让 AI 成为低风险的初判助手：

1. AI 负责发现候选、指出风险、提出问题。
2. 用户负责采纳、改写、确认和承担判断。
3. 所有 AI 输出在用户确认前都只是候选。
4. 本地模型优先用于日常初筛；远程强模型只在写作、综合和高价值复核时升级。

## 2. 产品原则

### 2.1 候选不是判断

AI 生成的关联、主题、观点浓缩、原创度判断和原则检查都不能直接成为稳定知识。

默认状态应为：

```text
suggested
```

只有经过用户动作后，才能进入：

```text
adopted_as_draft -> edited -> confirmed
```

禁止：

```text
suggested -> confirmed
```

### 2.2 本地优先

日常分析默认使用本地或私有模型：

1. 单条永久笔记浓缩候选。
2. 可能关联发现。
3. 主题候选初筛。
4. 原创度风险初筛。
5. 设计原则检查。

本地模型失败时不能阻塞主流程。

### 2.3 远程强模型按需升级

远程强模型适合：

1. 写作前多主题深度综合。
2. 长上下文原创度复核。
3. 论证结构、反方、边界和不适用条件分析。
4. 复杂主题网络的中心问题提炼。

升级到云端模型必须尊重隐私模式、预算策略和用户确认。

## 3. 分析能力拆分

### 3.1 关联候选

输入：

1. 当前永久笔记。
2. 候选相关永久笔记。
3. 现有关联、标签和图谱邻域。

输出：

1. `fromNoteId`
2. `toNoteId`
3. `relationType`
4. `rationale`
5. `evidence`
6. `confidence`
7. `suggestedAction`

默认落到 `LinkSuggestion` 或 relation suggestion，不直接创建 confirmed relation。

### 3.2 主题候选

输入：

1. 一组永久笔记。
2. 现有 index card。
3. 关系图谱。

输出：

1. 主题标题。
2. 中心问题。
3. 主题一句话判断。
4. 主题三句话压缩。
5. 相关永久笔记。
6. 主题张力和缺口。

默认作为候选主题，不直接创建正式 index card。

### 3.3 观点浓缩候选

输入：

1. 单条永久笔记标题和正文。
2. 已有 `thesis`、`threeLineSummary`、`boundaryOrCounterpoint`。
3. 来源和相关笔记摘要。

输出：

1. `thesis`
2. `threeLineSummary`
3. `boundaryOrCounterpoint`
4. `openQuestions`
5. `qualityChecks`

AI 输出只能作为候选；用户采纳为草稿、编辑后再确认。

### 3.4 原创度评估

分两层：

1. 规则和相似度初筛：当前已有 originality guard，可继续扩展。
2. 模型语义复核：判断内容是摘抄、转述、综合，还是用户原创判断。

输出：

1. `status`: `pass | warning | blocked`
2. `reasons`
3. `similarity`
4. `sourceRefs`
5. `recommendedAction`

原创度评估只能提示风险，不能自动删除或改写用户笔记。

### 3.5 设计原则检查

检查永久笔记是否符合研思录原则：

1. 是否是判断，而不只是材料。
2. 是否可独立理解。
3. 是否有理由或边界。
4. 是否可复用于主题或写作。
5. 是否保留来源追溯。
6. 是否避免 AI 替用户完成最终判断。

输出为轻量检查结果，不做羞辱式分数。

## 4. 技术架构

复用现有 AI harness：

1. `packages/ai-orchestrator/src/harness.mjs`
2. `packages/ai-orchestrator/src/artifacts.mjs`
3. `packages/ai-orchestrator/src/suggestions.mjs`
4. `packages/ai-orchestrator/src/agent-registry.mjs`
5. `packages/ai-orchestrator/src/core-note-tools.mjs`

新增一类分析层：

```text
note_analysis_agent
```

短期可以先实现为纯逻辑模块：

```text
packages/ai-orchestrator/src/note-analysis.mjs
```

职责：

1. 标准化永久笔记分析输入。
2. 执行本地规则初判。
3. 生成稳定的分析结果结构。
4. 为后续模型输出、artifact 和 suggestion 写入提供统一 contract。

## 5. 数据和状态

建议先不新增数据库表。

第一阶段输出可以停留在内存或 artifact/suggestion 层，等 UI 和 API 跑通后再决定是否固化。

统一结果结构：

```json
{
  "noteId": "pn_001",
  "analysisMode": "local_rule",
  "distillation": {
    "status": "warning",
    "suggestedThesis": "",
    "suggestedThreeLineSummary": [],
    "openQuestions": []
  },
  "originality": {
    "status": "pass",
    "reasons": []
  },
  "principleChecks": [
    {
      "checkId": "judgment_not_material",
      "status": "pass",
      "message": ""
    }
  ],
  "relationCandidates": [],
  "topicCandidates": [],
  "recommendedActions": []
}
```

## 6. 本地模型与远程模型路由

### 6.1 本地初判

默认 model pack：

1. `ollama_local`
2. `minicpm_local`
3. `privacy_first`

适用任务：

1. 快速关联发现。
2. 单条笔记浓缩。
3. 原创度和原则粗筛。
4. 后台周期性扫描。

### 6.2 远程强模型

默认 model pack：

1. `deep_work`
2. `global_optimized`
3. `china_optimized`

适用任务：

1. 写作前深度综合。
2. 主题网络整理。
3. 多笔记冲突和边界分析。
4. 重要作品前的原创度复核。

## 7. 产品入口

### 7.1 永久笔记右侧面板

新增或扩展一个面板：

```text
AI 初判
```

包含：

1. 浓缩候选。
2. 可能关联。
3. 主题候选。
4. 原创度风险。
5. 原则检查。

### 7.2 AI Inbox

批量查看候选：

1. 关联候选。
2. 主题候选。
3. 原创度 warning。
4. 原则检查 warning。
5. 写作缺口。

### 7.3 写作前检查

进入写作前检查：

1. 是否有 confirmed thesis。
2. 是否有主题中心问题。
3. 是否存在未处理冲突。
4. 是否存在来源缺口。
5. 是否需要远程强模型复核。

## 8. 实施路线

### Milestone 1: 本地初判纯逻辑

目标：

1. 新增 `note-analysis.mjs`。
2. 支持单条永久笔记本地规则检查。
3. 输出稳定结果结构。
4. 覆盖单元测试。

不做：

1. UI。
2. 数据库。
3. 真实模型调用。
4. 自动修改笔记。

### Milestone 2: Artifact / Suggestion 接入

目标：

1. 将分析结果转为可审阅候选。
2. 复用 suggestion 状态机。
3. 关系候选进入 `LinkSuggestion`。
4. 原创度和原则检查进入 AI Inbox。

### Milestone 3: API 接入

目标：

1. `POST /api/v1/notes/:id/ai-analysis`
2. `GET /api/v1/notes/:id/ai-analysis`
3. 后续可加批量扫描接口。

### Milestone 4: UI 接入

Status: partially implemented. The permanent-note inspector has an `AI 初判` card with an `AI 分析` entry point that runs local analysis, opens the current note's pending AI Inbox suggestions, and keeps an inline summary of local findings. Field-level suggestions are persisted as reviewable `InsightCard` artifacts; direct regenerate/ignore shortcuts remain future work.

目标：

1. 永久笔记右侧显示 AI 初判。
2. 用户可以采纳、忽略、重新生成。
3. 关系候选确认后才进入正式图谱。

### Milestone 5: 本地模型接入

Status: partially implemented. The analysis package now exposes a local-only structured request builder for local model assistance plus a JSON response normalizer/merge policy. `runPermanentNoteLocalModelAnalysis` can execute through a provider adapter and blocks non-local adapters for local-only privacy. The API can return `localModelRequest` for an external local runner or merge a supplied `localModelResponse` into review-only artifacts and field suggestions. API-level provider execution and runtime fallback wiring are still future work.

目标：

1. 通过现有 model pack 选择本地 provider。
2. 本地模型输出结构化候选。
3. 失败时回退到规则初判。

### Milestone 6: 主题与图谱分析

Status: partially implemented. Local graph analysis now scans permanent notes for shared topic candidates, unconfirmed relation candidates, bridge candidates, and isolated notes. `POST /api/v1/graph/ai-analysis` exposes directory or explicit note/relation scans and returns only reviewable artifacts; it does not create relations or index cards. The graph panel has an `AI 图谱初判` entry point that stores candidates for AI Inbox review.

目标：

1. 批量扫描永久笔记。
2. 发现主题候选、孤岛笔记和桥接候选。
3. 候选边与 confirmed 边保持状态分离。

### Milestone 7: 远程强模型升级

Status: partially implemented. Writing strong-model analysis now has an explicit-confirmation request builder, a response normalizer that emits only reviewable `WritingMove`, `OutlineDraft`, and `SourceGap` artifacts, provider-adapter execution for confirmed requests, and `POST /api/v1/writing/ai-analysis` for request/merge flows. The writing center has a strong-model analysis card that prepares the confirmed request package without directly calling a provider. API-level provider execution remains future work.

目标：

1. 写作前提供深度分析入口。
2. 用户确认后使用远程强模型。
3. 输出写作 move、source gap、outline draft。

## 9. 第一批验收标准

1. AI 可以为永久笔记生成本地初判结果。
2. 缺少 thesis 的笔记会被识别为待浓缩。
3. 像材料摘录、不像判断的笔记会被提示。
4. 缺少理由、边界或可复用方向的笔记会被提示。
5. AI 候选不会直接写入正文或 confirmed 字段。
6. 用户忽略所有 AI 分析时，主编辑、主题和写作流程不受影响。
7. 所有新增逻辑有单元测试覆盖。

## 10. 红线

1. 不做 AI 自动生成永久笔记正文。
2. 不做默认全库云端扫描。
3. 不把 AI 结果直接确认为用户判断。
4. 不让本地模型失败阻塞核心写作流程。
5. 不把原创度评估做成惩罚式评分。
6. 不用远程强模型绕过隐私模式。
