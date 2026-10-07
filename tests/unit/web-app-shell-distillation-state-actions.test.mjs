import test from "node:test";
import assert from "node:assert/strict";

import {
  handleConfirmNoteDistillationStateChange,
  handleSaveNoteDistillationStateChange
} from "../../apps/web/src/app-shell-distillation-state-actions.js";

function statusRecorder() {
  const calls = [];
  return {
    calls,
    setStatus(message, tone) {
      calls.push({ message, tone });
    }
  };
}

test("distillation state actions save fields and sync the open tab", async () => {
  const status = statusRecorder();
  const state = {
    notes: [{ id: "n1", title: "Old", body: "old" }],
    tabs: [{ noteId: "n1", title: "Old", savedTitle: "Old", body: "old", savedBody: "old", savedFileRevision: "old-revision", dirty: true }]
  };
  const calls = [];

  const result = await handleSaveNoteDistillationStateChange({
    noteId: "n1",
    thesis: "claim",
    threeLineSummary: ["a"],
    boundaryOrCounterpoint: "boundary",
    viewpointChangeSourceNoteIds: ["source-1"],
    commitViewpointChange: true,
    distillationStatus: "draft"
  }, {
    state,
    updatePermanentNoteDistillation: async (noteId, payload) => {
      calls.push(["update", noteId, payload]);
      return { id: noteId, title: "New", body: "new body", fileRevision: "new-revision", thesis: payload.thesis };
    },
    mapNoteItem: (item) => ({ ...item, mapped: true }),
    setStatus: status.setStatus,
    renderDistillationPanel: () => calls.push("render-distillation"),
    renderAll: () => calls.push("render-all")
  });

  assert.equal(result.title, "New");
  assert.equal(state.notes[0].mapped, true);
  assert.equal(state.notes[0].bodyLoaded, true);
  assert.deepEqual(state.tabs[0], {
    noteId: "n1",
    title: "New",
    savedTitle: "New",
    body: "new body",
    savedBody: "new body",
    savedFileRevision: "new-revision",
    dirty: false
  });
  assert.deepEqual(calls, [
    ["update", "n1", {
      thesis: "claim",
      threeLineSummary: ["a"],
      boundaryOrCounterpoint: "boundary",
      viewpointChangeSourceNoteIds: ["source-1"],
      commitViewpointChange: true,
      distillationStatus: "draft"
    }],
    "render-distillation",
    "render-all"
  ]);
  assert.deepEqual(status.calls.at(-1), { message: "观点草稿已保存", tone: "ok" });
});

test("distillation state actions save draft before confirming requested confirmed status", async () => {
  const status = statusRecorder();
  const calls = [];
  const state = {
    notes: [{ id: "n1", authorship: { ai_assisted: true } }],
    tabs: [{ noteId: "n1", body: "old", savedBody: "old", savedFileRevision: "before-confirm", dirty: false }]
  };

  const result = await handleSaveNoteDistillationStateChange({
    noteId: "n1",
    distillationStatus: "confirmed",
    authorship: { ai_assisted: false }
  }, {
    state,
    updatePermanentNoteDistillation: async (noteId, payload) => {
      calls.push(["update", noteId, payload.distillationStatus]);
      return { id: noteId, body: "draft" };
    },
    confirmPermanentNoteDistillation: async (noteId, payload) => {
      calls.push(["confirm", noteId, payload]);
      return { id: noteId, body: "confirmed body", fileRevision: "after-confirm", distillationStatus: "confirmed" };
    },
    mapNoteItem: (item) => item,
    setStatus: status.setStatus
  });

  assert.equal(result.distillationStatus, "confirmed");
  assert.equal(state.tabs[0].savedFileRevision, "after-confirm");
  assert.equal(state.tabs[0].savedBody, "confirmed body");
  assert.deepEqual(calls, [
    ["update", "n1", "draft"],
    ["confirm", "n1", { aiAssisted: false }]
  ]);
  assert.deepEqual(status.calls.at(-1), { message: "当前观点已保存", tone: "ok" });
});

test("distillation state actions return false when the note is missing", async () => {
  const result = await handleSaveNoteDistillationStateChange({ noteId: "missing" }, {
    state: { notes: [] }
  });
  assert.equal(result, false);
});

test("distillation state actions report save failures", async () => {
  const status = statusRecorder();
  const result = await handleSaveNoteDistillationStateChange({ noteId: "n1" }, {
    state: { notes: [{ id: "n1" }] },
    updatePermanentNoteDistillation: async () => {
      throw new Error("network");
    },
    setStatus: status.setStatus
  });

  assert.equal(result, false);
  assert.deepEqual(status.calls.at(-1), { message: "当前观点保存失败：network", tone: "bad" });
});

test("title and revision use the draft baseline, then confirmation uses the returned revision", async () => {
  const state = { notes: [{ id: "n1" }], tabs: [{ noteId: "n1" }] };
  const result = await handleSaveNoteDistillationStateChange({
    noteId: "n1", title: "My judgment", expectedRevision: "old", thesis: "Claim", distillationStatus: "confirmed"
  }, {
    state,
    updatePermanentNoteDistillation: async (id, payload) => {
      assert.equal(payload.title, "My judgment");
      assert.equal(payload.expectedRevision, "old");
      return { id, title: payload.title, body: "# My judgment", fileRevision: "draft" };
    },
    confirmPermanentNoteDistillation: async (id, payload) => {
      assert.equal(payload.expectedRevision, "draft");
      return { id, title: "My judgment", body: "# My judgment\n\nClaim", fileRevision: "confirmed" };
    }
  });
  assert.equal(result.fileRevision, "confirmed");
  assert.equal(state.tabs[0].savedTitle, "My judgment");
  assert.equal(state.tabs[0].savedFileRevision, "confirmed");
});

test("confirmation failure reports the saved draft and keeps an accurate retry baseline", async () => {
  const status = statusRecorder();
  const state = { notes: [{ id: "n1", title: "Old" }], tabs: [{ noteId: "n1", savedFileRevision: "old" }] };
  const draft = { id: "n1", title: "New", thesis: "Claim", body: "# New", fileRevision: "draft", distillationStatus: "draft" };
  const result = await handleSaveNoteDistillationStateChange({ noteId: "n1", title: "New", distillationStatus: "confirmed" }, {
    state, setStatus: status.setStatus,
    updatePermanentNoteDistillation: async () => draft,
    confirmPermanentNoteDistillation: async () => { throw new Error("service unavailable"); }
  });
  assert.equal(result.distillationSaveIncomplete, true);
  assert.equal(state.notes[0].title, "New");
  assert.equal(state.notes[0].distillationStatus, "draft");
  assert.equal(state.tabs[0].savedBody, "# New");
  assert.equal(state.tabs[0].savedFileRevision, "draft");
  assert.equal(state.tabs[0].dirty, false);
  assert.match(status.calls.at(-1).message, /草稿已保存，但确认失败.*service unavailable.*重试/);
  assert.equal(status.calls.at(-1).tone, "bad");
});

test("distillation state actions confirm an existing note", async () => {
  const status = statusRecorder();
  const state = {
    notes: [{ id: "n1", title: "Old", body: "old", authorship: { ai_assisted: true } }],
    tabs: [{ noteId: "n1", title: "Old", savedTitle: "Old", body: "old", savedBody: "old", dirty: true }]
  };
  const calls = [];

  const result = await handleConfirmNoteDistillationStateChange({ noteId: "n1" }, {
    state,
    confirmPermanentNoteDistillation: async (noteId, payload) => {
      calls.push(["confirm", noteId, payload]);
      return { id: noteId, title: "Updated", body: "updated body", fileRevision: "confirmed-revision", distillationStatus: "confirmed" };
    },
    mapNoteItem: (item) => ({ ...item, mapped: true }),
    setStatus: status.setStatus,
    renderAll: () => calls.push("render-all")
  });

  assert.equal(result.distillationStatus, "confirmed");
  assert.equal(state.notes[0].mapped, true);
  assert.equal(state.notes[0].bodyLoaded, true);
  assert.deepEqual(state.tabs[0], {
    noteId: "n1",
    title: "Updated",
    savedTitle: "Updated",
    body: "updated body",
    savedBody: "updated body",
    savedFileRevision: "confirmed-revision",
    dirty: false
  });
  assert.deepEqual(calls, [
    ["confirm", "n1", { aiAssisted: true }],
    "render-all"
  ]);
  assert.deepEqual(status.calls.at(-1), { message: "提炼内容已整理到正文", tone: "ok" });
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function distillationFixture() {
  return {
    noteMoveVaultScope: {},
    notes: [{ id: "n1", title: "Old", body: "old body", fileRevision: "old" }],
    tabs: [{ noteId: "n1", title: "Old", savedTitle: "Old", body: "old body",
      savedBody: "old body", savedFileRevision: "old", dirty: false }]
  };
}

const savedDraft = { id: "n1", title: "Saved", body: "saved body", fileRevision: "draft" };

for (const phase of ["draft", "confirmation", "explicit-confirmation"]) {
  for (const outcome of ["success", "failure"]) {
    test(`late ${phase} ${outcome} cannot mutate a switched vault with the same note ID`, async () => {
      const state = distillationFixture();
      const waiting = deferred();
      const started = deferred();
      const status = statusRecorder();
      let renders = 0, confirmations = 0;
      const wait = () => { started.resolve(); return waiting.promise; };
      const deps = {
        state, setStatus: status.setStatus,
        renderAll: () => renders++, renderDistillationPanel: () => renders++,
        updatePermanentNoteDistillation: phase === "draft" ? wait : async () => savedDraft,
        confirmPermanentNoteDistillation: () => { confirmations++; return wait(); }
      };
      const operation = phase === "explicit-confirmation"
        ? handleConfirmNoteDistillationStateChange({ noteId: "n1" }, deps)
        : handleSaveNoteDistillationStateChange({ noteId: "n1", distillationStatus: "confirmed" }, deps);
      await started.promise;
      state.noteMoveVaultScope = {};
      state.notes = [{ id: "n1", title: "Other vault", body: "other body", fileRevision: "other" }];
      state.tabs = [{ noteId: "n1", title: "New input", body: "unsaved other body",
        savedTitle: "Other vault", savedBody: "other body", savedFileRevision: "other", dirty: true }];
      const before = structuredClone({ notes: state.notes, tabs: state.tabs });
      if (outcome === "success") waiting.resolve(savedDraft);
      else waiting.reject(new Error("confirmation failed"));
      assert.equal(await operation, false);
      assert.deepEqual({ notes: state.notes, tabs: state.tabs }, before);
      assert.deepEqual(status.calls, []);
      assert.equal(renders, 0);
      assert.equal(confirmations, phase === "draft" ? 0 : 1);
    });
  }
}

for (const phase of ["draft", "confirmation", "explicit-confirmation"]) {
  test(`${phase} preserves newer body and title while updating the saved baseline`, async () => {
    const state = distillationFixture();
    const waiting = deferred(), started = deferred();
    const wait = () => { started.resolve(); return waiting.promise; };
    const deps = {
      state,
      updatePermanentNoteDistillation: phase === "draft" ? wait : async () => savedDraft,
      confirmPermanentNoteDistillation: wait
    };
    const operation = phase === "explicit-confirmation"
      ? handleConfirmNoteDistillationStateChange({ noteId: "n1" }, deps)
      : handleSaveNoteDistillationStateChange({ noteId: "n1",
        distillationStatus: phase === "draft" ? "draft" : "confirmed" }, deps);
    await started.promise;
    Object.assign(state.tabs[0], { title: "Newer title", body: "newer unsaved body", dirty: true });
    waiting.resolve(savedDraft);
    assert.equal((await operation).fileRevision, "draft");
    assert.equal(state.tabs[0].title, "Newer title");
    assert.equal(state.tabs[0].body, "newer unsaved body");
    assert.equal(state.tabs[0].savedTitle, "Saved");
    assert.equal(state.tabs[0].savedBody, "saved body");
    assert.equal(state.tabs[0].savedFileRevision, "draft");
    assert.equal(state.tabs[0].dirty, true);
  });
}

test("partial confirmation failure preserves newer input in a background tab", async () => {
  const state = distillationFixture();
  const waiting = deferred(), started = deferred();
  const operation = handleSaveNoteDistillationStateChange({ noteId: "n1", distillationStatus: "confirmed" }, {
    state, updatePermanentNoteDistillation: async () => savedDraft,
    confirmPermanentNoteDistillation: () => { started.resolve(); return waiting.promise; }
  });
  await started.promise;
  Object.assign(state.tabs[0], { title: "Newer title", body: "newer unsaved body", dirty: true });
  state.tabs.push({ id: "other-tab", noteId: "n2", body: "other" });
  state.activeTabId = "other-tab";
  waiting.reject(new Error("confirmation failed"));
  assert.equal((await operation).distillationSaveIncomplete, true);
  assert.equal(state.tabs[0].body, "newer unsaved body");
  assert.equal(state.tabs[0].title, "Newer title");
  assert.equal(state.tabs[0].savedBody, "saved body");
  assert.equal(state.tabs[0].savedFileRevision, "draft");
  assert.equal(state.tabs[0].dirty, true);
});

test("a late result cannot write to a closed and reopened tab", async () => {
  const state = distillationFixture();
  const waiting = deferred();
  const operation = handleSaveNoteDistillationStateChange({ noteId: "n1" }, {
    state, updatePermanentNoteDistillation: () => waiting.promise
  });
  const replacement = { ...state.tabs[0], body: "reopened unsaved body", dirty: true };
  state.tabs = [replacement];
  const before = structuredClone(replacement);
  waiting.resolve(savedDraft);
  await operation;
  assert.deepEqual(replacement, before);
});

for (const change of ["vault-path", "switch-in-progress", "newer-save"]) {
  test(`a ${change} prevents the follow-up confirmation and stale state writes`, async () => {
    const state = distillationFixture();
    const waiting = deferred();
    let vaultPath = "old-vault", confirmations = 0;
    const operation = handleSaveNoteDistillationStateChange({ noteId: "n1", distillationStatus: "confirmed" }, {
      state, getVaultPath: () => vaultPath,
      updatePermanentNoteDistillation: () => waiting.promise,
      confirmPermanentNoteDistillation: async () => { confirmations++; return savedDraft; }
    });
    if (change === "vault-path") vaultPath = "new-vault";
    if (change === "switch-in-progress") state.noteMoveVaultSwitching = true;
    if (change === "newer-save") state.notes[0].fileRevision = "newer-save";
    const before = structuredClone({ notes: state.notes, tabs: state.tabs });
    waiting.resolve(savedDraft);
    assert.equal(await operation, false);
    assert.equal(confirmations, 0);
    assert.deepEqual({ notes: state.notes, tabs: state.tabs }, before);
  });
}
