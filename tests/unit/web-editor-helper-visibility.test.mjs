import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource, readPrototypeHtmlSource } from "./copy-source-helpers.mjs";

test("editor helper rendering guards against partial DOM and keeps note-type matching normalized", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /if \(!kicker \|\| !title \|\| !body \|\| !action\) {\s*hideEditorHelper\(\);\s*return;\s*}/);
  assert.match(source, /\.trim\(\)\s*\.toLowerCase\(\);/);
  assert.match(source, /editorHelperDismissed \|\| editorHelperMuted \|\| state\.module !== "explorer"/);
});

test("editor helper markup is not globally hidden by CSS", async () => {
  const html = await readPrototypeHtmlSource();

  assert.match(html, /id="editorHelper"/);
  assert.doesNotMatch(html, /\.editor-helper\s*\{\s*display:\s*none\s*!important;\s*\}/);
});
