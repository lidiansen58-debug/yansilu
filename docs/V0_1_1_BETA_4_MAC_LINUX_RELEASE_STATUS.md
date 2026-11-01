# macOS / Linux beta.4 发布状态

更新日期：2026-11-02。两个平台已基于最新 main 重新打包，并公开为[新的 beta.4 预发布版本](https://github.com/lidiansen58-debug/yansilu/releases/tag/beta4-mac-linux-ci-109af856-20261102)。这是同版本重打包，已有 beta.4 用户需手动下载安装；Windows 的已验证安装包及自动更新入口保持原样。

新包包含从一个问题直接开始写作、查看材料后返回续写并保存、远程模型选择与设置保留修复，以及对应使用指南。相关笔记可以逐步补充，手动写作无需模型 Key。

## 来源与验证

- 固定产品源码 `109af856115e644b84cb46a1e0e665bb54b49032`，包含已合并的 PR #243；官网发布配置与产品构建源码分别记录。
- [正式构建 41324166633](https://github.com/lidiansen58-debug/yansilu/actions/runs/41324166633) 成功，macOS、Linux 打包回归及构建均通过。
- macOS Universal 同时包含 Intel 与 Apple Silicon 架构；应用、内置 Node.js、DMG 签名检查通过，Node.js JIT 权限验证通过，应用和 DMG 完成 Apple 公证与票据装订。
- [发布准备 41325750656](https://github.com/lidiansen58-debug/yansilu/actions/runs/41325750656) 在托管 runner 内校验全部文件库存、路径、大小和 SHA-256，使用固定产品源码的更新公钥验证四个安装/更新文件的签名，并确认篡改字节会被拒绝。DEB 也包含独立更新签名。
- 10 项公开产物的 GitHub 大小与摘要逐项匹配 CI 清单；公开清单、校验文件及四份签名文件已核对原始字节。未将本机未完成的大文件下载用于发布。

## 官网安装包

| 平台 | 文件 | 字节 | SHA-256 |
| --- | --- | ---: | --- |
| macOS Universal | `yansilu_0.1.1-beta.4_universal.dmg` | 186626189 | `149d7934aeb0158567afcacea0b062a55cf27c515c240845e24a97baa71646aa` |
| Linux AppImage x64 | `yansilu_0.1.1-beta.4_amd64.AppImage` | 136829432 | `498e92a35cf1f15f7051509b0f360b7da0297a44e8fcfbc752be9bf7235719ac` |
| Linux DEB x64 | `yansilu_0.1.1-beta.4_amd64.deb` | 65470708 | `85329ca755dca1133176fa730582e9aa5ab05e72a144db8130132053d38c06e8` |

发布同时包含 Universal `.app.tar.gz`、对应签名、`platform-bundle-manifest.json` 和完整 `SHA256SUMS.txt`。此次不替换 Windows 发布中的清单，也不启用 Mac/Linux 自动更新。

## 覆盖边界与回退

本轮完成云端构建、签名、公证、打包回归和产物完整性检查，尚未进行 Mac（Intel / Apple Silicon）或 Linux 桌面实机安装与主流程验收，不能沿用 beta.3 的 Mac 实机结论来描述 beta.4。

[10 月 23 日的 beta.4](https://github.com/lidiansen58-debug/yansilu/releases/tag/beta4-mac-linux-ci-4e9e2db4-20261023) 和更早版本继续保留。需要回退时可从[历史版本](https://github.com/lidiansen58-debug/yansilu/releases)手动下载安装；官网配置可回退到本次改动之前的清单，Windows 更新通道无需改变。

官网使用既有 Cloudflare Pages `yansilu` 项目的 `main` 生产分支手动部署，合并源码不会自动部署。部署时使用验收过的同一份静态产物，再核对线上下载页、下载清单及三个新安装包的公开地址。
