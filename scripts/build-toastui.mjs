import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

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
    name: "keep-markdown-code-literal",
    setup(builder) {
      builder.onLoad({ filter: /@toast-ui[\\/]editor[\\/]dist[\\/]esm[\\/]index\.js$/ }, async ({ path: modulePath }) => {
        const source = await fs.readFile(modulePath, "utf8");
        const original = "var nodes = lineTexts.map(function (lineText) {\n            return createParagraph(schema, createNodesWithWidget(lineText, schema));\n        });";
        const normalized = source.replaceAll("\r\n", "\n");
        const start = normalized.indexOf("MdEditor.prototype.setMarkdown = function");
        const end = normalized.indexOf("MdEditor.prototype.addWidget", start);
        const method = normalized.slice(start, end);
        if (start < 0 || end < 0 || !method.includes(original)) throw new Error("ToastUI Markdown model changed; revalidate code protection before building.");
        const helperPath = path.join(root, "apps/web/src/toastui-code-paragraphs.js").replaceAll("\\", "/");
        return { loader: "js", contents: `import { createCodeSafeMarkdownParagraphs } from ${JSON.stringify(helperPath)};\n` + normalized.slice(0, start) + method.replace(original, "var nodes = createCodeSafeMarkdownParagraphs(markdown, schema, createNodesWithWidget, createParagraph);") + normalized.slice(end) };
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
