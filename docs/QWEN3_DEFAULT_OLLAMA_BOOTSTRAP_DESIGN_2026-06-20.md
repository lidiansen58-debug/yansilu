# qwen3:8b 默认本地模型与 Ollama 引导设计

日期：2026-06-20

分支：`design/qwen3-default-ollama-bootstrap`

## 目标

本阶段只做分析、方案和规划，不实现功能代码。

设计目标是把 `qwen3:8b` 作为研思录默认本地模型，并在用户进入图谱 AI 能力或 AI 设置时，发现本地 AI 缺失状态，引导用户完成 Ollama 与默认模型准备。

核心原则：

- 不静默安装 Ollama。
- 不在用户只是打开图谱时自动下载模型。
- 所有会启动本机进程、下载模型、保存本地 AI 配置的动作都必须有明确用户确认。
- 检查、安装引导、启动、拉取模型、保存配置、健康检查要有清晰状态、进度和失败回退。
- 文案必须说明本地运行与隐私边界：Ollama 和模型运行在本机，但下载模型需要访问 Ollama 模型源；混合模式仍可能使用远程模型。

## 当前代码盘点

### 默认模型和模型目录

已有默认模型常量：

- `packages/ai-orchestrator/src/local-model-catalog.mjs`
  - `DEFAULT_LOCAL_AI_MODEL = "qwen3:8b"`
  - `DEFAULT_LOCAL_AI_MODEL_DOWNLOAD_COMMAND = "ollama pull qwen3:8b"`
  - `LOCAL_AI_MODEL_TIERS` 包含 `qwen2.5:7b`、`qwen3:8b`、`qwen3.5:9b`
  - `LOCAL_AI_RECOMMENDED_MODELS` 把 `qwen3:8b` 放在第一位

已有相关测试：

- `tests/unit/ai-model-pack-config-contract.test.mjs`
- `tests/unit/ai-provider-config-contract.test.mjs`
- `tests/unit/ai-note-analysis.test.mjs`
- `tests/unit/ai-scheduled-agent-tasks.test.mjs`

设计判断：默认模型大方向已经落地，不需要另建常量。后续实现应避免在前端、脚本、文档里继续分散硬编码，优先从后端 preview 返回的 `recommendedModel`、`modelTiers`、`downloadCommand` 驱动界面。

### Provider preset 与路由

已有 Ollama provider preset：

- `packages/ai-orchestrator/src/provider-presets.mjs`
  - `ollama_local_gateway`
  - 默认 endpoint：`http://localhost:11434/v1/chat/completions`
  - health endpoint：`http://localhost:11434/api/tags`
  - runtime model map 各逻辑 tier 默认指向 `DEFAULT_LOCAL_AI_MODEL`

已有 AI 设置状态：

- `apps/web/src/ai-settings-state.js`
  - 支持 `auto`、`local_only`、`hybrid`、`cloud_only`
  - `Ollama Local` 映射到 `ollama_local_gateway`
  - `Privacy First` / `hybrid` 可走本地优先路径

设计判断：`qwen3:8b` 默认模型应继续放在 AI orchestrator 层，设置页只展示和选择，不拥有默认模型真相。

### 后端 Ollama 能力

已有后端能力集中在 `apps/api/src/server.mjs`：

- 安装引导：`ollamaInstallGuide()`
  - Windows: `winget install --id Ollama.Ollama -e --accept-package-agreements --accept-source-agreements`
  - macOS: `brew install ollama`
  - Linux: `curl -fsSL https://ollama.com/install.sh | sh`
  - 当前 `autoInstallSupported: false`
- 检测安装：`detectOllamaInstallation()`
  - Windows 检查 `%LOCALAPPDATA%\Programs\Ollama\ollama.exe`、`Program Files` 等
  - macOS/Linux 检查 `/opt/homebrew/bin/ollama`、`/usr/local/bin/ollama`、`/usr/bin/ollama`
  - fallback 到 PATH
- 检测运行与模型：`buildOllamaModelsPreview()`
  - 调 `/api/tags`
  - 返回 installed、status、models、recommendedModel、modelTiers、setupGuide
- 启动/停止：
  - `startOllamaRuntime()`
  - `stopOllamaRuntime()`
- 拉取模型：
  - `pullOllamaModel(model)`
  - 当前使用 `/api/pull` 且 `stream: false`
- 一键准备：
  - `buildOllamaBootstrapPreview()`
  - `bootstrapOllamaLocalAi()`
  - 状态包括 `needs_install`、`needs_start`、`needs_model`、`needs_config`、`needs_health_check`、`ready`
- API：
  - `GET /api/v1/ai/local-runtimes/ollama/models`
  - `GET /api/v1/ai/local-runtimes/ollama/bootstrap`
  - `POST /api/v1/ai/local-runtimes/ollama/bootstrap`
  - `POST /api/v1/ai/local-runtimes/ollama/start`
  - `POST /api/v1/ai/local-runtimes/ollama/stop`
  - `POST /api/v1/ai/local-runtimes/ollama/pull-model`

安全边界：

- mutation endpoints 已经要求本机 loopback、允许的本地 origin、`X-Yansilu-Local-Runtime-Control: 1`
- 测试位于 `tests/unit/api-local-runtime-controls.test.mjs`

设计判断：检测和执行本机运行时动作应该继续放在后端。前端只触发 API、展示状态、收集确认，不直接执行 shell 或拼装安装命令。

### 前端设置入口

已有前端 API：

- `apps/web/src/prototype-api.js`
  - `fetchOllamaModels`
  - `fetchOllamaBootstrapStatus`
  - `bootstrapOllamaLocalAi`
  - `startOllamaRuntime`
  - `stopOllamaRuntime`
  - `pullOllamaModel`

已有设置页状态和 UI：

- `apps/web/src/prototype-app.js`
  - `previewOllamaLocalAiBootstrapFromUi`
  - `bootstrapOllamaLocalAiFromUi`
  - `detectOllamaModels`
  - `startOllamaRuntimeFromUi`
  - `stopOllamaRuntimeFromUi`
  - `pullRecommendedOllamaModel`
  - 本地模型推荐列表里已有 `qwen3:8b`，并标记为默认
  - AI 设置页已有本地模式、检测 Ollama、启动 Ollama、下载推荐模型、试运行等 UI 基础

设计判断：AI 设置是最自然的一站式向导入口。这里可以承载完整引导、进度、失败恢复和隐私说明。

### 图谱入口

当前图谱相关路径：

- 打开 graph module 时，已有测试要求会静默调用 `previewOllamaLocalAiBootstrapFromUi({ silent: true, render: false })`，然后刷新图谱。
- `runGraphAiAnalysis()` 中，如果 `localOllamaSetupActive()` 为真，会调用 `bootstrapOllamaLocalAiFromUi({ render: false })`，默认可能 `autoStart`、`pullModel`、`enableConfig`、`healthCheck` 都执行。

设计判断：这是最需要调整的地方。打开图谱可以做轻量预检，但不应自动启动 Ollama 或下载模型。点击“AI 图谱初判/目录扫描/关系分析”时，也不应直接下载模型，而应先展示确认式准备面板或转到 AI 设置。

## 合理性判断

### 点击图谱时做本地 AI 准备检查是否合适？

合适，但只适合做非侵入式检查。

图谱是用户首次感知“AI 能帮我看关系和缺口”的高价值场景。进入图谱时做一次轻量能力检查，有助于在需要时解释为什么 AI 图谱分析不可用。

但图谱本身是阅读和理解空间，不应把用户从图谱任务中强行拉到安装流程。因此打开图谱时只建议：

- 读取已缓存或快速 preview 状态。
- 如果本地 AI 未就绪，在图谱 AI 区域显示小提示。
- 提供“查看本地 AI 准备状态”或“去 AI 设置准备”的入口。

不建议：

- 自动启动 Ollama。
- 自动拉取 `qwen3:8b`。
- 自动保存 provider config。
- 弹出阻断式安装向导。

### 点击 AI 设置时触发部署引导是否更自然？

更自然。

AI 设置是用户预期中管理能力、隐私、模型和运行方式的地方。完整向导应放在这里，包括：

- 自动检测 Ollama 是否安装和运行。
- 显示 Windows/macOS 安装路径和命令。
- 允许用户启动 Ollama。
- 允许用户下载 `qwen3:8b`。
- 下载完成后保存本地 provider config。
- 运行健康检查和测试聊天。
- 解释仅本地和混合模式差异。

### 哪些场景只提示，哪些场景进入安装向导？

只提示：

- 打开图谱页。
- 打开普通笔记页。
- 刷新图谱。
- 查看 AI Inbox。
- 浏览设置总览但未选择本地 AI。

可以进入安装向导：

- AI 设置页点击“使用本地大模型”。
- AI 设置页切换到“仅本地”或“本地优先”后点击“开始准备”。
- 图谱 AI 区点击“用本地 AI 分析关系”但本地 AI 未就绪时，展示确认面板，用户点击“准备本地 AI”后进入向导。
- AI Inbox 中点击需要本地 summary 的动作，但本地 AI 未就绪时，提示并引导到 AI 设置。

可以执行本机动作：

- 用户明确点击“启动 Ollama”。
- 用户明确点击“下载 qwen3:8b”。
- 用户明确点击“保存为本地 AI 配置”或“完成准备”。
- 用户明确点击“试运行”。

### 是否应避免打开图谱就自动下载模型？

应该避免。

`qwen3:8b` 模型体积大，下载耗时和网络占用明显。打开图谱只是进入一个认知工作台，不代表用户同意安装本地 AI 依赖。自动下载会制造打扰感，也会让用户不清楚本机发生了什么。

建议产品规则：

- `GET bootstrap preview` 可以在图谱入口静默运行。
- `POST bootstrap` 不应在图谱入口静默运行。
- 图谱 AI 分析按钮在缺少模型时先显示确认式 blocker，而不是直接 `pull_model`。
- 真正下载前必须展示模型名、用途、预计耗时/占用说明、可取消或稍后再做。

## 可行性判断

### 检测能力应放在哪一层？

后端负责真实检测：

- Ollama CLI 是否安装。
- Ollama 服务是否运行。
- `/api/tags` 是否可访问。
- 版本输出是否可读。
- 模型是否存在。
- provider config 是否已保存。
- health check 是否通过。

前端负责体验状态：

- 当前用户是否进入本地 AI flow。
- 当前步骤 UI。
- CTA 是否可点击。
- 用户确认。
- 失败状态、重试、跳转。

AI orchestrator 负责模型真相：

- 默认模型常量。
- 推荐模型目录。
- provider preset。
- route preview。
- provider config contract。

### `qwen3:8b` 默认模型还需要改哪些配置？

从当前代码看，核心默认已经基本完成：

- local model catalog 默认是 `qwen3:8b`
- Ollama provider preset runtime model map 默认是 `qwen3:8b`
- API 推荐模型来自 orchestrator 默认
- eval/smoke 脚本优先匹配 `qwen3:8b`
- API 文档已有 `qwen3:8b`

后续实现阶段更应该做一致性收口：

- 前端 `OLLAMA_RECOMMENDED_MODEL = "qwen3:8b"` 改为由 API preview 返回驱动，减少重复硬编码。
- 设置页推荐列表应优先使用 `modelTiers`，本地兜底常量只用于 API 不可用时。
- 文档和测试继续锁定 `qwen3:8b` 作为默认。
- `qwen3.5:9b` 只作为“高质量/较慢”选项，不自动作为默认下载目标。

### 自动拉取模型由前端触发 API，还是后端统一执行？

后端统一执行，前端触发 API。

原因：

- 后端已经有本机运行时控制 guard。
- 后端能统一模型名校验、超时、错误处理、provider config 保存、health check。
- 前端不应直接调用 Ollama `/api/pull`，也不应执行命令。
- 未来桌面版可把更强的安装/权限能力包在后端或 Tauri command 后面，前端仍只面对同一状态机。

但前端必须拥有确认权：

- 不确认，不 POST `bootstrap` 或 `pull-model`。
- 图谱入口只 GET preview。
- 设置向导中用户点击后，前端才 POST。

## 安装与部署策略

### 阶段 1：确认式引导，不自动安装 Ollama

当前更稳妥的策略是：

- Windows/macOS/Linux 都先提供官方下载页和命令建议。
- 不自动执行 installer。
- 可以尝试启动已安装的 Ollama。
- 可以通过 Ollama API 拉取模型。
- 拉取模型前必须确认。

这与当前 `autoInstallSupported: false` 一致。

### Windows

建议流程：

1. 检测 `%LOCALAPPDATA%\Programs\Ollama\ollama.exe`、`Program Files\Ollama\ollama.exe`、PATH。
2. 未安装：展示官方下载入口和 winget 命令，不自动安装。
3. 已安装未运行：用户点击“启动 Ollama”，后端执行 `ollama serve`。
4. 已运行无模型：用户点击“下载 qwen3:8b”，后端调用 `/api/pull`。
5. 模型可用：保存 `ollama_local_gateway` 或 `local_private_gateway` 配置并 health check。

注意：

- Windows 桌面用户可能是通过 Ollama app 启动服务，不一定需要 `ollama serve`。
- 停止 Ollama 会影响其他软件，必须确认；当前已有 confirm 文案基础。
- winget 安装可能需要管理员权限或用户交互，不适合当前阶段静默执行。

### macOS

建议流程：

1. 检测 `/Applications/Ollama.app` 的可行性可以后续补充；当前先检查 Homebrew/PATH 常见 CLI 路径。
2. 未安装：展示官方下载入口和 `brew install ollama`。
3. 已安装未运行：用户点击“启动 Ollama”，后端执行 `ollama serve`。
4. 已运行无模型：用户确认后拉取 `qwen3:8b`。

注意：

- macOS 用户可能从 app bundle 启动，而 CLI 不在 PATH；后续应补充 app bundle 检测。
- Homebrew 安装不应在未确认时自动执行。

### 模型下载

`qwen3:8b` 是默认下载目标，策略：

- 如果没有任何推荐模型，首推 `qwen3:8b`。
- 如果已有 `qwen3:8b`，直接选择。
- 如果只有 `qwen2.5:7b`，可以先使用它，但提示推荐默认是 `qwen3:8b`。
- `qwen3.5:9b` 展示为“高质量、较慢”，不作为默认下载。
- 未来允许推荐更高版本的安全 qwen 系列模型，或其他 Ollama 可运行且经过研思录任务验证的高质量模型；这些模型应作为“更高质量/更慢/更占资源”的可选项，而不是静默替换默认模型。

模型选择策略：

- `qwen3:8b` 是默认推荐，不是唯一支持模型。
- 已安装模型应该在 AI 设置页里可见、可选、可测试、可切换。
- 推荐模型列表应区分“默认推荐”“轻量快速”“高质量较慢”“用户已安装”。
- 对非推荐但 Ollama 已安装的模型，允许高级用户选择，但需要提示“尚未通过研思录默认任务验证，建议先试运行”。
- 切换模型后应保存 provider config、刷新 route preview，并要求用户用一条不含敏感内容的短句试运行。

当前 `pullOllamaModel()` 使用 `stream: false`，前端只能看到长时间 pending。后续如果要更好进度反馈，建议新增 streaming/progress 方案：

- 短期：显示“不确定进度”的步骤状态、开始时间、可取消/稍后重试。
- 中期：后端使用 Ollama streaming pull，转换为轮询 job 状态或 SSE。
- 长期：桌面 runtime 提供下载任务队列、取消、恢复、磁盘空间提示。

## 推荐产品流程

### AI 设置页主流程

1. 用户打开 AI 设置。
2. 默认停留 `Starter Auto`，只显示本地 AI 是可选能力。
3. 用户点击“使用本地大模型”或切换“仅本地/本地优先”。
4. 前端 GET bootstrap preview。
5. 根据状态显示步骤：
   - `needs_install`：下载 Ollama。
   - `needs_start`：启动 Ollama。
   - `needs_model`：下载 `qwen3:8b`。
   - `needs_config`：保存本地 AI 配置。
   - `needs_health_check`：运行健康检查。
   - `ready`：试运行。
6. 每个会改变本机状态的动作都需要用户点击。
7. 完成后展示当前模式：
   - 仅本地：默认不走远程。
   - 本地优先：轻量任务优先本地，部分深度任务可能远程。

AI 设置页还应成为本地模型生命周期的唯一主入口：

- 安装 Ollama：在 AI 设置页展示下载入口、系统命令和下一步。
- 运行 Ollama：在 AI 设置页检测、启动、停止和重试。
- 安装模型：在 AI 设置页下载默认模型或其他推荐模型。
- 切换模型：在 AI 设置页从已安装模型和推荐模型中选择，并试运行确认。
- 解释模型差异：用“默认推荐/更快/更高质量/更占资源”这样的用户语言，而不是只展示模型 id。

这样可以避免非技术用户在图谱、AI Inbox、写作页之间被迫理解运行时、provider、endpoint、模型名等概念。

### 图谱页流程

进入图谱：

1. 刷新图谱数据。
2. 若 AI 设置处于本地相关模式，可以 GET bootstrap preview。
3. 在图谱 AI 区显示状态，不阻塞图谱浏览。

点击“AI 图谱初判/分析关系”：

1. 若本地 AI 已 ready，直接执行分析。
2. 若缺 Ollama 或模型，显示图谱内 blocker：
   - 说明“关系分析需要本地 AI 准备好”。
   - 显示当前缺哪一步。
   - 主按钮：“去 AI 设置准备”。
   - 次按钮：“仅查看手动图谱”。
3. 若用户选择在图谱内继续，必须打开确认式准备面板，而不是直接拉模型。

建议调整当前实现：

- `runGraphAiAnalysis()` 不直接调用默认 `bootstrapOllamaLocalAiFromUi({ render: false })`。
- 改为先 `fetchOllamaBootstrapStatus` 或调用 `bootstrapOllamaLocalAiFromUi({ pullModel: false, enableConfig: false, healthCheck: false })` 类型的纯检查路径。
- 只有用户在确认向导点击后，才允许 POST bootstrap/pull。

## 后端状态机建议

保留当前状态：

- `needs_install`
- `needs_start`
- `needs_model`
- `needs_config`
- `needs_health_check`
- `ready`

建议扩展字段：

- `canAutoStart`: 已安装时是否可以尝试启动。
- `canPullModel`: runtime available 时是否可以下载模型。
- `requiresUserConfirmation`: 对 next action 是否必须确认。
- `destructive`: stop runtime 为 true，start/pull/config 为 false。
- `estimatedDownloadSize` 或 `sizeHint`: 初期可为空或文案 hint。
- `privacySummary`: local-only/hybrid 的清晰说明。
- `networkUse`: pull model 需要联网下载。

建议新增或规范化前端动作：

- `preview`: 只读，GET。
- `prepare`: 执行前必须确认，POST bootstrap。
- `start`: 确认后 POST start。
- `pull`: 确认后 POST pull-model。
- `save_config`: POST bootstrap with `pullModel:false` 或独立 config action。
- `test`: POST test chat。

## 隐私与信任文案

必须表达：

- 本地模型运行在这台电脑上的 Ollama。
- 下载模型会访问 Ollama/模型源，不等于发送笔记内容。
- 模型下载完成后，图谱分析和摘要等适合本地执行的任务可以留在本机。
- “本地优先”不等于“永不使用远程”；敏感资料请用“仅本地”。
- AI 生成的关系、问题、摘要进入待确认层，不会自动改写笔记或图谱。

避免表达：

- “完全隐私”这类过度承诺。
- “自动安装”但没有说明会执行什么。
- 在图谱页使用强营销式打断。

## 实施计划

### Slice 1：设计确认和当前风险修正

目标：不改变功能大面，只消除图谱自动拉模型风险。

- 梳理当前图谱 `runGraphAiAnalysis()` 的 bootstrap 行为。
- 改为先 preview/blocker，不执行 pull。
- 设置页继续保留完整准备入口。
- 补充测试：图谱分析缺模型时不 POST bootstrap/pull，而是提示去设置。

### Slice 2：统一 qwen3 默认来源

目标：减少前端硬编码漂移。

- 设置页从后端 preview 的 `recommendedModel`、`modelTiers`、`downloadCommand` 渲染默认模型。
- 前端 `OLLAMA_RECOMMENDED_MODEL` 保留为 API 不可用兜底。
- 补充测试：当 API 返回 `qwen3:8b`，设置页下载按钮和推荐卡一致。

### Slice 3：AI 设置页模型管理

目标：让安装、运行、下载、切换模型都集中在 AI 设置页。

- 在 AI 设置页展示“默认推荐”“轻量快速”“高质量较慢”“已安装模型”。
- 允许选择已安装的非推荐 Ollama 模型，但标注为“未验证，建议试运行”。
- 切换模型后保存本地 provider config，并刷新 route preview。
- 试运行结果显示当前 provider 和模型，帮助用户确认确实在用本地模型。
- 图谱、AI Inbox、写作页只给出“去 AI 设置准备/切换模型”的入口。

### Slice 4：确认式本地 AI 向导

目标：把 “检查 -> 确认 -> 执行 -> 试运行” 明确化。

- AI 设置页增加确认面板或 modal。
- 下载模型前说明模型名、联网下载、可能耗时。
- 启动/停止 Ollama 前分别说明影响。
- POST mutation 只在明确点击后发生。
- 失败时保留可重试步骤，不清空用户已完成配置。

### Slice 5：进度与失败回退

目标：让模型下载不再像卡住。

- 短期先显示长任务状态、开始时间、可重试。
- 中期新增 pull job/SSE/轮询。
- 失败回退到手动命令：`ollama pull qwen3:8b`。
- health check 失败时提供“重新检测/改用已安装模型/稍后再试”。

### Slice 6：桌面安装能力评估

目标：再决定是否从“引导安装”升级到“确认后自动安装”。

- Windows: 评估 winget 可用性、权限、UAC、失败回滚。
- macOS: 评估 app bundle、Homebrew、签名/权限体验。
- 只有能做到清晰确认、进度、取消、失败解释时，才开启自动安装。
- 保持默认 `autoInstallSupported: false`，直到桌面端验证完成。

## 验收建议

必须新增或保留的测试：

- `qwen3:8b` 仍是默认本地模型。
- Ollama provider preset runtime map 默认到 `qwen3:8b`。
- GET bootstrap preview 不执行 start/pull/config。
- 图谱打开只做非侵入式 preview，不 POST mutation。
- 图谱 AI 分析在缺模型时显示准备提示，不自动下载。
- AI 设置页点击确认后才 POST bootstrap/pull/start。
- 安装、运行、下载、模型切换主入口都在 AI 设置页；图谱等业务页只提示并跳转。
- AI 设置页可展示并切换已安装的 Ollama 模型。
- 非默认推荐模型切换后必须刷新 route preview，并提示试运行。
- local runtime mutation guard 继续要求 loopback、local origin、runtime-control header。
- Windows/macOS install guide 可返回正确平台步骤。
- `qwen3.5:9b` 只作为高质量选项，不替代默认下载目标。
- 未来更高版本 qwen 或其他高质量 Ollama 模型可以进入推荐列表，但需要保留默认推荐、质量/速度/资源说明和试运行确认。

## 结论

推荐方案：

- `qwen3:8b` 继续作为默认本地模型。
- AI 设置页作为完整 Ollama + 本地模型管理中心，覆盖安装、运行、下载、切换、试运行。
- 图谱页只做能力发现和轻提示；图谱 AI 动作遇到未就绪时进入确认式引导或跳转设置。
- 自动部署的第一阶段只自动执行“启动已安装 Ollama、拉取用户确认的模型、保存配置、健康检查”，不自动安装 Ollama。
- 默认推荐 `qwen3:8b`，但架构上允许未来选择更高版本安全 qwen 或其他 Ollama 高质量模型；这些选择都应在 AI 设置中用非技术用户能理解的方式呈现。
- 后端统一执行检测和本机 runtime 控制，前端负责确认、展示和引导。
