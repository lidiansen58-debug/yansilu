import test from "node:test";
import assert from "node:assert/strict";

import { resultMetrics } from "../../apps/web/src/import-result-model.js";

test("writing scaffold-related result metrics use 草稿骨架 label", () => {
  const scaffoldMetrics = resultMetrics({
    stage: "draft_scaffold",
    writingProjectId: "wp_1",
    draftScaffoldId: "ds_1",
    sections: [{ id: "s1" }]
  });
  assert.equal(scaffoldMetrics[1]?.label, "草稿骨架");

  const draftMetrics = resultMetrics({
    stage: "writing_draft_note",
    writingProjectId: "wp_1",
    draftScaffoldId: "ds_1",
    noteId: "pn_1",
    directoryId: "dir_1"
  });
  assert.equal(draftMetrics[1]?.label, "草稿骨架");

  const exportMetrics = resultMetrics({
    stage: "writing_export_scaffold",
    writingProjectId: "wp_1",
    draftScaffoldId: "ds_1",
    fileName: "draft.md",
    characters: 120
  });
  assert.equal(exportMetrics[1]?.label, "草稿骨架");
});
