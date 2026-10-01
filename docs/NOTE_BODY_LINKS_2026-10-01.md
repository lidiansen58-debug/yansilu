# 正文笔记链接优化

分支：`fix/editor-relations-ux`；基线：`1cea231c`（main 已合并 PR #205）。

本轮优先正文内插入、修改和跳转笔记链接，交付一个可审查的改动。

## 行为

- 编辑器的“插入链接”按钮及 `[[` 入口只需搜索目标、选择并插入，移除关系类型和理由表单。随笔、文献与永久笔记均可使用。
- 搜索覆盖当前笔记库，包括尚未加载的目录；旧查询、切换笔记或笔记库后的结果不会进入当前界面。
- 新链接使用 `[[笔记ID|可读标题]]`，确保重名时仍指向选中的笔记。富文本显示可读别名；源码保留完整目标。
- 光标放进已有完整链接后使用同一按钮，可更换整条链接；只改选中范围，不重写正文中的其他别名、路径或段落链接。
- 键盘可先按 Enter 选择目标，再按 Enter 插入；源码使用 Ctrl/Cmd+点击，富文本直接点击，可预览目标，再打开编辑。
- 链接通过正文保存自动同步关系；不额外提交独立关系。保存失败保留编辑器内容，返回后有新输入时不重置光标或滚动。
- 原有侧栏独立关系入口继续处理关系类型和理由。

## 验证

- 相关单元测试：**530/530 通过**，包含链接范围、重名身份、迟到搜索、失败保存和请求期间继续编辑。
- 相关浏览器用例：**16 项通过**：正文链接 5 项、编辑往返及草稿恢复 5 项、独立关系编辑 2 项、原有入口和标签/链接跳转 4 项。正文链接用例覆盖三类笔记、两种编辑模式、390px 窄屏，实际保存、刷新、改目标及跳转。
- 原有 `[[` 键盘用例已更新，选择目标后第二次 Enter 能插入，无需理由；持久化得到自动正文链接关系。
- 已查看窄屏链接预览和编辑截图。
- `npm run build:toastui` 成功；源文件与提交的浏览器 bundle 同步。
- 编码检查无新增问题，`git diff --check` 通过。

```powershell
$noteTests = @(rg --files tests/unit | Where-Object { $_ -match 'web-(editor|source-note|source-promotion|source-permanent|note-|preview-relation|renamed-note|permanent-|relation-|graph-relation|app-shell-save-note|app-shell-state-note|app-shell-note-state|prototype-literature|link-picker)' })
node --test @noteTests
$env:RUN_BROWSER_E2E='1'
node --test --test-concurrency=2 tests/e2e/prototype-body-links.test.mjs tests/e2e/prototype-editor-roundtrip.test.mjs tests/e2e/prototype-relation-edit-safety.test.mjs
node --test --test-name-pattern='literature note.*toolbar|inline wikilink picker inserts ranked|opens wikilinks and tag results' tests/e2e/prototype-browser.test.mjs
npm run build:toastui
npm run encoding:doctor
git diff --check
```

日志与截图保存在忽略目录 `output/note-editor-validation/body-links-*` 和 `body-link-*`。此处报告的是相关用例，不代表全仓库浏览器套件通过；前轮报告的旧关系面板断言限制仍存在。真实系统输入法、手机软键盘与桌面安装包未验证。测试使用临时笔记库。

## 第二轮：插入与修改链接

- 修改已有链接时显示“修改笔记链接”和“保存链接”。确认原目标会保留完整引用，包括路径、段落或块定位、自定义别名。
- 更换目标会保留自定义别名；原别名等于原笔记标题时改用新标题。原段落或块定位属于旧目标，更换目标时移除。
- 原目标尚未加载时，按稳定 ID 加载并预选；关闭窗口、开始新搜索或切换笔记/笔记库后，迟到请求不能修改当前选择。歧义标题不会自动确认。
- 方向键和鼠标移动选择后，确认按钮使用当前候选；远程搜索返回时保留方向键选中的候选。
- 保存过程关闭窗口仍保持插入锁定，直到请求结束，避免重复写入。

本轮 **538 项相关单元测试、18 项浏览器用例通过**（7 项正文链接、5 项编辑往返与草稿、2 项独立关系、4 项原有入口）。新增浏览器用例覆盖未加载的原目标、原链接确认、别名与段落定位保留、重名目标的方向键更换，以及 390px 富文本布局。编码无新增问题，`git diff --check` 通过。本轮未修改 ToastUI 源码或 bundle。

日志：`output/note-editor-validation/link-edit-unit-all.log`、`link-edit-browser-final.log`、`link-edit-legacy.log`、`link-edit-encoding.log`；窄屏截图：`link-edit-alias-wysiwyg.png`。验证范围和上一轮限制相同。
