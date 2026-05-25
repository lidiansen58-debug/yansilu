import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing-center projected continuity handlers keep failure copy writing-center-scoped", async () => {
  const source = await readPrototypeAppSource();

  const createProjectMatch = source.match(/\$\("btnWritingCreateProject"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(createProjectMatch, "expected writing create-project handler to exist");
  assert.match(createProjectMatch[1], /continuation\.action === "open-draft" \? "从写作中心打开当前草稿" : continuation\.action === "resume-scaffold" \? "从写作中心回到草稿骨架" : "从写作中心继续当前项目"/);

  const createScaffoldMatch = source.match(/\$\("btnWritingCreateScaffold"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(createScaffoldMatch, "expected writing create-scaffold handler to exist");
  assert.match(createScaffoldMatch[1], /continuation\.action === "open-draft" \? "从写作中心打开当前草稿" : continuation\.action === "resume-scaffold" \? "从写作中心回到草稿骨架" : "从写作中心继续当前项目"/);

  const strongModelMatch = source.match(/\$\("btnWritingStrongModelAnalysis"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(strongModelMatch, "expected writing strong-model handler to exist");
  assert.match(strongModelMatch[1], /continuation\.action === "open-draft" \? "从写作中心打开当前草稿" : continuation\.action === "resume-scaffold" \? "从写作中心回到草稿骨架" : "从写作中心继续当前项目"/);
});
