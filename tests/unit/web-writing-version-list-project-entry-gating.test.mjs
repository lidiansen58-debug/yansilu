import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing scaffold version surfaces reuse project-entry gating before a project exists", async () => {
  const source = await readPrototypeAppSource();

  assert.match(
    source,
    /scaffoldVersionsHint\.textContent =[\s\S]*当前写作篮入口：\$\{projectEntry\.status\}。\$\{projectEntry\.hint\}/
  );
  assert.match(
    source,
    /scaffoldVersionsList\.innerHTML =[\s\S]*当前写作篮入口：\$\{escapeHtml\(projectEntry\.status\)\}。\$\{escapeHtml\(projectEntry\.hint\)\}/
  );
});

test("writing draft version surfaces reuse project-entry gating before a project exists", async () => {
  const source = await readPrototypeAppSource();

  assert.match(
    source,
    /draftVersionsHint\.textContent =[\s\S]*当前写作篮入口：\$\{projectEntry\.status\}。\$\{projectEntry\.hint\}/
  );
  assert.match(
    source,
    /draftVersionsList\.innerHTML =[\s\S]*当前写作篮入口：\$\{escapeHtml\(projectEntry\.status\)\}。\$\{escapeHtml\(projectEntry\.hint\)\}/
  );
});
