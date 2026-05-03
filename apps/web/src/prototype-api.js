const API_BASE =
  (typeof window !== "undefined" && typeof window.__API_BASE__ === "string" && window.__API_BASE__.trim()) ||
  "http://localhost:3000";

async function request(pathname, options = {}) {
  const url = `${API_BASE}${pathname}`;
  const response = await fetch(url, options);
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

export async function fetchDirectories(includeHidden = false) {
  const query = includeHidden ? "?includeHidden=true" : "";
  const json = await request(`/api/v1/directories${query}`);
  return Array.isArray(json.items) ? json.items : [];
}

export async function fetchVaultInfo() {
  const json = await request("/api/v1/vault");
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

export async function fetchDirectoryGraph(directoryId) {
  if (!directoryId) return null;
  const json = await request(`/api/v1/graph?scope=directory&directoryId=${encodeURIComponent(directoryId)}`);
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
  const json = await request(`/api/v1/graph/conflicts?${params.toString()}`);
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

export async function fetchImportRecord(importRecordId) {
  if (!importRecordId) throw new Error("importRecordId is required");
  const json = await request(`/api/v1/imports/${encodeURIComponent(importRecordId)}`);
  return json.importRecord || null;
}

export async function listImportRecords(limit = 12) {
  const size = Math.max(0, Math.min(200, Number(limit || 12) || 12));
  const json = await request(`/api/v1/imports?limit=${encodeURIComponent(String(size))}`);
  return {
    items: Array.isArray(json.items) ? json.items : [],
    count: Number(json.count || 0),
    total: Number(json.total || 0)
  };
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

export async function cancelImport(importRecordId) {
  if (!importRecordId) throw new Error("importRecordId is required");
  return request(`/api/v1/imports/${encodeURIComponent(importRecordId)}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: false })
  });
}

export async function rollbackImport(importRecordId) {
  if (!importRecordId) throw new Error("importRecordId is required");
  return request(`/api/v1/imports/${encodeURIComponent(importRecordId)}/rollback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
}

export async function exportMarkdown(targetPath) {
  const cleanTargetPath = String(targetPath || "").trim();
  if (!cleanTargetPath) throw new Error("targetPath is required");
  return request("/api/v1/exports/markdown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetPath: cleanTargetPath })
  });
}

export async function createWritingProject(payload) {
  const json = await request("/api/v1/writing-projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return json.item || null;
}

export async function listWritingProjects(limit = 8) {
  const size = Math.max(1, Math.min(50, Number(limit || 8) || 8));
  const json = await request(`/api/v1/writing-projects?limit=${encodeURIComponent(String(size))}`);
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

export async function bindWritingDraftNote(writingProjectId, draftNoteId, sourceScaffoldId = "") {
  const cleanWritingProjectId = String(writingProjectId || "").trim();
  const cleanDraftNoteId = String(draftNoteId || "").trim();
  const cleanSourceScaffoldId = String(sourceScaffoldId || "").trim();
  if (!cleanWritingProjectId) throw new Error("writingProjectId is required");
  if (!cleanDraftNoteId) throw new Error("draftNoteId is required");
  const json = await request(`/api/v1/writing-projects/${encodeURIComponent(cleanWritingProjectId)}/draft-note`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draftNoteId: cleanDraftNoteId,
      ...(cleanSourceScaffoldId ? { sourceScaffoldId: cleanSourceScaffoldId } : {})
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

export async function createDraftScaffold(writingProjectId) {
  const cleanWritingProjectId = String(writingProjectId || "").trim();
  if (!cleanWritingProjectId) throw new Error("writingProjectId is required");
  return request("/api/v1/draft-scaffolds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ writingProjectId: cleanWritingProjectId })
  });
}

export function getApiBase() {
  return API_BASE;
}
