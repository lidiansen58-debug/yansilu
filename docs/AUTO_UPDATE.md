# 研思录自动升级基础机制

## 工作方式

第一版只实现安全的更新检测闭环：

1. API 服务从根 `package.json` 读取当前应用版本。
2. API 服务读取 `YANSILU_UPDATE_MANIFEST_URL` 指向的远端 JSON manifest。
3. 服务端比较当前版本和 manifest 的 `version`。
4. 前端设置页显示当前版本、最新版本、检查时间、更新说明、错误信息和下载入口。
5. 用户确认后打开 manifest 里的下载页，由用户自行下载和安装。

第一版不会静默下载、不会自动安装、不会重启应用，也不会自动迁移或改写用户 Vault。

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
  "downloadUrl": "https://example.com/yansilu-0.1.2-setup.exe",
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
- `downloadUrl`：下载页或安装包页面。
- `minimumSupportedVersion`：最低支持版本，用于提示用户尽快升级。
- `critical`：重要更新会在设置页和系统消息里更明显展示，但仍需用户确认。
- `checksum`：预留校验字段，第一版只展示/传递，不自动校验安装包。

缺少可选字段时，客户端会降级显示；缺少 `version` 时，本次检查会标记为失败。

## 发布时如何更新 Manifest

1. 完成 release build 和人工验收。
2. 生成安装包、发布说明和校验和。
3. 将 manifest 更新为新版本号、发布日期、通道、更新说明、下载地址和 checksum。
4. 上传 manifest 到 `YANSILU_UPDATE_MANIFEST_URL` 指向的 HTTPS 静态地址。
5. 用旧版本启动应用，手动点击“设置 -> 版本更新 -> 检查更新”验证结果。

本地开发可用：

```powershell
$env:YANSILU_UPDATE_MANIFEST_URL="http://127.0.0.1:8080/update.json"
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

不支持：

- 静默下载或静默安装。
- 自动替换程序文件。
- 自动重启。
- 差分更新。
- 发布通道灰度策略。
- 安装包 checksum 强校验。
- Tauri updater 插件的端到端安装流程。

## 安全边界

- 更新状态只写入前端本地设置，不写入用户笔记正文。
- 检查失败不会阻塞主界面，也不会影响笔记编辑、导入导出或 AI 复核。
- 自动更新功能不会自动迁移 Vault。
- 如果未来版本需要数据迁移，必须先展示迁移说明、风险和确认动作。
- 下载和安装由用户明确触发；应用不会在用户不知情时替换程序。

## 后续接入方向

当桌面安装包和发布源稳定后，可以在此基础上接入 Tauri updater：

1. 为 release pipeline 生成 Tauri updater artifacts 和签名。
2. 将 manifest 扩展为平台化 release feed。
3. 下载前显示校验、大小和变更摘要。
4. 用户确认后执行下载，并在安装/重启前再次确认。
5. 将 checksum 校验和签名验证作为安装前置条件。
