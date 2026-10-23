# Windows 0.1.1-beta.4 发布状态

后续平台发布：macOS / Linux 已更新至 beta.4，见[独立发布记录](V0_1_1_BETA_4_MAC_LINUX_RELEASE_STATUS.md)。以下保留 Windows 发布当时的验证与平台状态。

更新日期：2026-10-23。Windows beta.4 已公开为预发布版本，Windows 更新入口已切换至同一份验证产物。官网分平台下载配置随本次变更交付，使用既有 Cloudflare Pages 项目手动部署。

## 固定源码与产物

- 核心流程优化及版本准备已通过 [PR #239](https://github.com/lidiansen58-debug/yansilu/pull/239) 合入 main：`fc21faec25bf174a61cc4ebb934a088a84e65786`。
- 签名包固定源码：`4e9e2db4120cc06430a8bfb7624f68a0e937d954`，与上述合并提交的文件树相同。
- [签名构建](https://github.com/lidiansen58-debug/yansilu/actions/runs/39815737164) 的 Windows 制品 `12443022186` 已完整下载，归档摘要匹配 GitHub 元数据。
- Windows 安装包：`yansilu_0.1.1-beta.4_x64-setup.exe`，33,891,703 字节；仅将 CI 原文件名改为 ASCII，文件内容未变。
- SHA-256：`7cb3008e392bcc194476015ce0ce527cf05ca2645d8660153dd37c07bdd5af43`。
- 配置公钥验签、篡改拒绝、完整制品清单和摘要均通过。安装包和 EXE 的 Authenticode 状态为 `NotSigned`，与更新签名含义不同。

[公开预发布](https://github.com/lidiansen58-debug/yansilu/releases/tag/beta4-ci-4e9e2db4-20261023) 使用标签 `beta4-ci-4e9e2db4-20261023`，包含 7 项产物，两份更新清单仅启用 `windows-x86_64`。未将此版本设为稳定版或 GitHub Latest。

## 已完成检查

- 核心功能提交 `b41a2f46` 完整回归：4805 通过、0 失败、469 按条件跳过；重点浏览器 9/9 通过。
- beta.4 版本、发布及更新判断定向检查通过；beta.1、beta.3 可更新至 beta.4，beta.4 不重复提示，beta.5 不降级。
- 实际 CI 安装包已安装到现有 Windows 安装位置。8,023 项产品文件与 CI 解包逐项摘要一致；安装目录另有 4 个未被当前运行时引用的旧文件，未将其描述为干净安装或全树相同。
- 新程序可正常启动；实际原生窗口可进入写作并展开完整主题库。隔离测试库的 52 个主题、已存提纲、草稿及来源资格通过内置后端检查。
- 公开地址下载的 7 项产物均与已验证的 CI 和发布清单逐字节摘要匹配；公钥验签、篡改拒绝和侧清单完整性检查通过。
- 两个固定更新入口均与上述公开 beta.4 清单一致，beta.1、beta.3 可更新，beta.4 不重复提示，beta.5 不降级；平台仍仅为 Windows。
- 官网候选支持 Windows beta.4 与 Mac/Linux beta.3 分平台显示，保留旧平台链接、大小及摘要；修复最新发布仅含 Windows 时的跨平台下载回退，并更新模块缓存版本。
- 官网定向检查 32/32、Windows/Mac/Linux/手机静态视图 4/4 通过；4 个公开安装包的 GitHub 文件名、URL、大小和摘要与配置一致。40 项静态构建产出逐字节匹配源码输入，复用同一构建部署。
- 自有测试进程已关闭，原笔记库选择已逐字节恢复；未遍历或修改真实用户笔记。

## 本轮验收覆盖边界

本轮未补测原生键盘/中文输入法、安装版保存快捷键及正常关闭重开的持久化往返。共享桌面持续有其他窗口输入，自动化工具拒绝继续键入；没有绕过输入保护，也未将这些未执行项记作通过。

独立 review 确认本次未修改原生输入、快捷键、关闭恢复或后端保存契约；原生依赖未升级。改动集中于首页、主题分页/搜索、导航和资格提示，已由完整基础回归、重点浏览器流程及实际安装验证覆盖。浏览器验收包含真实界面的 Ctrl+S、草稿与章节保存、API/Markdown 持久化以及返回已有草稿。本次据此发布有明确验证边界的 Beta，不宣称完成全套原生验收。

## 更新入口与回退

- 固定 Latest 锚保持 `v0.1.1-beta.1`；[原生更新清单](https://github.com/lidiansen58-debug/yansilu/releases/latest/download/latest.json)和[应用更新清单](https://github.com/lidiansen58-debug/yansilu/releases/latest/download/update-manifest.json)的内容现为 Windows beta.4。
- 覆盖前实时核对旧清单仍为 Windows beta.3，并在同一锚上保存原始字节：[原生清单备份](https://github.com/lidiansen58-debug/yansilu/releases/download/v0.1.1-beta.1/latest-before-beta4-20261023T032357Z.json)、[应用清单备份](https://github.com/lidiansen58-debug/yansilu/releases/download/v0.1.1-beta.1/update-manifest-before-beta4-20261023T032357Z.json)。需要回退时，将备份分别以 `latest.json`、`update-manifest.json` 原名覆盖该锚上的两个入口。
- 官网部署使用 Cloudflare Pages `yansilu` 项目、`main` 生产分支。合并源码不会自动部署；部署后应核对线上首页、下载页、清单和新缓存版本的 JS 与同一静态产出一致。

Mac 继续使用已有 Intel 原生验收的 Universal beta.3；Linux 保留现有 beta.3 手动下载。本次不宣称完成新 Mac/Linux 实机验收，也不启用其自动更新。

本轮本地凭证：`output/beta4-release-20261023/`；官网候选凭证：`output/release-beta4-20261023/marketing-candidate/`。
