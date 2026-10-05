# 研思录 Beta 2 发布准备

日期：2026-10-05。候选版本：`0.1.1-beta.2`。开发基线：main `e14252f6`；准备分支：`release/beta2-prep-20261005`。

状态：范围冻结，本轮定向源码验收通过，尚未打包或发布。包含本文件的发布准备提交固定候选源码；最终安装包须记录实际构建提交和 SHA-256，不能只用开发基线代表最终产物。

## 本轮范围

- 记录与导入材料，用自己的话形成判断，保留来源、依据、边界和观点变化。
- 对照真实笔记建立关联；正文链接和手动关联同等进入知识网络。
- 从图谱查看观点关系、检查待整理笔记、选择主题材料，再确认共同问题并进入写作。
- 保存并继续文章，编辑及排序章节，导出 Markdown 正文和所引用的本地图片。
- 短练习、Demo 手册、离线帮助、问题反馈，以及加密备份与恢复。

冻结后只修数据安全、启动失败、核心任务阻塞和持续误导的问题。账户系统、额外 AI 供应商、新出版格式、官网重设计和大库优化不纳入本轮。

## AI 使用边界

主线不依赖 AI。AI 结果是待审阅草稿，不自动替用户确认观点，不自动改写正文或建立关系。

本地模型的部分观点和写作任务仍有质量、超时及 CPU 延迟问题，暂按实验能力提供；不能宣称本地 AI 全部验收通过。远程 DeepSeek 已有小样本真实联调记录，不代表长文或复杂书籍生成质量通过。远程调用由用户明确配置和启用，费用向第三方支付；发布验收默认不调用付费服务。

## 验收记录

| 检查 | 本轮状态 | 完成标准 |
| --- | --- | --- |
| 版本一致性 | 通过：相关单测 43/43，无跳过 | npm、Tauri、Cargo、锁文件和浏览器显示一致；候选 tag 校验通过 |
| 主线浏览器与接口 | 通过：浏览器 5/5、定向单测 613/613，无跳过 | 短练习、Demo 转换、真实关系、主题确认、文章保存及当前正文导出、章节排序整稿导出；核对实际文件 |
| Windows 安装包 | 未执行 | 干净安装、首次启动与重启、端口冲突、图片、原生文件选择、导出、断网帮助及升级保留数据 |
| macOS Universal | 未执行 | 同一包在 Intel 和 Apple Silicon 实机完成上述操作，尤其检查白屏、服务启动及应用入口 |
| 新用户 | 尚无参与者结果 | 小范围测试收集独立完成与卡住位置，不用工程自测代替；公开扩大测试前核对 R09 标准 |
| 签名及更新 | 未执行 | 校验包、SHA-256、updater 签名与更新清单；Mac 签名公证；旧版更新失败反馈和升级重启演练 |

### 本轮验证命令与边界

```powershell
node --test tests/unit/release-version-consistency.test.mjs tests/unit/app-update.test.mjs tests/unit/app-update-release-manifest.test.mjs tests/unit/desktop-update-adapter.test.mjs tests/unit/web-update-state.test.mjs

$env:RUN_BROWSER_E2E='1'
node --test --test-isolation=none tests/e2e/prototype-beta-short-practice.test.mjs tests/e2e/prototype-beta-writing-closeout.test.mjs tests/e2e/prototype-graph-theme-index-entry.test.mjs tests/e2e/prototype-demo-material-flow.test.mjs

$tests = (Get-ChildItem tests/unit -Filter 'web*.test.mjs' | Where-Object { $_.Name -match 'graph|theme-index|writing-panel|relation-pair' }).FullName
node --test $tests
git diff --check
```

共 656 项单测和 5 项浏览器测试通过，`git diff --check` 通过。浏览器使用临时 Vault、独立 API 和网页服务；没有改动正式笔记库，没有付费 AI 调用，测试服务已退出。

主题测试中的“全部材料已确认后进入写作”案例替换了图谱响应，验证主题确认和写作交接契约，不证明图谱布局或接口返回的关系完全正确。未确认材料保护案例以及 Demo 转换、真实笔记打开使用实际 API。安装包、原生文件操作、三类设备和实际升级仍需独立验收，不能由这些自动化结果替代。

### CI 构建入口修复

PR #220 的干净环境预检暴露了历史构建顺序问题：Tauri 配置引用 `desktop-api-runtime`，但工作流在生成运行时之前执行 `cargo check`，报错 `resource path desktop-api-runtime doesn't exist`。旧预检还只输出最后一行警告，掩盖了实际原因。

已保留完整 Cargo 诊断并锁定依赖；PR 构建、发布检查和正式发布入口统一在预检前运行现有运行时准备脚本。PR 构建须等待预检成功，手动构建入口仍可用。定向回归 17/17 通过，三个工作流 YAML 语法通过，本机 Windows `cargo check --locked` 和完整桌面预检通过。跨平台结果以 PR 最终 CI 为准；CI 构建资产仍不是经过实机验收、签名公证和升级演练的正式发布包。

## 发布规则

不得覆盖 `v0.1.1-beta.1` 或旧资产。新 tag 为 `v0.1.1-beta.2`，仅在候选包验证和发布授权后创建。官网继续指向已发布版本，待新资产验证后再更新下载和版本说明。

Beta 更新通道需要单独核对：现有 updater 指向 `releases/latest/download/latest.json`，本次准备不改线上 feed，也不把构建或预检通过当成升级演练通过。Windows updater 签名与操作系统代码签名分别记录；若小范围测试接受未做 Windows 代码签名的包，须明确说明 SmartScreen 警告，不能称安装包已获得系统信任。

后续依次完成：候选源码回归并提交 -> 候选包及三类设备实测 -> 签名更新演练 -> 经授权发布小范围 Beta。没有新证据时不重复泛化 review，只对新增缺陷做定向修复与复验。

参考：[发布清单](RELEASE_CHECKLIST.md)、[首版任务](FIRST_RELEASE_TASKS_2026-09-30.md)、[用户验收](R09_ACCEPTANCE_RECORD_2026-10-02.md)、[本地 AI 边界](AI_VERIFICATION_2026-10-02.md)、[远程 AI 实测](DEEPSEEK_LIVE_VERIFICATION_2026-10-04.md)。
