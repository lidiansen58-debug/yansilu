# Prototype Prompt Guardrails

This note captures prompt-writing rules that help avoid growing oversized
`prototype-*` files during Codex-led development.

## Goal

Keep `prototype` entry files as thin orchestration shells.

They may:

- wire modules together
- pass state into views
- connect events to handlers

They should not accumulate:

- new business rules
- new state derivation logic
- new workflow controllers
- new compatibility logic
- unrelated UI sections

## Default Prompt Rules

When asking Codex to build or modify a feature that touches prototype files,
include these constraints:

1. Do not keep adding new business logic into `prototype-app.js` or other
   prototype entry files.
2. If this change introduces a new responsibility, extract a directly related
   small module and let the prototype file only wire it in.
3. A local structural split is allowed if needed for the current goal, but do
   not expand it into a full refactor.
4. Stop once the current feature reaches reviewable scope.

## Recommended Prompt Template

Use this as the default feature-development prompt when prototype files are in
scope:

```text
工作目录：<path>
分支：<branch>
目标：<一句话功能目标>

只改：<模块/文件范围>
代码组织要求：
- 不要把新的业务逻辑继续堆进 prototype 主文件
- 如果引入新职责，优先拆出一个直接相关的小模块
- prototype 主文件只负责装配、接线和模块组合
- 允许顺手做一层局部拆分，但不要扩展成全面重构

停止条件：达到可 review 状态就停
验证：<最小测试命令>
```

## Responsibility Mapping Hints

Prefer these destinations when a change adds a new kind of logic:

- workflow logic -> `*-controller.js`
- derived state / transformation -> `*-model.js`
- pure reusable logic -> `*-helpers.js`
- local UI surface -> `*-view.js` or `*-panel.js`
- integration / settings wiring -> dedicated navigation or routing modules

## High-Risk File Warning Signs

Treat a file as an early split candidate if any of these are true:

- the same file is touched by unrelated features repeatedly
- one feature requires jumping across many distant sections of the file
- the file contains UI, state derivation, and workflow logic together
- review explanations for the file are getting harder
- new features keep defaulting to "just add it into prototype-app"

## Allowed Small Splits

Encourage one-step extractions like:

- `graph-followup-controller.js`
- `graph-followup-model.js`
- `editor-relation-events.js`
- `permanent-note-sidebar-controller.js`
- `prototype-settings-navigation.js`

These are good because they reduce future growth pressure without forcing a
full architecture rewrite.

## Anti-Pattern Prompts

Avoid prompts like:

```text
实现图谱后续建议
继续完善 prototype 里的关系流程
把这个功能接到现有 prototype 页面里
```

These encourage Codex to push more logic into existing large files.

## Better Prompt Rewrites

Instead, say:

```text
实现图谱后续建议 MVP。
不要把新的关系后续建议逻辑继续堆进 prototype-app.js。
如果引入新职责，优先拆出 graph-followup-controller.js 或
graph-followup-model.js，由 prototype 文件只做接线。
达到可 review 状态就停。
```

## Review Checklist

Before accepting a prototype-related change, ask:

1. Did this change add a new responsibility?
2. If yes, was that responsibility moved into a local module?
3. Is the prototype file still mostly acting as a shell?
4. Did this change stay within one clear feature boundary?

If the answer to 2 or 3 is "no", the next round should split a local module
before more feature growth continues.
