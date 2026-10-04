# 远程 AI 设置与使用验证

日期：2026-10-04。源码分支：`fix/deepseek-remote-setup`。

## 最终整体验收

全部当前改动一起验收：346 项单元／接口测试及 3 项真实浏览器流程通过，均无失败、无跳过。覆盖模型编排与适配、期限与取消、测试记录器、关联缓存与审阅、设置状态／视图／事件、前端 API、远程配置、写作及来源提炼。浏览器覆盖连接失败／无效 HTTP 200 后禁止保存、重试保存／重载／取消，以及桌面 1366px、手机 390px 的关联确认。

`npm run encoding:doctor` 无新增基线问题，`git diff --check` 通过。本轮变更文件中未发现 API Key 形态的字面量。验收使用临时笔记库和模拟服务，未重新运行付费 DeepSeek 测试；之前的真实 Flash 样本见单独报告。StarBridge MDN 未提供地址、模型及接口文档，实际联调仍待补充；当前验证的是通用兼容接口。

本次单元／接口运行包含以下 21 个文件，测试数量与前面的历史分组不累加：

```powershell
node --test tests/unit/ai-orchestrator-harness.test.mjs tests/unit/ai-provider-deadline.test.mjs tests/unit/ai-deepseek-request-profile.test.mjs tests/unit/remote-ai-live-check.test.mjs tests/unit/potential-relations.test.mjs tests/unit/api-potential-relations-routing.test.mjs tests/unit/web-ai-error-message.test.mjs tests/unit/web-graph-ai-connect-runtime-controller.test.mjs tests/unit/web-prototype-api.test.mjs tests/unit/web-settings-ai-controls-view.test.mjs tests/unit/web-settings-ai-state-runtime.test.mjs tests/unit/web-settings-ai-runtime-controller.test.mjs tests/unit/web-settings-ai-runtime-actions.test.mjs tests/unit/web-settings-ai-route-preview-view.test.mjs tests/unit/web-settings-ai-mode-entry.test.mjs tests/unit/web-settings-ai-experience-view.test.mjs tests/unit/web-settings-ai-experience-model.test.mjs tests/unit/web-settings-ai-event-bindings.test.mjs tests/integration/api-ai-remote-settings.test.mjs tests/integration/api-writing.test.mjs tests/integration/api-potential-relations-refine.test.mjs
$env:RUN_BROWSER_E2E='1'
node --test tests/e2e/prototype-ai-settings-closeout.test.mjs tests/e2e/prototype-graph-ai-relation-flow.test.mjs
```

## 已验证流程

- 设置：地址、密钥、模型、发送授权 → 实际对话测试 → 保存 → 页面刷新及 API 重启后恢复。
- 草稿密钥只用于本次测试；失败、并发测试、临时清空均不修改已保存密钥，返回配置不包含密钥正文。
- 保存后的服务用于写作分析和来源观点提炼；每个动作只发起一次 HTTP 请求，原始笔记不被改写。
- 关联审阅保留确认步骤、来源信息及服务商信息；更换模型服务或修改笔记会使旧缓存失效。
- 认证失败、余额不足、参数错误、限流、服务故障可明确分类，失败后可重新测试。
- 取消和超时：响应头或响应正文停滞均受期限约束；请求启动前或读取凭据期间取消时，网络调用次数为零。

## 修复与性能约束

1. GET 健康检查不再证明远程模型可用，连接测试始终执行实际对话。
2. 远程连接测试输出上限为 256 tokens，默认等待上限由通用的 120 秒缩短至 30 秒；保留调用方指定期限。本地模型测试保留原有设置。
3. DeepSeek 官方地址使用 `json_object`，将原有输出结构放入 JSON 提示中。兼容写作 JSON、结构化代理及关联审阅请求；其他服务保留原有格式。
4. DeepSeek 连接测试和结构化任务使用非思考模式，让有限输出预算用于最终回复；普通文本调用保留服务默认行为。
5. 关联任务期限传到模型执行器，任务超时后会关闭实际 HTTP 传输，避免继续等待通用的 120 秒期限。

这些是请求预算、等待上限及取消行为的改进，不代表普遍的服务响应时间或质量提升。已完成的真实 DeepSeek Flash 联调及样本限制见 [真实 API 验证](DEEPSEEK_LIVE_VERIFICATION_2026-10-04.md)。

## 关联审阅取消回归

同一候选再次发起审阅时，浏览器会中止前一次请求。取消信号经接口传到兼容模型执行器；调用方断开连接后，服务端停止等待上游，不保存取消请求的审阅建议。

实际 HTTP 回归覆盖上游尚未发送响应头、已发送部分正文两种停滞状态：取消后上游连接均在 1 秒内关闭，收件箱没有新增建议；随后重试确实重新调用模型，未命中旧缓存，并保存一条正常建议。这些测试使用临时笔记库和本地兼容服务，不消耗 DeepSeek 额度。

随后增加页面上下文清理：图谱刷新时，已切换节点、图谱数据、分析结果、目录或模块的审阅会自动取消。当前上下文中的请求继续执行；旧请求不会将取消错误写入候选或弹出失败提示。此行为针对关联候选的 AI 审阅，完整图谱扫描仍使用已有迟到结果保护。

关联单元与接口回归 45 项通过；增加上下文取消检查后，前端请求和关联控制器 68 项通过，各组分别统计。
浏览器回归 3 项通过，无跳过：远程设置测试、保存、重载与取消，以及桌面（1366px）和手机（390px）关联确认与迟到结果保护。

```powershell
node --test tests/unit/potential-relations.test.mjs tests/unit/api-potential-relations-routing.test.mjs tests/integration/api-potential-relations-refine.test.mjs
node --test tests/unit/web-graph-ai-connect-runtime-controller.test.mjs tests/unit/web-prototype-api.test.mjs
```

## 验证记录

### 无效成功响应

HTTP 200 不再直接表示连接成功。空正文、非 JSON 正文、空对象、缺少实际回复、空白回复、仅思考内容及类型错误的正文会明确返回 `invalid_response`，不会启用设置中的保存按钮。连接测试只接受实际文本回复，单独返回工具调用不能证明对话测试成功；普通工具任务和非空 `output_text` 继续兼容。

95 项模型编排、请求、中文提示与 HTTPS 接口回归通过，含七种 HTTP 200 异常正文各一次失败及正常重试。真实浏览器设置流程 1 项通过，确认无效回复后禁止保存，重试成功后可保存、重载并取消后续请求。本轮使用模拟服务，未调用付费 API。

### Review 修复

实测脚本的成功记录在操作完成后计算耗时，操作返回值不能覆盖记录器的名称、成功标志或耗时。关联接口在异步数据库初始化结束后再次检查取消信号，防止等待期间取消仍写入建议。新增延迟操作、初始化期间取消、正常写入测试；记录器、关联路由与 HTTP 关联回归共 28 项通过，无失败或跳过。本轮未调用付费 API，未重测历史 DeepSeek 性能数据。

### 输出上限处理

后续扩展异常结束识别：`content_filter` 分类为内容过滤，`insufficient_system_resource` 为服务不可用，`aborted` 为服务端生成中断。均返回失败、清空不可用正文／JSON／工具调用，并保留已报告用量。资源不足和服务端中断可手动重试；当前流程不自动重复请求。正常结束、工具调用及省略结束字段的兼容网关维持原行为。分类语义以 [DeepSeek 官方接口说明](https://api-docs.deepseek.com/zh-cn/api/create-chat-completion/) 为依据。

扩展后 114 项相关回归通过，无失败或跳过，包括模型编排、结束状态、中文提示、记录器、取消写入、HTTPS 设置与写作接口。HTTPS 夹具覆盖写作和来源提炼各四种异常结束，均无新增分析建议、每次仅调用一次服务、手动重试成功。本轮未调用付费 API。

兼容服务返回 `finish_reason: length` 时，适配层将结果标记为 `output_incomplete`，不提供可用于分析的正文、JSON 或工具调用，同时保留服务商报告的 token 用量和请求标识。界面提示减少输入或选择支持更长输出的模型；不会自动重复请求。此状态与正常结束的含义参见 [DeepSeek 对话接口](https://api-docs.deepseek.com/api/create-chat-completion/)。

HTTPS 回归验证写作与来源提炼：即使截断响应包含可解析 JSON，也返回明确错误、不新增分析建议，手动重试可成功。关联审阅保留现有规则候选，不接受或缓存截断的 AI 判断；保存的规则候选不包含截断正文，后续完整响应重新调用模型。

模型编排、DeepSeek 请求、中文错误、远程设置、写作和关联接口回归共 115 项通过；随后新增关联截断回归并重跑该接口文件。未调用付费 API。

核心回归：173 项通过，无失败、无跳过；含 AI 编排、截止时间、设置、远程配置和写作接口。

```powershell
node --test tests/unit/ai-orchestrator-harness.test.mjs tests/unit/ai-provider-deadline.test.mjs tests/unit/ai-deepseek-request-profile.test.mjs tests/unit/web-settings-ai-event-bindings.test.mjs tests/unit/web-settings-ai-controls-view.test.mjs tests/unit/web-settings-ai-experience-view.test.mjs tests/unit/web-ai-error-message.test.mjs tests/unit/web-settings-ai-runtime-controller.test.mjs tests/integration/api-ai-remote-settings.test.mjs tests/integration/api-writing.test.mjs
```

关联与兼容性检查：25 项通过，另新增一项实际传输超时检查通过。最后限定优化仅作用于远程连接测试后，82 项模型／接口回归再次通过。各组有重复用例，不累加为独立测试数量。

```powershell
node --test tests/unit/ai-deepseek-request-profile.test.mjs tests/integration/api-potential-relations-refine.test.mjs tests/unit/api-potential-relations-routing.test.mjs
node --test --test-name-pattern='compatible relation provider transport' tests/integration/api-potential-relations-refine.test.mjs
node --test tests/unit/ai-deepseek-request-profile.test.mjs tests/unit/ai-provider-deadline.test.mjs tests/unit/ai-orchestrator-harness.test.mjs tests/integration/api-ai-remote-settings.test.mjs
```

浏览器流程：1 条通过，无跳过。真实界面填写、余额不足后重试、保存、刷新恢复以及取消等待均已执行。

```powershell
$env:RUN_BROWSER_E2E='1'
node --test tests/e2e/prototype-ai-settings-closeout.test.mjs
```

上述自动化测试使用临时笔记库和模拟模型服务。DeepSeek 官方格式在适配层单元测试中验证，本地 HTTPS 服务验证应用接口及浏览器流程；未使用用户笔记。随后使用用户授权的专用 Key 完成了真实 Flash 联调，结果见 [真实 API 验证](DEEPSEEK_LIVE_VERIFICATION_2026-10-04.md)。

参考：[DeepSeek 对话接口](https://api-docs.deepseek.com/api/create-chat-completion/)、[JSON 输出](https://api-docs.deepseek.com/guides/json_mode/)、[错误码](https://api-docs.deepseek.com/zh-cn/quick_start/error_codes/)。
