const API_BASE =
  (typeof window !== "undefined" &&
    typeof window.__API_BASE__ === "string" &&
    window.__API_BASE__.trim() &&
    window.__API_BASE__ !== "__API_BASE__" &&
    window.__API_BASE__) ||
  "http://localhost:3000";

async function request(pathname, options = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, options);
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

function jsonOptions(body = {}) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  };
}

export async function createPaperWorkspace(payload = {}) {
  const json = await request("/api/v1/papers", jsonOptions(payload));
  return json.item || null;
}

export async function fetchPaperWorkspace(paperId) {
  const cleanPaperId = String(paperId || "").trim();
  if (!cleanPaperId) throw new Error("paperId is required");
  const json = await request(`/api/v1/papers/${encodeURIComponent(cleanPaperId)}`);
  return json.item || null;
}

export async function addNotebookLmDraft(paperId, payload = {}) {
  const cleanPaperId = String(paperId || "").trim();
  if (!cleanPaperId) throw new Error("paperId is required");
  return request(`/api/v1/papers/${encodeURIComponent(cleanPaperId)}/notebooklm-drafts`, jsonOptions(payload));
}

export async function savePaperTranslation(paperId, payload = {}) {
  const cleanPaperId = String(paperId || "").trim();
  if (!cleanPaperId) throw new Error("paperId is required");
  return request(`/api/v1/papers/${encodeURIComponent(cleanPaperId)}/translations`, jsonOptions(payload));
}

export async function createPaperPermanentCandidate(paperId, payload = {}) {
  const cleanPaperId = String(paperId || "").trim();
  if (!cleanPaperId) throw new Error("paperId is required");
  return request(`/api/v1/papers/${encodeURIComponent(cleanPaperId)}/permanent-candidates`, jsonOptions(payload));
}

export async function savePaperPermanentNote(paperId, payload = {}) {
  const cleanPaperId = String(paperId || "").trim();
  if (!cleanPaperId) throw new Error("paperId is required");
  return request(`/api/v1/papers/${encodeURIComponent(cleanPaperId)}/permanent-notes`, jsonOptions(payload));
}

export function getPaperWorkspaceApiBase() {
  return API_BASE;
}
