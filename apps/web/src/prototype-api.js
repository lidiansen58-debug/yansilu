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

export function getApiBase() {
  return API_BASE;
}
