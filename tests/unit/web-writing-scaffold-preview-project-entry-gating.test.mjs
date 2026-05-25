import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing scaffold preview empty state reuses project-entry gating before a project exists", async () => {
  const source = await readPrototypeAppSource();

  assert.match(
    source,
    /当前写作篮已经对应\$\{escapeHtml\(projectEntry\.status\)\}。先用上面的“\$\{escapeHtml\(projectEntry\.actionLabel\)\}”继续，再回来查看草稿骨架预览。/
  );
  assert.match(
    source,
    /当前写作篮入口：\$\{escapeHtml\(projectEntry\?\.status \|\| "先补写作材料"\)\}。\$\{escapeHtml\(projectEntry\?\.hint \|\| "先补齐写作材料，再回来查看草稿骨架预览。"\)\}/
  );
});
