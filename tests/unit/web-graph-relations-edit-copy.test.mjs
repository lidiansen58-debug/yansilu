import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph relations-edit followup keeps reason-focused status copy", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /已从图谱打开笔记，继续补当前关系理由/);
  assert.doesNotMatch(source, /已从图谱打开笔记，继续补当前关系的理由或类型/);
});
