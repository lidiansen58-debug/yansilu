import test from "node:test";
import assert from "node:assert/strict";

import {
  editorHelperNoteType,
  editorHelperShouldHide
} from "../../apps/web/src/editor-helper-model.js";
import { readPrototypeHtmlSource } from "./copy-source-helpers.mjs";

test("editor helper visibility guards against partial DOM and muted contexts", () => {
  assert.deepEqual(editorHelperShouldHide({ elementsReady: false, module: "explorer" }), {
    hide: true,
    reason: "missing-elements"
  });
  assert.deepEqual(editorHelperShouldHide({ elementsReady: true, dismissed: true, module: "explorer" }), {
    hide: true,
    reason: "dismissed"
  });
  assert.deepEqual(editorHelperShouldHide({ elementsReady: true, muted: true, module: "explorer" }), {
    hide: true,
    reason: "muted"
  });
  assert.deepEqual(editorHelperShouldHide({ elementsReady: true, module: "graph" }), {
    hide: true,
    reason: "module"
  });
  assert.deepEqual(editorHelperShouldHide({ elementsReady: true, module: "explorer" }), {
    hide: false,
    reason: ""
  });
});

test("editor helper note-type matching prefers normalized folder root type", () => {
  assert.equal(
    editorHelperNoteType({ folderId: "dir_lit", noteType: "permanent" }, { typeFromFolder: () => " Literature " }),
    "literature"
  );
  assert.equal(editorHelperNoteType({ noteType: " Fleeting " }), "fleeting");
  assert.equal(editorHelperNoteType(null), "");
});

test("editor helper markup is not globally hidden by CSS", async () => {
  const html = await readPrototypeHtmlSource();
  const globallyHiddenEditorHelper = /(?:^|[}\r\n])\s*\.editor-helper\s*\{[^}]*display:\s*none\s*!important;?[^}]*\}/;

  assert.match(html, /id="editorHelper"/);
  assert.doesNotMatch(html, globallyHiddenEditorHelper);
});
