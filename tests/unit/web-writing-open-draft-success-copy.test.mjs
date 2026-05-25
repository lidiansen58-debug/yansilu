import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing open-draft projected continuity keeps writing-center-scoped feedback", async () => {
  const source = await readPrototypeAppSource();
  const match = source.match(/\$\("btnWritingOpenDraft"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writing open-draft handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /statusMessage: `已从写作中心打开当前草稿：\$\{continuation\.projectId\}`/);
  assert.match(fnBody, /从写作中心打开当前草稿失败：\$\{String\(error\?\.message \|\| error\)\}/);
});
