# Mac 签名候选包交付记录（2026-10-19）

当前阶段：修复已合入 main，新签名包的本机界面复验待 Mac 解锁。新 Release 尚未发布，官网改动仅在候选分支，不能视作线上交付完成。

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

## 本机安装运行证据与剩余检查

签名副本位于普通用户目录时，API 约 3.5 秒 ready，可从完整的隔离验收库重开原中文笔记。通过包内实际 API 新建并读取中文测试笔记成功；原测试笔记和图片 SHA-256 保持一致。正常退出释放 API 端口，临时库选择已恢复，正式库 85 个文件的大小及时间元数据保持一致。

临时目录经 LaunchServices 转为 `/var` 符号链接路径时，Tauri 的当前可执行文件安全策略拒绝解析资源；改为普通用户目录后启动成功。未更改该安全策略或重签应用。

当前 macOS 系统返回锁屏状态，辅助功能无法读取应用窗口。新签名副本的原生界面、笔记/图片显示及更新提示复验仍待解锁后执行；此前 debug 包原生验收记录不能转记为此签名包通过。Apple Silicon 实机仍未验收。

候选发布标签为 `beta3-mac-ci-f41c0627-20261019`，Mac 仍为 beta.3，采用手动安装。发布将复用旧 Windows/Linux 产物并核对字节与摘要；现有 Windows 更新通道保持原状。完成新包原生复验后才能发布该标签及合并官网新链接。官网部署方式与 Cloudflare 登录条件尚待确认，候选源码或本地构建不代表线上已更新。
