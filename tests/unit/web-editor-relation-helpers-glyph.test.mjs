import test from "node:test";
import assert from "node:assert/strict";

import { noteTypeGlyph } from "../../apps/web/src/editor-relation-helpers.js";

test("note type glyphs use beginner-readable note box labels", () => {
  assert.equal(noteTypeGlyph("fleeting"), "随");
  assert.equal(noteTypeGlyph("literature"), "文");
  assert.equal(noteTypeGlyph("permanent"), "久");
  assert.equal(noteTypeGlyph("original"), "久");
});
