import test from "node:test";
import assert from "node:assert/strict";

import {
  permanentNoteReadinessItems,
  permanentNoteReadinessSummary,
  renderPermanentNoteReadinessCard
} from "../../apps/web/src/permanent-note-readiness-card.js";

test("permanent note readiness card names beginner action gaps", () => {
  const note = {
    id: "pn_1",
    status: "draft",
    authorship: { user_confirmed: false },
    thesis: "",
    threeLineSummary: [],
    distillationStatus: "missing",
    body: ""
  };
  const summary = permanentNoteReadinessSummary(note, { explicitRelationCount: 0 });
  const html = renderPermanentNoteReadinessCard(note, { explicitRelationCount: 0 });

  assert.equal(summary.doneCount, 0);
  assert.equal(summary.nextAction, "确认这段判断归你负责");
  assert.deepEqual(permanentNoteReadinessItems(note).map((item) => item.label), [
    "作者确认",
    "原创确认",
    "一句话判断 / 三句压缩",
    "边界 / 反例",
    "关联"
  ]);
  assert.match(html, /data-permanent-note-readiness-card/);
  assert.match(html, /补一句自己的判断/);
  assert.match(html, /补一条关系理由/);
});

test("permanent note readiness card marks mature note complete", () => {
  const note = {
    id: "pn_ready",
    status: "active",
    authorship: { user_confirmed: true },
    thesis: "卡片写作需要先形成判断。",
    threeLineSummary: ["观点", "理由", "用途"],
    boundaryOrCounterpoint: "如果只是摘录，就不能当作永久笔记。",
    distillationStatus: "confirmed"
  };
  const summary = permanentNoteReadinessSummary(note, { explicitRelationCount: 1 });

  assert.equal(summary.doneCount, 5);
  assert.equal(summary.totalCount, 5);
});
