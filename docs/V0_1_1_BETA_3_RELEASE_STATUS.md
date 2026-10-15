# 研思录 0.1.1-beta.3 发布记录

更新日期：2026-10-15。用户最终将本轮验收范围限定为 Windows；该范围内的优化、验收、官网及更新通道交付已完成。此版本仍为 Beta 测试版。

## 交付入口

- [官网](https://yansilu.ai/) · [下载页](https://yansilu.ai/download/)
- [beta.3 安装包、签名与发布说明](https://github.com/lidiansen58-debug/yansilu/releases/tag/beta3-ci-d49f4839-20261015)
- [SHA-256 校验文件](https://github.com/lidiansen58-debug/yansilu/releases/download/beta3-ci-d49f4839-20261015/SHA256SUMS.txt)
- [Windows 原生更新清单](https://github.com/lidiansen58-debug/yansilu/releases/latest/download/latest.json)
- [应用版本更新清单](https://github.com/lidiansen58-debug/yansilu/releases/latest/download/update-manifest.json)

Windows x64 安装包：`yansilu_0.1.1-beta.3_x64-setup.exe`，33,883,210 字节。

SHA-256：`1c33ccb87035271c7a93ba3f73f7e9b9b558b0a378af9feb1e5c752a5bc7f91e`。

## 源码与验证

- 安装包来自固定提交 `d49f4839570bb32b018dc67d04b3ec9adb1631e4`，经 [PR #233](https://github.com/lidiansen58-debug/yansilu/pull/233) 合并；官网通过 [PR #234](https://github.com/lidiansen58-debug/yansilu/pull/234) 更新。发布直接复用验收产物，未重新打包。
- [固定提交构建](https://github.com/lidiansen58-debug/yansilu/actions/runs/38739071805)成功；[完整回归验证作业](https://github.com/lidiansen58-debug/yansilu/actions/runs/38738407261/job/116433509205)通过。该验证通过后，后续重复构建被取消，不将整次运行的取消状态记为验证通过。
- 核心检查 5,196 项：4,735 通过、0 失败、461 条条件项。MVP 通过，完整浏览器 465/465 通过、0 跳过。
- Windows 安装版主流程 10/10 通过，覆盖三类笔记、两种编辑模式、链接修改跳转、随笔和文献笔记转永久笔记。
- 原生中文输入与选词、跨应用焦点返回、保存、关闭重开通过。AI 人工草稿保留使用合成建议验证；本轮最终复验未新增付费模型调用。
- 官网 29 项定向检查和四种浏览器平台视图检查通过。公开 Windows 更新包完整下载后的摘要、配置公钥验签及篡改拒绝通过。
- 发布清单的版本判断中，beta.1/beta.2 提示 beta.3，beta.3 不提示重复更新，更高版本不降级；本次通道发布未重新执行旧版客户端原生安装。

## 平台边界

- Windows 更新签名有效；安装包 Authenticode 状态为 `NotSigned`，系统可能显示 SmartScreen 提示。两种签名不能混为一谈。
- Mac 通用包已完成 Apple 签名与公证，Mac 和 Linux 安装包可手动下载，但尚未完成对应平台实机验收。
- 原生更新清单仅包含 `windows-x86_64`，未启用 Mac/Linux 自动更新。

## 更新入口维护与回退

当前已安装客户端读取 GitHub 的固定 `releases/latest/download/` 地址。GitHub 的 Latest 发布仍是 `v0.1.1-beta.1`；该发布下的 `latest.json` 和 `update-manifest.json` 作为可更新入口，现已指向上述 beta.3 Windows 产物。beta.3 发布保留预发布标记，没有提升为稳定版。

beta.1 的安装包和签名未改动。其原始清单已归档为 [latest-original-beta1.json](https://github.com/lidiansen58-debug/yansilu/releases/download/v0.1.1-beta.1/latest-original-beta1.json) 和 [update-manifest-original-beta1.json](https://github.com/lidiansen58-debug/yansilu/releases/download/v0.1.1-beta.1/update-manifest-original-beta1.json)。需要回退通道时，先保存当前清单，再将这两份归档恢复到对应的活动文件名；这只回退更新入口，不会降级已安装客户端。

以后改变 GitHub Latest 发布时，须同时提供两个活动清单并验证默认入口；不要将归档旧清单误当作当前通道。原 2026-10-10 验收文档保留为历史过程记录，本文件为本轮最终交付状态。
