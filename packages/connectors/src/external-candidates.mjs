import { createHash } from "node:crypto";

function stableId(prefix, input) {
  const hash = createHash("sha1").update(String(input)).digest("hex").slice(0, 12);
  return `${prefix}_${hash}`;
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
}

function connectorItems(connector, payload) {
  if (connector === "zotero") return Array.isArray(payload.items) ? payload.items : [];
  if (connector === "readwise") return Array.isArray(payload.highlights) ? payload.highlights : [];
  if (connector === "notebooklm") return Array.isArray(payload.notes) ? payload.notes : [];
  return [];
}

export function buildExternalCandidates(connector, payload = {}) {
  const items = connectorItems(connector, payload);
  const sources = [];
  const literature = [];
  const permanent = [];
  const warnings = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i] || {};
    const externalId = String(item.id || item.key || `${connector}_${i}`);
    const title = String(item.title || `${connector} item ${i + 1}`);
    const sourceId = stableId("src", `${connector}:${externalId}`);
    const literatureId = stableId("ln", `${connector}:${externalId}`);
    const now = new Date().toISOString();

    sources.push({
      id: sourceId,
      source_type: connector === "zotero" ? "article" : "note",
      title,
      description: "",
      tags: toArray(item.tags),
      imported_from: connector,
      created_at: now,
      updated_at: now,
      connector,
      external_id: externalId
    });

    literature.push({
      id: literatureId,
      source_id: sourceId,
      title,
      quote_text: String(item.text || item.note || item.highlight || item.content || "").trim(),
      paraphrase_text: "",
      status: "draft",
      tags: connector === "readwise" ? [...new Set([...toArray(item.tags), "pending_paraphrase"])] : toArray(item.tags),
      imported_from: connector,
      created_at: now,
      updated_at: now,
      connector,
      locator: item.locator || item.location || null,
      notebook: connector === "notebooklm" ? payload.notebookName || payload.notebook || null : null
    });
  }

  if (!items.length) {
    warnings.push({ code: "IMPORT_EMPTY_PAYLOAD", message: `${connector} payload is empty`, count: 1 });
  }

  return { sources, literature, permanent, warnings };
}
