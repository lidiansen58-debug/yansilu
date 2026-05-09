# 研思录桌面壳 MVP

这个目录承载 Tauri 桌面 App 壳。当前目标是把已经可运行的 Web 原型、API 服务和本地 Vault 能力包装成跨平台桌面应用。

## 当前能力

- 使用 Tauri 2 作为桌面壳。
- 开发模式加载 `http://127.0.0.1:5173/prototype`。
- `beforeDevCommand` 会执行根目录 `npm run dev`，同时启动 API、Web 和 worker。
- 已启用 Tauri Dialog 插件权限，前端 `pickDirectoryPath()` 会优先调用系统目录选择器。
- 已启用 Tauri Opener 插件权限，Explorer 可直接在系统文件管理器中显示目录或 Markdown 文件。
- 浏览器环境仍会自动降级为手动路径输入或复制路径提示。

## 本机依赖

运行桌面壳需要：

- Node.js 22+
- Rust stable
- Cargo
- Windows WebView2 Runtime（Windows 通常已预装）

macOS / Linux 还需要按 Tauri 官方要求安装系统 WebView 相关依赖。

## 开发启动

在项目根目录执行：

```powershell
npm run dev:desktop:check
npm run dev:desktop
```

如果 `cargo` 安装在 `~/.cargo/bin`，但当前 shell 没带这个 PATH，`npm run dev:desktop` 现在会自动补齐常见 Rust 路径后再启动。

如果本机确实没有 `rustc` / `cargo`，该命令仍会失败，此时先安装 Rust 后再运行。

## 打包前检查

在项目根目录执行：

```powershell
npm run build:desktop:check
```

它会检查：

- `cargo` / `rustc` 是否可用
- `tauri.conf.json` 的产品名和窗口标题是否为 `研思录`
- 桌面图标文件是否存在
- `icon.png` 是否达到 256×256
- `cargo check` 是否通过

## 生成安装包

推荐先生成 NSIS 安装包：

```powershell
npm run build:desktop
```

它当前默认等价于：

```powershell
npm run build:desktop:nsis
```

当前已验证可生成的安装包路径：

```text
apps/desktop/src-tauri/target/release/bundle/nsis/研思录_0.1.0_x64-setup.exe
```

每次 `build:desktop` 成功后，还会自动生成：

```text
apps/desktop/src-tauri/target/release/bundle/bundle-manifest.json
apps/desktop/src-tauri/target/release/bundle/bundle-manifest.sha256.txt
```

如果只想重生成产物清单：

```powershell
npm run build:desktop:manifest
```

如果需要尝试 MSI：

```powershell
npm run build:desktop:msi
```

补充说明：

- 当前环境里 `NSIS` 打包已经通过。
- `MSI` 仍可能因为 WiX 工具下载中断而失败，这不是应用代码失败，而是 Windows 打包依赖下载链路不稳定。
- 当前安装包还未签名，属于开发/内测级产物。

## 重要边界

- 当前仍是桌面壳 MVP，不是最终安装包。
- 生产打包、签名、公证、自动更新仍未配置。
- API 仍以本地 Node 服务方式启动，后续可以再评估是否做 sidecar。
- Vault 默认路径和设置页体验还需要继续打磨。
