import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing open-draft button reuses projected continuity before a project is reopened", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const draftContinuation = !hasDraft \? currentWritingContinuationEntry\("当前写作篮"\) : null;/);
  assert.match(source, /const canContinueProjectedDraft = Boolean\(draftContinuation\?\.projectId\) && Boolean\(draftContinuation\?\.actionLabel\);/);
  assert.match(source, /openDraftButton\.disabled = !\(hasDraft \|\| canContinueProjectedDraft\);/);
  assert.match(source, /draftContinuation\?\.projectId && draftContinuation\?\.action === "open-draft"\s*\?\s*"打开当前草稿"/);
  assert.match(source, /draftContinuation\?\.projectId && draftContinuation\?\.actionLabel\s*\?\s*`先\$\{draftContinuation\.actionLabel\}`/);
});

test("writing open-draft handler resumes projected continuity before warning about a missing draft", async () => {
  const source = await readPrototypeAppSource();
  const match = source.match(/\$\("btnWritingOpenDraft"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writing open-draft handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const continuation = !draftNoteId \? currentWritingContinuationEntry\("当前写作篮"\) : null;/);
  assert.match(fnBody, /if \(!draftNoteId && continuation\?\.projectId\) \{/);
  assert.match(fnBody, /await continueWritingProjectEntry\(continuation\.projectId, \{/);
  assert.match(fnBody, /openDraft: continuation\.action === "open-draft"/);
  assert.match(fnBody, /if \(!draftNoteId\) return setStatus\("当前项目还没有绑定草稿笔记", "warn"\);/);
});
