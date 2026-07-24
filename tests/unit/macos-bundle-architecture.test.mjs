import assert from "node:assert/strict";
import test from "node:test";

import {
  assertExpectedArchitecture,
  parseLipoArchitectures
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
