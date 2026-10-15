import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { createWritingRelationCountLoader } from "../../apps/web/src/writing-relation-count-loader.js";

test("basket and theme relation reads share a bounded queue and later refreshes read fresh results", async () => {
  let active = 0, maximum = 0, relationCount = 1;
  const calls = [];
  const load = createWritingRelationCountLoader({
    fetchNoteRelations: async id => {
      active++; maximum = Math.max(maximum, active); calls.push(id);
      await setImmediate(); active--;
      return Array.from({ length: relationCount }, () => ({}));
    }, countRelations: items => items.length
  });
  const ids = Array.from({ length: 56 }, (_, index) => `n${index}`);
  const [basket, theme] = await Promise.all([load([...ids, ids[0], " "]), load(ids)]);
  assert.equal(maximum, 4);
  assert.equal(calls.length, 112);
  assert.deepEqual(basket, theme);
  assert.equal(Object.keys(basket.counts).length, 56);
  assert.ok(Object.values(basket.counts).every(count => count === 1));
  assert.ok(Object.values(basket.errors).every(error => error === false));
  relationCount = 2;
  assert.deepEqual((await load([ids[0]])).counts, { n0: 2 });
});

test("a failed relation read is reported separately from zero and a retry makes a new request", async () => {
  let failed = true;
  const load = createWritingRelationCountLoader({
    fetchNoteRelations: async id => { if (failed && id === "bad") throw new Error("offline"); return []; },
    countRelations: items => items.length
  });
  assert.deepEqual(await load(["bad", "zero"]), { counts: { bad: 0, zero: 0 }, errors: { bad: true, zero: false } });
  failed = false;
  assert.deepEqual(await load(["bad"]), { counts: { bad: 0 }, errors: { bad: false } });
});

test("vault switching cancels queued reads and rejects old results even for cloned IDs", async () => {
  let scope = "old";
  const releases = [], calls = [];
  const load = createWritingRelationCountLoader({
    getScope: () => scope,
    fetchNoteRelations: async id => {
      const vault = scope; calls.push([vault, id]);
      if (vault === "old") await new Promise(resolve => releases.push(resolve));
      return Array.from({ length: vault === "old" ? 1 : 2 }, () => ({}));
    }, countRelations: items => items.length
  });
  const old = load(["a", "b", "c", "d", "e", "f"]);
  const rejected = assert.rejects(old, { code: "WRITING_CONTEXT_CHANGED" });
  assert.equal(calls.length, 4);
  scope = "new";
  const fresh = load(["a", "e"]);
  releases.forEach(resolve => resolve());
  await rejected;
  assert.deepEqual((await fresh).counts, { a: 2, e: 2 });
  assert.equal(calls.filter(([vault]) => vault === "old").length, 4);
  assert.deepEqual(calls.filter(([vault]) => vault === "new"), [["new", "a"], ["new", "e"]]);
});

test("uncertain vault state cannot start relation reads and recovery reads afresh", async () => {
  let available = false, requests = 0;
  const load = createWritingRelationCountLoader({ canRead: () => available,
    fetchNoteRelations: async () => { requests++; return []; }, countRelations: items => items.length });
  await assert.rejects(load(["cloned"]), { code: "WRITING_CONTEXT_CHANGED" });
  assert.equal(requests, 0);
  available = true;
  assert.deepEqual(await load(["cloned"]), { counts: { cloned: 0 }, errors: { cloned: false } });
  assert.equal(requests, 1);
});
