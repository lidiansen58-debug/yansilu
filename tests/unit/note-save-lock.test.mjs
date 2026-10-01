import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { withNoteSaveLock } from "../../packages/domain/src/note-save-lock.mjs";

async function vault(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-save-lock-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test("same note actions run in order and a failure releases the next save", async t => {
  const root = await vault(t);
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const events = [];
  const first = withNoteSaveLock(root, "n", async () => { events.push("first"); await wait; throw new Error("failure"); });
  const rejected = assert.rejects(first, /failure/);
  const second = withNoteSaveLock(root, "n", () => { events.push("second"); return "saved"; });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual(events, ["first"]);
  release();
  await rejected;
  assert.equal(await second, "saved");
  assert.deepEqual(events, ["first", "second"]);
  assert.equal(await withNoteSaveLock(root, "n", () => "again"), "again");
});

test("a pending note does not block another note or another vault", async t => {
  const root = await vault(t), other = await vault(t);
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const first = withNoteSaveLock(root, "n", () => wait);
  assert.equal(await withNoteSaveLock(root, "other-note", () => "different-note"), "different-note");
  assert.equal(await withNoteSaveLock(other, "n", () => "different-vault"), "different-vault");
  release();
  await first;
});
