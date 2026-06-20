import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing strong-model status card only turns good for the active ready project", async () => {
  const source = await readPrototypeAppSource();

  assert.doesNotMatch(source, /canContinueProjectedStrongModel/);
  assert.match(source, /const strongModelTone = strongModelReady \? "good" : "warn";/);
  assert.match(source, /renderWritingStatusCard\("强模型", strongModelState\.status, strongModelState\.hint, strongModelTone\)/);
});
