import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fstatSync, writeSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { executeHdiutil, runHdiutil } from "../../scripts/macos-dmg-command.mjs";

function harness(results) {
  const calls = [];
  const waits = [];
  const output = [];
  const warnings = [];
  return {
    calls, waits, output, warnings,
    options: {
      execute(args) {
        calls.push([...args]);
        assert.ok(results.length, "Unexpected additional hdiutil attempt");
        return results.shift();
      },
      async wait(ms) { waits.push(ms); },
      write(value) { output.push(value); },
      warn(value) { warnings.push(value); }
    }
  };
}

const busy = (status = 1) => ({ status, output: "hdiutil: create failed - Resource busy\n" });

test("command executor captures real child stdout and stderr without output pipes", () => {
  let outputFd;
  const result = executeHdiutil(["create", "image.dmg"], (command, args, options) => {
    assert.equal(command, "hdiutil");
    assert.deepEqual(args, ["create", "image.dmg"]);
    assert.equal(options.stdio[0], "ignore");
    assert.equal(options.stdio[1], options.stdio[2]);
    assert.equal(typeof options.stdio[1], "number");
    assert.equal(options.shell, false);
    assert.equal(options.timeout, 240_000);
    outputFd = options.stdio[1];
    return spawnSync(process.execPath, ["-e",
      'process.stdout.write("stdout diagnostic\\n"); process.stderr.write("Resource busy\\n"); process.exitCode = 1;'
    ], options);
  });
  assert.equal(result.status, 1);
  assert.match(result.output, /stdout diagnostic/);
  assert.match(result.output, /Resource busy/);
  assert.throws(() => fstatSync(outputFd), { code: "EBADF" });
});

test("command executor closes its log descriptor when spawning throws", () => {
  let outputFd;
  const failure = new Error("spawn failed");
  assert.throws(() => executeHdiutil(["create"], (_command, _args, options) => {
    outputFd = options.stdio[1];
    writeSync(outputFd, "partial diagnostics");
    throw failure;
  }), (error) => error === failure);
  assert.throws(() => fstatSync(outputFd), { code: "EBADF" });
});

test("DMG creation retries transient busy failures with unchanged arguments", async () => {
  const h = harness([busy(), busy(), { status: 0, output: "created: image.dmg\n" }]);
  const args = ["create", "-srcfolder", "/tmp/source with spaces", "-ov", "/tmp/image.dmg"];
  await runHdiutil(args, h.options);
  assert.deepEqual(h.calls, [args, args, args]);
  assert.deepEqual(h.waits, [2000, 4000]);
  assert.equal(h.output.length, 3);
  assert.equal(h.warnings.length, 2);
});

test("DMG creation stops after five busy failures and preserves diagnostics", async () => {
  const h = harness(Array.from({ length: 5 }, () => busy()));
  await assert.rejects(runHdiutil(["create", "image.dmg"], h.options),
    /hdiutil create exited with code 1 \(attempt 5\/5\).*\n.*Resource busy/);
  assert.equal(h.calls.length, 5);
  assert.deepEqual(h.waits, [2000, 4000, 8000, 16000]);
});

test("DMG detach retries only the expected busy exit code", async () => {
  const h = harness([busy(16), { status: 0 }]);
  await runHdiutil(["detach", "/tmp/owned-mount"], h.options);
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.waits, [2000]);
});

for (const failure of [
  { status: 1, output: "hdiutil: Permission denied" },
  { status: 1, output: "hdiutil: No space left on device" },
  { status: 1, output: "hdiutil: No such file or directory" },
  { status: 2, output: "Resource busy" },
  { status: null, signal: "SIGKILL", output: "Resource busy" },
  { status: null, error: new Error("spawnSync hdiutil ETIMEDOUT"), output: "Resource busy" },
  { status: null, error: new Error("spawnSync hdiutil ENOENT") }
]) {
  test(`DMG command does not retry ${failure.error?.message || failure.signal || failure.output}`, async () => {
    const h = harness([failure]);
    await assert.rejects(runHdiutil(["create", "image.dmg"], h.options), (error) => {
      assert.match(error.message, /hdiutil create/);
      if (failure.output) assert.ok(error.message.includes(failure.output));
      if (failure.error) assert.equal(error.cause, failure.error);
      return true;
    });
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.waits, []);
  });
}

test("successful commands are not retried even when output mentions Resource busy", async () => {
  const h = harness([{ status: 0, output: "Resource busy resolved" }]);
  await runHdiutil(["create", "image.dmg"], h.options);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.waits, []);
});

test("attach errors and unexpected detach exit codes do not trigger a retry", async () => {
  for (const [operation, status] of [["attach", 1], ["detach", 1]]) {
    const h = harness([busy(status)]);
    await assert.rejects(runHdiutil([operation, "image.dmg"], h.options));
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.waits, []);
  }
});

test("packager awaits all image operations and verifies contents before reporting success", async () => {
  const source = await fs.readFile(new URL("../../scripts/package-macos-dmg.mjs", import.meta.url), "utf8");
  const runner = await fs.readFile(new URL("../../scripts/macos-dmg-command.mjs", import.meta.url), "utf8");
  assert.match(source, /await runHdiutil\(\["attach"/);
  assert.match(source, /await runHdiutil\(\["detach"/);
  assert.match(source, /await runHdiutil\(\[\s*"create"/);
  assert.ok(source.indexOf("await verifyMacosDmg(layout)") < source.indexOf("console.log(`macOS DMG packaged"));
  assert.match(runner, /stdio: \["ignore", logFd, logFd\]/);
  assert.match(runner, /timeout: 240_000/);
  assert.doesNotMatch(source + runner, /diskimages-helper.*kill|detach.*-force/);
});
