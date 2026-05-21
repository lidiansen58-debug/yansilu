import test from "node:test";
import assert from "node:assert/strict";
import { readWritingEngineSource } from "./copy-source-helpers.mjs";

test("writing markdown tensions heading uses Chinese copy", async () => {
  const source = await readWritingEngineSource();

  assert.match(source, /## 待处理的反方与漏洞/);
  assert.doesNotMatch(source, /## Draft-level tensions/);
});
