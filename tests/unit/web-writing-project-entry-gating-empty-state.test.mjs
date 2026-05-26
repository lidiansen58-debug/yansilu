import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing project hint reuses project-entry gating before a project exists", async () => {
  const source = await readPrototypeAppSource();

  assert.match(
    source,
    /else if \(!hasProject && projectEntry\.projectId\) projectsHint\.textContent = `当前写作篮入口：\$\{projectEntry\.status\}。\$\{projectEntry\.hint\}`;/
  );
  assert.match(
    source,
    /else projectsHint\.textContent = `当前写作篮入口：\$\{projectEntry\.status\}。\$\{projectEntry\.hint\}`;/
  );
});

test("writing project empty state reuses project-entry gating before a project exists", async () => {
  const source = await readPrototypeAppSource();

  assert.match(
    source,
    /当前写作篮已经对应 \$\{escapeHtml\(projectEntry\.status\)\}。直接用上面的“\$\{escapeHtml\(projectEntry\.actionLabel\)\}”继续，会比重新创建项目更连续。/
  );
  assert.match(
    source,
    /<div class="writing-empty">当前写作篮入口：\$\{escapeHtml\(projectEntry\.status\)\}。\$\{escapeHtml\(projectEntry\.hint\)\}<\/div>/
  );
});
