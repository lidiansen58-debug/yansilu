import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing scaffold status note distinguishes projected draft and scaffold continuity", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /projectEntry\?\.action === "open-draft"/);
  assert.match(source, /当前草稿已经存在。先打开当前草稿继续写作。/);
  assert.match(source, /projectEntry\?\.action === "resume-scaffold"/);
  assert.match(source, /先回到草稿骨架，再检查证据、缺口和开放问题。/);
  assert.match(source, /先\$\{projectEntry\.actionLabel\}，再生成草稿骨架/);
});
