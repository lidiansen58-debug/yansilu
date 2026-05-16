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
    ["/demo", "page-demo-v2"],
    ["/demo/zettelkasten", "page-demo-v2"],
    ["/demo/yijing", "page-demo-v2"],
    ["/privacy", "page-privacy-v2"],
    ["/terms", "page-terms-v2"],
    ["/login", "page-login-v2"],
    ["/register", "page-register-v2"],
    ["/billing", "page-billing-v2"]
  ];

  for (const [route, bodyClass] of routes) {
    const res = await fetch(`${webBase}${route}`);
    assert.equal(res.status, 200, route);
    assert.match(res.headers.get("content-type") || "", /text\/html/);
    const html = await res.text();
    assert.match(html, new RegExp(`body class="[^"]*${bodyClass}`));
    assert.match(html, /<main id="main"/);
    assert.match(html, /marketing-site\.js/);
    if (route === "/login" || route === "/register") {
      assert.match(html, /id="authForm"/);
      assert.match(html, /class="auth-card"/);
    }
    if (route === "/billing") {
      assert.match(html, /data-billing-plan/);
      assert.match(html, /data-billing-status/);
    }
    if (route === "/demo") {
      assert.match(html, /产品演示中心/);
      assert.match(html, /\/demo\/zettelkasten/);
      assert.match(html, /\/demo\/yijing/);
      assert.match(html, /\/prototype\?demo=smart-notes-product-thinking/);
    }
    if (route === "/demo/zettelkasten") {
      assert.match(html, /smart-notes-product-thinking/);
      assert.match(html, /\/prototype\?demo=smart-notes-product-thinking/);
      assert.match(html, /\/demo\/yijing/);
    }
    if (route === "/demo/yijing") {
      assert.match(html, /yijing-rich/);
      assert.match(html, /\/prototype\?demo=yijing-rich/);
      assert.match(html, /\/demo/);
    }
  }
});

test("marketing home exposes the smart notes demo story", async (t) => {
  const webBase = await withWebServer(t);
  const res = await fetch(`${webBase}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") || "", /text\/html/);
  const html = await res.text();
  assert.match(html, /home-v3-demo/);
  assert.match(html, /smart-notes-product-thinking/);
  assert.match(html, /\/prototype\?demo=smart-notes-product-thinking/);
});

test("asset proxy refuses html documents before calling the API", async (t) => {
  const webBase = await withWebServer(t);
  const res = await fetch(`${webBase}/assets/index.html`);
  assert.equal(res.status, 404);
  assert.equal(await res.text(), "Asset not found");
});
