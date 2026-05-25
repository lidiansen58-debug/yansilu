import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing open-draft projected continuity keeps writing-center-scoped feedback", async () => {
  const source = await readPrototypeAppSource();
  const match = source.match(/\$\("btnWritingOpenDraft"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writing open-draft handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /continuation\.action === "open-draft"[\s\S]*已从写作中心打开当前草稿：\$\{continuation\.projectId\}/);
  assert.match(fnBody, /continuation\.action === "resume-scaffold"[\s\S]*已从写作中心回到草稿骨架：\$\{continuation\.projectId\}/);
  assert.match(fnBody, /continuation\.action === "resume-project"[\s\S]*已从写作中心继续当前项目：\$\{continuation\.projectId\}/);
  assert.match(fnBody, /continuation\.action === "open-draft"[\s\S]*从写作中心打开当前草稿/);
  assert.match(fnBody, /continuation\.action === "resume-scaffold"[\s\S]*从写作中心回到草稿骨架/);
  assert.match(fnBody, /continuation\.action === "resume-project"[\s\S]*从写作中心继续当前项目/);
});
