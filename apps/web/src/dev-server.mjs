import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const PORT = Number(process.env.WEB_PORT || 5173);
const API_BASE = process.env.API_BASE || "http://localhost:3000";

const ROOT = path.resolve(process.cwd(), "apps", "web", "src");
const DESKTOP_ROOT = path.resolve(process.cwd(), "apps", "desktop", "src-tauri");
const DESKTOP_BUNDLE_ROOT = path.join(DESKTOP_ROOT, "target", "release", "bundle");
const DESKTOP_BUNDLE_MANIFEST = path.join(DESKTOP_BUNDLE_ROOT, "bundle-manifest.json");
const DESKTOP_CONFIG = path.join(DESKTOP_ROOT, "tauri.conf.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

async function servePrototype(res) {
  const htmlPath = path.join(ROOT, "prototype.html");
  const raw = await fs.readFile(htmlPath, "utf8");
  const html = raw.replaceAll('"__API_BASE__"', JSON.stringify(API_BASE));
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

async function serveApiBackedPage(res, filename) {
  const htmlPath = path.join(ROOT, filename);
  const raw = await fs.readFile(htmlPath, "utf8");
  const html = raw.replaceAll('"__API_BASE__"', JSON.stringify(API_BASE));
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

async function serveMarketingHome(res) {
  const htmlPath = path.join(ROOT, "marketing-home.html");
  const html = await fs.readFile(htmlPath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

async function serveStaticPage(res, filename) {
  const htmlPath = path.join(ROOT, filename);
  const html = await fs.readFile(htmlPath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

async function serveHandoff(res) {
  const htmlPath = path.join(ROOT, "prototype-handoff.html");
  const html = await fs.readFile(htmlPath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

async function serveFromFigma(res) {
  const htmlPath = path.join(ROOT, "prototype-from-figma.html");
  const html = await fs.readFile(htmlPath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

async function serveDownloadManifest(res) {
  const configRaw = await fs.readFile(DESKTOP_CONFIG, "utf8");
  const config = JSON.parse(configRaw);

  let manifest = null;
  try {
    const manifestRaw = await fs.readFile(DESKTOP_BUNDLE_MANIFEST, "utf8");
    manifest = JSON.parse(manifestRaw);
  } catch {
    manifest = null;
  }

  const payload = {
    ok: true,
    item: {
      productName: config.productName,
      version: config.version,
      bundleReady: Boolean(manifest),
      generatedAt: manifest?.generatedAt || null,
      totalFiles: manifest?.totalFiles || 0,
      items:
        manifest?.items?.map((item) => ({
          ...item,
          downloadUrl: `/downloads/${item.file}`
        })) || []
    }
  };

  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

async function serveBundleDownload(res, relativePath) {
  const candidate = path.resolve(DESKTOP_BUNDLE_ROOT, relativePath);
  if (!candidate.startsWith(DESKTOP_BUNDLE_ROOT)) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Invalid bundle path");
    return;
  }

  const stat = await fs.stat(candidate);
  if (!stat.isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bundle file not found");
    return;
  }

  const ext = path.extname(candidate).toLowerCase();
  const mime = MIME_TYPES[ext] || "application/octet-stream";
  const content = await fs.readFile(candidate);
  res.writeHead(200, {
    "Content-Type": mime
  });
  res.end(content);
}

async function serveAssetProxy(res, relativePath) {
  const assetPath = String(relativePath || "").replace(/^\/+/, "");
  if (!assetPath.startsWith("assets/")) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Invalid asset path");
    return;
  }
  // Avoid accidentally proxying HTML documents (e.g. index.html) through the assets pipeline.
  // This commonly happens when a host or client misroutes the default document into /assets/.
  if (assetPath.toLowerCase().endsWith(".html")) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Asset not found");
    return;
  }
  const upstream = await fetch(`${API_BASE}/api/v1/assets/file?path=${encodeURIComponent(assetPath)}`);
  if (!upstream.ok) {
    res.writeHead(upstream.status, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(await upstream.text().catch(() => "Asset not found"));
    return;
  }
  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const body = Buffer.from(await upstream.arrayBuffer());
  res.writeHead(200, { "Content-Type": contentType });
  res.end(body);
}

async function serveLocalStaticFile(res, relativePath) {
  const candidate = path.resolve(ROOT, relativePath);
  if (!candidate.startsWith(ROOT)) return false;
  try {
    const stat = await fs.stat(candidate);
    if (!stat.isFile()) return false;
    const ext = path.extname(candidate).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    const content = await fs.readFile(candidate);
    res.writeHead(200, { "Content-Type": mime });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      await serveMarketingHome(res);
      return;
    }
    if (url.pathname === "/product") {
      await serveStaticPage(res, "marketing-product.html");
      return;
    }
    if (url.pathname === "/pricing") {
      await serveStaticPage(res, "marketing-pricing.html");
      return;
    }
    if (url.pathname === "/download") {
      await serveStaticPage(res, "marketing-download.html");
      return;
    }
    if (url.pathname === "/register") {
      await serveStaticPage(res, "marketing-register.html");
      return;
    }
    if (url.pathname === "/about") {
      await serveStaticPage(res, "marketing-about.html");
      return;
    }
    if (url.pathname === "/privacy") {
      await serveStaticPage(res, "marketing-privacy.html");
      return;
    }
    if (url.pathname === "/terms") {
      await serveStaticPage(res, "marketing-terms.html");
      return;
    }
    if (url.pathname === "/login") {
      await serveStaticPage(res, "marketing-login.html");
      return;
    }
    if (url.pathname === "/billing" || url.pathname === "/account/billing") {
      await serveStaticPage(res, "marketing-billing.html");
      return;
    }
    if (url.pathname === "/checkout/success") {
      await serveStaticPage(res, "marketing-checkout-success.html");
      return;
    }
    if (url.pathname === "/checkout/cancel") {
      await serveStaticPage(res, "marketing-checkout-cancel.html");
      return;
    }
    if (url.pathname === "/prototype" || url.pathname === "/editor" || url.pathname === "/app" || url.pathname === "/app/editor") {
      await servePrototype(res);
      return;
    }
    if (url.pathname === "/paper-workspace" || url.pathname === "/app/paper-workspace") {
      await serveApiBackedPage(res, "paper-workspace.html");
      return;
    }
    if (url.pathname === "/prototype-handoff" || url.pathname === "/app/handoff") {
      await serveHandoff(res);
      return;
    }
    if (url.pathname === "/prototype-from-figma" || url.pathname === "/app/figma") {
      await serveFromFigma(res);
      return;
    }

    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify(
          {
            ok: true,
            service: "web",
            apiBase: API_BASE,
            time: new Date().toISOString()
          },
          null,
          2
        )
      );
      return;
    }
    if (url.pathname === "/api/download-manifest") {
      await serveDownloadManifest(res);
      return;
    }
    if (url.pathname.startsWith("/downloads/")) {
      const relativePath = decodeURIComponent(url.pathname.replace("/downloads/", ""));
      await serveBundleDownload(res, relativePath);
      return;
    }
    if (url.pathname.startsWith("/assets/")) {
      const relativePath = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
      if (await serveLocalStaticFile(res, relativePath)) {
        return;
      }
      await serveAssetProxy(res, relativePath);
      return;
    }

    // Static files under apps/web/src (for module-based prototype)
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (await serveLocalStaticFile(res, relative)) {
      return;
    }
    // Convenience rewrite: `/about` -> `marketing-about.html` (and same for other marketing pages).
    // This keeps routes working even if the caller omits the `.html` filename.
    if (relative && !relative.includes(".") && !relative.includes("/")) {
      const marketingCandidate = `marketing-${relative}.html`;
      if (await serveLocalStaticFile(res, marketingCandidate)) {
        return;
      }
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify(
        {
          error: "WEB_SERVER_ERROR",
          message: String(error?.message || error)
        },
        null,
        2
      )
    );
  }
});

server.listen(PORT, () => {
  console.log(`Web prototype running on http://localhost:${PORT}`);
});
