# 研思录自动升级基础机制

## 工作方式

当前实现分成两层：

1. API 服务从根 `package.json` 读取当前应用版本。
2. API 服务读取 `YANSILU_UPDATE_MANIFEST_URL` 指向的远端 JSON manifest；未配置时默认读取 GitHub Release 的 `https://github.com/lidiansen58-debug/yansilu/releases/latest/download/update-manifest.json`。
3. 服务端比较当前版本和 manifest 的 `version`。
4. 前端设置页显示当前版本、最新版本、检查时间、更新说明、错误信息和下载入口。
5. 浏览器环境或桌面更新源不可用时，用户确认后打开 manifest 里的下载页，由用户自行下载和安装。
6. Tauri 桌面环境中，如果 `latest.json` 更新 feed、签名和平台安装包都准备好，用户可以在设置页点击“一键下载并安装”，安装完成后再点击“重启完成更新”。

应用不会静默下载、不会在没有用户确认时安装或重启，也不会自动迁移或改写用户 Vault。

## Manifest 格式

示例：

```json
{
  "version": "0.1.2",
  "releaseDate": "2026-06-20",
  "channel": "beta",
  "changelog": [
    "修复更新检查失败时的提示。",
    "改进关系图中的系统消息入口。"
  ],
  "downloadUrl": "https://github.com/lidiansen58-debug/yansilu/releases/tag/v0.1.2",
  "assets": [
    {
      "file": "nsis/yansilu_0.1.2_x64-setup.exe",
      "platform": "windows-x86_64",
      "bytes": 12345678,
      "url": "https://github.com/lidiansen58-debug/yansilu/releases/download/v0.1.2/yansilu_0.1.2_x64-setup.exe",
      "checksum": {
        "algorithm": "sha256",
        "value": "..."
      }
    }
  ],
  "minimumSupportedVersion": "0.1.1-beta.1",
  "critical": false,
  "checksum": {
    "algorithm": "sha256",
    "value": "..."
  }
}
```

字段说明：

- `version`：最新版本号，必填。
- `releaseDate`：发布日期。
- `channel`：发布通道，例如 `beta`、`stable`。
- `changelog`：更新说明，可以是字符串数组或单个字符串。
- `downloadUrl`：GitHub Release 页面或稳定下载页；不要指向某一个平台专用安装包，避免 macOS/Linux 用户被带到 Windows 安装包。
- `assets`：可选的平台安装包列表，包含 `file`、`platform`、`bytes`、`url`、`checksum`。浏览器回退入口优先打开 `downloadUrl`，桌面一键安装使用 Tauri `latest.json`。
- `minimumSupportedVersion`：最低支持版本，用于提示用户尽快升级。
- `critical`：重要更新会在设置页和系统消息里更明显展示，但仍需用户确认。
- `checksum`：预留校验字段，第一版只展示/传递，不自动校验安装包。

缺少可选字段时，客户端会降级显示；缺少 `version` 时，本次检查会标记为失败。

## 发布时如何更新 Manifest

1. 完成 release build 和人工验收。
2. 生成安装包、发布说明和校验和。
3. 将安装包上传到 GitHub Release。
4. tagged `desktop-release` 工作流会自动收集下载到的桌面构建产物，生成 `bundle-manifest.json` / `bundle-manifest.sha256.txt`，再生成并上传 `update-manifest.json` 和 `latest.json` 到 GitHub Release 草稿。
5. 如果需要本地复现或手工补发 manifest，可以运行：

```powershell
npm.cmd run release:update-manifest -- --repo lidiansen58-debug/yansilu --tag v0.1.2 --changelog-file docs/V0_1_2_RELEASE_NOTES.md
```

默认会读取 `apps/desktop/src-tauri/target/release/bundle/bundle-manifest.json`，并生成两份文件：

- `release-artifacts/update-manifest.json`：研思录 API 和设置页用于检查更新、展示 changelog、打开下载页的简化 manifest。
- `release-artifacts/latest.json`：Tauri updater 使用的平台化安装 feed，包含 `platforms.<os-arch>.url` 和 `.sig` 文件内容。

如果需要指定简化 manifest 的主校验包，可以加 `--file "nsis/研思录_0.1.2_x64-setup.exe"`；`downloadUrl` 仍会指向 GitHub Release 页面，平台安装包地址会写入 `assets`。Tauri feed 会从构建目录里的 `.sig` 文件读取签名；缺少签名时脚本会失败，不会生成可误用的安装 feed。

6. 默认情况下，API 会直接读取 GitHub Release 的 `update-manifest.json`，Tauri updater 会直接读取 GitHub Release 的 `latest.json`。
7. 如果后续改用 `downloads.yansilu.app`、GitHub Pages 或对象存储 CDN，则将 GitHub Release 中的 `update-manifest.json` 同步到 `YANSILU_UPDATE_MANIFEST_URL` 指向的地址，并将 `latest.json` 同步到 `tauri.conf.json` 配置的 updater endpoint。
8. 用旧版本启动应用，手动点击“设置 -> 版本更新 -> 检查更新”验证结果。
9. 在签名 updater feed 可用时，继续验证“一键下载并安装 -> 重启完成更新”。

如果最新版安装包放在 GitHub Releases，`downloadUrl` 会指向发布页，形如：

```text
https://github.com/lidiansen58-debug/yansilu/releases/tag/v0.1.2
```

应用不需要直接调用 GitHub API；默认只访问 GitHub Release 的静态下载地址。这个 manifest 也可以放在 GitHub Pages、`downloads.yansilu.app`，或其他稳定 HTTPS 静态地址。
`releases/latest/download` 适合稳定公开版本；如果要给 beta/prerelease 单独推送更新，需要为 beta 配置独立 endpoint。

本地开发可用：

```powershell
$env:YANSILU_UPDATE_MANIFEST_URL="http://127.0.0.1:8080/update.json"
npm run dev:api
```

默认情况下，`POST /api/v1/app/updates/check` 会忽略请求体里的 `manifestUrl`，只使用服务端配置的地址。只有本地测试需要临时覆盖时，才设置 `YANSILU_ALLOW_UPDATE_MANIFEST_OVERRIDE=true`。

如需完全关闭服务端更新检查：

```powershell
$env:YANSILU_UPDATE_MANIFEST_URL="disabled"
npm run dev:api
```

## 第一版支持与不支持

支持：

- 读取当前应用版本。
- 读取远端 manifest。
- 比较版本并展示 `update-available` / `up-to-date` / `failed` / `disabled` 等状态。
- 启动后延迟自动检查，最多每天一次。
- 手动检查更新。
- 稍后提醒、忽略当前版本、关闭自动检查。
- 打开下载页。
- 桌面环境下由用户确认后调用 Tauri updater 下载、签名校验、安装。
- 安装完成后由用户再次确认重启。

不支持：

- 静默下载或无确认安装。
- 安装完成后自动重启。
- 差分更新。
- 发布通道灰度策略。
- 绕过 Tauri 签名机制的安装包校验。

## 安全边界

- 更新状态只写入前端本地设置，不写入用户笔记正文。
- 检查失败不会阻塞主界面，也不会影响笔记编辑、导入导出或 AI 复核。
- 自动更新功能不会自动迁移 Vault。
- 如果未来版本需要数据迁移，必须先展示迁移说明、风险和确认动作。
- 下载和安装由用户明确触发；应用不会在用户不知情时替换程序。
- Tauri updater 的安装 feed 必须使用签名 artifact；没有 `.sig` 时发布脚本会报错。

## 后续接入方向

后续仍建议补强：

1. 为不同 channel 提供独立 endpoint，例如 beta/stable。
2. 如果后续使用 `downloads.yansilu.app`，将 GitHub Release 中生成的 `update-manifest.json` 和 `latest.json` 自动同步过去。
3. 下载前显示安装包大小、签名 feed 时间和平台信息。
4. 对需要 Vault 迁移的版本增加迁移确认页和备份提示。
5. 增加真实打包环境下的端到端升级验收。
