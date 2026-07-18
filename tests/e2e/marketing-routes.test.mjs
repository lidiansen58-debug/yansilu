import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForJsonHealth(url) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Service did not become healthy: ${url}`);
}

async function withWebServer(t) {
  const webPort = await findFreePort();
  const webBase = `http://127.0.0.1:${webPort}`;
  const web = spawn(process.execPath, ["apps/web/src/dev-server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      WEB_PORT: String(webPort),
      API_BASE: "http://127.0.0.1:9"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => {
    web.kill();
  });

  const health = await waitForJsonHealth(`${webBase}/health`);
  assert.equal(health.service, "web");
  return webBase;
}

test("marketing routes expose static marketing pages", async (t) => {
  const webBase = await withWebServer(t);
  const routes = [
    ["/about", "page-about-v2"],
    ["/product", "page-product-v2"],
    ["/pricing", "page-pricing-v2"],
    ["/download", "page-download-v2"],
    ["/demo", "page-demo-v2"],
    ["/demo/zettelkasten", "page-demo-v2"],
    ["/privacy", "page-privacy-v2"],
    ["/terms", "page-terms-v2"]
  ];

  for (const [route, bodyClass] of routes) {
    const res = await fetch(`${webBase}${route}`);
    assert.equal(res.status, 200, route);
    assert.match(res.headers.get("content-type") || "", /text\/html/);
    const html = await res.text();
    assert.match(html, new RegExp(`body class="[^"]*${bodyClass}`));
    assert.match(html, /<main id="main"/);
    assert.match(html, /marketing-site\.js/);
    assert.match(html, /brand-slogan">让笔记生长为思想</);
    assert.doesNotMatch(html, /href="\/(?:login|register|billing)"/);
    assert.doesNotMatch(html, /href="\/app"/);
    assert.doesNotMatch(html, /href="\/prototype\?demo=/);
    assert.doesNotMatch(html, /<a href="\/download">下载<\/a>/);
    assert.doesNotMatch(html, /marketing-session\.js/);
    if (route === "/privacy" || route === "/terms") {
      assert.match(html, /生效日期：2026 年 7 月 17 日/);
      assert.match(html, /github\.com\/lidiansen58-debug\/yansilu\/issues/);
    }
    if (route === "/product") {
      assert.equal((html.match(/data-marketing-tabs/g) || []).length, 2);
      assert.doesNotMatch(html, /role="tabpanel"[^>]*\shidden(?:\s|>)/);
      assert.match(html, /形成自己的观点/);
      assert.match(html, /从积累中发现洞察/);
      assert.match(html, /用已有知识完成写作/);
      assert.match(html, /手机快速记录/);
      assert.match(html, /AI 减少重复劳动/);
      assert.match(html, /本地数据与备份/);
      assert.match(html, /v2-orbit-map/);
      assert.match(html, /v2-final-cta/);
      assert.doesNotMatch(html, /v2-workflow-rail/);
      assert.doesNotMatch(html, />连接<\/span>/);
    }
    if (route === "/demo") {
      assert.match(html, /\/demo\/zettelkasten/);
      assert.match(html, /demo-product-shot/);
      assert.match(html, /demo-journey-list/);
      assert.doesNotMatch(html, /\/demo\/yijing/);
      assert.doesNotMatch(html, /yijing-rich/);
    }
    if (route === "/demo/zettelkasten") {
      assert.match(html, /免费下载桌面版/);
      assert.match(html, /assets\/marketing\/original-writing\.png/);
      assert.doesNotMatch(html, /\/demo\/yijing/);
      assert.doesNotMatch(html, /yijing-rich/);
      assert.doesNotMatch(html, /demo-graph-preview|demo-step-list|306 relations|source_gap/);
      assert.doesNotMatch(html, /fixture/);
    }
  }
});
test("removed marketing account and checkout routes return not found", async (t) => {
  const webBase = await withWebServer(t);
  for (const route of [
    "/login",
    "/register",
    "/billing",
    "/account/billing",
    "/checkout/success",
    "/checkout/cancel",
    "/marketing-login.html",
    "/marketing-register.html",
    "/marketing-billing.html",
    "/marketing-checkout-success.html",
    "/marketing-checkout-cancel.html"
  ]) {
    const res = await fetch(`${webBase}${route}`, { redirect: "manual" });
    assert.equal(res.status, 404, route);
  }
});

test("marketing home exposes the smart notes demo story", async (t) => {
  const webBase = await withWebServer(t);
  const res = await fetch(`${webBase}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") || "", /text\/html/);
  const html = await res.text();
  assert.match(html, /page-home-carousel/);
  assert.match(html, /brand-slogan">让笔记生长为思想</);
  assert.match(html, /home-carousel-stage/);
  assert.match(html, /data-tab-autoplay="6500"/);
  assert.match(html, /data-tab-autoplay-toggle[^>]*aria-label="自动播放"[^>]*hidden/);
  assert.match(html, /让笔记生长为思想/);
  assert.match(html, /把零散记录加工成自己的观点/);
  assert.match(html, /把材料变成自己的观点/);
  assert.match(html, /看见观点之间的关系/);
  assert.match(html, /用长期积累完成作品/);
  assert.match(html, /assets\/marketing\/permanent-note\.png/);
  assert.match(html, /assets\/marketing\/knowledge-network\.png/);
  assert.match(html, /实际 Smart Notes Demo 的知识网络/);
  assert.match(html, /assets\/marketing\/original-writing\.png/);
  assert.equal((html.match(/data-marketing-tabs/g) || []).length, 1);
  assert.equal((html.match(/role="tabpanel"[^>]*\shidden(?:\s|>)/g) || []).length, 2);
  assert.equal((html.match(/loading="lazy"/g) || []).length, 2);
  assert.doesNotMatch(html, /workbench-preview|page-home-workbench|href="\/app"/);
  assert.doesNotMatch(html, /smart-notes-product-thinking|\/prototype\?demo=/);
  assert.match(html, /本地优先 · 永久免费 · AI 可选/);
  assert.match(html, /你的知识，始终在你的掌控之中/);
  assert.match(html, /手机轻记/);
  assert.match(html, /第三方远程模型可能收费/);
});
test("marketing pricing states the permanent-free and third-party cost boundary", async (t) => {
  const webBase = await withWebServer(t);
  const res = await fetch(`${webBase}/pricing`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /page-pricing-v2/);
  assert.match(html, /pricing-simple-list/);
  assert.match(html, /软件、本地 AI 和更新/);
  assert.match(html, /加密备份/);
  assert.match(html, /直接向第三方供应商付费/);
  assert.doesNotMatch(html, /promise-price|v2-faq-grid|v2-boundary-panel|cost-ledger/);
  assert.doesNotMatch(html, /token/);
  assert.doesNotMatch(html, /Stripe/);
});

test("marketing download puts Windows and macOS choices in the first screen", async (t) => {
  const webBase = await withWebServer(t);
  const res = await fetch(`${webBase}/download`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /data-download-buttons/);
  assert.match(html, /Windows 和 macOS 都提供桌面版/);
  assert.match(html, /DMG 安装包/);
  assert.doesNotMatch(html, /data-download-primary(?:[\s>])/);
  assert.doesNotMatch(html, /data-download-files|releaseTitle/);
});
test("asset proxy refuses html documents before calling the API", async (t) => {
  const webBase = await withWebServer(t);
  const res = await fetch(`${webBase}/assets/index.html`);
  assert.equal(res.status, 404);
  assert.equal(await res.text(), "Asset not found");
});

test("prototype keeps the public demo writing theme detail renderer", async (t) => {
  const webBase = await withWebServer(t);
  const prototype = await fetch(`${webBase}/prototype?demo=smart-notes-product-thinking`);
  assert.equal(prototype.status, 200);
  const html = await prototype.text();
  assert.match(html, /prototype-app\.js/);

  const controller = await fetch(`${webBase}/writing-panel-controller.js`);
  assert.equal(controller.status, 200);
  const controllerSource = await controller.text();
  assert.match(controllerSource, /from "\.\/writing-theme-card-panel\.js"/);

  const themePanel = await fetch(`${webBase}/writing-theme-card-panel.js`);
  assert.equal(themePanel.status, 200);
  const source = await themePanel.text();
  assert.match(source, /function renderWritingThemeDetailDom/);
  assert.match(source, /writingThemeDetailTitle/);
  assert.match(source, /writingThemeDetailCentralQuestion/);
});
