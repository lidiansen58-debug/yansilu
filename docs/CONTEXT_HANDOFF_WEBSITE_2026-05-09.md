# 研思录官网交接记录 - 2026-05-09

这份文档用于在清理对话上下文后继续推进官网。核心目标是让后续工作可以从 repo 文件本身恢复，不依赖聊天记录。

## 产品定位

- 产品名：研思录
- 核心理念：把知识变成你的智慧
- 官网表达重点：不是“存更多笔记”，而是帮助用户把阅读、摘录、思考、复盘沉淀成可长期使用的个人智慧系统。
- 主要受众：知识工作者、研究者、创作者、学生、长期学习者。
- 主要卖点：
  - 知识卡片化沉淀
  - 问题驱动的思考流
  - 复盘与输出闭环
  - 本地优先的桌面体验
  - 支持下载安装与自动更新
  - 后续可接入账号、订阅和付费体系

## 官网当前页面

开发服务器入口通常为：

```text
http://localhost:5173
```

已有路由：

- `/`：官网首页
- `/product`：产品理念与特色页
- `/pricing`：定价页
- `/download`：下载 / 在线安装页
- `/register`：注册页
- `/login`：登录页
- `/billing`：账户与订阅页
- `/checkout/success`：支付成功页
- `/checkout/cancel`：支付取消页
- `/prototype`：原型页
- `/api/download-manifest`：桌面安装包 manifest
- `/downloads/...`：安装包下载

## 关键文件

官网页面文件：

- `apps/web/src/marketing-home.html`
- `apps/web/src/marketing-product.html`
- `apps/web/src/marketing-pricing.html`
- `apps/web/src/marketing-download.html`
- `apps/web/src/marketing-register.html`
- `apps/web/src/marketing-login.html`
- `apps/web/src/marketing-billing.html`
- `apps/web/src/marketing-checkout-success.html`
- `apps/web/src/marketing-checkout-cancel.html`

官网样式与交互：

- `apps/web/src/marketing.css`
- `apps/web/src/marketing-site.js`
- `apps/web/src/marketing-session.js`
- `apps/web/src/marketing-home.js`
- `apps/web/src/marketing-auth.js`
- `apps/web/src/marketing-pricing.js`
- `apps/web/src/marketing-billing.js`
- `apps/web/src/marketing-download.js`
- `apps/web/src/marketing-checkout-success.js`

开发服务：

- `apps/web/src/dev-server.mjs`

API 服务：

- `apps/api/src/server.mjs`

桌面端更新相关：

- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/tauri.conf.json`
- `scripts/desktop-bundle-manifest.mjs`

## 账号、登录与付费状态

API 已经有一套本地可跑的账号与付费流程骨架：

- `POST /api/v1/auth/start`
- `POST /api/v1/auth/verify`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `GET /api/v1/billing/status`
- `POST /api/v1/billing/checkout-session`
- `POST /api/v1/billing/mock-complete`
- `POST /api/v1/billing/portal-session`
- `POST /api/v1/billing/webhook/stripe`

本地状态持久化文件：

- `vault-example/yansilu-vault/.yansilu/auth-state.json`

Stripe 相关环境变量预留：

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_BASE_URL`

当前实现倾向：

- 本地开发可以使用 mock checkout 完成订阅。
- 生产环境可接 Stripe Checkout Session。
- Webhook 入口已经预留，需要上线前补充真实签名验证、产品价格配置、错误页和回调验证。

## 下载与自动更新状态

官网已规划并实现下载页面 `/download`，用于承载：

- 当前版本信息
- Windows 安装包下载
- 安装步骤
- 自动更新说明
- 发布 manifest 状态

桌面端 Tauri 更新骨架已经接入：

- Tauri updater is intentionally not enabled for the MVP installer build.
- `tauri.conf.json` keeps `createUpdaterArtifacts` disabled until updater endpoints/signing are configured.

最近一次 manifest 状态记录：

```text
productName: 研思录
version: 0.1.0
bundleReady: true
item: nsis/研思录_0.1.0_x64-setup.exe
bytes: 2691996
sha256: F6FF42421415CF0E593C5A189F10614366B451F2F5D49CC67E944341F57A68BD
downloadUrl: /downloads/nsis/研思录_0.1.0_x64-setup.exe
```

## 已验证事项

曾验证通过的内容：

- 官网主要路由返回 200。
- `/api/download-manifest` 可返回安装包 manifest。
- `.exe` 安装包下载可访问。
- `npm.cmd run build:desktop:check` 通过。
- `cargo check` 通过。

如果重新接手，建议先跑：

```powershell
cd "E:\Projects\Thinking in Notes\yansilu"
npm.cmd run build:desktop:check
node .\apps\web\src\dev-server.mjs
```

然后浏览器打开：

```text
http://localhost:5173
http://localhost:5173/download
http://localhost:5173/pricing
```

## 已有产品文档

- `docs/MARKETING_SITE_PRODUCT_DOC.md`
- `docs/MARKETING_SITE_HOMEPAGE_V1.md`
- `docs/PRICING_PAGE_COPY_V1.md`
- `docs/AUTH_AND_PAYMENT_FLOW_V1.md`
- `docs/STRIPE_SETUP_V1.md`
- `docs/AUTH_STATE_STORAGE_V1.md`
- `docs/DESKTOP_DOWNLOAD_AND_AUTO_UPDATE_V1.md`

## 已知剩余问题

- 官网整体已经成型，但还需要继续做浏览器实测和细节 polish。
- 首页之前反馈“页面太长，要不断拖动”，已经做过方向调整，但仍建议继续压缩首屏和核心路径。
- `marketing.css` 里曾出现过中文乱码，尤其与 `.pricing-card-featured::before` 附近有关。后续应优先检查最终渲染文案，而不是只看源码。
- `marketing-download.js` 曾经做过一次 unicode 转义修复，继续前建议打开文件确认是否已经完全无乱码。
- 当前 git 工作区可能有大量未提交变更，接手时不要随意 revert。
- 生产级支付还需要真实 Stripe 配置、webhook 签名、价格 ID、正式成功/取消回调验证。
- 自动更新还需要正式发布服务器、签名、公钥/私钥配置和 release 流程固化。

## 下一步建议

建议按“小步可成功”的节奏推进：

1. 先打开 `http://localhost:5173`，完整走一遍首页、产品页、定价页、下载页、注册、登录、订阅入口。
2. 修掉浏览器中看到的明显 UI 问题：乱码、按钮 hover、移动端折行、首屏过长、导航状态。
3. 把所有页面核心文案统一为“把知识变成你的智慧”。
4. 针对 `/download` 做一次重点打磨：版本状态、安装步骤、自动更新说明、失败兜底。
5. 之后再处理真实 Stripe 与发布自动更新链路。

## 恢复上下文提示词

如果新开对话，可以直接说：

```text
请读取 docs/CONTEXT_HANDOFF_WEBSITE_2026-05-09.md，继续推进研思录官网。先用浏览器走一遍 localhost:5173 的官网流程，修 UI、交互和乱码问题，保持核心定位“把知识变成你的智慧”。
```
