import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createSqliteSuggestionStore } from "../../packages/ai-orchestrator/src/index.mjs";

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("sqlite suggestion store bootstraps schema in an existing vault and persists review transitions", async () => {
  const vaultPath = await makeTempDir("yansilu-suggestion-vault-");
  await fs.mkdir(path.join(vaultPath, ".yansilu"), { recursive: true });

  const store = await createSqliteSuggestionStore({ vaultPath });
  assert.ok(store.dbPath.endsWith(path.join(".yansilu", "ai-agent.db")));

  const suggestion = store.create(
    {
      id: "suggestion_sqlite_1",
      target: { type: "permanent_note", id: "pn_1", field: "thesis" },
      scope: "permanent_note_distillation",
      content: { thesis: "Reviewable suggestions stay drafts until the user confirms." },
      sourceArtifactId: "artifact_field_sqlite_1"
    },
    { now: "2026-05-18T00:00:00.000Z" }
  );
  assert.equal(store.get(suggestion.id).status, "suggested");
  assert.equal(store.get(suggestion.id).sourceArtifactId, "artifact_field_sqlite_1");

  const draft = store.transition(suggestion.id, "adopted_as_draft", {
    action: "adopt_as_draft",
    actor: "user",
    userId: "user_1",
    createdAt: "2026-05-18T00:05:00.000Z"
  });
  assert.equal(draft.status, "adopted_as_draft");
  assert.equal(store.get(suggestion.id).history.length, 1);

  const list = store.list({
    targetType: "permanent_note",
    targetId: "pn_1",
    sourceArtifactId: "artifact_field_sqlite_1",
    scope: "permanent_note_distillation"
  });
  assert.deepEqual(list.map((item) => item.id), ["suggestion_sqlite_1"]);

  await assert.doesNotReject(() => fs.stat(store.dbPath));
  store.close();
});

