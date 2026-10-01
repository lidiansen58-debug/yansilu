import test from "node:test";
import assert from "node:assert/strict";
import { PermanentRelationComposerController } from "../../apps/web/src/permanent-relation-composer-controller.js";

test("a missing explicit relation source does not fall back to a different active note", () => {
  const active = { id: "active" };
  const host = { state: { notes: [active] }, activeNote: () => active,
    permanentRelationWorkspaceState: { sourceNoteId: "deleted-source" } };
  const controller = new PermanentRelationComposerController(host);
  assert.equal(controller.sourceNote(), null);
  host.permanentRelationWorkspaceState = {};
  assert.equal(controller.sourceNote(), active);
});
