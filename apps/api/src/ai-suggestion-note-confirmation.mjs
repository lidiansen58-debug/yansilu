import path from "node:path";
import { createHash } from "node:crypto";
import { getNoteById, updateNoteContent } from "../../../packages/domain/src/index.mjs";
import { transitionSuggestionStatus } from "../../../packages/ai-orchestrator/src/suggestions.mjs";

function failure(code, message) { return Object.assign(new Error(message), { code }); }
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const suggestionWriteRevision = item => hash([item.target, item.sourceArtifactId, item.status, item.content, item.history, item.updatedAt]);

export function suggestionNoteField(item) {
  if (item?.target?.type !== "permanent_note") return "";
  const field = item.target.field;
  return field === "thesis" ? field : ["three_line_summary", "threeLineSummary"].includes(field) ? "threeLineSummary" : "";
}

export async function suggestionNoteWriteBase(vaultPath, item) {
  if (!suggestionNoteField(item)) return null;
  try {
    const note = await getNoteById(vaultPath, item.target.id);
    if (note.noteType !== "permanent") return null;
    return { vaultPath, noteId: note.id, fileRevision: note.fileRevision, suggestionRevision: suggestionWriteRevision(item) };
  } catch (error) {
    if (String(error.message).includes("not found")) return null;
    throw error;
  }
}

function reviewedField(item, content) {
  const field = suggestionNoteField(item);
  if (!field) throw failure("AI_SUGGESTION_WRITE_TARGET_INVALID", "这条建议不支持写入笔记字段。");
  const value = content && typeof content === "object" && !Array.isArray(content)
    ? content[field] ?? content[item.target.field] ?? (field === "threeLineSummary" ? content.three_line_summary : undefined) : content;
  if (field === "thesis" && typeof value === "string" && value.trim()) return { thesis: value.trim() };
  if (field === "threeLineSummary" && Array.isArray(value) && value.length && value.length <= 3 && value.every(line => typeof line === "string" && line.trim())) {
    return { threeLineSummary: value.map(line => line.trim()) };
  }
  throw failure("AI_SUGGESTION_WRITE_CONTENT_INVALID", "建议内容无效，请保留修改并重新核对。");
}

// The note save lock and its SQLite transaction cover both the catalog and attached AI metadata.
// Markdown rollback is conditional on our bytes still being on disk, preserving external edits.
export async function confirmSuggestionIntoNote({ vaultPath, currentVaultPath, suggestionStore, artifactStore,
  item, sourceArtifact, body, projectArtifact }) {
  const base = body.writeBase;
  if (!base || base.noteId !== item.target.id || !/^[a-f0-9]{64}$/.test(base.fileRevision || "") || !/^[a-f0-9]{64}$/.test(base.suggestionRevision || "")) {
    throw failure("AI_SUGGESTION_WRITE_BASE_INVALID", "缺少审阅时的笔记版本，请保留修改并重新打开建议。");
  }
  const assertVault = () => {
    if (path.resolve(currentVaultPath()) !== path.resolve(vaultPath) ||
      typeof body.writeBase?.vaultPath !== "string" || path.relative(vaultPath, path.resolve(body.writeBase.vaultPath)) !== "") {
      throw failure("AI_SUGGESTION_WRITE_VAULT_CHANGED", "笔记库已切换，本次确认未写入。请返回原笔记库核对。");
    }
  };
  assertVault();
  if (body.status !== "confirmed" || body.userConfirmed !== true) {
    throw failure("AI_SUGGESTION_WRITE_CONFIRM_REQUIRED", "写入需要明确确认。");
  }
  const update = reviewedField(item, body.content ?? item.content);
  const operationKey = hash([base, update]);
  if (item.status === "confirmed" && item.provenance?.noteWrite?.operationKey === operationKey) {
    return { item, artifact: sourceArtifact };
  }
  if (suggestionWriteRevision(item) !== base.suggestionRevision) {
    throw failure("AI_SUGGESTION_WRITE_REVIEW_CHANGED", "建议已变化，请保留修改并重新核对。");
  }
  const note = await getNoteById(vaultPath, item.target.id);
  assertVault();
  if (note.noteType !== "permanent") throw failure("AI_SUGGESTION_WRITE_TARGET_INVALID", "目标不是永久笔记，本次未写入。");
  const next = transitionSuggestionStatus(item, "confirmed", body);
  next.provenance = { ...next.provenance, noteWrite: { operationKey, noteId: note.id, field: suggestionNoteField(item) } };
  const projected = sourceArtifact ? projectArtifact(sourceArtifact, next) : null;
  if (sourceArtifact && path.resolve(artifactStore.dbPath) !== path.resolve(suggestionStore.dbPath)) {
    throw failure("AI_SUGGESTION_WRITE_STORE_INVALID", "审阅存储不一致，本次未写入。");
  }
  const saved = await updateNoteContent(vaultPath, note.id, {
    ...update, expectedRevision: base.fileRevision,
    ...(update.thesis && update.thesis !== note.thesis ? {
      thesisChangeReason: "确认人工改写的 AI 建议。", viewpointChangeStatus: "draft"
    } : {})
  }, {
    prepareTransaction(db) { db.prepare("ATTACH DATABASE ? AS ai_review").run(suggestionStore.dbPath); },
    beforeWrite: assertVault,
    commitTransaction(db) {
      assertVault();
      const changed = db.prepare(`UPDATE ai_review.ai_suggestions SET content_json = ?, status = ?,
        provenance_json = ?, history_json = ?, updated_at = ?
        WHERE id = ? AND status = ? AND content_json = ? AND history_json = ? AND updated_at = ?`).run(
        JSON.stringify(next.content), next.status, JSON.stringify(next.provenance), JSON.stringify(next.history), next.updatedAt,
        item.id, item.status, JSON.stringify(item.content), JSON.stringify(item.history), item.updatedAt);
      if (Number(changed.changes) !== 1) throw failure("AI_SUGGESTION_WRITE_REVIEW_CHANGED", "建议已变化，本次确认未写入。请重新核对。");
      if (projected) {
        const artifactChanged = db.prepare(`UPDATE ai_review.ai_artifacts SET status = ?, payload_json = ?, provenance_json = ?, updated_at = ?
          WHERE id = ? AND status = ? AND payload_json = ? AND updated_at = ?`).run(
          projected.status, JSON.stringify(projected.payload), JSON.stringify(projected.provenance), next.updatedAt,
          sourceArtifact.id, sourceArtifact.status, JSON.stringify(sourceArtifact.payload), sourceArtifact.updatedAt);
        if (Number(artifactChanged.changes) !== 1) throw failure("AI_SUGGESTION_WRITE_REVIEW_CHANGED", "建议来源已变化，本次确认未写入。请重新核对。");
      }
    }
  });
  return { item: suggestionStore.get(item.id), artifact: sourceArtifact ? artifactStore.getArtifact(sourceArtifact.id) : null, note: saved };
}
