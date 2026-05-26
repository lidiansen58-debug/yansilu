import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing draft surfaces reuse projected draft, scaffold, and project continuity before a project is reopened", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const draftStatus = hasDraft/);
  assert.match(source, /!hasProject && projectEntry\?\.projectId && projectEntry\?\.action === "open-draft"/);
  assert.match(source, /!hasProject && projectEntry\?\.projectId && projectEntry\?\.action === "resume-scaffold"/);
  assert.match(source, /!hasProject && projectEntry\?\.projectId && projectEntry\?\.action === "resume-project"/);
  assert.match(source, /const draftNote = hasDraft/);
  assert.match(source, /当前草稿骨架已经存在。先回到草稿骨架，再继续保存草稿。/);
  assert.match(source, /当前项目已经存在。先继续当前项目，再生成草稿骨架并保存草稿。/);
  assert.match(source, /renderWritingStatusCard\("草稿", draftStatus, draftNote, draftTone\)/);
  assert.match(source, /projectEntryAction: hasProject \? "" : String\(projectEntry\?\.action \|\| ""\)\.trim\(\)/);
});
