import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNoteTemplateSettingsCardModel,
  normalizeNoteTemplateSettingsKind,
  noteTemplateSettingsCapitalizedKind
} from "../../apps/web/src/settings-template-card-model.js";

const baseDeps = {
  defaultTemplateSourceForKind: (kind) => `${kind} default`,
  noteTemplateCardCopy: () => ({
    stats: ["统一骨架", "普通 Markdown"],
    summaryOpen: "后续新建会使用",
    statusClosed: "待保存修改"
  }),
  normalizeStoredNoteTemplateSource: (value) => `stored:${value}`,
  normalizeDraftBuffer: (value) => `draft:${value}`,
  normalizeNoteTemplateSource: (value) => `normalized:${value}`,
  noteTemplateDraftValidation: () => ({ ok: true, message: "" })
};

test("settings template card model normalizes template kind", () => {
  assert.equal(normalizeNoteTemplateSettingsKind("literature"), "literature");
  assert.equal(normalizeNoteTemplateSettingsKind("other"), "permanent");
  assert.equal(noteTemplateSettingsCapitalizedKind("literature"), "Literature");
});

test("settings template card model renders saved template state", () => {
  const model = buildNoteTemplateSettingsCardModel("permanent", {
    ...baseDeps,
    stateEntry: {
      text: "saved",
      draftText: "draft",
      draftActive: false,
      feedbackTone: "ok",
      feedbackText: " 已保存 "
    }
  });

  assert.equal(model.cleanKind, "permanent");
  assert.equal(model.visibleSource, "stored:saved");
  assert.equal(model.saveDisabled, false);
  assert.deepEqual(model.statsBadges.at(-1), { text: "已保存", tone: "ok" });
  assert.deepEqual(model.feedback, { visible: true, ok: true, warn: false, text: "已保存" });
});

test("settings template card model marks invalid draft as unsavable", () => {
  const model = buildNoteTemplateSettingsCardModel("literature", {
    ...baseDeps,
    stateEntry: {
      text: "saved",
      draftText: "bad draft",
      draftActive: true,
      feedbackTone: "warn",
      feedbackText: "bad"
    },
    noteTemplateDraftValidation: () => ({ ok: false, message: "缺少标题" })
  });

  assert.equal(model.capitalizedKind, "Literature");
  assert.equal(model.visibleSource, "draft:bad draft");
  assert.equal(model.saveDisabled, true);
  assert.equal(model.saveTitle, "缺少标题");
  assert.match(model.summaryText, /当前草稿还不能保存：缺少标题/);
  assert.deepEqual(model.statsBadges.at(-1), { text: "当前草稿不可保存", tone: "warn" });
});
