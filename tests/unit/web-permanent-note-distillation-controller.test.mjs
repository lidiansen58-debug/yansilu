import test from "node:test";
import assert from "node:assert/strict";

import {
  applyPermanentNoteDistillationToNote,
  currentPermanentNoteDistillationPrefill,
  emptyPermanentNoteDistillationPrefill,
  normalizePermanentNoteDistillationPrefill,
  permanentNoteDistillationFormValues
} from "../../apps/web/src/permanent-note-distillation-model.js";
import { PermanentNoteDistillationController } from "../../apps/web/src/permanent-note-distillation-controller.js";

function field(value = "") {
  return { value };
}

function distillationForm(values = {}) {
  const fields = new Map([
    ['[name="thesis"]', field(values.thesis)],
    ['[name="summary1"]', field(values.summary1)],
    ['[name="summary2"]', field(values.summary2)],
    ['[name="summary3"]', field(values.summary3)],
    ['[name="boundaryOrCounterpoint"]', field(values.boundaryOrCounterpoint)],
    ['[name="distillationStatus"]', field(values.distillationStatus)]
  ]);
  return {
    querySelector(selector) {
      return fields.get(selector) || null;
    }
  };
}

test("distillation model normalizes empty and remembered prefill state", () => {
  assert.deepEqual(currentPermanentNoteDistillationPrefill(null, "pn1"), emptyPermanentNoteDistillationPrefill("pn1"));

  const state = normalizePermanentNoteDistillationPrefill("pn1", {
    boundaryDraft: " boundary ",
    draftVariants: [
      { key: "default", label: "Default", boundaryDraft: "A" },
      { key: "product", label: "Product", boundaryDraft: "B" }
    ]
  }, {
    preferredTemplateVariant: "product",
    rememberedTemplateVariant: { key: "product", label: "Product" }
  });

  assert.equal(state.noteId, "pn1");
  assert.equal(state.boundaryDraft, "boundary");
  assert.equal(state.selectedTemplateVariant, "product");
  assert.equal(state.rememberedTemplateVariantLabel, "Product");
});

test("distillation form values keep thesis, boundary and confirmed status", () => {
  const values = permanentNoteDistillationFormValues(distillationForm({
    thesis: " Distilled thesis ",
    summary1: "One",
    summary2: "Two",
    summary3: "Three",
    boundaryOrCounterpoint: " Boundary ",
    distillationStatus: "confirmed"
  }));

  assert.deepEqual(values, {
    thesis: "Distilled thesis",
    threeLineSummary: ["One", "Two", "Three"],
    boundaryOrCounterpoint: "Boundary",
    distillationStatus: "confirmed"
  });
});

test("distillation controller confirms authorship after a confirmed save", async () => {
  const note = { id: "pn1", title: "Note", status: "active", noteType: "permanent", authorship: { ai_assisted: false } };
  const calls = [];
  const host = {
    activeNote: () => note,
    resolvedNoteType: () => "permanent",
    autoSaveActiveNote: async () => true,
    isActiveNoteId: (id) => id === note.id,
    onStateChange: async (action, payload) => {
      calls.push([action, payload]);
      return true;
    },
    renderThinkingStatus() {
      calls.push(["thinking"]);
    },
    renderRelated() {
      calls.push(["related"]);
    },
    readTemplateVariantPreference: () => "",
    templateVariantPreferenceMeta: () => ({ key: "", label: "" })
  };
  const controller = new PermanentNoteDistillationController(host);

  await controller.handleForm(distillationForm({
    thesis: "Thesis",
    summary1: "One",
    boundaryOrCounterpoint: "Boundary",
    distillationStatus: "confirmed"
  }));

  assert.equal(note.distillationStatus, "confirmed");
  assert.deepEqual(note.authorship, { ai_assisted: false, user_confirmed: true });
  assert.equal(calls[0][0], "save-note-distillation");
  assert.deepEqual(calls[0][1].authorship, { user_confirmed: true, ai_assisted: false });
  assert.deepEqual(calls.slice(-2), [["thinking"], ["related"]]);
});

test("distillation controller leaves note and writing status alone when save fails", async () => {
  const note = { id: "pn1", title: "Note", status: "active", noteType: "permanent" };
  const calls = [];
  const controller = new PermanentNoteDistillationController({
    activeNote: () => note,
    resolvedNoteType: () => "permanent",
    autoSaveActiveNote: async () => true,
    isActiveNoteId: (id) => id === note.id,
    onStateChange: async (action) => {
      calls.push([action]);
      return false;
    },
    renderThinkingStatus() {
      calls.push(["thinking"]);
    },
    renderRelated() {
      calls.push(["related"]);
    },
    readTemplateVariantPreference: () => "",
    templateVariantPreferenceMeta: () => ({ key: "", label: "" })
  });

  await controller.handleForm(distillationForm({
    thesis: "Thesis",
    summary1: "One",
    distillationStatus: "draft"
  }));

  assert.equal(note.thesis, undefined);
  assert.deepEqual(calls, [["save-note-distillation"]]);
});
