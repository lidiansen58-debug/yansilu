import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing scaffold button reuses non-project continuity gating instead of falling back to generic create-project copy", async () => {
  const source = await readPrototypeAppSource();

  assert.match(
    source,
    /projectEntry\?\.projectId && projectEntry\?\.actionLabel[\s\S]*`先\$\{projectEntry\.actionLabel\}`[\s\S]*projectEntry\?\.actionLabel === "创建项目"[\s\S]*"先创建项目"[\s\S]*projectEntry\?\.actionLabel \|\| "先补写作材料"/
  );
});
