import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("prototype graph shell keeps review and relation entry wiring without legacy wikilink copy", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /function renderGraphPanel\(\)/);
  assert.match(source, /function renderGraphSelectionPanel/);
  assert.match(source, /function renderGraphRelationWorkspaceForNote/);
  assert.match(source, /data-graph-relation-adjustment="strengthen"/);
  assert.match(source, /renderGraphRelationWorkspaceMarkup/);
  assert.doesNotMatch(source, /data-graph-followup-action="relations-edit"/);
  assert.doesNotMatch(source, /Markdown wikilink/);
});

test("prototype graph shell delegates isolated relation save and workspace rendering to modules", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /createGraphIsolatedRelationController/);
  assert.match(source, /createGraphRelationSaveController/);
  assert.match(source, /createGraphRelationWorkflowController/);
  assert.match(source, /renderGraphRelationWorkspaceForNote as renderGraphRelationWorkspaceMarkup/);
  assert.match(source, /renderGraphThemeIndexWorkspace as renderGraphThemeIndexWorkspaceMarkup/);
});
