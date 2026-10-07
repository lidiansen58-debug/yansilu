import test from "node:test";
import assert from "node:assert/strict";
import { persistTemplateEntry } from "../../apps/web/src/settings-template-storage.js";
import { createSettingsNoteTemplateRuntime } from "../../apps/web/src/settings-note-template-runtime.js";
import * as templates from "../../apps/web/src/prototype-note-templates.js";

function storageHarness(failKey = "") {
  const values = new Map([["template", "old"], ["history", '["older"]']]);
  const storage = {
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
    setItem(key, value) { if (key === failKey) throw new Error("QuotaExceededError"); values.set(key, value); }
  };
  return { values, storage };
}

for (const failKey of ["history", "template"]) {
  test(`template ${failKey} write failure keeps the saved text and history`, () => {
    const { storage, values } = storageHarness(failKey);
    const result = persistTemplateEntry({ getStorage: () => storage, key: "template", historyKey: "history", source: "new", history: ["old"] });
    assert.equal(result.ok, false);
    assert.match(result.message, /QuotaExceededError/);
    assert.equal(values.get("template"), "old");
    assert.equal(values.get("history"), '["older"]');
  });
}

test("unavailable template storage reports failure, not success", () => {
  assert.equal(persistTemplateEntry({ getStorage: () => null }).ok, false);
  assert.match(persistTemplateEntry({ getStorage() { throw new Error("SecurityError"); } }).message, /SecurityError/);
});

test("template storage persists the active source and history", () => {
  const { storage, values } = storageHarness();
  assert.deepEqual(persistTemplateEntry({ getStorage: () => storage, key: "template", historyKey: "history", source: "new", history: ["old"] }), { ok: true });
  assert.equal(values.get("template"), "new");
  assert.equal(values.get("history"), '["old"]');
});

test("template runtime keeps draft and saved state on failure, and commits only after retry succeeds", () => {
  let fail = true;
  const values = new Map();
  const saved = templates.defaultPermanentTemplateSource();
  const draft = `${saved}\n\n## 用户自定栏目\n\n保留我的内容`;
  const settingsState = { noteTemplates: { permanent: { text: saved, draftText: draft, draftActive: true, history: [] } } };
  const calls = [];
  const runtime = createSettingsNoteTemplateRuntime({
    ...templates, settingsState, currentVaultPath: () => "E:/isolated-vault",
    $: id => id === "settingsPermanentTemplateEditor" ? { value: draft } : null,
    setStatus: (...args) => calls.push(args), renderSettingsPanel() {},
    getStorage: () => ({
      getItem: key => values.get(key) ?? null,
      removeItem: key => values.delete(key),
      setItem(key, value) { if (fail) throw new Error("QuotaExceededError"); values.set(key, value); }
    })
  });
  assert.equal(runtime.saveNoteTemplateFromEditor("permanent"), false);
  assert.equal(settingsState.noteTemplates.permanent.text, saved);
  assert.equal(settingsState.noteTemplates.permanent.draftText, draft);
  assert.equal(settingsState.noteTemplates.permanent.draftActive, true);
  assert.deepEqual(settingsState.noteTemplates.permanent.history, []);
  assert.match(settingsState.noteTemplates.permanent.feedbackText, /保存失败.*QuotaExceededError/);
  assert.equal(calls.at(-1)[1], "bad");
  fail = false;
  assert.equal(runtime.saveNoteTemplateFromEditor("permanent"), true);
  assert.equal(settingsState.noteTemplates.permanent.text, draft);
  assert.equal(settingsState.noteTemplates.permanent.draftActive, false);
  assert.equal(values.get(runtime.noteTemplateStorageKey("permanent")), draft);
  assert.deepEqual(settingsState.noteTemplates.permanent.history, [templates.normalizeNoteTemplateSource(saved)]);
  fail = true;
  assert.equal(runtime.resetNoteTemplateToDefault("permanent"), false);
  assert.equal(settingsState.noteTemplates.permanent.text, draft);
  assert.equal(values.get(runtime.noteTemplateStorageKey("permanent")), draft);
  fail = false;
  assert.equal(runtime.resetNoteTemplateToDefault("permanent"), true);
  assert.equal(settingsState.noteTemplates.permanent.text, saved);
});
