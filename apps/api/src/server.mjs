import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  appendImportRecord,
  buildExternalCandidates,
  createdEntryFromWriteResult,
  listImportRecords,
  loadImportRecord,
  publicImportRecord,
  rollbackCreatedFiles,
  summarizeImportCandidates
} from "../../../packages/connectors/src/index.mjs";
import {
  createDirectory,
  createNoteInDirectory,
  deleteDirectory,
  deleteNoteById,
  detectGraphConflicts,
  findNotePath,
  getNoteById,
  initVault,
  getDirectoryGraph,
  listDirectories,
  listNoteRelations,
  listTags,
  listNotesByTag,
  listNotesInDirectory,
  moveNoteToDirectory,
  registerMarkdownNoteInCatalog,
  resolveVaultPath,
  saveNoteAsset,
  updateDirectory,
  updateNoteContent,
  writeLiteratureNoteIfAbsent,
  writePermanentNoteIfAbsent,
  writeSourceIfAbsent
} from "../../../packages/domain/src/index.mjs";
import { exportMarkdown } from "../../../packages/export-engine/src/index.mjs";
import { buildMarkdownCandidates } from "../../../packages/markdown-engine/src/index.mjs";
import { normalizeOriginalityPlan, originalityGuard } from "../../../packages/originality-guard/src/index.mjs";
import {
  bindDraftNoteToProject,
  createDraftScaffold,
  createWritingProject,
  getDraftScaffold,
  getWritingProject,
  listProjectDraftVersions,
  listProjectScaffolds,
  listWritingProjects,
  setCurrentDraftNote
} from "../../../packages/writing-engine/src/index.mjs";

const PORT = Number(process.env.API_PORT || 3000);
const WEB_PORT = Number(process.env.WEB_PORT || 5173);
const PROTOTYPE_URL = String(process.env.PROTOTYPE_URL || `http://127.0.0.1:${WEB_PORT}/prototype`);
const CWD = process.cwd();
const DEFAULT_VAULT_PATH = path.resolve(process.env.VAULT_PATH || path.join(CWD, "vault-example", "yansilu-vault"));
let VAULT_PATH = DEFAULT_VAULT_PATH;

const importRecords = new Map();
const allowedConnectors = new Set(["markdown", "obsidian", "zotero", "readwise", "notebooklm"]);

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Request-Id"
  });
  res.end(status === 204 ? "" : JSON.stringify(body, null, 2));
}

function sendBinary(res, status, contentType, body) {
  res.writeHead(status, {
    "Content-Type": contentType || "application/octet-stream",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Request-Id"
  });
  res.end(body);
}

function sendHtml(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Request-Id"
  });
  res.end(String(body || ""));
}

function requestId(req) {
  return req.headers["x-request-id"] || `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function err(code, message, rid, details) {
  return {
    error: { code, message, ...(details ? { details } : {}) },
    requestId: rid,
    timestamp: new Date().toISOString()
  };
}

function publicVaultInfo(layout = null) {
  return {
    vaultPath: VAULT_PATH,
    defaultVaultPath: DEFAULT_VAULT_PATH,
    initialized: Boolean(layout),
    dirs: layout?.dirs || []
  };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function parseConfirmPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/imports\/([^/]+)\/confirm$/);
  return m ? m[1] : null;
}

function parseRollbackPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/imports\/([^/]+)\/rollback$/);
  return m ? m[1] : null;
}

function parseImportRecordPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/imports\/([^/]+)$/);
  return m ? m[1] : null;
}

function parseConnectorPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/imports\/(markdown|obsidian|zotero|readwise|notebooklm)$/);
  return m ? m[1] : null;
}

function bucketFromCandidateId(candidates = {}) {
  const buckets = new Map();
  for (const item of Array.isArray(candidates.sources) ? candidates.sources : []) {
    if (item?.id) buckets.set(String(item.id), "sources");
  }
  for (const item of Array.isArray(candidates.literature) ? candidates.literature : []) {
    if (item?.id) buckets.set(String(item.id), "literature");
  }
  for (const item of Array.isArray(candidates.permanent) ? candidates.permanent : []) {
    if (item?.id) buckets.set(String(item.id), "permanent");
  }
  return buckets;
}

function buildSelectedImportCandidates(candidates = {}, selectedCandidateIds) {
  const sources = Array.isArray(candidates.sources) ? candidates.sources : [];
  const literature = Array.isArray(candidates.literature) ? candidates.literature : [];
  const permanent = Array.isArray(candidates.permanent) ? candidates.permanent : [];
  const totalCandidates = sources.length + literature.length + permanent.length;
  const byId = bucketFromCandidateId(candidates);

  if (selectedCandidateIds === undefined) {
    return {
      candidates: { sources, literature, permanent },
      selection: {
        mode: "all",
        candidateIds: [...byId.keys()],
        totalCandidates,
        selectedCandidates: totalCandidates,
        counts: {
          sources: sources.length,
          literatureNotes: literature.length,
          permanentNotes: permanent.length
        }
      }
    };
  }

  if (!Array.isArray(selectedCandidateIds)) {
    const error = new Error("selectedCandidateIds must be an array");
    error.code = "IMPORT_SELECTED_CANDIDATES_INVALID";
    throw error;
  }

  const requestedIds = [...new Set(selectedCandidateIds.map((item) => String(item || "").trim()).filter(Boolean))];
  if (!requestedIds.length) {
    const error = new Error("selectedCandidateIds must contain at least one candidate id");
    error.code = "IMPORT_SELECTION_EMPTY";
    throw error;
  }

  const unknownCandidateIds = requestedIds.filter((id) => !byId.has(id));
  if (unknownCandidateIds.length) {
    const error = new Error("selectedCandidateIds contains unknown candidate ids");
    error.code = "IMPORT_SELECTED_CANDIDATES_INVALID";
    error.details = { unknownCandidateIds };
    throw error;
  }

  const selectedSet = new Set(requestedIds);
  const selectedSources = sources.filter((item) => selectedSet.has(String(item?.id || "")));
  const selectedLiterature = literature.filter((item) => selectedSet.has(String(item?.id || "")));
  const selectedPermanent = permanent.filter((item) => selectedSet.has(String(item?.id || "")));

  return {
    candidates: {
      sources: selectedSources,
      literature: selectedLiterature,
      permanent: selectedPermanent
    },
    selection: {
      mode: requestedIds.length === totalCandidates ? "all" : "subset",
      candidateIds: requestedIds,
      totalCandidates,
      selectedCandidates: requestedIds.length,
      counts: {
        sources: selectedSources.length,
        literatureNotes: selectedLiterature.length,
        permanentNotes: selectedPermanent.length
      }
    }
  };
}

function parseDirectoryNotesPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/directories\/([^/]+)\/notes$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseTagNotesPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/tags\/([^/]+)\/notes$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseDirectoryPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/directories\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseNotePath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/notes\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseNoteRelationsPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/notes\/([^/]+)\/relations$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseMoveNotePath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/notes\/([^/]+)\/move$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function assetContentType(filePath) {
  const ext = path.extname(String(filePath || "")).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".bmp") return "image/bmp";
  if (ext === ".ico") return "image/x-icon";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".md") return "text/markdown; charset=utf-8";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function defaultDirectoryIdForImportNoteType(noteType) {
  if (noteType === "literature") return "dir_literature_default";
  if (noteType === "fleeting") return "dir_fleeting_default";
  return "dir_original_default";
}

function titleForCatalogNote(candidate) {
  const explicit = String(candidate?.title || "").trim();
  if (explicit) return explicit;
  const firstLine = String(candidate?.core_claim || candidate?.quote_text || "")
    .trim()
    .split(/\r?\n/)[0]
    ?.trim();
  return firstLine || String(candidate?.id || "imported-note");
}

async function registerImportCatalogNote(candidate, noteType, writeResult) {
  if (!writeResult?.written) return null;
  return registerMarkdownNoteInCatalog(VAULT_PATH, {
    noteId: candidate.id,
    noteType,
    title: titleForCatalogNote(candidate),
    status: candidate.status || "draft",
    markdownPath: path.relative(path.resolve(VAULT_PATH), writeResult.path).replaceAll("\\", "/"),
    directoryId: defaultDirectoryIdForImportNoteType(noteType)
  });
}

async function createPreview(connector, payload, options, rid) {
  const originalityPlan = normalizeOriginalityPlan(options?.originalityPlan || {});
  const built =
    connector === "markdown" || connector === "obsidian"
      ? await buildMarkdownCandidates({ connector, payload, options, cwd: CWD })
      : buildExternalCandidates(connector, payload);
  const guard = originalityGuard(built, originalityPlan);
  const warnings = [...built.warnings, ...guard.warnings];
  const importRecordId = `imp_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const candidatePreview = summarizeImportCandidates(built, guard);
  const preview = {
    importRecordId,
    status: "preview",
    connector,
    summary: {
      sources: built.sources.length,
      literatureNotes: built.literature.length,
      permanentNotes: built.permanent.length,
      warnings: warnings.reduce((a, b) => a + Number(b.count || 1), 0)
    },
    samples: {
      sourceIds: built.sources.slice(0, 3).map((x) => x.id),
      literatureNoteIds: built.literature.slice(0, 3).map((x) => x.id),
      permanentNoteIds: built.permanent.slice(0, 3).map((x) => x.id)
    },
    candidatePreview,
    warnings,
    originalityGuard: {
      plan: guard.plan,
      flaggedPermanentIds: guard.flaggedPermanentIds,
      evaluations: guard.evaluations
    },
    createdAt: new Date().toISOString()
  };

  importRecords.set(importRecordId, { ...preview, state: "preview", payload, options, candidates: built, updatedAt: preview.createdAt });
  await initVault(VAULT_PATH);
  await appendImportRecord(VAULT_PATH, connector, importRecordId, "preview", { requestId: rid, preview, payload, options, candidates: built });
  return preview;
}

async function getImportRecord(recordId) {
  const memoryRecord = importRecords.get(recordId);
  if (memoryRecord) return memoryRecord;
  const diskRecord = await loadImportRecord(VAULT_PATH, recordId);
  if (diskRecord) importRecords.set(recordId, diskRecord);
  return diskRecord;
}

async function getImportRecordList({ limit = 50 } = {}) {
  const requestedLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.min(200, Number(limit))) : 50;
  const diskRecords = await listImportRecords(VAULT_PATH, { limit: Math.max(requestedLimit, importRecords.size, 50) });
  const byId = new Map(diskRecords.map((record) => [record.importRecordId, record]));
  for (const record of importRecords.values()) {
    byId.set(record.importRecordId, record);
  }
  const records = [...byId.values()].sort((a, b) => {
    const byUpdatedAt = String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
    if (byUpdatedAt !== 0) return byUpdatedAt;
    return String(b.importRecordId || "").localeCompare(String(a.importRecordId || ""));
  });
  return {
    total: records.length,
    items: records.slice(0, requestedLimit)
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const rid = requestId(req);

  try {
    if (req.method === "OPTIONS") return sendJson(res, 204, {});

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return sendHtml(
        res,
        200,
        `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>研思录 API 开发入口</title>
    <meta http-equiv="refresh" content="0; url=${PROTOTYPE_URL}" />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f3f5f9;
        color: #0f172a;
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      .card {
        width: min(560px, calc(100vw - 40px));
        padding: 28px 30px;
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
      }
      h1 {
        margin: 0 0 10px;
        font-size: 24px;
      }
      p {
        margin: 0 0 14px;
        line-height: 1.65;
        color: #475569;
      }
      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 18px;
      }
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 140px;
        padding: 10px 14px;
        border-radius: 10px;
        text-decoration: none;
        font-weight: 600;
      }
      .primary {
        background: #0f172a;
        color: #ffffff;
      }
      .secondary {
        background: #eef2f7;
        color: #0f172a;
      }
      code {
        padding: 2px 6px;
        border-radius: 6px;
        background: #eef2f7;
      }
    </style>
    <script>
      window.location.replace(${JSON.stringify(PROTOTYPE_URL)});
    </script>
  </head>
  <body>
    <div class="card">
      <h1>研思录开发服务已启动</h1>
      <p>你当前打开的是 <code>API 端口 ${PORT}</code>，不是前端原型页。页面会自动跳转到可操作的原型界面。</p>
      <p>如果没有自动跳转，可以手动打开下面的入口。</p>
      <div class="actions">
        <a class="primary" href="${PROTOTYPE_URL}">打开原型界面</a>
        <a class="secondary" href="/health">查看 API 健康状态</a>
        <a class="secondary" href="/api/v1/vault">查看 Vault 信息</a>
      </div>
    </div>
  </body>
</html>`
      );
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { ok: true, service: "api", requestId: rid, vaultPath: VAULT_PATH, time: new Date().toISOString() });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/vault") {
      try {
        const layout = await initVault(VAULT_PATH);
        return sendJson(res, 200, {
          item: publicVaultInfo(layout),
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 500, err("VAULT_INIT_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/vault") {
      const body = await readJson(req);
      const nextVaultPathRaw = String(body.vaultPath || "").trim();
      if (!nextVaultPathRaw) return sendJson(res, 400, err("VAULT_PATH_REQUIRED", "vaultPath required", rid));
      const nextVaultPath = path.resolve(nextVaultPathRaw);
      try {
        const layout = await initVault(nextVaultPath);
        VAULT_PATH = layout.vaultPath;
        importRecords.clear();
        return sendJson(res, 200, {
          item: publicVaultInfo(layout),
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("VAULT_SWITCH_FAILED", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/directories") {
      await initVault(VAULT_PATH);
      const includeHidden = url.searchParams.get("includeHidden") === "true";
      const directories = await listDirectories(VAULT_PATH, { includeHidden });
      return sendJson(res, 200, {
        items: directories,
        total: directories.length,
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/graph") {
      const scope = String(url.searchParams.get("scope") || "directory").trim();
      const directoryId = String(url.searchParams.get("directoryId") || "").trim();
      if (scope !== "directory") {
        return sendJson(res, 400, err("GRAPH_SCOPE_INVALID", "only directory scope is supported in MVP", rid));
      }
      try {
        await initVault(VAULT_PATH);
        const graph = await getDirectoryGraph(VAULT_PATH, directoryId);
        return sendJson(res, 200, {
          item: graph,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("GRAPH_QUERY_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/graph/path") {
      try {
        await initVault(VAULT_PATH);
        const item = await findNotePath(VAULT_PATH, {
          fromNoteId: url.searchParams.get("fromNoteId"),
          toNoteId: url.searchParams.get("toNoteId"),
          directoryId: url.searchParams.get("directoryId"),
          maxDepth: url.searchParams.get("maxDepth"),
          direction: url.searchParams.get("direction")
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("GRAPH_PATH_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/graph/conflicts") {
      try {
        await initVault(VAULT_PATH);
        const item = await detectGraphConflicts(VAULT_PATH, {
          directoryId: url.searchParams.get("directoryId"),
          includeDescendants: url.searchParams.get("includeDescendants") !== "false"
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("GRAPH_CONFLICTS_INVALID", String(error?.message || error), rid));
      }
    }

    const tagName = parseTagNotesPath(url.pathname);
    if (req.method === "GET" && tagName) {
      const rootDirectoryId = String(url.searchParams.get("rootDirectoryId") || url.searchParams.get("directoryId") || "").trim();
      try {
        await initVault(VAULT_PATH);
        const result = await listNotesByTag(VAULT_PATH, tagName, { rootDirectoryId });
        return sendJson(res, 200, {
          ...result,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("TAG_QUERY_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/tags") {
      const rootDirectoryId = String(url.searchParams.get("rootDirectoryId") || url.searchParams.get("directoryId") || "").trim();
      const query = String(url.searchParams.get("q") || "").trim();
      const limit = Number(url.searchParams.get("limit") || 20);
      try {
        await initVault(VAULT_PATH);
        const result = await listTags(VAULT_PATH, { rootDirectoryId, query, limit });
        return sendJson(res, 200, {
          ...result,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("TAG_LIST_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/directories") {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const created = await createDirectory(VAULT_PATH, {
          title: body.title,
          parentDirectoryId: body.parentDirectoryId || null,
          directoryType: body.directoryType || "custom",
          fsPath: body.fsPath,
          maxNotes: body.maxNotes
        });
        return sendJson(res, 201, {
          item: created,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DIRECTORY_PAYLOAD_INVALID", String(error?.message || error), rid));
      }
    }

    const directoryId = parseDirectoryPath(url.pathname);
    if (req.method === "PATCH" && directoryId) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await updateDirectory(VAULT_PATH, directoryId, {
          title: body.title,
          parentDirectoryId: body.parentDirectoryId,
          fsPath: body.fsPath,
          isHidden: body.isHidden,
          maxNotes: body.maxNotes
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DIRECTORY_UPDATE_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "DELETE" && directoryId) {
      try {
        await initVault(VAULT_PATH);
        const result = await deleteDirectory(VAULT_PATH, directoryId);
        return sendJson(res, 200, {
          ...result,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DIRECTORY_DELETE_INVALID", String(error?.message || error), rid));
      }
    }

    const dirNotesId = parseDirectoryNotesPath(url.pathname);
    if (req.method === "GET" && dirNotesId) {
      try {
        await initVault(VAULT_PATH);
        const items = await listNotesInDirectory(VAULT_PATH, dirNotesId);
        return sendJson(res, 200, {
          directoryId: dirNotesId,
          items,
          total: items.length,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DIRECTORY_NOTES_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/notes") {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const created = await createNoteInDirectory(VAULT_PATH, {
          directoryId: body.directoryId,
          title: body.title,
          body: body.body,
          status: body.status || "draft"
        });
        return sendJson(res, 201, {
          item: created,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("NOTE_PAYLOAD_INVALID", String(error?.message || error), rid));
      }
    }

    const noteRelationsId = parseNoteRelationsPath(url.pathname);
    if (req.method === "GET" && noteRelationsId) {
      try {
        await initVault(VAULT_PATH);
        const relations = await listNoteRelations(VAULT_PATH, noteRelationsId);
        return sendJson(res, 200, {
          item: relations,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 404, err("NOTE_RELATIONS_NOT_FOUND", String(error?.message || error), rid));
      }
    }

    const noteId = parseNotePath(url.pathname);
    if (req.method === "GET" && noteId) {
      try {
        await initVault(VAULT_PATH);
        const item = await getNoteById(VAULT_PATH, noteId);
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 404, err("NOTE_NOT_FOUND", String(error?.message || error), rid));
      }
    }

    if (req.method === "PUT" && noteId) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await updateNoteContent(VAULT_PATH, noteId, {
          title: body.title,
          body: body.body,
          status: body.status
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("NOTE_UPDATE_INVALID", String(error?.message || error), rid));
      }
    }

    const moveNoteId = parseMoveNotePath(url.pathname);
    if (req.method === "POST" && moveNoteId) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await moveNoteToDirectory(VAULT_PATH, moveNoteId, body.directoryId);
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("NOTE_MOVE_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "DELETE" && noteId) {
      try {
        await initVault(VAULT_PATH);
        const result = await deleteNoteById(VAULT_PATH, noteId);
        return sendJson(res, 200, {
          ...result,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("NOTE_DELETE_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/assets") {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await saveNoteAsset(VAULT_PATH, body.noteId, {
          fileName: body.fileName,
          mimeType: body.mimeType,
          contentBase64: body.contentBase64,
          kind: body.kind
        });
        return sendJson(res, 201, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("ASSET_UPLOAD_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/assets/file") {
      const relativePath = String(url.searchParams.get("path") || "").trim().replaceAll("\\", "/");
      if (!relativePath) {
        return sendJson(res, 400, err("ASSET_PATH_REQUIRED", "asset path required", rid));
      }
      if (!relativePath.startsWith("assets/")) {
        return sendJson(res, 400, err("ASSET_PATH_INVALID", "asset path must stay inside assets/", rid));
      }
      try {
        await initVault(VAULT_PATH);
        const absolutePath = resolveVaultPath(VAULT_PATH, relativePath);
        const body = await fs.readFile(absolutePath);
        return sendBinary(res, 200, assetContentType(absolutePath), body);
      } catch (error) {
        return sendJson(res, 404, err("ASSET_NOT_FOUND", String(error?.message || error), rid));
      }
    }

    const directConnector = parseConnectorPath(url.pathname);
    if (req.method === "POST" && directConnector) {
      const body = await readJson(req);
      const preview = await createPreview(directConnector, body.payload || body, body.options || {}, rid);
      return sendJson(res, 200, preview);
    }

    if (req.method === "POST" && url.pathname === "/api/v1/imports/preview") {
      const body = await readJson(req);
      const connector = String(body.connector || "").trim();
      if (!allowedConnectors.has(connector)) return sendJson(res, 400, err("IMPORT_PAYLOAD_INVALID", "connector invalid", rid));
      const preview = await createPreview(connector, body.payload || {}, body.options || {}, rid);
      return sendJson(res, 200, preview);
    }

    if (req.method === "GET" && url.pathname === "/api/v1/imports") {
      const result = await getImportRecordList({ limit: url.searchParams.get("limit") || 50 });
      return sendJson(res, 200, {
        items: result.items.map(publicImportRecord),
        count: result.items.length,
        total: result.total,
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    const importRecordId = parseImportRecordPath(url.pathname);
    if (req.method === "GET" && importRecordId) {
      const record = await getImportRecord(importRecordId);
      if (!record) return sendJson(res, 404, err("IMPORT_RECORD_NOT_FOUND", "import record not found", rid));
      return sendJson(res, 200, {
        importRecord: publicImportRecord(record),
        requestId: rid,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/originality/check") {
      const body = await readJson(req);
      const plan = normalizeOriginalityPlan(body.originalityPlan || {});
      const record = {
        literature: Array.isArray(body.literature) ? body.literature : [],
        permanent: Array.isArray(body.permanent) ? body.permanent : []
      };
      const guard = originalityGuard(record, plan);
      return sendJson(res, 200, {
        originalityGuard: {
          plan: guard.plan,
          blockedPermanentIds: guard.flaggedPermanentIds,
          evaluations: guard.evaluations,
          warnings: guard.warnings
        },
        summary: {
          permanentCount: record.permanent.length,
          blockedCount: guard.evaluations.filter((x) => x.status === "blocked").length,
          warningCount: guard.evaluations.filter((x) => x.status === "warning").length,
          passCount: guard.evaluations.filter((x) => x.status === "pass").length
        }
      });
    }

    const confirmId = parseConfirmPath(url.pathname);
    if (req.method === "POST" && confirmId) {
      const body = await readJson(req);
      const record = await getImportRecord(confirmId);
      if (!record) return sendJson(res, 404, err("IMPORT_RECORD_NOT_FOUND", "import record not found", rid));
      if (record.state !== "preview") return sendJson(res, 400, err("IMPORT_STATUS_INVALID", "import status invalid", rid));
      if (body.confirm === false) {
        record.state = "cancelled";
        importRecords.set(confirmId, record);
        return sendJson(res, 200, { importRecordId: confirmId, status: "cancelled", message: "Import cancelled." });
      }
      if (body.confirm !== true) return sendJson(res, 400, err("IMPORT_CONFIRM_REQUIRED", "confirm must be true/false", rid));

      let selected;
      try {
        selected = buildSelectedImportCandidates(record.candidates, body.selectedCandidateIds);
      } catch (error) {
        return sendJson(res, 400, err(error.code || "IMPORT_SELECTED_CANDIDATES_INVALID", String(error?.message || error), rid, error.details));
      }

      const confirmPlan = normalizeOriginalityPlan(body.originalityPlan || record.originalityGuard?.plan || {});
      const confirmGuard = originalityGuard(selected.candidates, confirmPlan);
      const blocked = confirmGuard.evaluations.filter((x) => x.status === "blocked");
      const evaluationById = new Map(confirmGuard.evaluations.map((x) => [x.permanentId, x]));
      const allowOverride = body.overrideOriginality === true;
      if (confirmPlan.blockOnBlocked && blocked.length && !allowOverride) {
        return sendJson(
          res,
          409,
          err("IMPORT_ORIGINALITY_BLOCKED", "originality guard blocked confirmation", rid, {
            blockedPermanentIds: blocked.map((x) => x.permanentId),
            threshold: confirmPlan.blockThreshold
          })
        );
      }

      await initVault(VAULT_PATH);
      const created = { sources: 0, literatureNotes: 0, permanentNotes: 0 };
      const skipped = { conflicted: 0, invalid: 0 };
      const writtenPaths = new Set();
      const createdFiles = [];

      for (const source of selected.candidates.sources) {
        const result = await writeSourceIfAbsent(VAULT_PATH, source);
        if (result.written) {
          created.sources += 1;
          writtenPaths.add(path.dirname(result.path));
          createdFiles.push(await createdEntryFromWriteResult(VAULT_PATH, result));
        } else skipped.conflicted += 1;
      }
      for (const ln of selected.candidates.literature) {
        const result = await writeLiteratureNoteIfAbsent(VAULT_PATH, ln);
        if (result.written) {
          created.literatureNotes += 1;
          writtenPaths.add(path.dirname(result.path));
          createdFiles.push(await createdEntryFromWriteResult(VAULT_PATH, result));
          await registerImportCatalogNote(ln, "literature", result);
        } else skipped.conflicted += 1;
      }
      for (const pn of selected.candidates.permanent) {
        const evalItem = evaluationById.get(pn.id);
        if (evalItem?.status === "warning" && !confirmPlan.allowDraftOnWarning) {
          skipped.invalid += 1;
          continue;
        }
        const noteToWrite = {
          ...pn,
          originality_status: evalItem?.status || pn.originality_status || "warning"
        };
        const result = await writePermanentNoteIfAbsent(VAULT_PATH, noteToWrite);
        if (result.written) {
          created.permanentNotes += 1;
          writtenPaths.add(path.dirname(result.path));
          createdFiles.push(await createdEntryFromWriteResult(VAULT_PATH, result));
          await registerImportCatalogNote(noteToWrite, "permanent", result);
        } else skipped.conflicted += 1;
      }

      record.state = "completed";
      record.originalityGuard = confirmGuard;
      record.confirmResult = {
        created,
        skipped,
        selection: selected.selection,
        writtenPaths: [...writtenPaths].map((x) => path.relative(VAULT_PATH, x).replaceAll("\\", "/")),
        createdFiles,
        finishedAt: new Date().toISOString()
      };
      record.updatedAt = record.confirmResult.finishedAt;
      importRecords.set(confirmId, record);
      await appendImportRecord(VAULT_PATH, record.connector, confirmId, "confirm", {
        requestId: rid,
        created,
        skipped,
        selection: record.confirmResult.selection,
        writtenPaths: record.confirmResult.writtenPaths,
        createdFiles,
        originalityGuard: {
          plan: confirmGuard.plan,
          blockedPermanentIds: confirmGuard.flaggedPermanentIds,
          evaluations: confirmGuard.evaluations
        }
      });

      return sendJson(res, 200, {
        importRecordId: confirmId,
        status: "completed",
        result: {
          created,
          skipped,
          selection: record.confirmResult.selection,
          writtenPaths: record.confirmResult.writtenPaths,
          createdFiles
        },
        originalityGuard: {
          plan: confirmGuard.plan,
          blockedPermanentIds: confirmGuard.flaggedPermanentIds,
          evaluations: confirmGuard.evaluations
        },
        finishedAt: record.confirmResult.finishedAt
      });
    }

    const rollbackId = parseRollbackPath(url.pathname);
    if (req.method === "POST" && rollbackId) {
      const record = await getImportRecord(rollbackId);
      if (!record) return sendJson(res, 404, err("IMPORT_RECORD_NOT_FOUND", "import record not found", rid));
      if (record.state !== "completed") return sendJson(res, 400, err("IMPORT_STATUS_INVALID", "only completed imports can be rolled back", rid));

      const createdFiles = Array.isArray(record.confirmResult?.createdFiles) ? record.confirmResult.createdFiles : [];
      const { rolledBack, skipped } = await rollbackCreatedFiles(VAULT_PATH, createdFiles);
      for (const item of rolledBack) {
        if (item.noteType === "literature" || item.noteType === "permanent") {
          try {
            await deleteNoteById(VAULT_PATH, item.noteId);
          } catch {}
        }
      }

      const finishedAt = new Date().toISOString();
      record.state = "rolled_back";
      record.rollbackResult = {
        rolledBack,
        skipped,
        finishedAt
      };
      record.updatedAt = finishedAt;
      importRecords.set(rollbackId, record);
      await appendImportRecord(VAULT_PATH, record.connector, rollbackId, "rollback", {
        requestId: rid,
        rolledBack,
        skipped,
        finishedAt
      });

      return sendJson(res, 200, {
        importRecordId: rollbackId,
        status: "rolled_back",
        result: {
          rolledBack: rolledBack.length,
          skipped: skipped.length,
          rolledBackPaths: rolledBack.map((item) => item.path),
          skippedFiles: skipped
        },
        finishedAt
      });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/exports/markdown") {
      const body = await readJson(req);
      const targetPathRaw = String(body.targetPath || "").trim();
      if (!targetPathRaw) return sendJson(res, 400, err("EXPORT_SCOPE_INVALID", "targetPath required", rid));
      const targetPath = path.isAbsolute(targetPathRaw) ? targetPathRaw : path.resolve(CWD, targetPathRaw);
      const result = await exportMarkdown({ vaultPath: VAULT_PATH, targetPath, requestId: rid });
      return sendJson(res, 202, { exportJobId: result.exportJobId, status: result.status, copied: result.copied });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/writing-projects") {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await createWritingProject(VAULT_PATH, body);
        return sendJson(res, 201, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("WRITING_PROJECT_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "GET" && url.pathname === "/api/v1/writing-projects") {
      try {
        await initVault(VAULT_PATH);
        const limit = Number(url.searchParams.get("limit") || 8);
        const items = await listWritingProjects(VAULT_PATH, { limit });
        return sendJson(res, 200, {
          items,
          total: items.length,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("WRITING_PROJECT_INVALID", String(error?.message || error), rid));
      }
    }

    const writingProjectMatch = url.pathname.match(/^\/api\/v1\/writing-projects\/([^/]+)$/);
    if (req.method === "GET" && writingProjectMatch) {
      try {
        await initVault(VAULT_PATH);
        const item = await getWritingProject(VAULT_PATH, decodeURIComponent(writingProjectMatch[1]));
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("WRITING_PROJECT_INVALID", String(error?.message || error), rid));
      }
    }

    const writingDraftBindingMatch = url.pathname.match(/^\/api\/v1\/writing-projects\/([^/]+)\/draft-note$/);
    if (req.method === "POST" && writingDraftBindingMatch) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await bindDraftNoteToProject(VAULT_PATH, {
          writingProjectId: decodeURIComponent(writingDraftBindingMatch[1]),
          draftNoteId: body.draftNoteId || body.draft_note_id,
          sourceScaffoldId: body.sourceScaffoldId || body.source_scaffold_id,
          versionNote: body.versionNote || body.version_note
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("WRITING_PROJECT_INVALID", String(error?.message || error), rid));
      }
    }

    const writingCurrentDraftMatch = url.pathname.match(/^\/api\/v1\/writing-projects\/([^/]+)\/current-draft$/);
    if (req.method === "POST" && writingCurrentDraftMatch) {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await setCurrentDraftNote(VAULT_PATH, {
          writingProjectId: decodeURIComponent(writingCurrentDraftMatch[1]),
          draftNoteId: body.draftNoteId || body.draft_note_id
        });
        return sendJson(res, 200, {
          item,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("WRITING_PROJECT_INVALID", String(error?.message || error), rid));
      }
    }

    const writingDraftVersionsMatch = url.pathname.match(/^\/api\/v1\/writing-projects\/([^/]+)\/draft-versions$/);
    if (req.method === "GET" && writingDraftVersionsMatch) {
      try {
        await initVault(VAULT_PATH);
        const item = await listProjectDraftVersions(
          VAULT_PATH,
          decodeURIComponent(writingDraftVersionsMatch[1]),
          { limit: Number(url.searchParams.get("limit") || 12) }
        );
        return sendJson(res, 200, {
          items: item,
          total: item.length,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("WRITING_PROJECT_INVALID", String(error?.message || error), rid));
      }
    }

    const writingProjectScaffoldsMatch = url.pathname.match(/^\/api\/v1\/writing-projects\/([^/]+)\/scaffolds$/);
    if (req.method === "GET" && writingProjectScaffoldsMatch) {
      try {
        await initVault(VAULT_PATH);
        const item = await listProjectScaffolds(
          VAULT_PATH,
          decodeURIComponent(writingProjectScaffoldsMatch[1]),
          { limit: Number(url.searchParams.get("limit") || 12) }
        );
        return sendJson(res, 200, {
          items: item,
          total: item.length,
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DRAFT_SCAFFOLD_INVALID", String(error?.message || error), rid));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/v1/draft-scaffolds") {
      const body = await readJson(req);
      try {
        await initVault(VAULT_PATH);
        const item = await createDraftScaffold(VAULT_PATH, body);
        return sendJson(res, 201, {
          item,
          export: {
              json: {
                id: item.id,
                writing_project_id: item.writing_project_id,
                sections: item.sections,
                open_questions: item.open_questions,
                generated_by: item.generated_by,
                version_note: item.version_note || "",
                created_at: item.created_at,
                updated_at: item.updated_at
              },
            markdown: item.markdown
          },
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DRAFT_SCAFFOLD_INVALID", String(error?.message || error), rid));
      }
    }

    const draftScaffoldMatch = url.pathname.match(/^\/api\/v1\/draft-scaffolds\/([^/]+)$/);
    if (req.method === "GET" && draftScaffoldMatch) {
      try {
        await initVault(VAULT_PATH);
        const item = await getDraftScaffold(VAULT_PATH, decodeURIComponent(draftScaffoldMatch[1]));
        return sendJson(res, 200, {
          item,
          export: {
              json: {
                id: item.id,
                writing_project_id: item.writing_project_id,
                sections: item.sections,
                open_questions: item.open_questions,
                generated_by: item.generated_by,
                version_note: item.version_note || "",
                created_at: item.created_at,
                updated_at: item.updated_at
              },
            markdown: item.markdown
          },
          requestId: rid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return sendJson(res, 400, err("DRAFT_SCAFFOLD_INVALID", String(error?.message || error), rid));
      }
    }

    return sendJson(res, 404, err("NOT_FOUND", "Route not found", rid));
  } catch (error) {
    return sendJson(res, 500, err("INTERNAL_ERROR", String(error?.message || error), rid));
  }
});

server.listen(PORT, async () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`Vault path: ${VAULT_PATH}`);
  try {
    await initVault(VAULT_PATH);
    console.log("Vault initialized.");
  } catch (error) {
    console.error(`Vault initialization failed: ${String(error?.message || error)}`);
  }
});
