import test from "node:test";
import assert from "node:assert/strict";
import { createLiveCheckRecorder } from "../../scripts/remote-ai-live-check.mjs";

test("successful asynchronous checks include operation time and protect recorded metadata", async () => {
  const report = { results: [] }, output = [];
  const record = createLiveCheckRecorder(report, { log: line => output.push(JSON.parse(line)) });
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const running = record("delayed", async () => {
    await held;
    return { elapsedMs: 0, name: "overridden", ok: false, verified: true };
  });
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(report.results.length, 0);
  release();
  const result = await running;
  assert.ok(result.elapsedMs >= 40, `operation time was omitted: ${result.elapsedMs}ms`);
  assert.equal(result.name, "delayed");
  assert.equal(result.ok, true);
  assert.equal(result.verified, true);
  assert.deepEqual(output[0], result);
  assert.deepEqual(report.results[0], result);
});

test("required authentication failure records its cause and stops later paid operations", async () => {
  const report = { results: [] }, output = [];
  const record = createLiveCheckRecorder(report, { secret: "synthetic-secret", log: line => output.push(line) });
  let calls = 0;
  await assert.rejects(async () => {
    await record("connection", async () => { throw new Error("Rejected synthetic-secret"); }, { required: true });
    await record("writing", async () => { calls++; return {}; });
  }, /Required live check failed: connection/);
  assert.equal(calls, 0);
  assert.equal(report.results.length, 1);
  assert.equal(report.results[0].error, "Rejected [redacted]");
  assert.ok(!output.join().includes("synthetic-secret"));
});

test("successful connection allows saving and subsequent calls without recording credentials", async () => {
  const report = { results: [] }, output = [], order = [];
  const record = createLiveCheckRecorder(report, { secret: "synthetic-secret", log: line => output.push(line) });
  await record("connection", async () => { order.push("test"); return { metadata: { unexpectedCredential: "synthetic-secret" } }; }, { required: true });
  await record("save", async () => { order.push("save"); return {}; }, { required: true });
  await record("writing", async () => { order.push("use"); return {}; });
  assert.deepEqual(order, ["test", "save", "use"]);
  assert.equal(report.results.length, 3);
  assert.ok(!JSON.stringify(report).includes("synthetic-secret"));
  assert.ok(!output.join().includes("synthetic-secret"));
});

test("independent feature failure remains in the report and permits the next feature check", async () => {
  const report = { results: [] };
  const record = createLiveCheckRecorder(report, { log: () => {} });
  await record("outline", async () => { throw new Error("Invalid JSON"); });
  await record("relation", async () => ({ cacheHit: true }));
  assert.equal(report.results[0].ok, false);
  assert.equal(report.results[1].ok, true);
});
