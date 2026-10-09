import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { notarizeMacosArtifact } from "../../scripts/macos-notarization.mjs";

const credentials = { APPLE_ID: "test@example.invalid", APPLE_TEAM_ID: "TESTTEAM", APPLE_APP_PASSWORD: "test-only-password" };

function runner(results = []) {
  const calls = [];
  return { calls, run(command, args) {
    calls.push({ command, args });
    return results.shift() || { status: 0, stdout: JSON.stringify({ status: "Accepted", id: "test-submission" }) };
  } };
}

test("accepted DMG notarization requires stapling, validation and DMG Gatekeeper assessment", () => {
  const mock = runner();
  const result = notarizeMacosArtifact({ artifactPath: "release.dmg", env: credentials, run: mock.run });
  assert.equal(result.status, "Accepted");
  assert.equal(mock.calls.length, 4);
  assert.deepEqual(mock.calls[1].args, ["stapler", "staple", path.resolve("release.dmg")]);
  assert.deepEqual(mock.calls[2].args, ["stapler", "validate", path.resolve("release.dmg")]);
  assert.deepEqual(mock.calls[3], { command: "spctl", args: ["--assess", "--verbose=2", "--type", "open", "--context", "context:primary-signature", path.resolve("release.dmg")] });
  assert.ok(mock.calls[0].args.includes("--output-format"));
});

test("app notarization submits the ZIP but staples and assesses the actual app", () => {
  const mock = runner();
  notarizeMacosArtifact({ artifactPath: "app.zip", staplePath: "test.app", env: credentials, run: mock.run });
  assert.equal(mock.calls[0].args[2], path.resolve("app.zip"));
  assert.equal(mock.calls[1].args[2], path.resolve("test.app"));
  assert.deepEqual(mock.calls[3].args, ["--assess", "--verbose=2", "--type", "execute", path.resolve("test.app")]);
});

for (const status of ["Invalid", "In Progress", undefined]) {
  test(`notarytool exit zero does not permit non-Accepted status ${status}`, () => {
    const mock = runner([{ status: 0, stdout: JSON.stringify({ status, id: "rejected-submission" }) }]);
    assert.throws(() => notarizeMacosArtifact({ artifactPath: "release.dmg", env: credentials, run: mock.run }), /not Accepted/);
    assert.equal(mock.calls.length, 1);
  });
}

for (const stdout of ["not JSON", "null", "[]"]) {
  test(`invalid Apple result ${stdout} cannot continue to stapling`, () => {
    const mock = runner([{ status: 0, stdout }]);
    assert.throws(() => notarizeMacosArtifact({ artifactPath: "release.dmg", env: credentials, run: mock.run }), /invalid notarization result/);
    assert.equal(mock.calls.length, 1);
  });
}

test("tool launch errors block release and redact credentials", () => {
  const mock = runner([{ error: new Error(`launch failed ${credentials.APPLE_APP_PASSWORD}`) }]);
  assert.throws(() => notarizeMacosArtifact({ artifactPath: "release.dmg", env: credentials, run: mock.run }), error => {
    assert.match(error.message, /launch failed \[REDACTED\]/);
    return true;
  });
  assert.equal(mock.calls.length, 1);
});

for (const failureIndex of [0, 1, 2, 3]) {
  test(`command failure at step ${failureIndex} stops all subsequent release checks`, () => {
    const results = Array.from({ length: failureIndex }, () => ({ status: 0, stdout: JSON.stringify({ status: "Accepted", id: "test" }) }));
    results.push({ status: 1, stderr: `failed ${credentials.APPLE_APP_PASSWORD} ${credentials.APPLE_ID}` });
    const mock = runner(results);
    assert.throws(() => notarizeMacosArtifact({ artifactPath: "release.dmg", env: credentials, run: mock.run }), error => {
      assert.match(error.message, /failed/);
      assert.ok(!error.message.includes(credentials.APPLE_APP_PASSWORD));
      assert.ok(!error.message.includes(credentials.APPLE_ID));
      return true;
    });
    assert.equal(mock.calls.length, failureIndex + 1);
  });
}

test("missing credentials fail before uploading anything", () => {
  for (const name of Object.keys(credentials)) {
    const mock = runner();
    assert.throws(() => notarizeMacosArtifact({ artifactPath: "release.dmg", env: { ...credentials, [name]: "" }, run: mock.run }), new RegExp(name));
    assert.equal(mock.calls.length, 0);
  }
});

test("release packages updater from the same final notarized app before signing and manifesting", () => {
  const source = fs.readFileSync("scripts/build-mac-release.sh", "utf8");
  const main = source.slice(source.indexOf('main() {'));
  assert.match(main, /sign_app\s+notarize_app\s+create_dmg\s+notarize_dmg\s+package_tauri_updater\s+sign_tauri_dmg/);
  assert.match(main, /npm run build:desktop:manifest/);
  assert.match(source, /YANSILU_DESKTOP_UPDATER_ARTIFACTS=false npm run build:desktop -- app/);
  assert.match(source, /tar -czf "\$archive_path" -C "\$bundle_dir" "\$\{APP_NAME\}\.app"/);
  assert.match(source, /sign-tauri-artifact\.mjs" --required "\$archive_path"/);
  assert.doesNotMatch(source, /Skipping notarization|stapler.*\|\| true|spctl.*\|\| true|codesign --deep --force/);
});
