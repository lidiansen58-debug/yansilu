import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const vendorDir = path.join(root, "apps", "web", "src", "vendor");
await fs.mkdir(vendorDir, { recursive: true });

await build({
  entryPoints: ["apps/web/src/toastui-entry.js"],
  bundle: true,
  format: "esm",
  sourcemap: false,
  minify: true,
  target: ["es2022"],
  outfile: "apps/web/src/vendor/toastui-editor.bundle.js"
});

await fs.copyFile(
  path.join(root, "node_modules", "@toast-ui", "editor", "dist", "toastui-editor.css"),
  path.join(vendorDir, "toastui-editor.css")
);

console.log("Built Toast UI editor bundle and stylesheet");
