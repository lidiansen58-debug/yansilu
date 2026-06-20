import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing-center projected continuity success copy stays on explicit continuation actions", async () => {
  const source = await readPrototypeAppSource();

  const createProjectMatch = source.match(/\$\("btnWritingCreateProject"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(createProjectMatch, "expected writing create-project handler to exist");
  assert.doesNotMatch(createProjectMatch[1], /continuation\.projectId/);
  assert.match(createProjectMatch[1], /await createWritingProjectFromCurrentBasket\(\);/);

  const strongModelMatch = source.match(/\$\("btnWritingStrongModelAnalysis"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(strongModelMatch, "expected writing strong-model handler to exist");
  assert.doesNotMatch(strongModelMatch[1], /continuation\.projectId/);
  assert.match(strongModelMatch[1], /await prepareWritingStrongModelAnalysis\(\);/);

  const createScaffoldMatch = source.match(/\$\("btnWritingCreateScaffold"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(createScaffoldMatch, "expected writing create-scaffold handler to exist");
  assert.match(createScaffoldMatch[1], /已从写作中心打开当前草稿：\$\{continuation\.projectId\}/);
  assert.match(createScaffoldMatch[1], /已从写作中心回到草稿骨架：\$\{continuation\.projectId\}/);
  assert.match(createScaffoldMatch[1], /已从写作中心继续当前项目：\$\{continuation\.projectId\}/);
});
