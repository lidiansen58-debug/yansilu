# Phase 0 MVP 验收清单

> Status: acceptance draft
> Date: 2026-05-16
> Related: `PHASE_0_TO_V1_1_EXECUTION_PLAN.md`

## 1. 验收目标

Phase 0 的目标不是证明功能很多，而是证明：

```text
研思录可以可信地承载用户的本地资料、笔记、关系和写作资产。
```

验收时优先检查：

1. 数据不会静默丢失或损坏。
2. 文件始终可读、可迁移、可恢复。
3. 导入、回滚、导出可被用户理解和信任。
4. 原创性守卫不会被核心流程绕过。
5. 永久笔记能进入关系、图谱和写作闭环。

## 2. 主验收流

用一条真实用户流验收 Phase 0：

```text
创建或切换本地 vault
-> 导入来源资料
-> 生成/编辑文献笔记
-> 转化或新建永久笔记
-> 通过原创性守卫
-> 建立关系与标签
-> 在图谱查看
-> 加入写作篮
-> 创建写作项目
-> 生成脚手架
-> 导出 Markdown
-> 回滚一次导入记录
-> 重启后确认数据仍可恢复
```

## 3. 验收矩阵

| Area | 必须通过 | 风险信号 |
| --- | --- | --- |
| Vault | 初始化、切换、恢复后目录结构稳定 | 切换后丢失当前 note、路径越界、默认目录重复 |
| Source | 来源资料可创建、读取、定位 | 原始资料路径不可恢复、文件名乱码 |
| LiteratureNote | 文献笔记可转述、保存、恢复 | 转述为空仍能进入永久笔记流程 |
| PermanentNote | 永久笔记可保存、恢复、进入关系/写作 | 正文被自动改写、标题路径不同步 |
| Originality Guard | 高相似内容被 warning/block | 可绕过确认、block 后仍写入 confirmed permanent note |
| Import | preview/confirm/history/rollback 可追踪 | rollback 删除用户修改文件、记录丢失 |
| Export | Markdown 与资产链接可用 | 导出到 vault 内部、资产路径断裂 |
| Assets | 图片/附件插入、预览、保存后可访问 | 中文/空格路径失效、预览 404 |
| Relations | 显式关系可创建、编辑、删除 | AI 候选直接变 confirmed relation |
| Graph | 目录图谱可打开节点、显示关系 | 图谱节点打不开、关系方向错乱 |
| Writing | 永久笔记可进入写作篮并生成脚手架 | 写作项目脱离来源笔记、脚手架不可追溯 |
| Desktop Shell | vault picker、打开文件、外链打开可用 | 桌面命令失败无 fallback |
| Autosave | dirty/saved 状态可信，重启可恢复草稿 | 保存状态显示已同步但文件未写入 |

## 4. 自动化测试映射

当前已有测试应覆盖：

1. API 基础：directories、notes、assets、imports、exports、vault、writing。
2. 原创性：originality guard、paper workspace、permanent note save。
3. 图谱与关系：relation API、graph API、browser graph flow。
4. Web 主流程：prototype browser e2e。
5. AI review-only 边界：AI inbox、analysis artifacts、provider execution。

验收前必须跑：

```powershell
npm.cmd test
```

必要时补跑浏览器单项：

```powershell
$env:RUN_BROWSER_E2E='1'
node --test --test-isolation=none tests/e2e/prototype-browser.test.mjs
```

## 5. 手工验收记录模板

每次手工验收记录：

```text
Date:
Commit:
Vault path:
Scenario:
Result: pass / fail / blocked
Data loss risk:
Originality guard result:
Import rollback result:
Export result:
Known issues:
Next fix:
```

## 6. Phase 0 阻断级问题定义

以下问题必须优先修复：

1. 保存显示成功但文件没有写入。
2. 导入确认或回滚会破坏用户已有文件。
3. vault 切换后路径越界或数据混入另一个 vault。
4. 原创性 blocked 内容仍能作为 confirmed permanent note 写入。
5. 图片/附件保存后链接不可恢复。
6. 关系或图谱写入无法追溯到真实笔记。
7. 写作项目无法追溯来源永久笔记。
8. 重启后草稿、tabs 或 active note 状态造成数据误写。

## 7. Phase 0 通过标准

Phase 0 可标记为通过，当：

1. 主验收流可重复跑通。
2. `npm.cmd test` 全绿。
3. 阻断级问题为 0。
4. 已知非阻断问题记录清楚。
5. 用户能解释自己的文件在哪里、如何导出、如何回滚、AI 候选如何被审阅。

## 8. 通过后进入 V1.1

Phase 0 通过后，下一步进入：

```text
永久笔记右侧提纯面板：thesis + three_line_summary
```

V1.1 的第一刀必须保持手写优先，AI 只提供候选态辅助。
