import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing strong-model status card stays visually continuity-aware before the project is reopened", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const canContinueProjectedStrongModel =/);
  assert.match(source, /basketReadiness\.level === "strong_model_ready"/);
  assert.match(source, /const strongModelTone = strongModelReady \|\| canContinueProjectedStrongModel \? "good" : "warn";/);
  assert.match(source, /renderWritingStatusCard\("强模型", strongModelState\.status, strongModelState\.hint, strongModelTone\)/);
});
