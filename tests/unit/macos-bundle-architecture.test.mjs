import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { universalLibnodeName } from "../../scripts/macos-runtime-layout.mjs";

import {
  assertExpectedArchitecture,
  parseLipoArchitectures,
  parseLibnodeDependencies,
  verifyMacosBundleArchitecture
} from "../../scripts/verify-macos-bundle-architecture.mjs";

test("parses thin and universal lipo architecture output", () => {
  assert.deepEqual(parseLipoArchitectures("arm64\n"), ["arm64"]);
  assert.deepEqual(
    parseLipoArchitectures("/tmp/yansilu is architecture: arm64\n"),
    ["arm64"]
  );
  assert.deepEqual(
    parseLipoArchitectures("Architectures in the fat file: /tmp/yansilu are: x86_64 arm64\n"),
    ["x86_64", "arm64"]
  );
});

test("parses actual Node dynamic dependencies without requiring libnode for static Node", () => {
  assert.deepEqual(parseLibnodeDependencies("node:\n\t/usr/lib/libSystem.B.dylib (compatibility version 1.0.0)\n"), []);
  assert.deepEqual(parseLibnodeDependencies("node:\n\t@loader_path/../lib/libnode.127.dylib (compatibility version 127.0.0)\n"), ["libnode.127.dylib"]);
});

test("Universal preparation supports static distributions and rejects incompatible dynamic libraries", () => {
  assert.equal(universalLibnodeName(["node_modules"], []), "");
  assert.equal(universalLibnodeName(["libnode.127.dylib"], ["libnode.127.dylib"]), "libnode.127.dylib");
  assert.throws(() => universalLibnodeName(["libnode.127.dylib"], []), /matching libnode/);
  assert.throws(() => universalLibnodeName(["libnode.127.dylib"], ["libnode.128.dylib"]), /matching libnode/);
});

function bundleFixture(t, arch = "arm64", withLibrary = false) {
  const appPath = fs.mkdtempSync(path.join(os.tmpdir(), "yansilu-macos-architecture-"));
  t.after(() => fs.rmSync(appPath, { recursive: true, force: true }));
  const runtime = path.join(appPath, "Contents", "Resources", "desktop-api-runtime");
  const node = path.join(runtime, "node", "node");
  const binary = path.join(appPath, "Contents", "MacOS", "yansilu-desktop");
  for (const file of [node, binary]) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "fixture");
  }
  fs.writeFileSync(path.join(runtime, "desktop-api-runtime.json"), JSON.stringify({ arch }));
  if (withLibrary) {
    fs.mkdirSync(path.join(runtime, "lib"));
    fs.writeFileSync(path.join(runtime, "lib", "libnode.127.dylib"), "fixture");
  }
  return {
    appPath, expectedArchitecture: arch,
    inspectArchitectures: () => arch === "universal" ? ["arm64", "x86_64"] : [arch],
    inspectNodeDependencies: () => []
  };
}

test("static Node verifies without a library directory for thin and Universal bundles", t => {
  assert.doesNotThrow(() => verifyMacosBundleArchitecture(bundleFixture(t)));
  assert.doesNotThrow(() => verifyMacosBundleArchitecture(bundleFixture(t, "universal")));
});

test("dynamic Node still requires its bundled library with the correct architecture", t => {
  const missing = bundleFixture(t);
  missing.inspectNodeDependencies = () => ["libnode.127.dylib"];
  assert.throws(() => verifyMacosBundleArchitecture(missing), /Required bundled Node dependency is missing/);
  const bundled = bundleFixture(t, "arm64", true);
  bundled.inspectNodeDependencies = () => ["libnode.127.dylib"];
  assert.doesNotThrow(() => verifyMacosBundleArchitecture(bundled));
  bundled.inspectArchitectures = file => file.endsWith(".dylib") ? ["x86_64"] : ["arm64"];
  assert.throws(() => verifyMacosBundleArchitecture(bundled), /Architecture mismatch/);
});

test("static Node does not bypass app, Node or manifest architecture validation", t => {
  const wrongBinary = bundleFixture(t);
  wrongBinary.inspectArchitectures = () => ["x86_64"];
  assert.throws(() => verifyMacosBundleArchitecture(wrongBinary), /Architecture mismatch/);
  const wrongManifest = bundleFixture(t, "x64");
  wrongManifest.expectedArchitecture = "arm64";
  wrongManifest.inspectArchitectures = () => ["arm64"];
  assert.throws(() => verifyMacosBundleArchitecture(wrongManifest), /manifest reports x64/);
});

test("accepts the expected architecture and rejects a mismatched bundle file", () => {
  assert.doesNotThrow(() => {
    assertExpectedArchitecture({
      filePath: "/tmp/node",
      architectures: ["x86_64"],
      expectedArchitecture: "x64"
    });
  });
  assert.throws(
    () => assertExpectedArchitecture({
      filePath: "/tmp/node",
      architectures: ["arm64"],
      expectedArchitecture: "x86_64"
    }),
    /Architecture mismatch/u
  );
  assert.doesNotThrow(() => {
    assertExpectedArchitecture({
      filePath: "/tmp/universal-node",
      architectures: ["x86_64", "arm64"],
      expectedArchitecture: "universal"
    });
  });
});
