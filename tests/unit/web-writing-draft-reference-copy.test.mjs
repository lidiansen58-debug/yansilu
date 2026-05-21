import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing draft body references use 项目 and 草稿骨架 wording", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /项目：\$\{projectId\}/);
  assert.match(source, /草稿骨架：\$\{scaffoldId\}/);
  assert.doesNotMatch(source, /WritingProject: \$\{projectId\}/);
  assert.doesNotMatch(source, /DraftScaffold: \$\{scaffoldId\}/);
});
