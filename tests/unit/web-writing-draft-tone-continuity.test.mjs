import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing draft status card stays visually continuity-aware for projected scaffold and project resumes", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const draftTone =/);
  assert.match(source, /projectEntry\?\.action === "open-draft"/);
  assert.match(source, /projectEntry\?\.action === "resume-scaffold"/);
  assert.match(source, /projectEntry\?\.action === "resume-project"/);
  assert.match(source, /renderWritingStatusCard\("草稿", draftStatus, draftNote, draftTone\)/);
});
