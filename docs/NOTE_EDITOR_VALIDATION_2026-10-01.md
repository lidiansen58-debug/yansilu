# 笔记编辑流程验证与优化

基线：`origin/main` 的 `d900c88d`（已合并 PR #204）。
分支：`fix/note-editor-validation`。

## 范围与完成条件

验证下列流程的实际输入、持久化和返回路径；为确认的问题补充回归并分批修复。完成条件为清单中的主要路径均有测试证据、已发现的范围内缺陷完成修复、相关回归通过，交付可审查的差异。真实系统输入法、桌面安装包与外部 AI 服务的限制需单独记录。

| 流程 | 验证重点 | 结果 |
| --- | --- | --- |
| 通用编辑 | 新建选中标题、正文输入、富文本/源码切换、格式、长文编辑 | 三类笔记的两种模式标题接正文、Unicode 内容往返通过；已有长文标签隔离用例通过 |
| 保存与恢复 | 自动/手动保存、失败重试、并发编辑、切换/关闭标签、刷新恢复 | 保存反馈、保存中切换、取消关闭、关闭其他标签通过；修复恢复草稿后不自动保存 |
| 随笔 | 编辑、保存、生成永久笔记、重复操作、保留来源 | 成功、写回失败、空回执、转换中继续输入、重试与刷新通过 |
| 文献笔记 | 标题、摘录、出处、转述、完成条件、生成永久笔记 | 模板字段保留、出处与正文转换、失败恢复通过；完成门槛由单元/API 测试覆盖 |
| 永久笔记 | 编辑、来源链接、生成后继续编辑、返回来源 | 新建编辑保存、来源与生成结果的双向链接通过 |
| 笔记关联 | 搜索目标、创建/编辑/删除关系、跳转、重名、刷新持久化、切换隔离 | 当前搜索创建入口、链接跳转已有浏览器用例通过；新增精确入向关系编辑/删除、失败重试回归；重名身份由单元和 API 覆盖 |
| 窄屏 | 核心编辑入口和关联操作可达性 | 390px 新建、标题接正文、保存以及关系编辑/删除通过，页面无水平溢出 |

## 工作规则

- 仅在独立 worktree 修改代码，使用测试临时笔记库。
- 每项修复只解决一个明确问题；新增职责放在小模块中，避免扩展大型入口文件。
- 优先修复内容丢失、错误保存反馈、操作对象错位和流程阻断；不增加帮助面板或重复入口。
- 所有新建和修改文本文件使用 UTF-8；脚本写文件须明确指定 UTF-8。

## 已确认并修复的问题

1. **转换过程中覆盖新输入或错误标记为已保存。** 将来源转换事务提取到 `source-note-promotion-controller.js`，等待现有保存、合并请求期间的新输入，只确认实际返回的保存快照。写回失败保留草稿与警告，已创建的永久笔记仍可使用。
2. **重复转换和选择目录后的上下文错位。** 同来源的并发转换复用一个请求；目录弹窗返回后核对原笔记和笔记库，转换请求结束后再次核对笔记库，避免跨库写回。
3. **来源链接依赖标题。** 生成的来源与回链使用带可读别名的稳定 ID，后续插入其他链接也不再抹掉已有 ID。重名及重命名不会因本次链接规范化丢失身份。
4. **多条关系之间误编辑、误删除。** 编辑草稿携带选中的关系 ID，并按该 ID 查找；关系已消失时拒绝保存。每条入向/出向关系都有自己的操作按钮，保留方向与原有草稿状态。
5. **空回执被当作成功。** 创建永久笔记、写回来源、创建/更新关系均校验返回结果；来源返回错误 ID 或缺少正文也按失败处理，不能更新已保存快照。关联保存失败保留字段并清除过时的“正在保存”状态。
6. **关系编辑按钮被表单裁切。** 编辑区域允许滚动，错误信息保留高度；桌面和 390px 窄屏均完成失败重试及删除操作。
7. **恢复草稿后必须再打字才会自动保存。** 打开恢复的脏标签后启动自动保存；通过刷新、接受恢复、无新输入、等待自动保存的浏览器回归确认。

## 验证结果

- 相关单元测试：**521/521 通过**，无跳过。
- API 集成：**36/36 通过**，覆盖笔记持久化、重命名链接、分类与元数据、文献完成条件等。
- 集中的浏览器回归：**26/26 通过**，无跳过。强化窄屏标题/正文精确断言后单独重跑 **1/1 通过**。
- 旧浏览器套件抽查 12 项：6 项通过；另外 6 项仍使用过时界面断言，未计入上述 26 项通过结果，详见下节。
- `npm run encoding:doctor`：没有相对编码基线的新增问题。
- `git diff --check`：通过；一个既有文件提示 CRLF 将被 Git 规范化为 LF，不是差异错误。
- 已查看桌面/窄屏关系失败截图和窄屏编辑截图；测试数据全部位于临时笔记库。

PowerShell 复现命令（在本 worktree 根目录执行）：

```powershell
$noteTests = @(rg --files tests/unit | Where-Object { $_ -match 'web-(editor|source-note|source-promotion|source-permanent|note-|preview-relation|renamed-note|permanent-|relation-|graph-relation|app-shell-save-note|app-shell-state-note|app-shell-note-state|prototype-literature|link-picker)' })
node --test @noteTests
node --test tests/integration/api-notes.test.mjs tests/integration/note-rename-links.test.mjs tests/integration/note-ux-feedback.test.mjs
$env:RUN_BROWSER_E2E='1'
node --test --test-concurrency=2 tests/e2e/prototype-note-title-body-entry.test.mjs tests/e2e/prototype-editor-save-feedback.test.mjs tests/e2e/prototype-editor-close-autosave.test.mjs tests/e2e/prototype-source-promotion-safety.test.mjs tests/e2e/prototype-relation-edit-safety.test.mjs tests/e2e/prototype-editor-roundtrip.test.mjs
npm run encoding:doctor
git diff --check
```

证据保存在忽略目录 `output/note-editor-validation/`：`unit-final.log`、`integration.log`、`e2e-final.log`、`mobile-final.log`、`encoding.log`、`relation-error-1366.png`、`relation-error-390.png`、`mobile-editor.png`。早期失败日志保留用于复现比较，不代表最终回归状态。

## 验证边界与旧套件情况

`prototype-browser.test.mjs` 的六个旧失败分别涉及右侧关系入口、关系面板渲染、旧创建表单、旧目标搜索表单、旧内联编辑表单、刷新后资源管理器定位。它们仍定位隐藏的 select、旧侧栏表单或已经变化的文案/默认页面；部分夹具使用字面量反引号 n。新回归使用当前关系弹窗和搜索入口，覆盖关键编辑删除、失败重试与草稿恢复路径。本次没有全面迁移这个大型旧套件，不能宣称仓库全量浏览器测试通过。

未验证真实系统中文输入法组合事件、Tauri 桌面安装包、移动设备软键盘，以及外部 AI 服务在线响应；中文浏览器输入使用 Playwright `insertText`。AI 已有草稿的转换接入通过代码和单元检查，不代表在线 AI 端到端验证。

## 提交前审查

再次检查了转换与现有保存之间的互斥、请求期间新输入的合并、空回执及笔记库切换后的写回保护，以及关系 ID 从操作入口到保存/删除的传递。未发现新的阻断问题。代码未在最终回归后发生变化，因此沿用上述回归结果。

工作区：`E:\Projects\Thinking in Notes\yansilu-wt\fix-note-editor-validation`。依赖在本 worktree 独立安装，未修改锁文件或共享工作区内容。修复按来源转换、关系操作、草稿恢复与验证分为本地提交，尚未推送或创建新 PR。
