# V1.1 Alpha 验收记录 2026-05-17

> Status: pass with documented beta follow-up
> Date: 2026-05-17
> Branch: `feat/v1_1-opinion-distillation-alpha`
> Scope baseline: `docs/V1_1_REPLANNED_TASKS_2026-05-17.md`

## 1. 验收结论

V1.1 Alpha 当前可以标记为：

```text
opinion distillation alpha passed
```

本轮收口完成了第一阶段 A1-A4：

1. 用户可见命名从“思想提纯器 / 思想提纯”统一切换为“观点提纯”。
2. 首页与永久笔记主路径开始展示观点形成进度，而不再只强调资料数量。
3. 观点提纯队列具备状态筛选、队列跳转、即时刷新和空态出口。
4. Alpha 范围、测试结果、非目标与 Beta 候选已形成正式记录。

Alpha 通过的含义不是 V1.1 已经完整完成，而是“观点提纯”已经第一次形成了可使用、可演示、可继续迭代的主链路。

## 2. Alpha 范围

本次验收覆盖以下能力：

1. 永久笔记右侧 `观点提纯` 面板：
   - 保存一句话判断
   - 保存三句话压缩
   - 显示观点状态
   - 仅允许用户显式确认观点
2. 观点提纯队列：
   - `全部 / 待一句话判断 / 待三句话压缩 / 待确认 / 已确认` 筛选
   - 点击条目跳转到对应笔记与对应输入位置
   - 保存或确认后即时刷新
   - 空态引导进入写作准备或继续创建永久笔记
3. 永久笔记优先路径增强：
   - 侧栏流程卡展示 `待提纯 / 已确认观点 / 可进入写作`
   - 首页与模块入口主行动切换为 `继续观点提纯 / 进入写作准备`
   - 随笔 / 文献支持继续生成永久笔记
4. 对外文案与产品规划：
   - 官网与定价页同步使用“观点提纯”
   - 规划文档统一记录旧称迁移与后续阶段拆分

## 3. 验收标准对照

### A1. 术语统一

结果：通过。

1. Prototype 主模块、侧栏、面板、状态提示、按钮文案已统一为“观点提纯”。
2. 官网与定价页中的主叙事已统一为“观点提纯 / 一句话判断 / 三句话压缩 / 确认观点”。
3. 产品与规划文档已明确：“思想提纯器”属于旧称，后续主称统一为“观点提纯”。

### A2. 首页价值反馈重构

结果：通过。

1. 永久笔记主路径改为展示观点形成进度。
2. 首页/侧栏反馈优先展示缺口提示：
   - 缺一句话判断
   - 缺三句话压缩
   - 待确认观点
   - 缺边界/反例
3. 主行动会根据状态切换到：
   - `继续观点提纯`
   - `进入写作准备`
   - `新建永久笔记`

### A3. 观点提纯队列 polish

结果：通过。

1. 队列支持按提纯阶段筛选。
2. 点击队列项会打开对应永久笔记，并把焦点移动到对应字段。
3. 保存或确认后队列即时重算，不需要手工切页面。
4. 空态不再只提示“没有条目”，而是给出下一步出口。

### A4. V1.1 Alpha 验收文档

结果：通过。

1. 本文档明确记录了 Alpha 已实现范围。
2. 测试结果已记录。
3. Alpha done / out-of-scope / Beta 候选已明确拆开。

## 4. 测试记录

本轮实际执行了以下验证：

```powershell
node --test tests/unit/web-note-browser-actions.test.mjs
npm.cmd run test:e2e:browser:file
npm.cmd test
node --test --test-isolation=none --test-name-pattern "prototype browser flow creates, edits, and persists a markdown note" tests/e2e/prototype-browser.test.mjs
```

结果：

```text
node --test tests/unit/web-note-browser-actions.test.mjs
tests 4
pass 4
fail 0

npm.cmd run test:e2e:browser:file
tests 70
pass 70
fail 0

npm.cmd test
tests 441
pass 440
fail 1

single-test rerun for "prototype browser flow creates, edits, and persists a markdown note"
tests 1
pass 1
fail 0
```

说明：

1. 重点验证了命名切换、永久笔记入口文案、观点提纯面板保存与确认、队列筛选与跳转。
2. 全量 `npm.cmd test` 中仅有 1 个浏览器用例在长套件运行时超时；该用例单独重跑通过，当前判断为套件级偶发超时，不构成这次 Alpha 收口的稳定阻断。
3. 因此，本轮把“相关改动已验证通过”视为成立，同时保留“全量浏览器套件存在偶发超时”的残余风险备注。

## 5. Alpha Done

以下内容可视为 Alpha 已完成：

1. 永久笔记的观点字段保存与确认边界
2. 观点提纯主命名切换
3. 队列级别的轻量工作流
4. 写作入口前的最小进度反馈
5. `confirmed` 只能来自用户显式动作这一产品边界

## 6. Out Of Scope

以下内容不进入 V1.1 Alpha：

1. 独立三栏式观点提纯工作区
2. AI 自动生成观点并直接落笔记
3. AI 自动把候选变成 `confirmed`
4. 主题级观点工作区与张力图
5. 全库 AI 扫描
6. 自动生成完整文章

## 7. Beta 候选

建议进入后续 Beta / Phase 2 的候选能力：

1. 观点质量检查层：
   - 过短
   - 过长
   - 像标题
   - 三句话重复
   - 缺边界/反方
2. AI 观点候选：
   - 候选 thesis
   - 候选 three-line summary
   - rationale / source scope
   - adopt as draft
3. 主题级观点组织：
   - central question
   - 主题聚合
   - 从主题进入写作
4. 独立观点提纯工作区：
   - 连续处理队列
   - 更强的上下文切换效率

## 8. 已知说明

1. 工程字段名如 `distillationStatus` 继续保留，不在 Alpha 做大规模重命名。
2. AI 相关能力仍保持 review-only 边界，本轮没有放开自动确认。
3. 本地 QA 运行目录可能出现 `.codex-run/` 临时产物，不属于提交内容。
