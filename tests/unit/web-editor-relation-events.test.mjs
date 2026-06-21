import test from "node:test";
import assert from "node:assert/strict";

import {
  routeEditorRelationClick,
  routeEditorRelationInput,
  routeEditorRelationKeydown,
  routeEditorRelationSubmit
} from "../../apps/web/src/editor-relation-events.js";

function eventFor(target, overrides = {}) {
  return {
    target,
    key: "",
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...overrides
  };
}

function elementWithClosest(matches = {}) {
  return {
    closest(selector) {
      return Object.prototype.hasOwnProperty.call(matches, selector) ? matches[selector] : null;
    }
  };
}

function attrElement(attrs = {}, extra = {}) {
  return {
    dataset: {},
    getAttribute(name) {
      return attrs[name] ?? "";
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name);
    },
    ...extra
  };
}

test("relation submit route handles create forms once", () => {
  const calls = [];
  const form = {
    matches(selector) {
      return selector === "[data-create-relation-form]";
    }
  };
  const target = elementWithClosest({
    "[data-permanent-relation-form]": null,
    "[data-create-relation-form], [data-edit-relation-form]": form
  });
  const host = {
    handleCreateRelationForm(nextForm) {
      calls.push(["create", nextForm]);
    },
    handleEditRelationForm(nextForm) {
      calls.push(["edit", nextForm]);
    },
    handlePermanentRelationWorkspaceSubmit(nextForm) {
      calls.push(["permanent", nextForm]);
    }
  };
  const event = eventFor(target);

  assert.equal(routeEditorRelationSubmit(host, event), true);
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(calls, [["create", form]]);
});

test("relation keydown route selects highlighted target with Enter", () => {
  const applied = [];
  const hiddenTarget = { value: "note-b" };
  const buttons = [
    { dataset: { noteId: "note-a", noteTitle: "Alpha" } },
    { dataset: { noteId: "note-b", noteTitle: "Beta" } }
  ];
  const form = {
    querySelector(selector) {
      if (selector === "[data-relation-target-id]") return hiddenTarget;
      return null;
    }
  };
  const targetSearch = {
    closest(selector) {
      if (selector === "[data-create-relation-form]") return form;
      return null;
    }
  };
  const target = elementWithClosest({
    "[data-relation-target-search]": targetSearch,
    "[data-create-relation-form]": form
  });
  const host = {
    visibleRelationTargetChoices(nextForm) {
      assert.equal(nextForm, form);
      return buttons;
    },
    applyRelationTargetChoice(nextForm, noteId, noteTitle) {
      applied.push([nextForm, noteId, noteTitle]);
    }
  };
  const event = eventFor(target, { key: "Enter" });

  assert.equal(routeEditorRelationKeydown(host, event), true);
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(applied, [[form, "note-b", "Beta"]]);
});

test("relation input route keeps target search on the debounce queue", () => {
  const calls = [];
  const searchInput = {};
  const target = elementWithClosest({
    "[data-relation-target-search]": searchInput
  });
  const host = {
    queueRelationTargetSearch(input) {
      calls.push(input);
    }
  };

  assert.equal(routeEditorRelationInput(host, eventFor(target)), true);
  assert.deepEqual(calls, [searchInput]);
});

test("permanent relation open action keeps sidebar route context", () => {
  const opened = [];
  const action = attrElement({
    "data-permanent-relation-action": "open",
    "data-permanent-relation-mode": "manual"
  });
  const target = elementWithClosest({
    "[data-relation-template-merge-action]": null,
    "[data-relation-template-variant]": null,
    "[data-permanent-relation-mode]": action,
    "[data-permanent-relation-action]": action
  });
  const host = {
    activeNote() {
      return { id: "note-current" };
    },
    openPermanentRelationWorkspace(route) {
      opened.push(route);
    }
  };

  assert.equal(routeEditorRelationClick(host, eventFor(target)), true);
  assert.equal(opened.length, 1);
  assert.equal(opened[0].source, "right-sidebar");
  assert.equal(opened[0].mode, "manual");
  assert.equal(opened[0].noteId, "note-current");
});
