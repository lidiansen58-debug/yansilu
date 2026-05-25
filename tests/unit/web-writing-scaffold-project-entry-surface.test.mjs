import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing scaffold status card reuses project entry hint before a project exists", async () => {
  const source = await readPrototypeAppSource();

  assert.match(
    source,
    /const scaffoldNote = hasScaffold[\s\S]*!hasProject && projectEntry\?\.projectId && projectEntry\?\.actionLabel[\s\S]*`先\$\{projectEntry\.actionLabel\}，再生成草稿骨架`[\s\S]*: projectEntry\.hint;/
  );
});

test("writing scaffold status card reuses project entry status before a project exists", async () => {
  const source = await readPrototypeAppSource();

  assert.match(
    source,
    /const scaffoldStatus = hasScaffold[\s\S]*!hasProject && projectEntry\?\.projectId && projectEntry\?\.actionLabel[\s\S]*`先\$\{projectEntry\.actionLabel\}`[\s\S]*: projectEntry\.status;/
  );
});
