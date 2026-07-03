import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("mobile CSS prioritizes demo walkthrough and softens editor toolbar", () => {
  const css = fs.readFileSync("apps/web/src/prototype.css", "utf8");

  assert.match(css, /data-smart-notes-demo-walkthrough/);
  assert.match(css, /order:\s*-20/);
  assert.match(css, /\.editor-stage-top \.toolbar/);
  assert.match(css, /max-height:\s*30px/);
  assert.match(css, /opacity:\s*0\.48/);
  assert.match(css, /focus-within \.toolbar/);
});
