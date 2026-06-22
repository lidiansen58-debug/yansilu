import test from "node:test";
import assert from "node:assert/strict";

import {
  readAppShellStateChangeDepsSource
} from "./copy-source-helpers.mjs";

test("app shell state-change deps delegates action domains to smaller deps modules", async () => {
  const source = await readAppShellStateChangeDepsSource();

  assert.match(source, /from "\.\/app-shell-graph-state-change-deps\.js"/);
  assert.match(source, /from "\.\/app-shell-note-state-change-deps\.js"/);
  assert.match(source, /from "\.\/app-shell-ai-writing-state-change-deps\.js"/);
  assert.match(source, /from "\.\/app-shell-file-state-change-deps\.js"/);
  assert.match(source, /\.\.\.buildAppShellGraphStateChangeDeps\(host\)/);
  assert.match(source, /\.\.\.buildAppShellNoteStateChangeDeps\(host\)/);
  assert.match(source, /\.\.\.buildAppShellAiWritingStateChangeDeps\(host\)/);
  assert.match(source, /\.\.\.buildAppShellFileStateChangeDeps\(host\)/);
  assert.doesNotMatch(source, /graphAssociateNote:\s*\{/);
  assert.doesNotMatch(source, /saveNote:\s*\{/);
  assert.doesNotMatch(source, /directoryMove:\s*\{/);
});
