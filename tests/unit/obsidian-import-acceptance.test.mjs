import test from "node:test";
import assert from "node:assert/strict";
import {
  assertNoAcceptanceErrors,
  catalogDeltaMatchesCreated,
  inspectImportedAssetLinks,
  sourceEntriesUseSourceDirectory,
  sourceNotesExcludedFromOriginalScope
} from "../../scripts/obsidian-import-acceptance.mjs";

test("inspectImportedAssetLinks requires rewritten assets/imports links for every imported asset reference", () => {
  const report = inspectImportedAssetLinks([
    {
      markdownPath: "notes/literature/ln_good.md",
      markdown: "# Good\n\n![[../../assets/imports/imp_1/assets/chart 1.png]]"
    },
    {
      markdownPath: "notes/literature/ln_bad.md",
      markdown: "# Bad\n\n![[../../assets/images/chart 2.png]]"
    }
  ]);

  assert.deepEqual(report.referencedAssetPaths.sort(), [
    "assets/images/chart 2.png",
    "assets/imports/imp_1/assets/chart 1.png"
  ]);
  assert.deepEqual(report.invalidReferences, [
    {
      markdownPath: "notes/literature/ln_bad.md",
      assetPath: "assets/images/chart 2.png"
    }
  ]);
});

test("assertNoAcceptanceErrors throws when import acceptance has errors", () => {
  assert.throws(
    () => assertNoAcceptanceErrors({ severityCounts: { error: 1, warning: 0 } }, "Import acceptance"),
    /Import acceptance failed with 1 error/
  );
});

test("catalogDeltaMatchesCreated requires source, literature, and permanent deltas to match", () => {
  assert.equal(
    catalogDeltaMatchesCreated(
      { sources: 2, literatureNotes: 3, permanentNotes: 1 },
      { sources: 2, literatureNotes: 3, permanentNotes: 1 }
    ),
    true
  );
  assert.equal(
    catalogDeltaMatchesCreated(
      { sources: 1, literatureNotes: 3, permanentNotes: 1 },
      { sources: 2, literatureNotes: 3, permanentNotes: 1 }
    ),
    false
  );
});

test("sourceEntriesUseSourceDirectory only accepts dir_source_default source entries", () => {
  assert.equal(
    sourceEntriesUseSourceDirectory([
      { id: "src_1", directoryId: "dir_source_default" },
      { id: "src_2", directoryId: "dir_source_default" }
    ]),
    true
  );
  assert.equal(
    sourceEntriesUseSourceDirectory([
      { id: "src_1", directoryId: "dir_source_default" },
      { id: "src_2", directoryId: "dir_original_default" }
    ]),
    false
  );
});

test("sourceNotesExcludedFromOriginalScope rejects source ids inside original scope", () => {
  assert.equal(
    sourceNotesExcludedFromOriginalScope(
      [{ id: "src_1" }, { id: "src_2" }],
      [{ id: "pn_1" }, { id: "ln_1" }]
    ),
    true
  );
  assert.equal(
    sourceNotesExcludedFromOriginalScope(
      [{ id: "src_1" }, { id: "src_2" }],
      [{ id: "pn_1" }, { id: "src_2" }]
    ),
    false
  );
});
