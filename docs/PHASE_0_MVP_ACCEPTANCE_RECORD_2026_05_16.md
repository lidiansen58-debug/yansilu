# Phase 0 MVP 验收记录 2026-05-16

> Status: pass with documented follow-up
> Date: 2026-05-16
> Branch: `codex/wt-ai-harness`
> Base commit: `eff1686 Add Phase 0 MVP acceptance checklist`
> Acceptance checklist: `PHASE_0_MVP_ACCEPTANCE.md`

## 1. 验收结论

Phase 0 可信 MVP 当前可标记为：

```text
automated acceptance passed
```

本次没有发现阻断级问题。按当前自动化覆盖，系统已经具备进入 Phase 1 / V1.1 思想提纯器的工程底座。

进入 V1.1 前仍建议保留一次人工演示验收，用真实 vault 跑主流程并记录观察，但这不阻塞当前阶段结论。

## 2. 自动化验证

命令：

```powershell
npm.cmd test
```

结果：

```text
tests 429
pass 429
fail 0
cancelled 0
skipped 0
todo 0
```

## 3. 主验收流覆盖

| 验收流步骤 | 覆盖状态 | 证据 |
| --- | --- | --- |
| 创建或切换本地 vault | Passed | `vault API initializes default vault and can switch active vault path`; browser settings vault flow |
| 导入来源资料 | Passed | import preview/confirm tests for Zotero, Readwise, NotebookLM, Obsidian |
| 生成/编辑文献笔记 | Passed | literature note browser/API flows; paper workspace flows |
| 转化或新建永久笔记 | Passed | permanent note save and literature-to-permanent draft flows |
| 通过原创性守卫 | Passed | originality guard unit/API/browser coverage |
| 建立关系与标签 | Passed | explicit relation create/edit/delete, wikilink/tag sync |
| 在图谱查看 | Passed | graph API and browser graph panel flows |
| 加入写作篮 | Passed | import confirm to writing basket, writing basket flows |
| 创建写作项目 | Passed | writing project API and browser writing panel flow |
| 生成脚手架 | Passed | writing scaffold generation and core writing flow |
| 导出 Markdown | Passed | export API and browser export panel flow |
| 回滚一次导入记录 | Passed | import rollback API/browser flows, modified-file protection |
| 重启后确认数据仍可恢复 | Passed | import record restore/restart tests, autosaved draft restore |

## 4. 验收矩阵摘要

| Area | Result | Notes |
| --- | --- | --- |
| Vault | Pass | 初始化、切换、路径边界有测试覆盖 |
| Source | Pass | 导入候选和来源文件记录有覆盖 |
| LiteratureNote | Pass | 文献转述、保存、候选状态有覆盖 |
| PermanentNote | Pass | 保存、恢复、标题/路径、原创性重算有覆盖 |
| Originality Guard | Pass | warning/block/override 边界有覆盖 |
| Import | Pass | preview/confirm/history/rollback/restore 有覆盖 |
| Export | Pass | selected note、directory tree、asset copy 有覆盖 |
| Assets | Pass | 图片/附件、中文/空格路径、移动后链接重写有覆盖 |
| Relations | Pass | 显式关系 CRUD 与 AI review-only 边界有覆盖 |
| Graph | Pass | 图谱 API、browser graph panel、fixture graph 有覆盖 |
| Writing | Pass | 写作篮、项目、脚手架、强模型 review-only 输出有覆盖 |
| Desktop Shell | Pass | picker fallback、reveal/openUrl fallback 有覆盖 |
| Autosave | Pass | dirty/saved、草稿恢复、tab 隔离有覆盖 |

## 5. 阻断级问题检查

本次未发现以下阻断级问题：

1. 保存显示成功但文件未写入。
2. 导入确认或回滚破坏用户已有文件。
3. vault 切换后路径越界或数据混入另一个 vault。
4. blocked 原创性内容仍写入 confirmed permanent note。
5. 图片/附件保存后链接不可恢复。
6. 关系或图谱无法追溯到真实笔记。
7. 写作项目无法追溯来源永久笔记。
8. 重启后草稿、tabs 或 active note 状态造成数据误写。

## 6. 非阻断后续

进入 V1.1 前建议补一条人工记录：

```text
真实 vault 演示：来源资料 -> 文献笔记 -> 永久笔记 -> 关系/标签 -> 图谱 -> 写作项目 -> 脚手架 -> 导出/回滚
```

目的不是再证明测试，而是确认真实用户路径的文案、状态提示和操作节奏足够清楚。

## 7. Phase 0 结论

Phase 0 的工程验收结论：

```text
可信 MVP 收口通过，可以进入 Phase 1 / V1.1 的第一刀。
```

下一阶段建议启动：

```text
永久笔记右侧提纯面板：thesis + three_line_summary
```

原则保持：

1. 手写优先。
2. AI 只提供候选态辅助。
3. 不自动确认用户判断。
4. 不自动改写永久笔记正文。
