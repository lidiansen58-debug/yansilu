import test from "node:test";
import assert from "node:assert/strict";

import {
  buildWritingPanelPrototypeHostDeps
} from "../../apps/web/src/writing-panel-host-deps.js";

test("writing panel prototype host deps keeps shell-owned writing helpers in one mapping", () => {
  const host = {};
  const keys = [
    "$",
    "state",
    "writingState",
    "folderById",
    "rootBoxIdFromFolder",
    "writingCandidateNotes",
    "writingSourceIndexSummary",
    "writingBasketEntries",
    "normalizeWritingBookStructure",
    "deriveWritingBookDesign",
    "writingBookStructureStats",
    "parseWritingBasketIds",
    "writingKnownNoteById",
    "isWritingEligibleNote",
    "writingRelationCountsReady",
    "writingRelationCountsErrored",
    "currentWritingBasketEligibility",
    "writingIneligibleSummary",
    "writingDraftDirectoryId",
    "currentWritingContinuationEntry",
    "selectedWritingThemeIndex",
    "writingThemeIndexNoteIds",
    "findExistingWritingProjectForTheme",
    "renderThinkingStatusBadge",
    "writingNoteMeta",
    "writingNoteExcerpt",
    "writingProjectStatusLabel",
    "writingThemeProjectEntry",
    "shouldHydrateWritingThemeNotes",
    "hydrateWritingThemeNotes",
    "shouldRefreshWritingThemeRelationCounts",
    "refreshWritingThemeRelationCounts",
    "clearWritingThemeRelationCounts",
    "writingThemeDetailHintText",
    "renderWritingToplineMetric",
    "writingThemeSummary",
    "renderScaffoldVersionCard",
    "renderDraftVersionCard",
    "writingBookProjectGoal",
    "writingBookProjectAudience",
    "escapeHtml"
  ];
  for (const key of keys) host[key] = { key };

  const deps = buildWritingPanelPrototypeHostDeps(host);

  assert.notEqual(deps, host);
  assert.deepEqual(Object.keys(deps), keys);
  for (const key of keys) {
    assert.equal(deps[key], host[key]);
  }
});
