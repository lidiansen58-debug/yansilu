import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

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

function startApi(port, vaultPath) {
  return spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

async function jsonRequest(baseUrl, pathname, options = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, options);
  const json = await res.json();
  return { status: res.status, json };
}

function postJson(baseUrl, pathname, body) {
  return jsonRequest(baseUrl, pathname, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function patchJson(baseUrl, pathname, body) {
  return jsonRequest(baseUrl, pathname, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function getJson(baseUrl, pathname) {
  return jsonRequest(baseUrl, pathname);
}

test("V1.1 distillation queue, writing intent, and AI suggestions expose review-first contracts", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-v1-1-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const roughNote = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Rough distillation candidate\n\nThis note still needs a compressed judgment."
  });
  assert.equal(roughNote.status, 201, JSON.stringify(roughNote.json));

  const draftedNote = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Drafted distillation\n\nThis note already has draft fields.",
    thesis: "Distilled notes make writing preparation less blank.",
    threeLineSummary: [
      "Distilled notes carry reusable judgments.",
      "Reusable judgments reduce blank-page drafting.",
      "Writing still needs user-owned intent before scaffolding."
    ],
    distillationStatus: "draft"
  });
  assert.equal(draftedNote.status, 201, JSON.stringify(draftedNote.json));

  const queueBefore = await getJson(baseUrl, "/api/v1/distillation/queue?limit=20");
  assert.equal(queueBefore.status, 200, JSON.stringify(queueBefore.json));
  assert.equal(queueBefore.json.item.counts.permanentNotes, 2);
  assert.ok(queueBefore.json.item.pendingThesis.some((item) => item.note.id === roughNote.json.item.id));
  assert.ok(queueBefore.json.item.pendingThreeLineSummary.some((item) => item.note.id === roughNote.json.item.id));
  assert.ok(queueBefore.json.item.items[0].qualityChecks.some((item) => item.code === "missing_thesis"));

  const patchedDistillation = await patchJson(
    baseUrl,
    `/api/v1/permanent-notes/${encodeURIComponent(roughNote.json.item.id)}/distillation`,
    {
      thesis: "Distillation starts when a note states a reusable judgment.",
      threeLineSummary: [
        "A reusable judgment makes the note easier to connect.",
        "The three-line summary separates claim, reason, and use.",
        "Confirmation remains a user action."
      ],
      distillationStatus: "draft"
    }
  );
  assert.equal(patchedDistillation.status, 200, JSON.stringify(patchedDistillation.json));
  assert.equal(patchedDistillation.json.item.distillationStatus, "draft");

  const confirmed = await postJson(
    baseUrl,
    `/api/v1/permanent-notes/${encodeURIComponent(roughNote.json.item.id)}/distillation/confirm`,
    { confirm: true }
  );
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.json));
  assert.equal(confirmed.json.item.distillationStatus, "confirmed");
  assert.deepEqual(confirmed.json.item.authorship, { user_confirmed: true, ai_assisted: false });

  const project = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "Intent first scaffold",
    goal: "Show that writing starts from confirmed judgments.",
    basketNoteIds: [roughNote.json.item.id, draftedNote.json.item.id]
  });
  assert.equal(project.status, 201, JSON.stringify(project.json));
  assert.equal(project.json.item.thinkingStatus.status, "needs_intent");
  assert.ok(project.json.item.preflight.checks.some((item) => item.code === "missing_intent"));

  const updatedIntent = await patchJson(
    baseUrl,
    `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/intent`,
    {
      intent: "Explain why confirmed note judgments should precede generated structure.",
      desiredReaderTakeaway: "Readers should treat AI output as review material, not final prose."
    }
  );
  assert.equal(updatedIntent.status, 200, JSON.stringify(updatedIntent.json));
  assert.equal(updatedIntent.json.item.intent, "Explain why confirmed note judgments should precede generated structure.");
  assert.equal(updatedIntent.json.item.thinkingStatus.status, "needs_scaffold");

  const scaffold = await postJson(baseUrl, "/api/v1/draft-scaffolds", {
    writingProjectId: project.json.item.id
  });
  assert.equal(scaffold.status, 201, JSON.stringify(scaffold.json));
  assert.equal(scaffold.json.item.readiness.status, "ready");
  assert.equal(scaffold.json.export.json.readiness.status, "ready");
  assert.match(scaffold.json.export.markdown, /## Readiness Check/);
  assert.match(scaffold.json.export.markdown, /Intent: Explain why confirmed note judgments/);

  const suggestion = await postJson(baseUrl, "/api/v1/ai-suggestions", {
    id: "suggestion_api_thesis",
    target: { type: "permanent_note", id: roughNote.json.item.id, field: "thesis" },
    scope: "permanent_note_distillation",
    content: { thesis: "AI can suggest claims, but users confirm judgments." },
    provenance: { contentOrigin: "ai_generated" }
  });
  assert.equal(suggestion.status, 201, JSON.stringify(suggestion.json));
  assert.equal(suggestion.json.item.status, "suggested");

  const rejectedDirectConfirm = await patchJson(baseUrl, "/api/v1/ai-suggestions/suggestion_api_thesis", {
    status: "confirmed",
    action: "confirm",
    actor: "user",
    userId: "user_1"
  });
  assert.equal(rejectedDirectConfirm.status, 400);
  assert.equal(rejectedDirectConfirm.json.error.code, "AI_SUGGESTION_TRANSITION_INVALID");

  const adopted = await patchJson(baseUrl, "/api/v1/ai-suggestions/suggestion_api_thesis", {
    status: "adopted_as_draft",
    action: "adopt_as_draft",
    actor: "user",
    userId: "user_1"
  });
  assert.equal(adopted.status, 200, JSON.stringify(adopted.json));
  assert.equal(adopted.json.item.status, "adopted_as_draft");

  const listed = await getJson(
    baseUrl,
    `/api/v1/ai-suggestions?targetType=permanent_note&targetId=${encodeURIComponent(roughNote.json.item.id)}`
  );
  assert.equal(listed.status, 200, JSON.stringify(listed.json));
  assert.deepEqual(listed.json.items.map((item) => item.id), ["suggestion_api_thesis"]);
});
