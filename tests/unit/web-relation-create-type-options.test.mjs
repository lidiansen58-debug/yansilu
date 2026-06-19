import test from "node:test";
import assert from "node:assert/strict";

import { readComponentsEditorPaneSource, readPrototypeHtmlSource } from "./copy-source-helpers.mjs";

test("relation create form keeps associated_with available in the editor source", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.match(source, /const RELATION_CREATE_TYPES = \[[\s\S]*"same_topic",[\s\S]*"associated_with",[\s\S]*"unexpected_connection"/);
  assert.match(source, /associated_with: "相关"/);
});

test("prototype link picker keeps only common relation options for manual linking", async () => {
  const html = await readPrototypeHtmlSource();

  assert.match(html, /<option value="associated_with" selected>相关<\/option>/);
  assert.match(html, /<option value="supports">支持<\/option>/);
  assert.match(html, /<option value="complements">补充<\/option>/);
  assert.match(html, /<option value="qualifies">限定<\/option>/);
  assert.match(html, /<option value="contradicts">反驳<\/option>/);
  assert.match(html, /<option value="bridges">桥接<\/option>/);
  assert.doesNotMatch(html, /<option value="appears_in_draft">/);
  assert.doesNotMatch(html, /<option value="reframes">/);
  assert.doesNotMatch(html, /<option value="restates">/);
});
