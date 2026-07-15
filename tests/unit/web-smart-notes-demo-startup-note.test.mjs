import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  smartNotesDemoExistingFolder,
  smartNotesDemoImportedStatus,
  smartNotesDemoOpenedExistingGuideStatus,
  smartNotesDemoStartupNoteId,
  shouldRefreshHomeAfterSmartNotesDemoImport
} from "../../apps/web/src/smart-notes-demo-startup-note.js";

test("smart notes demo startup prefers the returned guide note when it exists", () => {
  assert.equal(smartNotesDemoStartupNoteId({
    result: { firstNoteId: "guide-00" },
    notes: [{ id: "guide-00", title: "00 从这里开始：10 分钟走完研思录" }]
  }), "guide-00");
});

test("smart notes demo startup falls back to the 00 guide title", () => {
  assert.equal(smartNotesDemoStartupNoteId({
    result: { firstNoteId: "missing" },
    notes: [
      { id: "n1", title: "普通笔记" },
      { id: "guide-00", title: "00 从这里开始：10 分钟走完研思录" }
    ]
  }), "guide-00");
});

test("smart notes demo startup can locate an existing demo folder", () => {
  assert.equal(smartNotesDemoExistingFolder([
    { id: "other", name: "普通目录" },
    { id: "demo", name: "Smart Notes 产品思考 Demo" }
  ])?.id, "demo");
});

test("smart notes demo existing guide status stays beginner friendly", () => {
  const message = smartNotesDemoOpenedExistingGuideStatus();

  assert.match(message, /已为你打开导览笔记/);
  assert.match(message, /10 分钟导览/);
  assert.doesNotMatch(message, /database|locked|error|failed|重试未完成/i);
});

test("smart notes demo import status reports imported data and refreshed home", () => {
  const message = smartNotesDemoImportedStatus({
    counts: {
      permanent_notes: 24,
      relations: 18,
      writing_projects: 2
    }
  }, { refreshedHome: true });

  assert.match(message, /24 条永久笔记/);
  assert.match(message, /18 条关系/);
  assert.match(message, /2 个写作项目/);
  assert.match(message, /首页已刷新/);
});

test("smart notes demo import refreshes home for first-run entry points", () => {
  assert.equal(shouldRefreshHomeAfterSmartNotesDemoImport({ source: "today-empty-start" }), true);
  assert.equal(shouldRefreshHomeAfterSmartNotesDemoImport({ source: "empty-start", confirmed: true }), true);
  assert.equal(shouldRefreshHomeAfterSmartNotesDemoImport({ source: "settings-help" }), true);
  assert.equal(shouldRefreshHomeAfterSmartNotesDemoImport({ source: "manual-toolbar" }), false);
});

test("smart notes demo import reopens the guide after the final render", () => {
  const source = fs.readFileSync("apps/web/src/prototype-app.js", "utf8");

  assert.match(source, /const shouldOpenGuide = Boolean\(firstNoteId\) && \(startup \|\| !shouldRefreshHome\);/);
  assert.match(source, /renderAll\(\);\s*if \(shouldOpenGuide\) \{\s*state\.selectedFileId = firstNoteId;\s*openNoteById\(firstNoteId, \{ preferTitleSelection: false \}\);/);
});

test("smart notes demo import syncs the directory tree and refreshes the home module", () => {
  const source = fs.readFileSync("apps/web/src/prototype-app.js", "utf8");

  assert.match(source, /const shouldRefreshHome = shouldRefreshHomeAfterSmartNotesDemoImport\(options\);/);
  assert.match(source, /await syncNotesForDirectoryTree\(directoryId\);/);
  assert.match(source, /if \(shouldRefreshHome\) activateModule\("today"\);/);
  assert.match(source, /const importedStatus = smartNotesDemoImportedStatus\(result, \{ openedGuide: shouldOpenGuide, refreshedHome: shouldRefreshHome \}\);/);
  assert.match(source, /state\.todayNoticeMessage = importedStatus;/);
  assert.match(source, /setStatus\(importedStatus, "ok"\);/);
});

test("smart notes demo startup falls back to an existing guide when seed is locked", () => {
  const source = fs.readFileSync("apps/web/src/prototype-app.js", "utf8");

  assert.match(source, /await syncDirectoriesFromApi\(\);/);
  assert.match(source, /const demoFolder = smartNotesDemoExistingFolder\(state\.folders\);/);
  assert.match(source, /await syncNotesForDirectory\(demoFolder\.id\);/);
  assert.match(source, /const fallbackNoteId = smartNotesDemoStartupNoteId\(\{ result: \{\}, notes: state\.notes \}\);/);
  assert.match(source, /openNoteById\(fallbackNoteId, \{ preferTitleSelection: false \}\);/);
  assert.match(source, /setStatus\(smartNotesDemoOpenedExistingGuideStatus\(\), "ok"\);/);
});
