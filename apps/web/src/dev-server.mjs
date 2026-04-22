import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const PORT = Number(process.env.WEB_PORT || 5173);
const API_BASE = process.env.API_BASE || "http://localhost:3000";

const ROOT = path.resolve(process.cwd(), "apps", "web", "src");

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

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/prototype") {
      await servePrototype(res);
      return;
    }
    if (url.pathname === "/prototype-handoff") {
      await serveHandoff(res);
      return;
    }
    if (url.pathname === "/prototype-from-figma") {
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

    // Static files under apps/web/src (for module-based prototype)
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const candidate = path.resolve(ROOT, relative);
    if (candidate.startsWith(ROOT)) {
      try {
        const stat = await fs.stat(candidate);
        if (stat.isFile()) {
          const ext = path.extname(candidate).toLowerCase();
          const mime = MIME_TYPES[ext] || "application/octet-stream";
          const content = await fs.readFile(candidate);
          res.writeHead(200, { "Content-Type": mime });
          res.end(content);
          return;
        }
      } catch {
        // fallthrough to 404
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
