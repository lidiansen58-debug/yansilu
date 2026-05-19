import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readSchema, validateSchemaValue } from "../helpers/schema-validation.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error("API server did not become healthy");
}

async function getJson(baseUrl, pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const json = await res.json();
  return { status: res.status, json };
}

async function postJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function patchJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

test("AI suggestions API exposes optional canonical payloads", async (t) => {
  const vaultPath = await makeTempDir("yansilu-ai-suggestions-canonical-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => child.kill());
  await waitForHealth(baseUrl);
  const suggestionSchema = await readSchema("ai_suggestion.schema.json");

  const note = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Suggestion target\n\nThe target note starts with placeholder text.",
    thesis: "First draft from note",
    threeLineSummary: ["line 1", "line 2", "line 3"],
    distillationStatus: "draft"
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

  const created = await postJson(baseUrl, "/api/v1/ai-suggestions?canonical=true", {
    id: "suggestion_canonical_1",
    target: { type: "permanent_note", id: note.json.item.id, field: "thesis" },
    scope: "note_field",
    content: "A reviewable claim starts life as a draft."
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  assert.equal(created.json.item.id, "suggestion_canonical_1");
  assert.equal(created.json.canonical.item.id, "suggestion_canonical_1");
  assert.equal(created.json.canonical.item.target.field, "thesis");
  assert.equal(created.json.canonical.item.content_source, "suggestion_record");
  validateSchemaValue(suggestionSchema, created.json.canonical.item, "$.canonical.item");

  const listed = await getJson(baseUrl, `/api/v1/ai-suggestions?canonical=true&targetType=permanent_note&targetId=${encodeURIComponent(note.json.item.id)}`);
  assert.equal(listed.status, 200, JSON.stringify(listed.json));
  assert.equal(listed.json.items[0].id, "suggestion_canonical_1");
  assert.equal(listed.json.canonical.items[0].target.id, note.json.item.id);
  validateSchemaValue(suggestionSchema, listed.json.canonical.items[0], "$.canonical.items[0]");

  const adopted = await patchJson(baseUrl, "/api/v1/ai-suggestions/suggestion_canonical_1?canonical=true", {
    status: "adopted_as_draft",
    action: "adopt_as_draft",
    actor: "user",
    userId: "user_1"
  });
  assert.equal(adopted.status, 200, JSON.stringify(adopted.json));
  assert.equal(adopted.json.item.status, "adopted_as_draft");
  assert.equal(adopted.json.canonical.item.status, "adopted_as_draft");
  assert.equal(adopted.json.canonical.item.content_source, "target_note_mirror");
  validateSchemaValue(suggestionSchema, adopted.json.canonical.item, "$.canonical.item");

  const createdFieldSuggestion = await postJson(baseUrl, "/api/v1/ai-suggestions?canonical=true", {
    id: "suggestion_canonical_field",
    target: { type: "permanent_note", id: note.json.item.id, field: "thesis" },
    scope: "note_field",
    content: "Original suggested thesis"
  });
  assert.equal(createdFieldSuggestion.status, 201, JSON.stringify(createdFieldSuggestion.json));
  assert.equal(createdFieldSuggestion.json.canonical.item.content_source, "suggestion_record");
  validateSchemaValue(suggestionSchema, createdFieldSuggestion.json.canonical.item, "$.canonical.item");

  const adoptedField = await patchJson(baseUrl, `/api/v1/ai-suggestions/${encodeURIComponent("suggestion_canonical_field")}?canonical=true`, {
    status: "adopted_as_draft",
    action: "adopt_as_draft",
    actor: "user",
    userId: "user_1"
  });
  assert.equal(adoptedField.status, 200, JSON.stringify(adoptedField.json));
  assert.equal(adoptedField.json.canonical.item.content_source, "target_note_mirror");
  validateSchemaValue(suggestionSchema, adoptedField.json.canonical.item, "$.canonical.item");

  const updatedNote = await fetch(`${baseUrl}/api/v1/notes/${encodeURIComponent(note.json.item.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: note.json.item.title,
      body: note.json.item.body,
      status: note.json.item.status,
      thesis: "Edited in target note",
      threeLineSummary: ["line 1", "line 2", "line 3"],
      distillationStatus: "draft"
    })
  });
  const updatedNoteJson = await updatedNote.json();
  assert.equal(updatedNote.status, 200, JSON.stringify(updatedNoteJson));

  const edited = await patchJson(baseUrl, "/api/v1/ai-suggestions/suggestion_canonical_1?canonical=true", {
    status: "edited",
    action: "edit",
    actor: "user",
    userId: "user_1"
  });
  assert.equal(edited.status, 200, JSON.stringify(edited.json));
  assert.equal(edited.json.item.status, "edited");
  assert.equal(edited.json.canonical.item.status, "edited");
  validateSchemaValue(suggestionSchema, edited.json.canonical.item, "$.canonical.item");

  const editedField = await patchJson(baseUrl, `/api/v1/ai-suggestions/${encodeURIComponent("suggestion_canonical_field")}?canonical=true`, {
    status: "edited",
    action: "edit",
    actor: "user",
    userId: "user_1"
  });
  assert.equal(editedField.status, 200, JSON.stringify(editedField.json));
  assert.equal(editedField.json.item.content, "Edited in target note");
  assert.equal(editedField.json.canonical.item.content, "Edited in target note");
  assert.equal(editedField.json.canonical.item.content_source, "target_note_mirror");
  validateSchemaValue(suggestionSchema, editedField.json.canonical.item, "$.canonical.item");

  const confirmed = await patchJson(baseUrl, "/api/v1/ai-suggestions/suggestion_canonical_1?canonical=true", {
    status: "confirmed",
    action: "confirm",
    actor: "user",
    userId: "user_1",
    userConfirmed: true
  });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.json));
  assert.equal(confirmed.json.item.status, "confirmed");
  assert.equal(confirmed.json.canonical.item.status, "confirmed");
  validateSchemaValue(suggestionSchema, confirmed.json.canonical.item, "$.canonical.item");

  const updatedNoteAgain = await fetch(`${baseUrl}/api/v1/notes/${encodeURIComponent(note.json.item.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: updatedNoteJson.item.title,
      body: updatedNoteJson.item.body,
      status: updatedNoteJson.item.status,
      thesis: "Final confirmed note wording",
      threeLineSummary: ["line 1", "line 2", "line 3"],
      distillationStatus: "draft"
    })
  });
  const updatedNoteAgainJson = await updatedNoteAgain.json();
  assert.equal(updatedNoteAgain.status, 200, JSON.stringify(updatedNoteAgainJson));

  const confirmedField = await patchJson(baseUrl, `/api/v1/ai-suggestions/${encodeURIComponent("suggestion_canonical_field")}?canonical=true`, {
    status: "confirmed",
    action: "confirm",
    actor: "user",
    userId: "user_1",
    userConfirmed: true
  });
  assert.equal(confirmedField.status, 200, JSON.stringify(confirmedField.json));
  assert.equal(confirmedField.json.item.content, "Final confirmed note wording");
  assert.equal(confirmedField.json.canonical.item.content, "Final confirmed note wording");
  assert.equal(confirmedField.json.canonical.item.content_source, "target_note_mirror");
  validateSchemaValue(suggestionSchema, confirmedField.json.canonical.item, "$.canonical.item");

  const fetched = await getJson(baseUrl, "/api/v1/ai-suggestions/suggestion_canonical_1?canonical=true");
  assert.equal(fetched.status, 200, JSON.stringify(fetched.json));
  assert.equal(fetched.json.item.status, "confirmed");
  assert.equal(fetched.json.canonical.item.history[0].to_status, "adopted_as_draft");
  assert.equal(fetched.json.canonical.item.history[1].to_status, "edited");
  assert.equal(fetched.json.canonical.item.history[2].to_status, "confirmed");
  validateSchemaValue(suggestionSchema, fetched.json.canonical.item, "$.canonical.item");

  const fetchedField = await getJson(baseUrl, `/api/v1/ai-suggestions/${encodeURIComponent("suggestion_canonical_field")}?canonical=true`);
  assert.equal(fetchedField.status, 200, JSON.stringify(fetchedField.json));
  assert.equal(fetchedField.json.item.content, "Final confirmed note wording");
  assert.equal(fetchedField.json.canonical.item.history[1].to_status, "edited");
  assert.equal(fetchedField.json.canonical.item.history[2].to_status, "confirmed");
  validateSchemaValue(suggestionSchema, fetchedField.json.canonical.item, "$.canonical.item");
});
