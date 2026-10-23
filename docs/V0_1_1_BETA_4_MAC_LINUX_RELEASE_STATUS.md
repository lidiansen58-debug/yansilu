# macOS / Linux beta.4 发布状态

更新日期：2026-10-23。两个平台的 beta.4 已公开为[预发布版本](https://github.com/lidiansen58-debug/yansilu/releases/tag/beta4-mac-linux-ci-4e9e2db4-20261023)，手动下载安装；Windows 的已验证安装包及自动更新入口保持原样。

## 来源与验证

- 固定产品源码 `4e9e2db4120cc06430a8bfb7624f68a0e937d954`，与 Windows beta.4 相同。
- [正式构建 39897167774](https://github.com/lidiansen58-debug/yansilu/actions/runs/39897167774) 的 macOS、Linux 打包回归及构建均成功。
- macOS Universal 同时包含 Intel 与 Apple Silicon 架构；应用、内置 Node.js、DMG 签名检查通过，Node.js JIT 权限验证通过，应用和 DMG 完成 Apple 公证与票据装订。
- [发布准备 39898453126](https://github.com/lidiansen58-debug/yansilu/actions/runs/39898453126) 在托管 runner 内校验全部文件库存、路径、大小和 SHA-256，使用固定产品源码的更新公钥验证四个安装/更新文件的签名，并确认篡改字节会被拒绝。DEB 也包含独立更新签名。
- 10 项公开产物的 GitHub 大小与摘要逐项匹配 CI 清单；公开清单、校验文件及四份签名文件已核对原始字节。未将本机未完成的大文件下载用于发布。

## 官网安装包

| 平台 | 文件 | 字节 | SHA-256 |
| --- | --- | ---: | --- |
| macOS Universal | `yansilu_0.1.1-beta.4_universal.dmg` | 187620865 | `5a426602a038641b4b5620510806a73374230c6c91182f2a1849d30ae39ddac0` |
| Linux AppImage x64 | `yansilu_0.1.1-beta.4_amd64.AppImage` | 136837624 | `a5e952eac508358d4fd45d4151f777fd1e142a186706da65bdef0574176d7580` |
| Linux DEB x64 | `yansilu_0.1.1-beta.4_amd64.deb` | 65430248 | `e00909477c78cfcbd0271cc0e5800a6de0dc23b466fe2c01f9f52a14933576ae` |

发布同时包含 Universal `.app.tar.gz`、对应签名、`platform-bundle-manifest.json` 和完整 `SHA256SUMS.txt`。此次不替换 Windows 发布中的清单，也不启用 Mac/Linux 自动更新。

## 覆盖边界与回退

本轮完成云端构建、签名、公证、打包回归和产物完整性检查，尚未进行 Mac（Intel / Apple Silicon）或 Linux 桌面实机安装与主流程验收，不能沿用 beta.3 的 Mac 实机结论来描述 beta.4。

旧 beta.3 发布和安装包继续保留。需要回退时可从[历史版本](https://github.com/lidiansen58-debug/yansilu/releases)手动下载安装；官网配置可回退到 PR #240 的清单，Windows 更新通道无需改变。
