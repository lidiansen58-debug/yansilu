import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { decodeAppleCertificate } from "../../scripts/prepare-macos-signing-certificate.mjs";

function syntheticEnvelope(size = 51517) {
  const bytes = Buffer.alloc(size, 0x61);
  bytes.set([0x30, 0x82, 0, 0, 2, 1, 3]);
  bytes.writeUInt16BE(size - 4, 2);
  return bytes;
}

test("large signing input joins two bounded Secrets without changing certificate bytes", () => {
  const bytes = syntheticEnvelope(), encoded = bytes.toString("base64");
  const primary = encoded.slice(0, 40000), continuation = encoded.slice(40000);
  assert.ok(encoded.length > 48 * 1024);
  assert.ok(primary.length < 48 * 1024 && continuation.length < 48 * 1024);
  assert.deepEqual(decodeAppleCertificate(primary, continuation), bytes);
  assert.deepEqual(decodeAppleCertificate(encoded), bytes);
});

test("certificate decoder accepts whitespace and rejects truncated, malformed and wrong file formats", () => {
  const bytes = syntheticEnvelope(), encoded = bytes.toString("base64");
  assert.deepEqual(decodeAppleCertificate(`\n${encoded.slice(0, 40000)}\n`, ` ${encoded.slice(40000)}\n`), bytes);
  for (const input of [encoded.slice(0, 40000), "not-a-certificate", "-----BEGIN CERTIFICATE-----", Buffer.from("a text file").toString("base64")]) {
    assert.throws(() => decodeAppleCertificate(input));
  }
  const wrongVersion = Buffer.from(bytes); wrongVersion[6] = 2;
  assert.throws(() => decodeAppleCertificate(wrongVersion.toString("base64")), /PKCS#12 version 3/);
});

test("CLI writes only the decoded file, reports its fingerprint and cannot overwrite an existing file", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-signing-input-"));
  const bytes = syntheticEnvelope(), encoded = bytes.toString("base64");
  const env = { ...process.env, RUNNER_TEMP: directory, APPLE_CERTIFICATE: encoded.slice(0, 40000), APPLE_CERTIFICATE_PART_2: encoded.slice(40000) };
  const args = ["scripts/prepare-macos-signing-certificate.mjs"];
  const result = spawnSync(process.execPath, args, { env, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(await fs.readFile(path.join(directory, "apple-developer-id.p12")), bytes);
  assert.match(result.stdout, /51517 bytes; SHA256 [a-f0-9]{64}/);
  assert.ok(!result.stdout.includes(encoded.slice(0, 80)));
  const retry = spawnSync(process.execPath, args, { env, encoding: "utf8" });
  assert.equal(retry.status, 1);
  assert.deepEqual(await fs.readFile(path.join(directory, "apple-developer-id.p12")), bytes);
  assert.ok(!retry.stderr.includes(encoded.slice(0, 80)));
});

test("workflow supplies the optional second certificate part to the decoder", async () => {
  const workflow = await fs.readFile(".github/workflows/desktop-release.yml", "utf8");
  assert.match(workflow, /APPLE_CERTIFICATE_PART_2: \$\{\{ secrets\.APPLE_CERTIFICATE_PART_2 \}\}/);
  assert.match(workflow, /node \.\/scripts\/prepare-macos-signing-certificate\.mjs/);
  assert.doesNotMatch(workflow, /echo "\$APPLE_CERTIFICATE"/);
});
