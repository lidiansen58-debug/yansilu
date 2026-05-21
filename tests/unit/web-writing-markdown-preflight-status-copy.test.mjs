import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing markdown preflight checks use 通过 and 提醒 wording", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /check\.status === "pass" \? "通过" : "提醒"/);
  assert.doesNotMatch(source, /check\.status === "pass" \? "PASS" : "WARN"/);
});
