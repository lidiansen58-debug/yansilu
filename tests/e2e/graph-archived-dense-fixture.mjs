import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

export async function archivedDenseFixture(t) {
  const provenance = JSON.parse(await fs.readFile(new URL("../fixtures/graph-archived-dense-demo.provenance.json", import.meta.url), "utf8"));
  const raw = gunzipSync(await fs.readFile(new URL("../fixtures/graph-archived-dense-demo.json.gz", import.meta.url)));
  assert.equal(raw.length, provenance.bytes);
  assert.equal(createHash("sha256").update(raw).digest("hex"), provenance.sha256);
  const data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  assert.equal(data.permanent_notes.length, provenance.permanentNotes);
  assert.equal(data.relations.length, provenance.relations);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-dense-archive-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const fixturePath = path.join(directory, "demo.json");
  await fs.writeFile(fixturePath, raw);
  return { fixturePath, data, provenance };
}
