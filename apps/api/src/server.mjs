import http from "node:http";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  appendImportRecord,
  buildExternalCandidates,
  createdEntryFromWriteResult,
  loadImportRecord,
  publicImportRecord,
  rollbackCreatedFiles
} from "../../../packages/connectors/src/index.mjs";
import {
  createDirectory,
  createNoteInDirectory,
  deleteDirectory,
  deleteNoteById,
  getNoteById,
  initVault,
  listDirectories,
  listNotesInDirectory,
  moveNoteToDirectory,
  registerMarkdownNoteInCatalog,
  updateDirectory,
  updateNoteContent,
  writeLiteratureNoteIfAbsent,
  writePermanentNoteIfAbsent,
  writeSourceIfAbsent
} from "../../../packages/domain/src/index.mjs";
import { exportMarkdown } from "../../../packages/export-engine/src/index.mjs";
import { buildMarkdownCandidates } from "../../../packages/markdown-engine/src/index.mjs";
import { normalizeOriginalityPlan, originalityGuard } from "../../../packages/originality-guard/src/index.mjs";

const PORT = Number(process.env.API_PORT || 3000);
const CWD = process.cwd();
const VAULT_PATH = process.env.VAULT_PATH || path.join(CWD, "vault-example", "yansilu-vault");

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

function parseDirectoryNotesPath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/directories\/([^/]+)\/notes$/);
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

function parseMoveNotePath(urlPath) {
  const m = urlPath.match(/^\/api\/v1\/notes\/([^/]+)\/move$/);
  return m ? decodeURIComponent(m[1]) : null;
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const rid = requestId(req);

  try {
    if (req.method === "OPTIONS") return sendJson(res, 204, {});

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { ok: true, service: "api", requestId: rid, vaultPath: VAULT_PATH, time: new Date().toISOString() });
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

      const confirmPlan = normalizeOriginalityPlan(body.originalityPlan || record.originalityGuard?.plan || {});
      const confirmGuard = originalityGuard(record.candidates, confirmPlan);
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

      for (const source of record.candidates.sources) {
        const result = await writeSourceIfAbsent(VAULT_PATH, source);
        if (result.written) {
          created.sources += 1;
          writtenPaths.add(path.dirname(result.path));
          createdFiles.push(await createdEntryFromWriteResult(VAULT_PATH, result));
        } else skipped.conflicted += 1;
      }
      for (const ln of record.candidates.literature) {
        const result = await writeLiteratureNoteIfAbsent(VAULT_PATH, ln);
        if (result.written) {
          created.literatureNotes += 1;
          writtenPaths.add(path.dirname(result.path));
          createdFiles.push(await createdEntryFromWriteResult(VAULT_PATH, result));
          await registerImportCatalogNote(ln, "literature", result);
        } else skipped.conflicted += 1;
      }
      for (const pn of record.candidates.permanent) {
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
          writtenPaths: record.confirmResult.writtenPaths
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

    return sendJson(res, 404, err("NOT_FOUND", "Route not found", rid));
  } catch (error) {
    return sendJson(res, 500, err("INTERNAL_ERROR", String(error?.message || error), rid));
  }
});

server.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`Vault path: ${VAULT_PATH}`);
});
