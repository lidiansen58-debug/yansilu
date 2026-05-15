# 研思录 v0.1 发布路线图

更新日期：2026-05-09

## 1. 当前判断

研思录当前已经进入 `v0.1 Windows 桌面内测候选` 阶段。

这不是早期原型阶段了。核心链路已经具备真实运行能力：

- API、Web prototype、本地 Vault、Markdown 文件事实源已经跑通。
- 目录、笔记、标签、wikilink、图谱、导入、导出、写作 scaffold 已经接入真实 API 和本地持久化。
- Windows 桌面构建、NSIS 安装包、静默安装、卸载、重装、已安装程序启动已经有本地验证记录。
- `npm.cmd test` 当前基线为 `131 pass / 0 fail / 50 skipped`。
- `npm.cmd run mvp:check` 已覆盖核心测试、smoke e2e、快速真实浏览器 MVP e2e、桌面开发预检和桌面打包预检。

当前不应该再把 v0.1 当作功能扩张阶段。接下来要把它当成发布收口阶段。

## 2. v0.1 发布目标

v0.1 的目标是交付一个可信的本地优先桌面内测版。

发布承诺：

- 用户可以在本地 Vault 中创建、编辑、移动、删除目录和笔记。
- Markdown 文件是用户内容的事实源。
- 用户可以通过 `[[wikilink]]`、`#tag`、反链和图谱建立基础结构。
- 用户可以导入 Markdown / Obsidian 内容，先预览，再确认，再查看历史和回滚。
- 用户可以从永久笔记创建写作项目，并生成带证据映射、缺口、反方和开放问题的 scaffold。
- Windows 用户可以安装并启动桌面应用。

不在 v0.1 发布承诺内：

- 生产级账号系统。
- 生产级 Stripe 付费链路。
- macOS / Linux 正式安装包承诺。
- V1.1 思想提纯工作台。
- Paper workspace / NotebookLM 工作流。
- 语义搜索、语音输入、协作、多端同步。
- AI 自动代写完整终稿或自动保存 AI 生成的永久笔记正文。

## 3. 发布门槛

v0.1 可以发布内测版，需要同时满足以下条件：

1. `npm.cmd run mvp:check` 通过。
2. `npm.cmd run build:desktop` 能产出 Windows NSIS 安装包。
3. 使用安装后的桌面应用完成一次人工 walkthrough。
4. 原生目录选择、打开目录、定位 Markdown 文件在桌面壳内可用。
5. 中文路径和带空格路径完成至少一次验证。
6. 导入、导出、图谱、写作 scaffold 在安装版中完成验证。
7. 发布说明写清楚已知限制和备份建议。
8. 没有 P0 缺陷。

## 4. 最后一公里工作

### P0：发布前必须完成

1. Windows packaged-app walkthrough
   - 安装 NSIS 包。
   - 从安装后的程序启动，而不是 dev shell。
   - 新建 Vault 或切换 Vault。
   - 新建目录和笔记。
   - 编辑、保存、重启后确认内容仍在。
   - 插入 `[[wikilink]]`。
   - 点击 `#tag`。
   - 导入 Markdown / Obsidian 示例。
   - 导出 Markdown。
   - 打开图谱并从节点回跳笔记。
   - 创建写作项目和 scaffold。

2. 桌面原生能力验证
   - 目录选择器可返回路径。
   - 可打开当前目录。
   - 可定位当前 Markdown 文件。
   - 权限失败或路径不可用时有可读错误。
   - 中文路径、空格路径不破坏保存、导入、导出、打开位置。

3. 发布包与说明
   - 记录安装包路径、版本号、构建时间。
   - 生成或确认 bundle manifest 和 checksum。
   - 写 `v0.1` release note。
   - 写 `Known Issues`。
   - 写本地 Vault 备份建议。

4. 工作区清理
   - 构建产物、日志、临时目录不进入发布提交。
   - 样例 Vault 数据只保留必要 fixture。
   - 发布候选分支保持可审阅。

### P1：强烈建议发布前完成

1. 把 full browser e2e 拆成更小的可运行脚本，避免单次运行超过 shell 或 CI 时间预算。
2. 为桌面原生 dialog/opener 行为补最小自动化覆盖或人工 checklist 证据。
3. 加一组更贴近真实用户的 Obsidian / Markdown vault fixture。
4. 从设置页提供一键打开当前 Vault 根目录。
5. 补充安装后首次启动的空状态和错误态走查。

### P2：可延后到 v0.2

1. macOS / Linux 打包 smoke。
2. MSI 稳定打包和 WiX 缓存策略。
3. 自动更新。
4. 代码签名。
5. 生产级账号和计费。
6. 更重的连接器和 AI suggestion 流。

## 5. Worktree 执行分工

建议下一阶段使用以下 worktree：

- `mainline`
  - 只做集成、回归、发版判断。
  - 不承接大功能开发。

- `wt-desktop-release`
  - 第一优先级。
  - 负责 packaged-app walkthrough、桌面原生能力、安装包、发布说明。

- `wt-core-workflow`
  - 负责 walkthrough 中发现的笔记、编辑器、图谱、写作主链路缺陷。

- `wt-import-pipeline`
  - 负责真实 Markdown / Obsidian 导入 fixture、rollback、skip reason、导入体验缺陷。

- `wt-growth-site`
  - v0.1 不作为阻塞项。
  - 保留给官网、注册、登录、计费的后续工作。

不建议此时同时打开太多新方向。v0.1 当前最怕的是范围膨胀，不是功能不够多。

## 6. 一周收口节奏

### Day 1：冻结发布候选范围

目标：

- 确认 v0.1 只发布 Windows 桌面内测版。
- 冻结 v0.1 不做的范围。
- 创建或确认 `wt-desktop-release`。
- 跑 `npm.cmd run mvp:check`。

出口：

- 有一份明确的发布候选状态。
- 没有新增功能进入 v0.1 门槛。

### Day 2：安装版 walkthrough

目标：

- 使用 NSIS 安装包安装。
- 从安装后的程序完成完整 MVP walkthrough。
- 记录所有 P0/P1 问题。

出口：

- 至少一份人工 walkthrough 记录。
- P0 问题进入修复列表。

### Day 3：修 P0 缺陷

目标：

- 只修 walkthrough 中的 P0。
- 桌面路径、保存、导入、导出、图谱、写作任何阻断优先。

出口：

- P0 清零或明确降级理由。
- `npm.cmd run mvp:check` 重新通过。

### Day 4：发布包重建

目标：

- 重新构建 Windows 安装包。
- 重新安装、启动、卸载、重装。
- 确认 manifest、checksum、安装路径。

出口：

- 有一枚可指向的 v0.1 RC 安装包。

### Day 5：文档与已知问题

目标：

- 写 release note。
- 写 known issues。
- 写用户备份建议。
- 写最小使用说明。

出口：

- 内测用户能知道怎么安装、怎么试、什么不要依赖。

### Day 6：第二轮回归

目标：

- 再跑一次 `npm.cmd run mvp:check`。
- 再跑一次 packaged-app 主链路。
- 确认没有回归。

出口：

- 连续两轮验证通过。

### Day 7：Go / No-Go

目标：

- 对照发布门槛做最终判断。
- 如果通过，打 `v0.1.0-rc` 或等价标签。
- 如果不通过，只保留 P0 修复，不再扩大范围。

出口：

- 发布或明确延期原因。

## 7. 推荐立即执行

下一步从 `wt-desktop-release` 开始。

建议执行：

```powershell
npm run wt:create -- -Name desktop-release -Kind feat
npm run wt:run -- -Target all
npm.cmd run mvp:check
npm.cmd run build:desktop
```

然后用安装包做人工 walkthrough。

如果 `wt-desktop-release` 已经存在，就直接进入该 worktree，先跑 `npm.cmd run mvp:check`，再开始安装版 walkthrough。

## 8. v0.2 方向

v0.1 发布后，v0.2 可以分两条线推进：

1. 产品深度线
   - 思想提纯 workspace。
   - index card / relation model 深化。
   - 更清晰的 AI suggestion 边界和拒绝/采纳流程。
   - 更好的真实 vault 导入体验。

2. 商业化外层
   - 生产级 auth。
   - Stripe checkout / portal / webhook 完整闭环。
   - 官网、定价页、账号页。
   - 下载页和自动更新策略。

v0.2 的关键选择是：先深化本地产品价值，还是先推进公开商业化。这个选择不应该在 v0.1 收口期混进来。
