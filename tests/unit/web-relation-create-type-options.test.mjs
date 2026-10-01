import test from "node:test";
import assert from "node:assert/strict";

import { readEditorDomainSource, readPrototypeHtmlSource } from "./copy-source-helpers.mjs";

test("relation create form keeps associated_with available in the editor source", async () => {
  const source = await readEditorDomainSource();

  assert.match(source, /const RELATION_CREATE_TYPES = \[[\s\S]*"same_topic",[\s\S]*"associated_with",[\s\S]*"unexpected_connection"/);
  assert.match(source, /associated_with: "相关"/);
});

test("body link picker omits relation type options", async () => {
  const html = await readPrototypeHtmlSource();

  assert.doesNotMatch(html, /id="linkRelationTypeSelect"/);
  assert.doesNotMatch(html, /<option value="bridges">/);
  assert.doesNotMatch(html, /<option value="appears_in_draft">/);
  assert.doesNotMatch(html, /<option value="reframes">/);
  assert.doesNotMatch(html, /<option value="restates">/);
});
