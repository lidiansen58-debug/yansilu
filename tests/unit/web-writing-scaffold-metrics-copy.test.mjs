import test from "node:test";
import assert from "node:assert/strict";

import { resultMetrics } from "../../apps/web/src/import-result-model.js";

test("writing scaffold-related result metrics fall back to generic status when no status is provided", () => {
  const scaffoldMetrics = resultMetrics({
    stage: "draft_scaffold",
    writingProjectId: "wp_1",
    draftScaffoldId: "ds_1",
    sections: [{ id: "s1" }]
  });
  assert.deepEqual(scaffoldMetrics, [{ label: "状态", value: "未提供" }]);

  const draftMetrics = resultMetrics({
    stage: "writing_draft_note",
    writingProjectId: "wp_1",
    draftScaffoldId: "ds_1",
    noteId: "pn_1",
    directoryId: "dir_1"
  });
  assert.deepEqual(draftMetrics, [{ label: "状态", value: "未提供" }]);

  const exportMetrics = resultMetrics({
    stage: "writing_export_scaffold",
    writingProjectId: "wp_1",
    draftScaffoldId: "ds_1",
    fileName: "draft.md",
    characters: 120
  });
  assert.deepEqual(exportMetrics, [{ label: "状态", value: "未提供" }]);
});
