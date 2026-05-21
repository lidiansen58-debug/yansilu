import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing preflight check labels use Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /"永久笔记篮"/);
  assert.match(source, /"写作意图"/);
  assert.match(source, /"读者收获"/);
  assert.match(source, /"已确认提纯"/);
  assert.match(source, /"提纯质量"/);
  assert.match(source, /"主题入口"/);
  assert.match(source, /"反方与边界"/);
  assert.doesNotMatch(source, /"Permanent-note basket"/);
  assert.doesNotMatch(source, /"Writing intent"/);
  assert.doesNotMatch(source, /"Reader takeaway"/);
  assert.doesNotMatch(source, /"Confirmed distillation"/);
  assert.doesNotMatch(source, /"Distillation quality"/);
  assert.doesNotMatch(source, /"Theme entry"/);
  assert.doesNotMatch(source, /"Counterpoint boundary"/);
});
