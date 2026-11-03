# macOS / Linux beta.4 发布状态

更新日期：2026-11-03。两个平台基于包含 PR #245、#246 的产品代码及 Unix 安装启动修复重新打包，对应[新的 beta.4 预发布版本](https://github.com/lidiansen58-debug/yansilu/releases/tag/beta4-mac-linux-ci-59da1e2d-20261103)。这是同版本重打包，已有 beta.4 用户需手动下载安装；Windows 安装包及自动更新入口保持原样。

新包包含图谱阅读、关系筛选与主题材料优化，以及退出重开后找回原主题、继续原草稿的修复。可以从一个问题直接开始写作，再逐步补充相关笔记；手动写作无需模型 Key。同时修复了 Unix 安装后试图修改系统所有的可执行运行时权限、导致应用无法启动的问题。

## 来源与验证

- 固定产品源码 `59da1e2d893c63b55da5a8c42eac126d907be018`；官网和发布辅助脚本的后续改动不改变安装包源码。
- [正式构建 41567359043](https://github.com/lidiansen58-debug/yansilu/actions/runs/41567359043) 成功，macOS、Linux 打包回归、可执行文件权限单元测试及构建均通过。
- macOS Universal 同时包含 Intel 与 Apple Silicon 架构；应用、内置 Node.js、DMG 签名检查通过，Node.js JIT 权限验证通过，应用和 DMG 完成 Apple 公证与票据装订。
- [安装与发布准备 41569885299](https://github.com/lidiansen58-debug/yansilu/actions/runs/41569885299)：托管 Apple Silicon macOS 从 DMG 复制应用、卸载镜像后启动；Ubuntu 24.04 安装 DEB 后以普通用户启动，并运行 AppImage。三个包均验证原生窗口、内置 API、独立笔记库、保存测试笔记及终止进程组后重新打开读取。这里的停止方式为进程组 SIGTERM，不代指人工正常关闭窗口流程。
- 发布准备还校验全部文件库存、路径、大小和 SHA-256，使用固定产品源码的更新公钥验证四个安装/更新文件的签名，并确认篡改字节会被拒绝；DEB 也包含独立更新签名。发布前逐项对比 GitHub 资产摘要和 CI 清单。

## 官网安装包

| 平台 | 文件 | 字节 | SHA-256 |
| --- | --- | ---: | --- |
| macOS Universal | `yansilu_0.1.1-beta.4_universal.dmg` | 156317861 | `f49807d600f14251ee187560fe1764993ff91a09cfa9808a512182a3a47cb4eb` |
| Linux AppImage x64 | `yansilu_0.1.1-beta.4_amd64.AppImage` | 136837624 | `f5d1314278fac4142ed461f578c7e325ec48756bf146af2af555fc9dcf3370ed` |
| Linux DEB x64 | `yansilu_0.1.1-beta.4_amd64.deb` | 65472604 | `04ec926bfcb1aa52b958c252767d9796abf70c45beb43452eed9e8fa39c9e65b` |

发布同时包含 Universal `.app.tar.gz`、对应签名、`platform-bundle-manifest.json` 和完整 `SHA256SUMS.txt`。此次不替换 Windows 发布中的清单，也不启用 Mac/Linux 自动更新。

## 覆盖边界与回退

本轮完成目标系统托管环境安装启动冒烟，尚未覆盖用户实体设备、Intel Mac 原生运行、输入法和完整人工记录到写作流程，不能沿用 beta.3 的 Mac 实机结论来描述 beta.4。Linux 的 AppImage 在无 FUSE 挂载的 CI 环境采用官方 `--appimage-extract-and-run` 模式；图形环境为 Xvfb、软件渲染，未关闭 WebKit 沙箱。

[11 月 2 日的 beta.4](https://github.com/lidiansen58-debug/yansilu/releases/tag/beta4-mac-linux-ci-109af856-20261102)、[10 月 23 日的 beta.4](https://github.com/lidiansen58-debug/yansilu/releases/tag/beta4-mac-linux-ci-4e9e2db4-20261023) 和更早版本继续保留。需要回退时可从[历史版本](https://github.com/lidiansen58-debug/yansilu/releases)手动下载安装；官网配置可回退到本次改动之前的清单，Windows 更新通道无需改变。未通过 Linux 安装启动检查的 `0b80e713` 候选保持草稿，不用于官网。

官网使用既有 Cloudflare Pages `yansilu` 项目的 `main` 生产分支手动部署，合并源码不会自动部署。部署时使用验收过的同一份静态产物，再核对线上下载页、下载清单及三个新安装包的公开地址。若 GitHub Actions 在创建草稿时返回 403，可使用具备发布权限的账号为固定源码预建空的 Beta 草稿，再运行发布准备。脚本仅接收源码匹配、尚无资产的未发布预发布草稿，拒绝替换已有资产。
