import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "apps", "web", "src");
const output = path.join(root, "dist", "marketing-site");
const desktopConfigPath = path.join(root, "apps", "desktop", "src-tauri", "tauri.conf.json");

const pages = {
  "index.html": "marketing-home.html",
  "product/index.html": "marketing-product.html",
  "pricing/index.html": "marketing-pricing.html",
  "demo/index.html": "marketing-demo.html",
  "demo/zettelkasten/index.html": "marketing-demo-zettelkasten.html",
  "download/index.html": "marketing-download.html",
  "about/index.html": "marketing-about.html",
  "privacy/index.html": "marketing-privacy.html",
  "terms/index.html": "marketing-terms.html"
};

async function copyPage(destination, filename) {
  const target = path.join(output, destination);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(path.join(source, filename), target);
}

async function main() {
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });

  await Promise.all(Object.entries(pages).map(([destination, filename]) => copyPage(destination, filename)));
  await Promise.all([
    fs.copyFile(path.join(source, "marketing.css"), path.join(output, "marketing.css")),
    fs.copyFile(path.join(source, "marketing-site.js"), path.join(output, "marketing-site.js")),
    fs.copyFile(path.join(source, "marketing-tabs.js"), path.join(output, "marketing-tabs.js")),
    fs.copyFile(path.join(source, "marketing-download.js"), path.join(output, "marketing-download.js")),
    fs.cp(path.join(source, "assets"), path.join(output, "assets"), { recursive: true })
  ]);

  const desktopConfig = JSON.parse(await fs.readFile(desktopConfigPath, "utf8"));
  const downloadManifest = {
    ok: true,
    item: {
      productName: desktopConfig.productName,
      version: desktopConfig.version,
      bundleReady: false,
      generatedAt: null,
      totalFiles: 0,
      items: []
    }
  };
  await fs.mkdir(path.join(output, "api"), { recursive: true });
  await fs.writeFile(path.join(output, "api", "download-manifest"), JSON.stringify(downloadManifest), "utf8");
  await fs.writeFile(path.join(output, "_headers"), [
    "/assets/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "",
    "/*.css",
    "  Cache-Control: public, max-age=3600",
    "",
    "/*.js",
    "  Cache-Control: public, max-age=3600",
    "",
    "/*",
    "  Cache-Control: no-cache"
  ].join("\n"), "utf8");

  console.log(`Marketing site built: ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
