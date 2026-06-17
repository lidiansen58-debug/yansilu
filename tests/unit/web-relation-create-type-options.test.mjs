import test from "node:test";
import assert from "node:assert/strict";

import { readComponentsEditorPaneSource, readPrototypeHtmlSource } from "./copy-source-helpers.mjs";

test("relation create form keeps associated_with available in the editor source", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.match(source, /const RELATION_CREATE_TYPES = \[[\s\S]*"same_topic",[\s\S]*"associated_with",[\s\S]*"unexpected_connection"/);
  assert.match(source, /associated_with: "链接线索"/);
});

test("prototype link picker keeps runtime relation options aligned with associated_with clues", async () => {
  const html = await readPrototypeHtmlSource();

  assert.match(html, /<option value="same_topic">同主题<\/option>/);
  assert.match(html, /<option value="associated_with">链接线索<\/option>/);
  assert.match(html, /<option value="unexpected_connection">意外相关<\/option>/);
  assert.match(html, /<option value="restates">重述<\/option>/);
  assert.match(html, /<option value="reframes">改写问题<\/option>/);
  assert.match(html, /<option value="appears_in_draft">进入草稿<\/option>/);
});
