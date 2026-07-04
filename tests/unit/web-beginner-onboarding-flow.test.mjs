import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSmartNotesDemoWalkthrough,
  isSmartNotesDemoScope,
  renderSmartNotesDemoWalkthrough,
  renderWritingBeginnerMainlineView,
  writingBeginnerMainline
} from "../../apps/web/src/beginner-onboarding-flow.js";

test("beginner flow detects Smart Notes demo and renders one focused next step", () => {
  const notes = [
    { id: "GUIDE-SN-001" },
    { id: "PN-SN-001" },
    { id: "PN-SN-101" },
    { id: "PN-SN-FEATURE-003" },
    { id: "WP-SN-PM-001" }
  ];
  const flow = buildSmartNotesDemoWalkthrough({ notes, selectedNoteId: "PN-SN-FEATURE-003" });
  const html = renderSmartNotesDemoWalkthrough(flow);

  assert.equal(isSmartNotesDemoScope(notes), true);
  assert.equal(flow.steps.length, 5);
  assert.equal(flow.activeStepKey, "theme-index");
  assert.equal(flow.steps[0].done, true);
  assert.equal(flow.steps[2].active, true);
  assert.match(html, /data-smart-notes-demo-walkthrough/);
  assert.match(html, /Smart Notes Demo 导览/);
  assert.match(html, /sidebar-flow-current/);
  assert.match(html, /第 3 \/ 5 步/);
  assert.match(html, /读主题索引/);
  assert.match(html, /打开主题索引示例/);
  assert.doesNotMatch(html, /data-sidebar-flow-action="open-demo-note-relations"/);
  assert.doesNotMatch(html, /打开写作中心/);
});

test("beginner flow does not treat arbitrary SN-looking notes as the Smart Notes demo", () => {
  assert.equal(isSmartNotesDemoScope([
    { id: "MEETING-SN-001" },
    { id: "PERSONAL-SN-002" }
  ]), false);
});

test("writing beginner mainline exposes one stage and one action", () => {
  const material = writingBeginnerMainline({ basketCount: 0 });
  const theme = writingBeginnerMainline({
    basketCount: 3,
    hasProject: false,
    projectEntry: { actionLabel: "确定可写主题" }
  });
  const draft = writingBeginnerMainline({
    basketCount: 3,
    hasProject: true,
    hasScaffold: true
  });

  assert.equal(material.label, "选相关笔记");
  assert.equal(theme.label, "确定可写主题");
  assert.equal(draft.label, "保存草稿");
  assert.match(renderWritingBeginnerMainlineView(theme), /data-writing-beginner-mainline/);
  assert.match(renderWritingBeginnerMainlineView(theme), /确定可写主题/);
});
