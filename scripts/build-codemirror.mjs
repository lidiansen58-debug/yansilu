import { build } from "esbuild";

await build({
  entryPoints: ["apps/web/src/codemirror-entry.js"],
  bundle: true,
  format: "esm",
  sourcemap: false,
  minify: true,
  target: ["es2022"],
  outfile: "apps/web/src/vendor/codemirror-editor.bundle.js"
});

console.log("Built apps/web/src/vendor/codemirror-editor.bundle.js");
