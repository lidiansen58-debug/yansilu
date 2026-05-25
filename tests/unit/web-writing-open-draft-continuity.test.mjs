import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing open-draft button reuses projected draft continuity before a project is reopened", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const draftContinuation = !hasDraft \? currentWritingContinuationEntry\("当前写作篮"\) : null;/);
  assert.match(source, /const canOpenProjectedDraft = Boolean\(draftContinuation\?\.projectId\) && draftContinuation\.action === "open-draft";/);
  assert.match(source, /openDraftButton\.disabled = !\(hasDraft \|\| canOpenProjectedDraft\);/);
  assert.match(source, /openDraftButton\.textContent = hasDraft \|\| canOpenProjectedDraft \? "打开当前草稿" : "暂无草稿";/);
});

test("writing open-draft handler resumes projected draft continuity before warning about a missing draft", async () => {
  const source = await readPrototypeAppSource();
  const match = source.match(/\$\("btnWritingOpenDraft"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writing open-draft handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const continuation = !draftNoteId \? currentWritingContinuationEntry\("当前写作篮"\) : null;/);
  assert.match(fnBody, /if \(!draftNoteId && continuation\?\.projectId && continuation\.action === "open-draft"\) \{/);
  assert.match(fnBody, /await continueWritingProjectEntry\(continuation\.projectId, \{/);
  assert.match(fnBody, /openDraft: true/);
  assert.match(fnBody, /if \(!draftNoteId\) return setStatus\("当前项目还没有绑定草稿笔记", "warn"\);/);
});
