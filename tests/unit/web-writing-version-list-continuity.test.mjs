import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing version list empty states reuse projected continuity before asking to create or open a project", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /当前写作篮已经对应\$\{projectEntry\.status\}。先用上面的“\$\{projectEntry\.actionLabel\}”继续，这里就会显示当前项目的草稿骨架版本。/);
  assert.match(source, /当前写作篮已经对应\$\{escapeHtml\(projectEntry\.status\)\}。先用上面的“\$\{escapeHtml\(projectEntry\.actionLabel\)\}”继续，这里就会显示当前项目的历史草稿骨架版本。/);
  assert.match(source, /当前写作篮已经对应\$\{projectEntry\.status\}。先用上面的“\$\{projectEntry\.actionLabel\}”继续，这里就会显示当前项目的草稿版本。/);
  assert.match(source, /当前写作篮已经对应\$\{escapeHtml\(projectEntry\.status\)\}。先用上面的“\$\{escapeHtml\(projectEntry\.actionLabel\)\}”继续，这里就会显示当前项目的草稿版本。/);
});
