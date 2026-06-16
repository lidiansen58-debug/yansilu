import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createSqliteArtifactStore } from "../../packages/ai-orchestrator/src/index.mjs";

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

async function requestJson(baseUrl, pathname, options = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, options);
  const json = await res.json();
  return { status: res.status, json };
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

test("graph AI analysis persists repeat scans idempotently instead of duplicating inbox artifacts", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-graph-ai-analysis-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const body = {
    notes: [
      {
        id: "pn_graph_source",
        title: "Reviewable AI relation candidates",
        body: "# Reviewable AI relation candidates\n\n## One-line thesis\nAI relation candidates should remain reviewable suggestions.",
        thesis: "AI relation candidates should remain reviewable suggestions.",
        tags: ["ai-review"],
        folderId: "dir_original_default",
        updatedAt: "2026-06-17T00:00:00.000Z"
      },
      {
        id: "pn_graph_target",
        title: "Graph relation review boundary",
        body: "# Graph relation review boundary\n\n## One-line thesis\nGraph relation candidates need human review before becoming edges.",
        thesis: "Graph relation candidates need human review before becoming edges.",
        tags: ["ai-review"],
        folderId: "dir_original_default",
        updatedAt: "2026-06-17T00:00:00.000Z"
      },
      {
        id: "pn_graph_isolated",
        title: "Writing synthesis",
        body: "# Writing synthesis\n\n## One-line thesis\nWriting synthesis needs traceable note clusters.",
        thesis: "Writing synthesis needs traceable note clusters.",
        tags: ["writing"],
        folderId: "dir_original_default",
        updatedAt: "2026-06-17T00:00:00.000Z"
      }
    ],
    relations: [],
    focusNoteId: "pn_graph_source",
    currentNoteId: "pn_graph_source",
    minRelationConfidence: 0.05,
    relationLimit: 24,
    persistArtifacts: true
  };

  const first = await requestJson(baseUrl, "/api/v1/graph/ai-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  assert.equal(first.status, 200, JSON.stringify(first.json));
  assert.ok(first.json.item.reviewItems.storedArtifactIds.length > 0);

  const second = await requestJson(baseUrl, "/api/v1/graph/ai-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  assert.equal(second.status, 200, JSON.stringify(second.json));
  assert.deepEqual(second.json.item.reviewItems.storedArtifactIds, first.json.item.reviewItems.storedArtifactIds);

  const inbox = await requestJson(baseUrl, "/api/v1/ai/inbox?view=all&limit=50");
  assert.equal(inbox.status, 200, JSON.stringify(inbox.json));
  assert.equal(inbox.json.total, first.json.item.reviewItems.storedArtifactIds.length);
});

test("graph AI analysis can surface a new bridge review item after the old one was ignored and the note content changed", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-graph-ai-analysis-reopen-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const body = {
    notes: [
      {
        id: "pn_graph_source",
        title: "Reviewable AI relation candidates",
        body: "# Reviewable AI relation candidates\n\n## One-line thesis\nAI relation candidates should remain reviewable suggestions.",
        thesis: "AI relation candidates should remain reviewable suggestions.",
        tags: ["ai-review"],
        folderId: "dir_original_default",
        updatedAt: "2026-06-17T00:00:00.000Z"
      },
      {
        id: "pn_graph_target",
        title: "Graph relation review boundary",
        body: "# Graph relation review boundary\n\n## One-line thesis\nGraph relation candidates need human review before becoming edges.",
        thesis: "Graph relation candidates need human review before becoming edges.",
        tags: ["ai-review"],
        folderId: "dir_original_default",
        updatedAt: "2026-06-17T00:00:00.000Z"
      },
      {
        id: "pn_graph_isolated",
        title: "Writing synthesis",
        body: "# Writing synthesis\n\n## One-line thesis\nWriting synthesis needs traceable note clusters.",
        thesis: "Writing synthesis needs traceable note clusters.",
        tags: ["writing"],
        folderId: "dir_original_default",
        updatedAt: "2026-06-17T00:00:00.000Z"
      }
    ],
    relations: [],
    focusNoteId: "pn_graph_source",
    currentNoteId: "pn_graph_source",
    minRelationConfidence: 0.05,
    relationLimit: 24,
    persistArtifacts: true
  };

  const first = await requestJson(baseUrl, "/api/v1/graph/ai-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  assert.equal(first.status, 200, JSON.stringify(first.json));
  assert.ok(first.json.item.reviewItems.storedArtifactIds.length > 0);

  const artifactStore = await createSqliteArtifactStore({ vaultPath });
  t.after(() => artifactStore.close());

  const firstRelationArtifact = first.json.item.reviewItems.storedArtifactIds
    .map((artifactId) => artifactStore.getArtifact(artifactId))
    .find((artifact) => artifact && (artifact.type === "BridgeCard" || artifact.type === "LinkSuggestion"));
  assert.ok(firstRelationArtifact, "expected an initial relation-style graph artifact");
  artifactStore.recordDecision(firstRelationArtifact.id, {
    decision: "ignored",
    userId: "local_user",
    comment: "Ignore the first version of this bridge suggestion."
  });

  const unchanged = await requestJson(baseUrl, "/api/v1/graph/ai-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  assert.equal(unchanged.status, 200, JSON.stringify(unchanged.json));
  const relationArtifactsAfterUnchanged = artifactStore
    .listArtifacts({ limit: 20 })
    .filter((artifact) => artifact.type === "BridgeCard" || artifact.type === "LinkSuggestion");
  assert.equal(relationArtifactsAfterUnchanged.length, 1);
  assert.equal(artifactStore.getArtifact(firstRelationArtifact.id)?.status, "ignored");

  const changed = await requestJson(baseUrl, "/api/v1/graph/ai-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      notes: [
        {
          ...body.notes[0],
          body: "# Reviewable AI relation candidates\n\n## One-line thesis\nAI relation candidates should remain reviewable suggestions.\n\n## Three-line summary\nA later edit sharpens the bridge rationale for reconnecting this note into the graph.",
          thesis: "AI relation candidates should remain reviewable suggestions, and the later edit sharpens how this note should reconnect into the graph.",
          updatedAt: "2026-06-18T00:00:00.000Z"
        },
        body.notes[1],
        body.notes[2]
      ]
    })
  });
  assert.equal(changed.status, 200, JSON.stringify(changed.json));

  const relationArtifactsAfterChange = artifactStore
    .listArtifacts({ limit: 20 })
    .filter((artifact) => artifact.type === "BridgeCard" || artifact.type === "LinkSuggestion");
  assert.equal(relationArtifactsAfterChange.length, 2);
  const pendingArtifact = relationArtifactsAfterChange.find((artifact) => artifact.status === "pending_review");
  assert.ok(pendingArtifact, "expected a new pending relation-style artifact after the content changed");
  assert.notEqual(pendingArtifact.id, firstRelationArtifact.id);
});

test("graph AI analysis removes stale pending review artifacts when the current graph scope no longer needs them", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-graph-ai-analysis-prune-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const body = {
    notes: [
      {
        id: "pn_graph_source",
        title: "Reviewable AI relation candidates",
        body: "# Reviewable AI relation candidates\n\n## One-line thesis\nAI relation candidates should remain reviewable suggestions.",
        thesis: "AI relation candidates should remain reviewable suggestions.",
        tags: ["ai-review"],
        folderId: "dir_original_default",
        updatedAt: "2026-06-17T00:00:00.000Z"
      },
      {
        id: "pn_graph_target",
        title: "Graph relation review boundary",
        body: "# Graph relation review boundary\n\n## One-line thesis\nGraph relation candidates need human review before becoming edges.",
        thesis: "Graph relation candidates need human review before becoming edges.",
        tags: ["ai-review"],
        folderId: "dir_original_default",
        updatedAt: "2026-06-17T00:00:00.000Z"
      },
      {
        id: "pn_graph_isolated",
        title: "Writing synthesis",
        body: "# Writing synthesis\n\n## One-line thesis\nWriting synthesis needs traceable note clusters.",
        thesis: "Writing synthesis needs traceable note clusters.",
        tags: ["writing"],
        folderId: "dir_original_default",
        updatedAt: "2026-06-17T00:00:00.000Z"
      }
    ],
    relations: [],
    focusNoteId: "pn_graph_source",
    currentNoteId: "pn_graph_source",
    minRelationConfidence: 0.05,
    relationLimit: 24,
    persistArtifacts: true
  };

  const first = await requestJson(baseUrl, "/api/v1/graph/ai-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  assert.equal(first.status, 200, JSON.stringify(first.json));
  assert.ok(first.json.item.reviewItems.storedArtifactIds.length > 0);

  const artifactStore = await createSqliteArtifactStore({ vaultPath });
  t.after(() => artifactStore.close());

  const firstArtifactIds = [...first.json.item.reviewItems.storedArtifactIds];
  const second = await requestJson(baseUrl, "/api/v1/graph/ai-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      relations: [
        {
          id: "rel_existing",
          fromNoteId: "pn_graph_source",
          toNoteId: "pn_graph_target",
          relationType: "same_topic",
          status: "confirmed"
        }
      ]
    })
  });
  assert.equal(second.status, 200, JSON.stringify(second.json));
  assert.deepEqual(second.json.item.reviewItems.storedArtifactIds.sort(), [
    "artifact_isolated_note_graph_focus_pn_graph_source_pn_graph_isolated",
    "artifact_topic_candidate_graph_focus_pn_graph_source_graph_scan_ai_review"
  ]);

  const inbox = await requestJson(baseUrl, "/api/v1/ai/inbox?view=all&limit=50");
  assert.equal(inbox.status, 200, JSON.stringify(inbox.json));
  assert.equal(inbox.json.total, second.json.item.reviewItems.storedArtifactIds.length);

  const staleArtifactIds = firstArtifactIds.filter((artifactId) => !second.json.item.reviewItems.storedArtifactIds.includes(artifactId));
  assert.ok(staleArtifactIds.length > 0);
  for (const artifactId of staleArtifactIds) {
    assert.equal(artifactStore.getArtifact(artifactId), null, `expected stale graph artifact ${artifactId} to be removed`);
  }
});
