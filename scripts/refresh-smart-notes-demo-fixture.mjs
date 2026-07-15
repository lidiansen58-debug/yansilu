import fs from "node:fs/promises";
import path from "node:path";

import { buildSmartNotesDemoFixture } from "./smart-notes-demo-data.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const fixturePath = path.join(repoRoot, "tests", "fixtures", "demo-smart-notes-product-thinking", "demo.json");
const fixture = buildSmartNotesDemoFixture();

await fs.writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");

console.log(
  `Refreshed Smart Notes Demo: ${fixture.permanent_notes.length} permanent notes, ${fixture.relations.length} relations, ${fixture.index_cards.length} themes.`
);
