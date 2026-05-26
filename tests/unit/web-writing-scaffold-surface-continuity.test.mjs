import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing scaffold surfaces reuse current basket continuity wording before reopening a project", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const scaffoldNote = hasScaffold/);
  assert.match(source, /const scaffoldStatus = hasScaffold/);
  assert.match(source, /projectEntry\?\.action === "open-draft"/);
  assert.match(source, /projectEntry\?\.action === "resume-scaffold"/);
  assert.match(source, /projectEntry\?\.action === "resume-project"/);
  assert.match(source, /const scaffoldTone =/);
  assert.match(source, /renderWritingStatusCard\("草稿骨架", scaffoldStatus, scaffoldNote, scaffoldTone\)/);
  assert.match(
    source,
    /当前写作篮已经对应\$\{escapeHtml\(projectEntry\.status\)\}。先用上面的“\$\{escapeHtml\(projectEntry\.actionLabel\)\}”继续，再回来查看草稿骨架预览。/
  );
});
