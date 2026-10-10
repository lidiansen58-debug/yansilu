import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export function decodeAppleCertificate(primary = "", continuation = "") {
  const encoded = `${primary}${continuation}`.replace(/\s/g, "");
  if (!encoded || encoded.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error("APPLE_CERTIFICATE must contain complete PKCS#12 Base64, with optional APPLE_CERTIFICATE_PART_2.");
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded || bytes[0] !== 0x30) throw new Error("Invalid PKCS#12 encoding.");
  const lengthBytes = bytes[1] & 0x80 ? bytes[1] & 0x7f : 0;
  if (lengthBytes > 4 || bytes.length < 2 + lengthBytes + 3) throw new Error("Invalid PKCS#12 envelope.");
  const payloadLength = lengthBytes ? bytes.readUIntBE(2, lengthBytes) : bytes[1];
  const headerLength = 2 + lengthBytes;
  if (payloadLength !== bytes.length - headerLength) throw new Error("Incomplete PKCS#12 file: check both certificate Secret parts.");
  if (!bytes.subarray(headerLength, headerLength + 3).equals(Buffer.from([2, 1, 3]))) {
    throw new Error("Expected a PKCS#12 version 3 certificate, not a PEM or standalone certificate.");
  }
  return bytes;
}

async function main() {
  if (!process.env.RUNNER_TEMP) throw new Error("RUNNER_TEMP is required.");
  const bytes = decodeAppleCertificate(process.env.APPLE_CERTIFICATE, process.env.APPLE_CERTIFICATE_PART_2);
  await fs.writeFile(path.join(process.env.RUNNER_TEMP, "apple-developer-id.p12"), bytes, { flag: "wx", mode: 0o600 });
  console.log(`Prepared PKCS#12: ${bytes.length} bytes; SHA256 ${crypto.createHash("sha256").update(bytes).digest("hex")}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
