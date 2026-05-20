import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import net from "node:net";
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

  const created = await postJson(baseUrl, "/api/v1/ai-suggestions?canonical=true", {
    id: "suggestion_canonical_1",
    target: { type: "permanent_note", id: "pn_1", field: "thesis" },
    scope: "note_field",
    content: "A reviewable claim starts life as a draft."
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  assert.equal(created.json.item.id, "suggestion_canonical_1");
  assert.equal(created.json.canonical.item.id, "suggestion_canonical_1");
  assert.equal(created.json.canonical.item.target.field, "thesis");

  const rejectedCreate = await postJson(baseUrl, "/api/v1/ai-suggestions?canonical=true", {
    id: "suggestion_canonical_invalid_create",
    target: { type: "permanent_note", id: "pn_1", field: "thesis" },
    scope: "note_field",
    content: "This should not be creatable as confirmed.",
    status: "confirmed",
    userConfirmed: true,
    history: [
      {
        fromStatus: "edited",
        toStatus: "confirmed",
        action: "confirm",
        actor: "user",
        userId: "user_1",
        comment: "forged",
        createdAt: "2026-05-18T12:00:00.000Z"
      }
    ]
  });
  assert.equal(rejectedCreate.status, 400, JSON.stringify(rejectedCreate.json));
  assert.equal(rejectedCreate.json.error.code, "AI_SUGGESTION_CREATE_STATUS_INVALID");

  const listed = await getJson(baseUrl, "/api/v1/ai-suggestions?canonical=true&targetType=permanent_note&targetId=pn_1");
  assert.equal(listed.status, 200, JSON.stringify(listed.json));
  assert.equal(listed.json.items[0].id, "suggestion_canonical_1");
  assert.equal(listed.json.canonical.items[0].target.id, "pn_1");

  const adopted = await patchJson(baseUrl, "/api/v1/ai-suggestions/suggestion_canonical_1?canonical=true", {
    status: "adopted_as_draft",
    action: "adopt_as_draft",
    actor: "user",
    userId: "user_1"
  });
  assert.equal(adopted.status, 200, JSON.stringify(adopted.json));
  assert.equal(adopted.json.item.status, "adopted_as_draft");
  assert.equal(adopted.json.canonical.item.status, "adopted_as_draft");
  assert.equal(adopted.json.canonical.review_events[0].event_type, "adopted_as_draft");
  assert.equal(adopted.json.canonical.review_events[0].target.id, "pn_1");
  assert.equal(adopted.json.canonical.trace.source_artifact_id, "");

  const edited = await patchJson(baseUrl, "/api/v1/ai-suggestions/suggestion_canonical_1?canonical=true", {
    status: "edited",
    action: "edit",
    actor: "user",
    userId: "user_1"
  });
  assert.equal(edited.status, 200, JSON.stringify(edited.json));
  assert.equal(edited.json.item.status, "edited");
  assert.equal(edited.json.canonical.item.status, "edited");
  assert.equal(edited.json.canonical.latest_review_event.event_type, "edited");
  assert.equal(edited.json.canonical.latest_review_event.metadata.from_status, "adopted_as_draft");
  assert.equal(edited.json.canonical.latest_review_event.metadata.to_status, "edited");

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
  assert.equal(confirmed.json.canonical.latest_review_event.event_type, "confirmed");
  assert.equal(confirmed.json.canonical.latest_review_event.metadata.from_status, "edited");
  assert.equal(confirmed.json.canonical.latest_review_event.metadata.to_status, "confirmed");

  const fetched = await getJson(baseUrl, "/api/v1/ai-suggestions/suggestion_canonical_1?canonical=true");
  assert.equal(fetched.status, 200, JSON.stringify(fetched.json));
  assert.equal(fetched.json.item.status, "confirmed");
  assert.equal(fetched.json.canonical.item.history[0].to_status, "adopted_as_draft");
  assert.equal(fetched.json.canonical.item.history[1].to_status, "edited");
  assert.equal(fetched.json.canonical.item.history[2].to_status, "confirmed");
  assert.equal(fetched.json.canonical.latest_review_event.event_type, "confirmed");
  assert.equal(fetched.json.canonical.review_events.length, 3);
  assert.equal(fetched.json.canonical.review_events[2].metadata.to_status, "confirmed");

  const rejectedRetarget = await patchJson(baseUrl, "/api/v1/ai-suggestions/suggestion_canonical_1?canonical=true", {
    status: "confirmed",
    action: "confirm",
    actor: "user",
    userId: "user_1",
    userConfirmed: true,
    targetId: "pn_2",
    targetField: "three_line_summary"
  });
  assert.equal(rejectedRetarget.status, 400, JSON.stringify(rejectedRetarget.json));
  assert.equal(rejectedRetarget.json.error.code, "AI_SUGGESTION_TARGET_IMMUTABLE");
});
