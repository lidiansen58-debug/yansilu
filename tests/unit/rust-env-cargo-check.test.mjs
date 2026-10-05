import test from "node:test";
import assert from "node:assert/strict";
import { runCargoCheck } from "../../scripts/rust-env.mjs";

test("cargo check preserves errors from both streams instead of the final warning", () => {
  const env = { PATH: "test-toolchain" };
  const result = runCargoCheck("desktop", env, (command, args, options) => {
    assert.equal(command, "cargo");
    assert.deepEqual(args, ["check", "--locked"]);
    assert.equal(options.cwd, "desktop");
    assert.equal(options.env, env);
    assert.equal(options.shell, false);
    assert.ok(options.maxBuffer >= 20 * 1024 * 1024);
    return { status: 1, stdout: "build output", stderr: "error: missing resource\nwarning: waiting for other jobs" };
  });
  assert.equal(result.ok, false);
  assert.match(result.detail, /build output/);
  assert.match(result.detail, /error: missing resource/);
  assert.match(result.detail, /warning: waiting for other jobs/);
});

test("cargo check reports process launch errors and termination", () => {
  const result = runCargoCheck("desktop", {}, () => ({
    status: null, error: new Error("spawn cargo ENOENT"), signal: "SIGTERM", stderr: "partial diagnostics"
  }));
  assert.equal(result.ok, false);
  assert.match(result.detail, /partial diagnostics/);
  assert.match(result.detail, /spawn cargo ENOENT/);
  assert.match(result.detail, /SIGTERM/);
});

test("cargo check requires successful completion without a process error", () => {
  assert.equal(runCargoCheck("desktop", {}, () => ({ status: 0, stderr: "checked" })).ok, true);
  assert.equal(runCargoCheck("desktop", {}, () => ({ status: 0, error: new Error("output exceeded buffer") })).ok, false);
});
