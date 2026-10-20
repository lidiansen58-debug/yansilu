# Mac 签名包交付记录（2026-10-19 构建，2026-10-20 复验）

当前阶段：修复已合入 main，新签名包已于 2026-10-20 完成 Intel macOS 13.7.8 原生界面复验并发布。官网 PR 合入 main 后触发自动部署；部署后的线上内容另行核对。

## 固定源码与 CI

- 修复 [PR #237](https://github.com/lidiansen58-debug/yansilu/pull/237) 已合并，main 为 `ebb1fce86c6daeacee48a78bef1eb9fb7eebf47e`。
- [三平台 PR CI](https://github.com/lidiansen58-debug/yansilu/actions/runs/39231623087)全部成功。
- [新签名演练](https://github.com/lidiansen58-debug/yansilu/actions/runs/39231979304)全部成功，固定源码 `f41c06272e95c80a37b623f1f75273e63f74b29e`；与合并后 main 仅有隔离构建触发条件的工作流差异，产品代码相同。
- 应用公证 Accepted：`d88e4fe3-fd02-44d8-9df6-ba166faee59d`；DMG 公证 Accepted：`8a5e9ec9-c633-4ecf-8312-211218dfae2c`。

## 新 Mac 产物与校验

- GitHub Mac artifact：`12177699660`，ZIP 230,404,780 字节；SHA-256 `54d40aa0069031f8a545951d73a2bc2253bccd628a58f652202d683a0ac6dc9c`，本机完整下载匹配。
- DMG 180,310,665 字节；SHA-256 `9daaa810992469e84c993e2471c7cde861a04d1ab9dadd6edab857386833611a`。
- 应用更新归档 105,207,817 字节；SHA-256 `7e86cf87d8f67f5be7410614d4d59d11a10e390cac08af682463d56d98d9dc0f`。
- 全部四项产物的大小、摘要和文本校验清单一致；DMG/更新归档均通过应用配置公钥验签，篡改字节均被拒绝。
- 本机严格验签、公证票据、Gatekeeper（Notarized Developer ID）及 Universal 架构检查通过；从只读 DMG 复制后的应用文件、链接及权限与原包一致。

## 本机安装运行与原生界面证据

签名副本位于普通用户目录时，API 约 3.5 秒 ready，可从完整的隔离验收库重开原中文笔记。通过包内实际 API 新建并读取中文测试笔记成功；原测试笔记和图片 SHA-256 保持一致。正常退出释放 API 端口，临时库选择已恢复，正式库 85 个文件的大小及时间元数据保持一致。

临时目录经 LaunchServices 转为 `/var` 符号链接路径时，Tauri 的当前可执行文件安全策略拒绝解析资源；改为普通用户目录后启动成功。未更改该安全策略或重签应用。

2026-10-20 解锁后，使用上述已严格验签的安装包副本完成原生窗口复验：

- 原生编辑器输入中文标记 `SIGNED-NATIVE-20261020`，Cmd+S 保存；实际 API 与 Markdown 持久化一致。
- 正常退出后重启同一签名副本，在原生编辑器重开笔记，中文内容与验收标记仍可见。
- 打开原测试笔记并点击图片，预览弹窗实际显示图片，关闭正常。
- 在“关于与更新”实际点击“检查更新”，系统代理下返回当前平台无应用内更新包的中文说明及“打开下载页”，没有误报最新版本或提供安装按钮。
- 退出释放 API 端口；恢复测试前的库选择记录。原测试笔记、图片摘要保持一致，正式库 85 个文件的大小及时间元数据保持一致。
- 本机截图及 AX 记录保存在 `test-results/mac-2026-10-19/signed-native-*`（含编辑器、图片、更新提示和重启后内容）。Apple Silicon 实机尚未验收。

发布标签 `beta3-mac-ci-f41c0627-20261019`，Mac 仍为 beta.3，采用手动安装。Windows/Linux 复用旧产物并核对字节与摘要；现有 Windows 更新通道保持原状。官网随 main 合并自动部署。

## 发布与官网更新

[新 Mac 修复包 Release](https://github.com/lidiansen58-debug/yansilu/releases/tag/beta3-mac-ci-f41c0627-20261019) 已公开为预发布版本。[交付 CI](https://github.com/lidiansen58-debug/yansilu/actions/runs/39359755371) 已完成发布及全部 13 项公开资产的大小和 GitHub SHA-256 摘要核对，Mac DMG 与本机验收字节相同，旧 Windows/Linux 包未变。

官网更新将下载页与清单切换到此发布标签，说明 Intel 原生验收结果、同版本手动安装方式与 M 系列尚未实机验收的边界。已有官网相关测试 22 项通过，营销站静态构建通过。
