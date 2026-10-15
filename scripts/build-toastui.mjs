import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { patchToastuiUpstreamSource } from "./lib/toastui-upstream-patches.mjs";

const root = process.cwd();
const vendorDir = path.join(root, "apps", "web", "src", "vendor");
await fs.mkdir(vendorDir, { recursive: true });
const sharedCodeContext = await fs.readFile(path.join(root, "packages/markdown-engine/src/markdown-code-context.mjs"), "utf8");
await fs.writeFile(path.join(root, "apps/web/src/markdown-code-context.js"), "// Generated from packages/markdown-engine/src/markdown-code-context.mjs by build:toastui.\n" + sharedCodeContext, "utf8");

await build({
  entryPoints: ["apps/web/src/toastui-entry.js"],
  bundle: true,
  format: "esm",
  sourcemap: false,
  minify: true,
  target: ["es2022"],
  plugins: [{
    name: "patch-toastui-upstream-boundaries",
    setup(builder) {
      builder.onLoad({ filter: /@toast-ui[\\/]editor[\\/]dist[\\/]esm[\\/]index\.js$/ }, async ({ path: modulePath }) => {
        const source = await fs.readFile(modulePath, "utf8");
        const helperPath = path.join(root, "apps/web/src/toastui-code-paragraphs.js").replaceAll("\\", "/");
        return { loader: "js", resolveDir: path.dirname(modulePath), contents: patchToastuiUpstreamSource(source, { codeParagraphsPath: helperPath }) };
      });
    }
  }],
  outfile: "apps/web/src/vendor/toastui-editor.bundle.js"
});

await fs.copyFile(
  path.join(root, "node_modules", "@toast-ui", "editor", "dist", "toastui-editor.css"),
  path.join(vendorDir, "toastui-editor.css")
);

console.log("Built Toast UI editor bundle and stylesheet");
