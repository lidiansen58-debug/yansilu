import { aiSuggestionFromCanonical } from "./ai-suggestions-model.js";

const API_BASE =
  (typeof window !== "undefined" &&
    typeof window.__API_BASE__ === "string" &&
    window.__API_BASE__.trim() &&
    window.__API_BASE__ !== "__API_BASE__" &&
    window.__API_BASE__.trim()) ||
  "http://localhost:3000";
const LOCAL_RUNTIME_CONTROL_HEADERS = { "X-Yansilu-Local-Runtime-Control": "1" };

async function request(pathname, options = {}) {
  const url = `${API_BASE}${pathname}`;
  const timeoutMs = Math.max(0, Number(options?.timeoutMs || 0) || 0);
  const externalSignal = options?.signal;
  const controller = timeoutMs > 0 ? new AbortController() : null;
  let timeoutId = null;
  const fetchOptions = { ...options };
  delete fetchOptions.timeoutMs;
  if (controller) {
    if (externalSignal?.aborted) controller.abort(externalSignal.reason);
    else if (externalSignal && typeof externalSignal.addEventListener === "function") {
      externalSignal.addEventListener("abort", () => controller.abort(externalSignal.reason), { once: true });
    }
    timeoutId = globalThis.setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    fetchOptions.signal = controller.signal;
  }
  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    if (timeoutId) globalThis.clearTimeout(timeoutId);
    if ((controller?.signal?.aborted || externalSignal?.aborted) && String(error?.name || "") === "AbortError") {
      const timeoutError = new Error(`Request timed out after ${timeoutMs}ms`);
      timeoutError.code = "request_timeout";
      timeoutError.timeoutMs = timeoutMs;
      throw timeoutError;
    }
    throw error;
  }
  if (timeoutId) globalThis.clearTimeout(timeoutId);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json?.error?.message || json?.message || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.code = json?.error?.code || null;
    error.details = json?.error?.details || null;
    error.response = json;
    throw error;
  }
  return json;
}

function canonicalQuery(options = {}) {
  return options?.canonical === true ? "canonical=true" : "";
}

function withCanonical(result, json, options = {}) {
  if (options?.canonical !== true) return result;
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return {
      ...result,
      canonical: json?.canonical || null
    };
  }
  return {
    item: result,
    canonical: json?.canonical || null
  };
}

export async function fetchDirectories(includeHidden = false) {
  const query = includeHidden ? "?includeHidden=true" : "";
  const json = await request(`/api/v1/directories${query}`);
  return Array.isArray(json.items) ? json.items : [];
}

export async function fetchVaultInfo() {
  const json = await request("/api/v1/vault");
  return json.item || null;
}

export async function fetchAiPreferences() {
  const json = await request("/api/v1/ai/preferences");
  return json.item || null;
}

export async function saveAiPreferences(payload) {
  const json = await request("/api/v1/ai/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function fetchAiProviderConfigs() {
  const json = await request("/api/v1/ai/provider-configs");
  return Array.isArray(json.items) ? json.items : [];
}

export async function fetchOllamaModels() {
  const json = await request("/api/v1/ai/local-runtimes/ollama/models");
  return json.item || null;
}

export async function fetchOllamaBootstrapStatus(options = {}) {
  const params = new URLSearchParams();
  const model = String(options?.model || options?.modelName || "").trim();
  const runtimeMode = String(options?.runtimeMode || options?.runtime_mode || "").trim();
  if (model) params.set("model", model);
  if (runtimeMode) params.set("runtimeMode", runtimeMode);
  const suffix = params.toString();
  const json = await request(`/api/v1/ai/local-runtimes/ollama/bootstrap${suffix ? `?${suffix}` : ""}`);
  return json.item || null;
}

export async function bootstrapOllamaLocalAi(options = {}) {
  const json = await request("/api/v1/ai/local-runtimes/ollama/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...LOCAL_RUNTIME_CONTROL_HEADERS },
    body: JSON.stringify(options || {})
  });
  return json.item || null;
}

export async function startOllamaRuntime() {
  const json = await request("/api/v1/ai/local-runtimes/ollama/start", {
    method: "POST",
    headers: LOCAL_RUNTIME_CONTROL_HEADERS
  });
  return json.item || null;
}

export async function stopOllamaRuntime() {
  const json = await request("/api/v1/ai/local-runtimes/ollama/stop", {
    method: "POST",
    headers: LOCAL_RUNTIME_CONTROL_HEADERS
  });
  return json.item || null;
}

export async function pullOllamaModel(model, options = {}) {
  const json = await request("/api/v1/ai/local-runtimes/ollama/pull-model", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...LOCAL_RUNTIME_CONTROL_HEADERS },
    body: JSON.stringify({
      model: String(model || "").trim(),
      ...(options?.enable === true || options?.enableLocal === true ? { enable: true } : {}),
      ...(options?.runtimeMode ? { runtimeMode: String(options.runtimeMode).trim() } : {})
    })
  });
  return json.item || null;
}

export async function saveAiProviderConfig(payload = {}) {
  const json = await request("/api/v1/ai/provider-configs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function checkAiProviderHealth(providerId, payload = {}) {
  const cleanProviderId = String(providerId || "").trim();
  if (!cleanProviderId) throw new Error("providerId is required");
  const json = await request(`/api/v1/ai/provider-configs/${encodeURIComponent(cleanProviderId)}/health-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function previewAiRoute(payload = {}) {
  const json = await request("/api/v1/ai/route-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function runAiTestChat(payload = {}) {
  const json = await request("/api/v1/ai/test-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function fetchAiInbox(options = {}) {
  const params = new URLSearchParams();
  const view = String(options?.view || "pending").trim();
  const type = String(options?.type || "").trim();
  const sourceNoteId = String(options?.sourceNoteId || "").trim();
  const privacyMode = String(options?.privacyMode || "").trim();
  const limit = Math.max(1, Math.min(100, Number(options?.limit || 50) || 50));
  if (view) params.set("view", view);
  if (type && type !== "all") params.set("type", type);
  if (sourceNoteId) params.set("sourceNoteId", sourceNoteId);
  if (privacyMode) params.set("privacyMode", privacyMode);
  if (options?.canonical === true) params.set("canonical", "true");
  params.set("limit", String(limit));
  const json = await request(`/api/v1/ai/inbox?${params.toString()}`);
  return withCanonical({
    items: Array.isArray(json.items) ? json.items : [],
    total: Number(json.total || 0),
    counts: json.counts || {},
    views: Array.isArray(json.views) ? json.views : []
  }, json, options);
}

export async function fetchAiInboxEvaluationSummary(options = {}) {
  const params = new URLSearchParams();
  const view = String(options?.view || "all").trim();
  const type = String(options?.type || "").trim();
  const sourceNoteId = String(options?.sourceNoteId || "").trim();
  const privacyMode = String(options?.privacyMode || "").trim();
  if (view) params.set("view", view);
  if (type && type !== "all") params.set("type", type);
  if (sourceNoteId) params.set("sourceNoteId", sourceNoteId);
  if (privacyMode) params.set("privacyMode", privacyMode);
  const json = await request(`/api/v1/ai/inbox/evaluation-summary?${params.toString()}`);
  return json.item || null;
}

export async function fetchAiSuggestions(options = {}) {
  const params = new URLSearchParams();
  const status = String(options?.status || "").trim();
  const targetType = String(options?.targetType || options?.target_type || "").trim();
  const targetId = String(options?.targetId || options?.target_id || "").trim();
  const sourceArtifactId = String(options?.sourceArtifactId || options?.source_artifact_id || "").trim();
  const scope = String(options?.scope || "").trim();
  const limit = Math.max(1, Math.min(100, Number(options?.limit || 50) || 50));
  if (status && status !== "all") params.set("status", status);
  if (targetType) params.set("targetType", targetType);
  if (targetId) params.set("targetId", targetId);
  if (sourceArtifactId) params.set("sourceArtifactId", sourceArtifactId);
  if (scope) params.set("scope", scope);
  if (options?.canonical === true) params.set("canonical", "true");
  params.set("limit", String(limit));
  const json = await request(`/api/v1/ai-suggestions?${params.toString()}`);
  return withCanonical({
    items:
      options?.canonical === true && Array.isArray(json?.canonical?.items)
        ? json.canonical.items.map((item) => aiSuggestionFromCanonical(item))
        : Array.isArray(json.items)
          ? json.items
          : [],
    total: Number(json.total || 0)
  }, json, options);
}

export async function createAiSuggestion(payload = {}) {
  const suffix = canonicalQuery(payload);
  const json = await request(`/api/v1/ai-suggestions${suffix ? `?${suffix}` : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  const item = payload?.canonical === true && json?.canonical?.item ? aiSuggestionFromCanonical(json.canonical.item) : json.item || null;
  return withCanonical(item, json, payload);
}

export async function fetchAiSuggestion(suggestionId, options = {}) {
  const cleanSuggestionId = String(suggestionId || "").trim();
  if (!cleanSuggestionId) throw new Error("suggestionId is required");
  const suffix = canonicalQuery(options);
  const json = await request(`/api/v1/ai-suggestions/${encodeURIComponent(cleanSuggestionId)}${suffix ? `?${suffix}` : ""}`);
  const item = options?.canonical === true && json?.canonical?.item ? aiSuggestionFromCanonical(json.canonical.item) : json.item || null;
  return withCanonical(item, json, options);
}

export async function updateAiSuggestion(suggestionId, payload = {}) {
  const cleanSuggestionId = String(suggestionId || "").trim();
  if (!cleanSuggestionId) throw new Error("suggestionId is required");
  const suffix = canonicalQuery(payload);
  const json = await request(`/api/v1/ai-suggestions/${encodeURIComponent(cleanSuggestionId)}${suffix ? `?${suffix}` : ""}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  const item = payload?.canonical === true && json?.canonical?.item ? aiSuggestionFromCanonical(json.canonical.item) : json.item || null;
  return withCanonical(item, json, payload);
}

export async function fetchAiInboxItem(artifactId) {
  return fetchAiInboxItemWithOptions(artifactId, {});
}

export async function fetchAiInboxItemWithOptions(artifactId, options = {}) {
  const cleanArtifactId = String(artifactId || "").trim();
  if (!cleanArtifactId) throw new Error("artifactId is required");
  const suffix = canonicalQuery(options);
  const json = await request(`/api/v1/ai/inbox/${encodeURIComponent(cleanArtifactId)}${suffix ? `?${suffix}` : ""}`);
  return withCanonical(json, json, options);
}

export async function recordAiInboxDecision(artifactId, payload = {}) {
  const cleanArtifactId = String(artifactId || "").trim();
  if (!cleanArtifactId) throw new Error("artifactId is required");
  const suffix = canonicalQuery(payload);
  const json = await request(`/api/v1/ai/inbox/${encodeURIComponent(cleanArtifactId)}/decision${suffix ? `?${suffix}` : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return withCanonical(json, json, payload);
}

export async function acceptAiInboxLink(artifactId, payload = {}) {
  const cleanArtifactId = String(artifactId || "").trim();
  if (!cleanArtifactId) throw new Error("artifactId is required");
  const suffix = canonicalQuery(payload);
  const json = await request(`/api/v1/ai/inbox/${encodeURIComponent(cleanArtifactId)}/accept-link${suffix ? `?${suffix}` : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(payload || {}),
      confirm: true
    })
  });
  return withCanonical(json, json, payload);
}

export async function promoteAiInboxNote(artifactId, payload = {}) {
  const cleanArtifactId = String(artifactId || "").trim();
  if (!cleanArtifactId) throw new Error("artifactId is required");
  const suffix = canonicalQuery(payload);
  const json = await request(`/api/v1/ai/inbox/${encodeURIComponent(cleanArtifactId)}/promote-note${suffix ? `?${suffix}` : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(payload || {}),
      confirm: true
    })
  });
  return withCanonical(json, json, payload);
}

export async function adoptAiInboxFieldSuggestion(artifactId, payload = {}) {
  const cleanArtifactId = String(artifactId || "").trim();
  if (!cleanArtifactId) throw new Error("artifactId is required");
  const suffix = canonicalQuery(payload);
  const json = await request(`/api/v1/ai/inbox/${encodeURIComponent(cleanArtifactId)}/adopt-field-suggestion${suffix ? `?${suffix}` : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(payload || {}),
      confirm: true
    })
  });
  return withCanonical(json, json, payload);
}

export async function summarizeAiInboxItem(artifactId, payload = {}) {
  const cleanArtifactId = String(artifactId || "").trim();
  if (!cleanArtifactId) throw new Error("artifactId is required");
  const json = await request(`/api/v1/ai/inbox/${encodeURIComponent(cleanArtifactId)}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function analyzeWritingWithStrongModel(payload = {}) {
  const json = await request("/api/v1/writing/ai-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function analyzePermanentNote(noteId, payload = {}) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) throw new Error("noteId is required");
  const json = await request(`/api/v1/notes/${encodeURIComponent(cleanNoteId)}/ai-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function fetchDistillationQueue(options = {}) {
  const params = new URLSearchParams();
  const targetType = String(options?.targetType || "permanent_note").trim();
  const status = String(options?.status || "").trim();
  const limit = Math.max(1, Math.min(100, Number(options?.limit || 50) || 50));
  if (targetType) params.set("targetType", targetType);
  if (status && status !== "all") params.set("status", status);
  params.set("limit", String(limit));
  const json = await request(`/api/v1/distillation/queue?${params.toString()}`);
  return {
    items: Array.isArray(json.items) ? json.items : [],
    total: Number(json.total || 0)
  };
}

export async function updatePermanentNoteDistillation(noteId, payload = {}) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) throw new Error("noteId is required");
  const json = await request(`/api/v1/permanent-notes/${encodeURIComponent(cleanNoteId)}/distillation`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function confirmPermanentNoteDistillation(noteId, payload = {}) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) throw new Error("noteId is required");
  const json = await request(`/api/v1/permanent-notes/${encodeURIComponent(cleanNoteId)}/distillation/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(payload || {}),
      confirm: true
    })
  });
  return json.item || null;
}

export async function fetchPermanentNoteAnalysis(noteId, options = {}) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) throw new Error("noteId is required");
  const params = new URLSearchParams();
  const view = String(options?.view || "all").trim();
  const limit = Math.max(1, Math.min(100, Number(options?.limit || 100) || 100));
  if (view) params.set("view", view);
  params.set("limit", String(limit));
  const query = params.toString();
  const json = await request(`/api/v1/notes/${encodeURIComponent(cleanNoteId)}/ai-analysis${query ? `?${query}` : ""}`);
  return json.item || null;
}

export async function fetchAiScheduledTasks(options = {}) {
  const params = new URLSearchParams();
  const status = String(options?.status || "").trim();
  const taskType = String(options?.taskType || options?.task_type || "").trim();
  const limit = Math.max(1, Math.min(100, Number(options?.limit || 50) || 50));
  if (status && status !== "all") params.set("status", status);
  if (taskType && taskType !== "all") params.set("taskType", taskType);
  if (options?.canonical === true) params.set("canonical", "true");
  params.set("limit", String(limit));
  const json = await request(`/api/v1/ai/scheduled-tasks?${params.toString()}`);
  return withCanonical({
    items: Array.isArray(json.items) ? json.items : [],
    total: Number(json.total || 0)
  }, json, options);
}

export async function fetchAiScheduledTaskTemplates(options = {}) {
  const params = new URLSearchParams();
  if (options?.implementationReady !== undefined) {
    params.set("implementationReady", options.implementationReady === false ? "false" : "true");
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const json = await request(`/api/v1/ai/scheduled-task-templates${suffix}`);
  return {
    items: Array.isArray(json.items) ? json.items : [],
    total: Number(json.total || 0)
  };
}

export async function saveAiScheduledTask(payload = {}) {
  const suffix = canonicalQuery(payload);
  const json = await request(`/api/v1/ai/scheduled-tasks${suffix ? `?${suffix}` : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return withCanonical(json.item || null, json, payload);
}

export async function updateAiScheduledTaskStatus(scheduledTaskId, status) {
  return updateAiScheduledTaskStatusWithOptions(scheduledTaskId, status, {});
}

export async function updateAiScheduledTaskStatusWithOptions(scheduledTaskId, status, options = {}) {
  const cleanScheduledTaskId = String(scheduledTaskId || "").trim();
  const cleanStatus = String(status || "").trim();
  if (!cleanScheduledTaskId) throw new Error("scheduledTaskId is required");
  if (!cleanStatus) throw new Error("status is required");
  const suffix = canonicalQuery(options);
  const json = await request(`/api/v1/ai/scheduled-tasks/${encodeURIComponent(cleanScheduledTaskId)}/status${suffix ? `?${suffix}` : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: cleanStatus })
  });
  return withCanonical(json.item || null, json, options);
}

export async function deleteAiScheduledTask(scheduledTaskId) {
  const cleanScheduledTaskId = String(scheduledTaskId || "").trim();
  if (!cleanScheduledTaskId) throw new Error("scheduledTaskId is required");
  return request(`/api/v1/ai/scheduled-tasks/${encodeURIComponent(cleanScheduledTaskId)}`, {
    method: "DELETE"
  });
}

export async function runDueAiScheduledTasks(payload = {}) {
  const body = { ...(payload || {}) };
  if (body.limit !== undefined) body.limit = Math.max(1, Math.min(100, Number(body.limit || 10) || 10));
  const json = await request("/api/v1/ai/scheduled-tasks/run-due", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return json.item || null;
}

export async function switchVault(vaultPath) {
  const cleanVaultPath = String(vaultPath || "").trim();
  if (!cleanVaultPath) throw new Error("vaultPath is required");
  const json = await request("/api/v1/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vaultPath: cleanVaultPath })
  });
  return json.item || null;
}

export async function createDirectory(payload) {
  const json = await request("/api/v1/directories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function updateDirectory(directoryId, payload) {
  if (!directoryId) throw new Error("directoryId is required");
  const json = await request(`/api/v1/directories/${encodeURIComponent(directoryId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function deleteDirectory(directoryId) {
  if (!directoryId) throw new Error("directoryId is required");
  return request(`/api/v1/directories/${encodeURIComponent(directoryId)}`, { method: "DELETE" });
}

export async function fetchDirectoryNotes(directoryId) {
  if (!directoryId) return [];
  const json = await request(`/api/v1/directories/${encodeURIComponent(directoryId)}/notes`);
  return Array.isArray(json.items) ? json.items : [];
}

export async function fetchDirectoryGraph(directoryId, options = {}) {
  if (!directoryId) return null;
  const params = new URLSearchParams({
    scope: "directory",
    directoryId,
    includeDescendants: options.includeDescendants ? "true" : "false"
  });
  const json = await request(`/api/v1/graph?${params.toString()}`, {
    timeoutMs: options.timeoutMs
  });
  return json.item || null;
}

export async function analyzeDirectoryGraph(directoryId, payload = {}) {
  const cleanDirectoryId = String(directoryId || "").trim();
  if (!cleanDirectoryId) throw new Error("directoryId is required");
  const json = await request("/api/v1/graph/ai-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(payload || {}),
      directoryId: cleanDirectoryId
    })
  });
  return json.item || null;
}

export async function refinePotentialRelationCandidate(payload = {}) {
  const json = await request("/api/v1/graph/potential-relations/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
    timeoutMs: payload?.timeoutMs ?? payload?.timeout_ms
  });
  return json.item || null;
}

export async function fetchGraphPath({ fromNoteId, toNoteId, directoryId = "", maxDepth = 4, direction = "outgoing" } = {}) {
  if (!fromNoteId) throw new Error("fromNoteId is required");
  if (!toNoteId) throw new Error("toNoteId is required");
  const params = new URLSearchParams({
    fromNoteId,
    toNoteId,
    maxDepth: String(maxDepth || 4),
    direction: direction || "outgoing"
  });
  if (directoryId) params.set("directoryId", directoryId);
  const json = await request(`/api/v1/graph/path?${params.toString()}`);
  return json.item || null;
}

export async function fetchGraphConflicts({ directoryId, includeDescendants = true } = {}) {
  if (!directoryId) throw new Error("directoryId is required");
  const params = new URLSearchParams({
    directoryId,
    includeDescendants: includeDescendants ? "true" : "false"
  });
  const json = await request(`/api/v1/graph/conflicts?${params.toString()}`, {
    timeoutMs: 12000
  });
  return json.item || null;
}

export async function fetchRelationReviewQueue({
  directoryId,
  includeDescendants = false,
  qualityLevels = ["empty", "basic"],
  relationType = "all",
  status = "all",
  limit = 20
} = {}) {
  if (!directoryId) throw new Error("directoryId is required");
  const levels = Array.isArray(qualityLevels) ? qualityLevels.filter(Boolean).join(",") : String(qualityLevels || "");
  const params = new URLSearchParams({
    directoryId,
    includeDescendants: includeDescendants ? "true" : "false",
    qualityLevels: levels || "empty,basic",
    relationType: relationType || "all",
    status: status || "all",
    limit: String(Math.max(1, Math.min(100, Number(limit || 20) || 20)))
  });
  const json = await request(`/api/v1/relations/review-queue?${params.toString()}`, {
    timeoutMs: 12000
  });
  return {
    directoryId: json.directoryId || directoryId,
    directoryTitle: json.directoryTitle || "",
    includeDescendants: Boolean(json.includeDescendants),
    qualityLevels: Array.isArray(json.qualityLevels) ? json.qualityLevels : [],
    relationType: json.relationType || "all",
    status: json.status || "all",
    limit: Number(json.limit || limit || 20),
    items: Array.isArray(json.items) ? json.items : [],
    summary: json.summary && typeof json.summary === "object" ? json.summary : {},
    total: Number(json.total || 0)
  };
}

export async function seedYijingKnowledgeNetwork() {
  const json = await request("/api/v1/demo/knowledge-network/yijing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  return json.item || null;
}

export async function seedYijingRichAcceptanceDemo() {
  const json = await request("/api/v1/demo/acceptance/yijing-rich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  return json.item || null;
}

export async function seedSmartNotesProductThinkingDemo() {
  const json = await request("/api/v1/demo/product-thinking/smart-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  return json.item || null;
}

export async function fetchNotesByTag(tag, { rootDirectoryId = "" } = {}) {
  const normalized = String(tag || "").replace(/^#/, "").trim();
  if (!normalized) return { tag: "", items: [], total: 0 };
  const query = rootDirectoryId ? `?rootDirectoryId=${encodeURIComponent(rootDirectoryId)}` : "";
  const json = await request(`/api/v1/tags/${encodeURIComponent(normalized)}/notes${query}`);
  return {
    tag: json.tag || normalized,
    rootDirectoryId: json.rootDirectoryId || null,
    items: Array.isArray(json.items) ? json.items : [],
    total: Number(json.total || 0)
  };
}

export async function listTags({ rootDirectoryId = "", query = "", limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (rootDirectoryId) params.set("rootDirectoryId", String(rootDirectoryId).trim());
  if (query) params.set("q", String(query).trim());
  params.set("limit", String(Math.max(1, Math.min(100, Number(limit || 20) || 20))));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const json = await request(`/api/v1/tags${suffix}`);
  return {
    rootDirectoryId: json.rootDirectoryId || null,
    query: json.query || "",
    items: Array.isArray(json.items) ? json.items : [],
    total: Number(json.total || 0)
  };
}

export async function searchNotes({ query = "", rootDirectoryId = "", directoryId = "", excludeNoteId = "", limit = 20 } = {}) {
  const params = new URLSearchParams();
  params.set("q", String(query || "").trim());
  const rootId = String(rootDirectoryId || directoryId || "").trim();
  if (rootId) params.set("rootDirectoryId", rootId);
  if (excludeNoteId) params.set("excludeNoteId", String(excludeNoteId).trim());
  params.set("limit", String(Math.max(1, Math.min(100, Number(limit || 20) || 20))));
  const json = await request(`/api/v1/notes/search?${params.toString()}`);
  return {
    rootDirectoryId: json.rootDirectoryId || null,
    query: json.query || "",
    items: Array.isArray(json.items) ? json.items : [],
    total: Number(json.total || 0)
  };
}

export async function createNote(payload) {
  const json = await request("/api/v1/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function fetchNote(noteId) {
  if (!noteId) return null;
  const json = await request(`/api/v1/notes/${encodeURIComponent(noteId)}`);
  return json.item || null;
}

export async function fetchNoteRelations(noteId) {
  if (!noteId) return null;
  const json = await request(`/api/v1/notes/${encodeURIComponent(noteId)}/relations`);
  return json.item || null;
}

export async function createNoteRelation(noteId, payload) {
  if (!noteId) throw new Error("noteId is required");
  const json = await request(`/api/v1/notes/${encodeURIComponent(noteId)}/relations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function updateNoteRelation(relationId, payload) {
  if (!relationId) throw new Error("relationId is required");
  const json = await request(`/api/v1/relations/${encodeURIComponent(relationId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function deleteNoteRelation(relationId) {
  if (!relationId) throw new Error("relationId is required");
  return request(`/api/v1/relations/${encodeURIComponent(relationId)}`, { method: "DELETE" });
}

export async function updateNote(noteId, payload) {
  if (!noteId) throw new Error("noteId is required");
  const json = await request(`/api/v1/notes/${encodeURIComponent(noteId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function moveNote(noteId, directoryId) {
  if (!noteId) throw new Error("noteId is required");
  if (!directoryId) throw new Error("directoryId is required");
  const json = await request(`/api/v1/notes/${encodeURIComponent(noteId)}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ directoryId })
  });
  return json.item || null;
}

export async function deleteNote(noteId) {
  if (!noteId) throw new Error("noteId is required");
  return request(`/api/v1/notes/${encodeURIComponent(noteId)}`, { method: "DELETE" });
}

export async function uploadNoteAsset(noteId, payload) {
  if (!noteId) throw new Error("noteId is required");
  const json = await request("/api/v1/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      noteId,
      ...(payload || {})
    })
  });
  return json.item || null;
}

export function assetPreviewUrl(assetPath) {
  const cleanPath = String(assetPath || "").trim();
  if (!cleanPath) return "";
  return `${API_BASE}/api/v1/assets/file?path=${encodeURIComponent(cleanPath)}`;
}

export async function checkOriginality(payload) {
  return request("/api/v1/originality/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
}

export async function previewImport({ connector, payload, options } = {}) {
  return request("/api/v1/imports/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connector,
      payload: payload || {},
      options: options || {}
    })
  });
}

export async function confirmImport(importRecordId, payload = {}) {
  if (!importRecordId) throw new Error("importRecordId is required");
  return request(`/api/v1/imports/${encodeURIComponent(importRecordId)}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      confirm: true,
      ...payload
    })
  });
}

export async function exportMarkdown(targetPathOrOptions, maybeOptions = {}) {
  const options =
    typeof targetPathOrOptions === "object" && targetPathOrOptions !== null
      ? targetPathOrOptions
      : { ...(maybeOptions || {}), targetPath: targetPathOrOptions };
  const cleanTargetPath = String(options.targetPath || "").trim();
  const cleanDirectoryId = String(options.directoryId || "").trim();
  if (!cleanTargetPath) throw new Error("targetPath is required");
  const payload = { targetPath: cleanTargetPath };
  if (cleanDirectoryId) payload.directoryId = cleanDirectoryId;
  if (options.includeDescendants === false) payload.includeDescendants = false;
  return request("/api/v1/exports/markdown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function createIndexCard(payload) {
  const json = await request("/api/v1/index-cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function listIndexCards(options = {}) {
  const params = new URLSearchParams();
  const directoryId = String(options?.directoryId || "").trim();
  const indexType = String(options?.indexType || "").trim();
  const includeDescendants = options?.includeDescendants !== false;
  const limit = Math.max(1, Math.min(50, Number(options?.limit || 12) || 12));
  if (directoryId) params.set("directoryId", directoryId);
  if (indexType) params.set("indexType", indexType);
  params.set("includeDescendants", includeDescendants ? "true" : "false");
  params.set("limit", String(limit));
  const json = await request(`/api/v1/index-cards?${params.toString()}`);
  return Array.isArray(json.items) ? json.items : [];
}

export async function fetchIndexCard(indexCardId) {
  const cleanIndexCardId = String(indexCardId || "").trim();
  if (!cleanIndexCardId) throw new Error("indexCardId is required");
  const json = await request(`/api/v1/index-cards/${encodeURIComponent(cleanIndexCardId)}`);
  return json.item || null;
}

export async function updateIndexCard(indexCardId, payload) {
  const cleanIndexCardId = String(indexCardId || "").trim();
  if (!cleanIndexCardId) throw new Error("indexCardId is required");
  const json = await request(`/api/v1/index-cards/${encodeURIComponent(cleanIndexCardId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function createWritingProject(payload) {
  const json = await request("/api/v1/writing-projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function listWritingProjects(options = {}) {
  const size = Math.max(1, Math.min(50, Number(options?.limit || 8) || 8));
  const params = new URLSearchParams({ limit: String(size) });
  const query = String(options?.q || "").trim();
  const status = String(options?.status || "").trim();
  const hasDraft = String(options?.hasDraft || "").trim();
  if (query) params.set("q", query);
  if (status && status !== "all") params.set("status", status);
  if (hasDraft && hasDraft !== "all") params.set("hasDraft", hasDraft);
  const json = await request(`/api/v1/writing-projects?${params.toString()}`);
  return Array.isArray(json.items) ? json.items : [];
}

export async function fetchWritingProject(writingProjectId) {
  const cleanWritingProjectId = String(writingProjectId || "").trim();
  if (!cleanWritingProjectId) throw new Error("writingProjectId is required");
  const json = await request(`/api/v1/writing-projects/${encodeURIComponent(cleanWritingProjectId)}`);
  return json.item || null;
}

export async function fetchDraftScaffold(draftScaffoldId) {
  const cleanDraftScaffoldId = String(draftScaffoldId || "").trim();
  if (!cleanDraftScaffoldId) throw new Error("draftScaffoldId is required");
  return request(`/api/v1/draft-scaffolds/${encodeURIComponent(cleanDraftScaffoldId)}`);
}

export async function updateDraftScaffoldVersionNote(draftScaffoldId, versionNote = "") {
  const cleanDraftScaffoldId = String(draftScaffoldId || "").trim();
  if (!cleanDraftScaffoldId) throw new Error("draftScaffoldId is required");
  const json = await request(`/api/v1/draft-scaffolds/${encodeURIComponent(cleanDraftScaffoldId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ versionNote: String(versionNote || "").trim() })
  });
  return json.item || null;
}

export async function listProjectScaffolds(writingProjectId, limit = 12) {
  const cleanWritingProjectId = String(writingProjectId || "").trim();
  const size = Math.max(1, Math.min(50, Number(limit || 12) || 12));
  if (!cleanWritingProjectId) throw new Error("writingProjectId is required");
  const json = await request(`/api/v1/writing-projects/${encodeURIComponent(cleanWritingProjectId)}/scaffolds?limit=${encodeURIComponent(String(size))}`);
  return Array.isArray(json.items) ? json.items : [];
}

export async function listProjectDraftVersions(writingProjectId, limit = 12) {
  const cleanWritingProjectId = String(writingProjectId || "").trim();
  const size = Math.max(1, Math.min(50, Number(limit || 12) || 12));
  if (!cleanWritingProjectId) throw new Error("writingProjectId is required");
  const json = await request(`/api/v1/writing-projects/${encodeURIComponent(cleanWritingProjectId)}/draft-versions?limit=${encodeURIComponent(String(size))}`);
  return Array.isArray(json.items) ? json.items : [];
}

export async function updateDraftNoteVersionNote(draftVersionId, versionNote = "") {
  const cleanDraftVersionId = String(draftVersionId || "").trim();
  if (!cleanDraftVersionId) throw new Error("draftVersionId is required");
  const json = await request(`/api/v1/draft-note-versions/${encodeURIComponent(cleanDraftVersionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ versionNote: String(versionNote || "").trim() })
  });
  return json.item || null;
}

export async function bindWritingDraftNote(writingProjectId, draftNoteId, sourceScaffoldId = "", versionNote = "") {
  const cleanWritingProjectId = String(writingProjectId || "").trim();
  const cleanDraftNoteId = String(draftNoteId || "").trim();
  const cleanSourceScaffoldId = String(sourceScaffoldId || "").trim();
  const cleanVersionNote = String(versionNote || "").trim();
  if (!cleanWritingProjectId) throw new Error("writingProjectId is required");
  if (!cleanDraftNoteId) throw new Error("draftNoteId is required");
  const json = await request(`/api/v1/writing-projects/${encodeURIComponent(cleanWritingProjectId)}/draft-note`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draftNoteId: cleanDraftNoteId,
      ...(cleanSourceScaffoldId ? { sourceScaffoldId: cleanSourceScaffoldId } : {}),
      ...(cleanVersionNote ? { versionNote: cleanVersionNote } : {})
    })
  });
  return json.item || null;
}

export async function setWritingCurrentDraftNote(writingProjectId, draftNoteId) {
  const cleanWritingProjectId = String(writingProjectId || "").trim();
  const cleanDraftNoteId = String(draftNoteId || "").trim();
  if (!cleanWritingProjectId) throw new Error("writingProjectId is required");
  if (!cleanDraftNoteId) throw new Error("draftNoteId is required");
  const json = await request(`/api/v1/writing-projects/${encodeURIComponent(cleanWritingProjectId)}/current-draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftNoteId: cleanDraftNoteId })
  });
  return json.item || null;
}

export async function createDraftScaffold(writingProjectId, versionNote = "") {
  const cleanWritingProjectId = String(writingProjectId || "").trim();
  const cleanVersionNote = String(versionNote || "").trim();
  if (!cleanWritingProjectId) throw new Error("writingProjectId is required");
  return request("/api/v1/draft-scaffolds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      writingProjectId: cleanWritingProjectId,
      ...(cleanVersionNote ? { versionNote: cleanVersionNote } : {})
    })
  });
}

export function getApiBase() {
  return API_BASE;
}
