import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing scaffold status card stays visually continuity-aware before reopening an existing project", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const scaffoldTone =/);
  assert.match(source, /projectEntry\?\.action === "open-draft"/);
  assert.match(source, /projectEntry\?\.action === "resume-scaffold"/);
  assert.match(source, /projectEntry\?\.action === "resume-project"/);
  assert.match(source, /renderWritingStatusCard\("草稿骨架", scaffoldStatus, scaffoldNote, scaffoldTone\)/);
});
