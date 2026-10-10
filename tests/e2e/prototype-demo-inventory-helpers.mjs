import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fetchJson } from "./prototype-copy-test-helpers.mjs";

// Compare against the bundled content, rather than an obsolete minimum count
// in one directory: usage notes now live in their own directory.
export async function snapshotDemoNoteInventory(apiBase) {
  const fixture = JSON.parse(await fs.readFile(new URL("../fixtures/demo-smart-notes-product-thinking/demo.json", import.meta.url), "utf8"));
  const groups = new Map();
  for (const [key, defaultDirectory] of [
    ["fleeting_notes", "dir_fleeting_default"],
    ["literature_notes", "dir_literature_default"],
    ["permanent_notes", "dir_demo_smart_notes_product_thinking_original"],
    ["guide_notes", "dir_demo_smart_notes_product_thinking_original"],
    ["final_essays", "dir_demo_smart_notes_product_thinking_original"]
  ]) {
    for (const note of fixture[key]) {
      const directory = note.directoryId || defaultDirectory;
      if (!groups.has(directory)) groups.set(directory, []);
      groups.get(directory).push(note.id);
    }
  }
  const snapshot = {};
  for (const [directory, expectedIds] of groups) {
    const response = await fetchJson(apiBase, `/api/v1/directories/${encodeURIComponent(directory)}/notes?limit=200`);
    assert.equal(response.status, 200, JSON.stringify(response.json));
    const ids = response.json.items.map(note => note.id).sort();
    assert.deepEqual(ids, [...expectedIds].sort(), `Complete and unique Demo inventory in ${directory}`);
    assert.equal(response.json.total, expectedIds.length);
    snapshot[directory] = await Promise.all(ids.map(async id => {
      const note = await fetchJson(apiBase, `/api/v1/notes/${encodeURIComponent(id)}`);
      assert.equal(note.status, 200, JSON.stringify(note.json));
      assert.ok(note.json.item.body.trim(), `Demo note ${id} has persisted content`);
      return { id, title: note.json.item.title, body: note.json.item.body };
    }));
  }
  return snapshot;
}
