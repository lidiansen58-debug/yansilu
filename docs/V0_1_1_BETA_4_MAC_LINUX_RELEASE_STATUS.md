# macOS / Linux beta.4 发布状态

更新日期：2026-11-03。两个平台已基于最新产品 main 重新打包，并公开为[新的 beta.4 预发布版本](https://github.com/lidiansen58-debug/yansilu/releases/tag/beta4-mac-linux-ci-0b80e713-20261103)。这是同版本重打包，已有 beta.4 用户需手动下载安装；Windows 的已验证安装包及自动更新入口保持原样。

新包包含图谱阅读、关系筛选与主题材料优化，以及退出重开后找回原主题、继续原草稿的修复。可以从一个问题直接开始写作，再逐步补充相关笔记；手动写作无需模型 Key。

## 来源与验证

- 固定产品源码 `0b80e713a63c9b0bc9aeb5fb439c37de89f38917`，包含已合并的 PR #245、#246；官网发布配置与产品构建源码分别记录。
- [正式构建 41560992567](https://github.com/lidiansen58-debug/yansilu/actions/runs/41560992567) 成功，macOS、Linux 打包回归及构建均通过。
- macOS Universal 同时包含 Intel 与 Apple Silicon 架构；应用、内置 Node.js、DMG 签名检查通过，Node.js JIT 权限验证通过，应用和 DMG 完成 Apple 公证与票据装订。
- [发布准备 41563148749](https://github.com/lidiansen58-debug/yansilu/actions/runs/41563148749) 在托管 runner 内校验全部文件库存、路径、大小和 SHA-256，使用固定产品源码的更新公钥验证四个安装/更新文件的签名，并确认篡改字节会被拒绝。DEB 也包含独立更新签名。
- 10 项公开产物的 GitHub 大小与摘要逐项匹配 CI 清单；公开清单、校验文件及四份签名文件已核对原始字节。未将本机未完成的大文件下载用于发布。

## 官网安装包

| 平台 | 文件 | 字节 | SHA-256 |
| --- | --- | ---: | --- |
| macOS Universal | `yansilu_0.1.1-beta.4_universal.dmg` | 185501286 | `b46e18d9666adbb3aba82e304a7d45af763523995fe5ea7c7f68f1c4b0516c06` |
| Linux AppImage x64 | `yansilu_0.1.1-beta.4_amd64.AppImage` | 136829432 | `091e3725c094832d8a94e797d727d862448fb34f7ee7ccc87d0bcc46b796f33c` |
| Linux DEB x64 | `yansilu_0.1.1-beta.4_amd64.deb` | 65475122 | `716e90470ee3c4a55414de9911b39a7c445d1f06270fa019816e35ec0d592bd9` |

发布同时包含 Universal `.app.tar.gz`、对应签名、`platform-bundle-manifest.json` 和完整 `SHA256SUMS.txt`。此次不替换 Windows 发布中的清单，也不启用 Mac/Linux 自动更新。

## 覆盖边界与回退

本轮完成云端构建、签名、公证、打包回归和产物完整性检查，尚未进行 Mac（Intel / Apple Silicon）或 Linux 桌面实机安装与主流程验收，不能沿用 beta.3 的 Mac 实机结论来描述 beta.4。

[11 月 2 日的 beta.4](https://github.com/lidiansen58-debug/yansilu/releases/tag/beta4-mac-linux-ci-109af856-20261102)、[10 月 23 日的 beta.4](https://github.com/lidiansen58-debug/yansilu/releases/tag/beta4-mac-linux-ci-4e9e2db4-20261023) 和更早版本继续保留。需要回退时可从[历史版本](https://github.com/lidiansen58-debug/yansilu/releases)手动下载安装；官网配置可回退到本次改动之前的清单，Windows 更新通道无需改变。

官网使用既有 Cloudflare Pages `yansilu` 项目的 `main` 生产分支手动部署，合并源码不会自动部署。部署时使用验收过的同一份静态产物，再核对线上下载页、下载清单及三个新安装包的公开地址。
