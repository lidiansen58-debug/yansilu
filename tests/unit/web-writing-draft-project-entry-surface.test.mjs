import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing draft status card reuses project entry status before a project exists", async () => {
  const source = await readPrototypeAppSource();

  assert.match(
    source,
    /const draftStatus = hasDraft[\s\S]*!hasProject && projectEntry\?\.projectId && projectEntry\?\.action === "resume-project"[\s\S]*projectEntry\.status[\s\S]*: projectEntry\.status;/
  );
});

test("writing draft status card reuses project entry hint before a project exists", async () => {
  const source = await readPrototypeAppSource();

  assert.match(
    source,
    /const draftNote = hasDraft[\s\S]*!hasProject && projectEntry\?\.projectId && projectEntry\?\.action === "resume-project"[\s\S]*当前项目已经存在。先继续当前项目，再生成草稿骨架并保存草稿。[\s\S]*: projectEntry\.hint;/
  );
});
