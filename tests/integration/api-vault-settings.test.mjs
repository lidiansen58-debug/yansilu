import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import net from "node:net";
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

async function startHealthProbeServer(status = 200) {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: status >= 200 && status < 300 }));
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false }));
  });
  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" ? address.port : 0;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => server.close()
  };
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

test("vault API initializes default vault and can switch active vault path", async (t) => {
  const defaultVaultPath = await makeTempDir("yansilu-default-vault-");
  const nextVaultPath = path.join(await makeTempDir("yansilu-selected-vault-parent-"), "selected-vault");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: defaultVaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const initial = await getJson(baseUrl, "/api/v1/vault");
  assert.equal(initial.status, 200, JSON.stringify(initial.json));
  assert.equal(path.resolve(initial.json.item.vaultPath), path.resolve(defaultVaultPath));
  assert.equal(initial.json.item.initialized, true);
  await fs.access(path.join(defaultVaultPath, ".yansilu", "vault.json"));

  const switched = await postJson(baseUrl, "/api/v1/vault", { vaultPath: nextVaultPath });
  assert.equal(switched.status, 200, JSON.stringify(switched.json));
  assert.equal(path.resolve(switched.json.item.vaultPath), path.resolve(nextVaultPath));
  assert.equal(switched.json.item.initialized, true);
  await fs.access(path.join(nextVaultPath, ".yansilu", "vault.json"));

  const health = await getJson(baseUrl, "/health");
  assert.equal(health.status, 200);
  assert.equal(path.resolve(health.json.vaultPath), path.resolve(nextVaultPath));

  const directories = await getJson(baseUrl, "/api/v1/directories");
  assert.equal(directories.status, 200);
  assert.ok(directories.json.items.some((item) => item.id === "dir_original_default"));
});

test("AI preferences API previews the effective model route", async (t) => {
  const vaultPath = await makeTempDir("yansilu-ai-route-preview-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const healthProbe = await startHealthProbeServer(200);

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
  t.after(() => healthProbe.close());
  await waitForHealth(baseUrl);

  const initial = await getJson(baseUrl, "/api/v1/ai/route-preview");
  assert.equal(initial.status, 200, JSON.stringify(initial.json));
  assert.equal(initial.json.item.userMode, "Auto");
  assert.equal(initial.json.item.provider.providerId, "platform_managed_openai");
  assert.equal(initial.json.item.access.keyMode, "platform_managed");
  assert.equal(initial.json.item.access.ready, true);

  const chinaPreview = await postJson(baseUrl, "/api/v1/ai/route-preview", {
    modelPack: "China Optimized",
    userMode: "Auto"
  });
  assert.equal(chinaPreview.status, 200, JSON.stringify(chinaPreview.json));
  assert.equal(chinaPreview.json.item.modelPack, "China Optimized");
  assert.equal(chinaPreview.json.item.provider.providerId, "china_optimized_gateway");
  assert.equal(chinaPreview.json.item.access.ready, false);
  assert.equal(chinaPreview.json.item.access.nextAction, "configure_workspace_key");

  const providerConfig = await postJson(baseUrl, "/api/v1/ai/provider-configs", {
    providerId: "china_optimized_gateway",
    authMode: "workspace_managed",
    secretRef: "secret_china_gateway",
    endpointUrl: "https://china-gateway.example.test/v1/chat/completions"
  });
  assert.equal(providerConfig.status, 200, JSON.stringify(providerConfig.json));
  assert.equal(providerConfig.json.item.secretRef, "secret_china_gateway");

  const providerConfigs = await getJson(baseUrl, "/api/v1/ai/provider-configs");
  assert.equal(providerConfigs.status, 200, JSON.stringify(providerConfigs.json));
  assert.equal(providerConfigs.json.total, 1);
  assert.equal(providerConfigs.json.items[0].providerId, "china_optimized_gateway");

  const configuredFromProviderConfig = await postJson(baseUrl, "/api/v1/ai/route-preview", {
    modelPack: "China Optimized",
    userMode: "Auto"
  });
  assert.equal(configuredFromProviderConfig.status, 200, JSON.stringify(configuredFromProviderConfig.json));
  assert.equal(configuredFromProviderConfig.json.item.provider.providerId, "china_optimized_gateway");
  assert.equal(configuredFromProviderConfig.json.item.access.ready, true);
  assert.equal(configuredFromProviderConfig.json.item.access.secretRefConfigured, true);

  const configuredGateway = await postJson(baseUrl, "/api/v1/ai/route-preview", {
    modelPack: "China Optimized",
    userMode: "Auto",
    secretRef: "secret_china_gateway"
  });
  assert.equal(configuredGateway.status, 200, JSON.stringify(configuredGateway.json));
  assert.equal(configuredGateway.json.item.access.ready, true);
  assert.equal(configuredGateway.json.item.access.secretRefConfigured, true);

  const savedGateway = await postJson(baseUrl, "/api/v1/ai/preferences", {
    userMode: "Auto",
    modelPack: "China Optimized",
    advancedSettings: { secretRef: "secret_china_gateway" }
  });
  assert.equal(savedGateway.status, 200, JSON.stringify(savedGateway.json));

  const storedGatewayPreview = await postJson(baseUrl, "/api/v1/ai/route-preview", {});
  assert.equal(storedGatewayPreview.status, 200, JSON.stringify(storedGatewayPreview.json));
  assert.equal(storedGatewayPreview.json.item.provider.providerId, "china_optimized_gateway");
  assert.equal(storedGatewayPreview.json.item.access.ready, true);
  assert.equal(storedGatewayPreview.json.item.access.secretRefConfigured, true);

  const localProviderConfig = await postJson(baseUrl, "/api/v1/ai/provider-configs", {
    providerId: "local_private_gateway",
    authMode: "local_no_key",
    endpointUrl: `${healthProbe.baseUrl}/v1/chat/completions`,
    healthCheck: {
      enabled: true,
      endpointUrl: `${healthProbe.baseUrl}/health`,
      method: "GET",
      timeoutMs: 1000,
      expectedStatus: 200,
      intervalSeconds: 30
    }
  });
  assert.equal(localProviderConfig.status, 200, JSON.stringify(localProviderConfig.json));

  const localHealth = await postJson(baseUrl, "/api/v1/ai/provider-configs/local_private_gateway/health-check", {
    networkEnabled: true
  });
  assert.equal(localHealth.status, 200, JSON.stringify(localHealth.json));
  assert.equal(localHealth.json.item.status, "succeeded");
  assert.equal(localHealth.json.item.record.status, "healthy");
  assert.equal(localHealth.json.item.record.payload.endpointUrl, `${healthProbe.baseUrl}/health`);

  const localHealthPreview = await postJson(baseUrl, "/api/v1/ai/route-preview", {
    userMode: "Local / Private",
    modelPack: "Privacy First"
  });
  assert.equal(localHealthPreview.status, 200, JSON.stringify(localHealthPreview.json));
  assert.equal(localHealthPreview.json.item.provider.providerId, "local_private_gateway");
  assert.equal(localHealthPreview.json.item.health.status, "healthy");

  const saved = await postJson(baseUrl, "/api/v1/ai/preferences", {
    userMode: "Local / Private",
    modelPack: "Privacy First",
    advancedSettings: { modelRef: "local_private_gateway:manual-model" }
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.json));

  const preview = await postJson(baseUrl, "/api/v1/ai/route-preview", {});
  assert.equal(preview.status, 200, JSON.stringify(preview.json));
  assert.equal(preview.json.item.userMode, "Local / Private");
  assert.equal(preview.json.item.provider.providerId, "local_private_gateway");
  assert.equal(preview.json.item.route.modelRef, "local_private_gateway:manual-model");
  assert.equal(preview.json.item.route.advancedOverride, true);
  assert.equal(preview.json.item.route.localOnly, true);
  assert.equal(preview.json.item.access.keyMode, "no_key");
  assert.equal(preview.json.item.access.ready, true);
});

test("AI scheduled task API manages tasks and runs due scoped tasks", async (t) => {
  const vaultPath = await makeTempDir("yansilu-ai-scheduled-task-vault-");
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

  const templates = await getJson(baseUrl, "/api/v1/ai/scheduled-task-templates?implementationReady=true");
  assert.equal(templates.status, 200, JSON.stringify(templates.json));
  assert.ok(templates.json.items.some((item) => item.templateId === "reflection_reminder"));

  const note = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Scheduled reflection seed\n\nBridge concept notes need periodic reflection prompts."
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

  const created = await postJson(baseUrl, "/api/v1/ai/scheduled-tasks", {
    templateId: "reflection_reminder",
    scheduledTaskId: "sched_api_reflection",
    name: "API reflection reminder",
    status: "active",
    schedule: { type: "interval", intervalMinutes: 30 },
    budget: { maxRunsPerPeriod: 3, maxEstimatedCostPerRun: 0.35, maxEstimatedCostPerPeriod: 2, period: "week" },
    scope: { noteIds: [note.json.item.id] },
    nextRunAt: "2026-05-11T08:00:00.000Z"
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  assert.equal(created.json.item.scheduledTaskId, "sched_api_reflection");
  assert.deepEqual(created.json.item.scope.noteIds, [note.json.item.id]);

  const listed = await getJson(baseUrl, "/api/v1/ai/scheduled-tasks");
  assert.equal(listed.status, 200, JSON.stringify(listed.json));
  assert.equal(listed.json.total, 1);

  const paused = await postJson(baseUrl, "/api/v1/ai/scheduled-tasks/sched_api_reflection/status", { status: "paused" });
  assert.equal(paused.status, 200, JSON.stringify(paused.json));
  assert.equal(paused.json.item.status, "paused");

  const activated = await postJson(baseUrl, "/api/v1/ai/scheduled-tasks/sched_api_reflection/status", { status: "active" });
  assert.equal(activated.status, 200, JSON.stringify(activated.json));
  assert.equal(activated.json.item.status, "active");

  const due = await postJson(baseUrl, "/api/v1/ai/scheduled-tasks/run-due", {
    now: "2026-05-11T09:00:00.000Z"
  });
  assert.equal(due.status, 200, JSON.stringify(due.json));
  assert.equal(due.json.item.total, 1);
  assert.equal(due.json.item.succeeded, 1);
  assert.equal(due.json.item.runs[0].result.run.status, "succeeded");
  assert.equal(due.json.item.runs[0].result.contextPack.items[0].sourceId, note.json.item.id);
  const firstArtifactId = due.json.item.runs[0].result.artifacts[0].id;
  assert.ok(firstArtifactId);

  const fetched = await getJson(baseUrl, "/api/v1/ai/scheduled-tasks/sched_api_reflection");
  assert.equal(fetched.status, 200, JSON.stringify(fetched.json));
  assert.equal(fetched.json.item.lastRunStatus, "succeeded");
  assert.equal(fetched.json.item.lastRunAt, "2026-05-11T09:00:00.000Z");

  const pendingInbox = await getJson(baseUrl, `/api/v1/ai/inbox?view=pending&sourceNoteId=${encodeURIComponent(note.json.item.id)}`);
  assert.equal(pendingInbox.status, 200, JSON.stringify(pendingInbox.json));
  assert.equal(pendingInbox.json.total, 1);
  assert.equal(pendingInbox.json.items[0].artifactId, firstArtifactId);
  assert.equal(pendingInbox.json.items[0].primarySourceNoteId, note.json.item.id);
  assert.equal(pendingInbox.json.counts.pending, 1);

  const detail = await getJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(firstArtifactId)}`);
  assert.equal(detail.status, 200, JSON.stringify(detail.json));
  assert.equal(detail.json.item.artifactId, firstArtifactId);
  assert.equal(detail.json.artifact.sources.noteIds[0], note.json.item.id);
  assert.equal(detail.json.artifact.status, "pending_review");

  const accepted = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(firstArtifactId)}/decision`, {
    action: "accept",
    noteId: note.json.item.id,
    comment: "Useful scheduled reflection prompt.",
    feedback: {
      useful: true
    }
  });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.json));
  assert.equal(accepted.json.item.status, "accepted");
  assert.equal(accepted.json.latestDecision.decision, "accepted");
  assert.equal(accepted.json.latestDecision.feedback.useful, true);
  assert.equal(accepted.json.artifact.provenance.humanAccepted, true);

  const reviewedInbox = await getJson(baseUrl, `/api/v1/ai/inbox?view=reviewed&sourceNoteId=${encodeURIComponent(note.json.item.id)}`);
  assert.equal(reviewedInbox.status, 200, JSON.stringify(reviewedInbox.json));
  assert.equal(reviewedInbox.json.total, 1);
  assert.equal(reviewedInbox.json.items[0].latestDecision.comment, "Useful scheduled reflection prompt.");

  const dueForIgnore = await postJson(baseUrl, "/api/v1/ai/scheduled-tasks/run-due", {
    now: "2026-05-11T10:00:00.000Z"
  });
  assert.equal(dueForIgnore.status, 200, JSON.stringify(dueForIgnore.json));
  const ignoredArtifactId = dueForIgnore.json.item.runs[0].result.artifacts[0].id;
  const ignored = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(ignoredArtifactId)}/decision`, {
    action: "ignore",
    noisy: true,
    already_known: true
  });
  assert.equal(ignored.status, 200, JSON.stringify(ignored.json));
  assert.equal(ignored.json.item.status, "ignored");
  assert.equal(ignored.json.latestDecision.feedback.noisy, true);
  assert.equal(ignored.json.latestDecision.feedback.alreadyKnown, true);

  const dueForArchive = await postJson(baseUrl, "/api/v1/ai/scheduled-tasks/run-due", {
    now: "2026-05-11T10:30:00.000Z"
  });
  assert.equal(dueForArchive.status, 200, JSON.stringify(dueForArchive.json));
  const archivedArtifactId = dueForArchive.json.item.runs[0].result.artifacts[0].id;
  const archived = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(archivedArtifactId)}/decision`, { action: "archive" });
  assert.equal(archived.status, 200, JSON.stringify(archived.json));
  assert.equal(archived.json.item.status, "archived");

  const archivedInbox = await getJson(baseUrl, "/api/v1/ai/inbox?view=archived");
  assert.equal(archivedInbox.status, 200, JSON.stringify(archivedInbox.json));
  assert.ok(archivedInbox.json.items.some((item) => item.artifactId === archivedArtifactId));

  const evaluationSummary = await getJson(baseUrl, `/api/v1/ai/inbox/evaluation-summary?sourceNoteId=${encodeURIComponent(note.json.item.id)}`);
  assert.equal(evaluationSummary.status, 200, JSON.stringify(evaluationSummary.json));
  assert.equal(evaluationSummary.json.item.filter.view, "all");
  assert.equal(evaluationSummary.json.item.artifacts.total, 3);
  assert.equal(evaluationSummary.json.item.artifacts.reviewed, 2);
  assert.equal(evaluationSummary.json.item.artifacts.archived, 1);
  assert.equal(evaluationSummary.json.item.decisions.total, 3);
  assert.equal(evaluationSummary.json.item.decisions.latest.accepted, 1);
  assert.equal(evaluationSummary.json.item.decisions.latest.ignored, 1);
  assert.equal(evaluationSummary.json.item.decisions.latest.archived, 1);
  assert.equal(evaluationSummary.json.item.agentRunCounts[due.json.item.runs[0].result.run.agentRunId], 1);
  assert.equal(evaluationSummary.json.item.agentRunCounts[dueForIgnore.json.item.runs[0].result.run.agentRunId], 1);
  assert.equal(evaluationSummary.json.item.agentRunCounts[dueForArchive.json.item.runs[0].result.run.agentRunId], 1);
  assert.equal(evaluationSummary.json.item.feedback.all.useful, 1);
  assert.equal(evaluationSummary.json.item.feedback.all.noisy, 1);
  assert.equal(evaluationSummary.json.item.feedback.all.alreadyKnown, 1);
});

test("AI inbox accepts LinkSuggestion artifacts into explicit note relations", async (t) => {
  const vaultPath = await makeTempDir("yansilu-ai-link-acceptance-vault-");
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

  const first = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Bridge concept alpha\n\nThis note uses the bridge concept for relation discovery."
  });
  assert.equal(first.status, 201, JSON.stringify(first.json));

  const second = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Bridge concept beta\n\nThis note uses the bridge concept from another angle."
  });
  assert.equal(second.status, 201, JSON.stringify(second.json));

  const created = await postJson(baseUrl, "/api/v1/ai/scheduled-tasks", {
    templateId: "weekly_link_suggestions",
    scheduledTaskId: "sched_api_link_suggestion",
    name: "API link suggestion",
    status: "active",
    schedule: { type: "interval", intervalMinutes: 30 },
    scope: { keywords: ["bridge concept"] },
    nextRunAt: "2026-05-11T08:00:00.000Z"
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  assert.equal(created.json.item.output.artifactTypes[0], "LinkSuggestion");

  const due = await postJson(baseUrl, "/api/v1/ai/scheduled-tasks/run-due", {
    now: "2026-05-11T09:00:00.000Z"
  });
  assert.equal(due.status, 200, JSON.stringify(due.json));
  assert.equal(due.json.item.succeeded, 1);
  const artifact = due.json.item.runs[0].result.artifacts[0];
  assert.equal(artifact.type, "LinkSuggestion");
  assert.ok([first.json.item.id, second.json.item.id].includes(artifact.payload.from.id));
  assert.ok([first.json.item.id, second.json.item.id].includes(artifact.payload.to.id));

  const missingConfirmation = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}/accept-link`, {});
  assert.equal(missingConfirmation.status, 400, JSON.stringify(missingConfirmation.json));
  assert.equal(missingConfirmation.json.error.code, "AI_LINK_SUGGESTION_CONFIRMATION_REQUIRED");

  const blockedGenericPromotion = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}/decision`, {
    status: "linked_to_note"
  });
  assert.equal(blockedGenericPromotion.status, 400, JSON.stringify(blockedGenericPromotion.json));
  assert.equal(blockedGenericPromotion.json.error.code, "AI_ARTIFACT_DECISION_INVALID");

  const accepted = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}/accept-link`, {
    confirm: true,
    comment: "This is a useful bridge."
  });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.json));
  assert.equal(accepted.json.item.status, "linked_to_note");
  assert.equal(accepted.json.latestDecision.decision, "linked_to_note");
  assert.equal(accepted.json.relation.created, true);
  assert.equal(accepted.json.relation.relationType, "related");
  assert.deepEqual([accepted.json.relation.fromNoteId, accepted.json.relation.toNoteId].sort(), [first.json.item.id, second.json.item.id].sort());

  const sourceRelations = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(accepted.json.relation.fromNoteId)}/relations`);
  assert.equal(sourceRelations.status, 200, JSON.stringify(sourceRelations.json));
  assert.ok(sourceRelations.json.item.outgoingLinks.some((link) => link.id === accepted.json.relation.id));

  const acceptedAgain = await postJson(baseUrl, `/api/v1/ai/inbox/${encodeURIComponent(artifact.id)}/accept-link`, {
    confirm: true
  });
  assert.equal(acceptedAgain.status, 200, JSON.stringify(acceptedAgain.json));
  assert.equal(acceptedAgain.json.relation.created, false);
  assert.equal(acceptedAgain.json.relation.id, accepted.json.relation.id);

  const artifactStore = await createSqliteArtifactStore({ vaultPath });
  artifactStore.createArtifact({
    id: "artifact_non_note_link",
    type: "LinkSuggestion",
    title: "Non-note endpoint link",
    agentRunId: "run_manual_non_note_link",
    sources: { noteIds: [first.json.item.id, second.json.item.id], sourceDocIds: [], artifactIds: [], externalUrls: [] },
    payload: {
      from: { kind: "source", id: "source_doc_1" },
      to: { kind: "note", id: second.json.item.id },
      relationType: "related"
    }
  });
  artifactStore.close();

  const blockedEndpointOverride = await postJson(baseUrl, "/api/v1/ai/inbox/artifact_non_note_link/accept-link", {
    confirm: true,
    fromNoteId: first.json.item.id,
    toNoteId: second.json.item.id
  });
  assert.equal(blockedEndpointOverride.status, 400, JSON.stringify(blockedEndpointOverride.json));
  assert.equal(blockedEndpointOverride.json.error.code, "AI_LINK_SUGGESTION_NOTE_ENDPOINT_REQUIRED");
});
