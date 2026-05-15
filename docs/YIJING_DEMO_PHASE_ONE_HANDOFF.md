# 易经官网 Demo 第一阶段交付说明

更新时间：2026-05-15

## 目标

第一阶段用于收口当前 worktree：把易经富样例从 QA 数据升级为官网可展示 Demo 的基础资产，并确认数据、schema、AI prompt、官网入口、prototype 自动导入和测试叙事一致。

## 交付范围

### 1. 易经数据与关系类型

- 富样例 fixture 当前权威计数：
  - `fleeting_notes`: 2
  - `literature_notes`: 3
  - `original_notes`: 55
  - `relations`: 85
  - `index_cards`: 5
  - `writing_projects`: 2
- 新增原创笔记 `YJ-E11` 到 `YJ-E15`，用于展示关系治理、意外连接、反例、写作引用和后续承接。
- 新增或覆盖展示关系类型：`same_topic`、`unexpected_connection`、`counterexample_to`、`appears_in_draft`、`follows`。
- Seed 脚本不再把新关系类型降级为旧类型，而是保留 fixture 中的 `relationType` 与 `rationale`。

### 2. Contract 与文档一致性

- `schemas/link.schema.json` 已扩展到最新关系类型集合。
- `packages/ai-orchestrator/src/agent-prompts.mjs` 的 `relation_type` 约束已同步。
- `docs/DOMAIN_MODEL_AND_SCHEMAS.md`、`docs/AI_TOOL_CONTRACTS_V1.md`、`docs/AI_ARTIFACT_SCHEMA_V1.md` 已同步关系类型。
- `docs/API.md` 与 `docs/ACCEPTANCE_CHECKLIST_YIJING_RICH.md` 应以 55/85/2 作为当前展示口径。

### 3. 官网 Demo 入口

- 新增官网静态页 `/demo`，页面文件为 `apps/web/src/marketing-demo.html`。
- 首页、产品页、定价页、下载页加入 Demo 导航或 CTA。
- `/demo` 的主 CTA 指向 `/prototype?demo=yijing-rich`。
- `prototype` 启动时识别 `demo=yijing-rich`，自动调用富易经 seed，并切到关系图谱模块。
- 原型内按钮文案从验收口径调整为「导入官网演示」。

## 人工走查路径

### 官网入口

1. 启动 API 与 Web：
   - `npm.cmd run dev:api`
   - `npm.cmd run dev:web`
2. 打开 `http://127.0.0.1:5173/demo`。
3. 确认首屏包含：
   - 标题：`易经知识网络 Demo`
   - 主按钮：`打开可交互 Demo`
   - 数据预览：`55 永久笔记`、`85 关联关系`、`2 写作方案`
4. 点击主按钮，确认进入 `/prototype?demo=yijing-rich`。

### Prototype 自动导入

1. 等待工作台加载 API。
2. 确认状态提示包含：`已导入易经官网演示`。
3. 确认关系图谱模块已打开。
4. 在干净 vault 中，图谱应展示 55 个原创节点和 85 条显式语义关系。
5. 如果使用已有开发 vault，图谱可能同时包含默认永久笔记盒中已有数据；正式官网演示建议使用独立 demo vault。

## PR 描述草稿

### Summary

- Expand the rich Yijing acceptance fixture to cover the latest explicit relation taxonomy.
- Preserve fixture relation types during rich Yijing seeding and align schema, prompts, docs, and tests.
- Add a public `/demo` marketing page that launches the Yijing knowledge-network demo through `/prototype?demo=yijing-rich`.

### Testing

- `node --test tests/e2e/marketing-routes.test.mjs tests/unit/web-prototype-api.test.mjs tests/unit/yijing-rich-acceptance-fixture.test.mjs tests/unit/yijing-rich-acceptance-seed.test.mjs`
- `node --test tests/integration/api-knowledge-network-yijing.test.mjs`
- `npm.cmd test`
- Browser QA: `/demo` desktop and 390px mobile viewport; primary CTA launches `/prototype?demo=yijing-rich` and triggers the rich Yijing demo import.

## 第一阶段剩余风险

- 当前 graph 面板以永久笔记盒为全局范围；已有开发 vault 会让图谱计数包含历史样例。官网正式环境需要独立 demo vault 或后续增加 demo-only scope。
- `/demo` 已具备展示入口，但还不是完整演示脚本页；下一阶段应补首页 Demo 区块、录屏脚本和精选关系讲解。
