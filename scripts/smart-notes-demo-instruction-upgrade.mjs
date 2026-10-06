import fs from "node:fs/promises";
import { getNoteById, listNoteRelations, updateNoteContent } from "../packages/domain/src/index.mjs";

const legacyInstructionsUrl = new URL("../tests/fixtures/demo-smart-notes-product-thinking/legacy-instructions-v3.json", import.meta.url);

function outgoingRelationContent(links) {
  const fields = ["toNoteId", "relationType", "rationale", "insightQuestion", "createdBy", "confidence", "status"];
  return JSON.stringify(links.map(link => Object.fromEntries(fields.map(key => [key, link[key] ?? null])))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

// Only exact, generated v3 instructions are owned by this upgrade. User notes,
// edits, relation changes and writing bindings remain untouched; saves guard races.
export async function upgradeSmartNotesDemoInstructions(vaultPath, fixture) {
  if (!String(fixture?.id || "").startsWith("demo-smart-notes-product-thinking") || Number(fixture?.version || 0) < 4) return 0;
  const legacyInstructions = JSON.parse(await fs.readFile(legacyInstructionsUrl, "utf8"));
  const replacements = new Map([...(fixture.guide_notes || []), ...(fixture.final_essays || [])].map(note => [note.id, note]));
  let updated = 0;
  for (const legacy of legacyInstructions) {
    const replacement = replacements.get(legacy.targetId);
    if (!replacement) continue;
    let existing;
    try { existing = await getNoteById(vaultPath, legacy.id); }
    catch (error) {
      if (error.code === "NOTE_NOT_FOUND" || error.message === `noteId not found: ${legacy.id}`) continue;
      throw error;
    }
    if (existing.title !== legacy.title || existing.body !== legacy.body) continue;
    if (Object.entries(legacy.metadata).some(([key, value]) => JSON.stringify(existing[key] ?? null) !== JSON.stringify(value))) continue;
    const { outgoingLinks } = await listNoteRelations(vaultPath, legacy.id);
    if (outgoingRelationContent(outgoingLinks) !== outgoingRelationContent(legacy.outgoingRelations)) continue;
    const body = String(replacement.body).replace(/^# [^\n]+/, `# ${existing.title}`);
    const tags = (replacement.tags || []).map(tag => `#${String(tag).replace(/^#/, "")}`).join(" ");
    try {
      await updateNoteContent(vaultPath, legacy.id, {
        body: `${body.trimEnd()}\n${tags ? `\n${tags}` : ""}`,
        expectedBody: existing.body,
        expectedRevision: existing.fileRevision,
        expectedOutgoingRelations: outgoingLinks
      });
      updated += 1;
    } catch (error) {
      if (error.code !== "NOTE_SAVE_CONFLICT") throw error;
    }
  }
  return updated;
}
