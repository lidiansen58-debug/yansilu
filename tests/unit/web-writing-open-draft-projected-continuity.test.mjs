import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing open-draft button stays continuity-aware for projected scaffold and project entries", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /openDraftButton\.textContent = hasDraft[\s\S]*draftContinuation\?\.projectId && draftContinuation\?\.action === "open-draft"[\s\S]*"打开当前草稿"[\s\S]*draftContinuation\?\.projectId && draftContinuation\?\.actionLabel[\s\S]*`先\$\{draftContinuation\.actionLabel\}`[\s\S]*"暂无草稿";/);
});

test("writing open-draft handler resumes projected scaffold or project continuity with writing-center scoped feedback", async () => {
  const source = await readPrototypeAppSource();
  const match = source.match(/\$\("btnWritingOpenDraft"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writing open-draft handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /continuation\.action === "resume-scaffold"[\s\S]*已从写作中心回到草稿骨架/);
  assert.match(fnBody, /continuation\.action === "resume-project"[\s\S]*已从写作中心继续当前项目/);
  assert.match(fnBody, /continuation\.action === "resume-scaffold"[\s\S]*从写作中心回到草稿骨架/);
  assert.match(fnBody, /continuation\.action === "resume-project"[\s\S]*从写作中心继续当前项目/);
});
