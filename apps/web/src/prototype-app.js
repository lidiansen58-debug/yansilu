import {
  childFolders,
  createInitialState,
  folderById,
  joinFsPath,
  notesInFolder,
  rootBoxIdFromFolder,
  typeFromFolder,
  uid
} from "./prototype-store.js";
import { ContextMenu } from "./components-context-menu.js";
import { CreateBoxDialog } from "./components-create-box-dialog.js";
import { createDesktopFileCommandService } from "./desktop-file-command-service.js";
import { ExplorerPane } from "./components-explorer-pane.js";
import { EditorPane } from "./components-editor-pane.js";
import { basenameLocalPath, dirnameLocalPath, joinLocalPath } from "./desktop-file-adapter.js";
import {
  bindWritingDraftNote,
  cancelImport,
  confirmImport,
  createDirectory,
  createDraftScaffold,
  createNote,
  createWritingProject,
  deleteDirectory,
  deleteNote,
  exportMarkdown,
  fetchDraftScaffold,
  fetchDirectories,
  fetchDirectoryGraph,
  fetchDirectoryNotes,
  fetchImportRecord,
  listImportRecords,
  fetchNote,
  fetchWritingProject,
  listProjectDraftVersions,
  listProjectScaffolds,
  listWritingProjects,
  fetchVaultInfo,
  getApiBase,
  moveNote,
  previewImport,
  rollbackImport,
  switchVault,
  updateDirectory,
  updateNote
} from "./prototype-api.js";

const $ = (id) => document.getElementById(id);
const state = createInitialState();
const importState = {
  importRecordId: "",
  lastPreview: null,
  lastResultPayload: null,
  historyItems: [],
  historyTotal: 0,
  historyLoading: false,
  historyStatusFilter: "all",
  historyConnectorFilter: "all",
  historyRiskFilter: "all",
  selectionImportRecordId: "",
  selectedCandidateIds: new Set(),
  previewFilter: "all",
  resultFocusReason: ""
};
const graphState = {
  item: null,
  loading: false,
  error: ""
};
const settingsState = {
  vault: null,
  error: ""
};
const writingState = {
  project: null,
  scaffold: null,
  scaffoldMarkdown: "",
  projects: [],
  loadingProjects: false,
  scaffoldVersions: [],
  loadingScaffoldVersions: false,
  draftVersions: [],
  loadingDraftVersions: false
};
const desktopCommands = createDesktopFileCommandService({ switchVaultImpl: switchVault });
let statusRevision = 0;

function setStatus(text, cls = "", options = {}) {
  const requiredRevision = Number(options?.skipIfStaleSince || 0);
  if (requiredRevision && statusRevision !== requiredRevision) return false;
  const requiredModule = String(options?.requireModule || "").trim();
  if (requiredModule && state.module !== requiredModule) return false;
  statusRevision += 1;
  $("statusText").className = `status-pill ${cls}`.trim();
  $("statusText").textContent = text;
  const statusBar = $("statusBar");
  if (statusBar) statusBar.dataset.tone = cls || "";
  return true;
}

function setImportRecordId(value) {
  importState.importRecordId = String(value || "").trim();
  const input = $("importRecordId");
  if (input) input.value = importState.importRecordId;
  renderImportHistory();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function primitiveEntries(value = {}) {
  return Object.entries(value || {}).filter(([, item]) => item === null || ["string", "number", "boolean"].includes(typeof item));
}

function compactValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

function formatImportTimestamp(value) {
  if (!value) return "时间未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function importStatusLabel(status) {
  const labels = {
    preview: "预览",
    completed: "已写入",
    rolled_back: "已回滚",
    cancelled: "已取消"
  };
  return labels[String(status || "").trim()] || compactValue(status);
}

function importStatusTone(status) {
  const tones = {
    preview: "neutral",
    completed: "ok",
    rolled_back: "warn",
    cancelled: "muted"
  };
  return tones[String(status || "").trim()] || "neutral";
}

function importHistorySummary(record = {}) {
  const summary = record.summary || {};
  return `S${Number(summary.sources || 0)} · L${Number(summary.literatureNotes || 0)} · P${Number(summary.permanentNotes || 0)} · W${Number(summary.warnings || 0)}`;
}

function importHistoryOriginalityCounts(record = {}) {
  const evaluations = Array.isArray(record.originalityGuard?.evaluations) ? record.originalityGuard.evaluations : [];
  return {
    blocked: evaluations.filter((item) => String(item?.status || "").trim() === "blocked").length,
    warning: evaluations.filter((item) => String(item?.status || "").trim() === "warning").length
  };
}

function importHistoryAlertBadges(record = {}) {
  const status = String(record.status || record.state || "").trim();
  const badges = [];
  const summaryWarnings = Number(record.summary?.warnings || 0);
  const originality = importHistoryOriginalityCounts(record);
  const warningCount = Math.max(summaryWarnings, originality.warning);
  if (warningCount > 0) {
    badges.push({
      tone: "warn",
      text: `Warning ${warningCount}`
    });
  }
  if (originality.blocked > 0) {
    badges.push({
      tone: "bad",
      text: `Blocked ${originality.blocked}`
    });
  }
  if (status === "rolled_back") {
    const skipped = Array.isArray(record.rollbackResult?.skipped) ? record.rollbackResult.skipped : [];
    const modifiedCount = skipped.filter((item) => String(item?.reason || "").trim() === "modified").length;
    if (modifiedCount > 0) {
      badges.push({
        tone: "warn",
        text: `Modified ${modifiedCount}`
      });
    }
  }
  return badges;
}

function importHistoryMatchesRisk(record = {}, riskFilter = "all") {
  const normalized = String(riskFilter || "all").trim();
  if (normalized === "all") return true;

  const summaryWarnings = Number(record.summary?.warnings || 0);
  const originality = importHistoryOriginalityCounts(record);
  const skipped = Array.isArray(record.rollbackResult?.skipped) ? record.rollbackResult.skipped : [];
  const modifiedCount = skipped.filter((item) => String(item?.reason || "").trim() === "modified").length;

  if (normalized === "warning") {
    return summaryWarnings > 0 || originality.warning > 0 || skipped.length > 0;
  }
  if (normalized === "blocked") {
    return originality.blocked > 0;
  }
  if (normalized === "modified") {
    return modifiedCount > 0;
  }
  return true;
}

function importHistoryDetailSummary(record = {}) {
  const status = String(record.status || record.state || "").trim();
  if (status === "preview") {
    const summary = record.summary || {};
    const originality = importHistoryOriginalityCounts(record);
    const detail = [
      `候选 ${Number(summary.sources || 0)} Source · ${Number(summary.literatureNotes || 0)} Literature · ${Number(summary.permanentNotes || 0)} Permanent`
    ];
    const signals = [];
    if (Number(summary.warnings || 0) > 0) signals.push(`warning ${Number(summary.warnings || 0)}`);
    if (originality.warning > 0) signals.push(`originality warning ${originality.warning}`);
    if (originality.blocked > 0) signals.push(`blocked ${originality.blocked}`);
    detail.push(signals.length ? `需人工检查：${signals.join(" · ")}` : "当前预览未发现需要额外处理的 warning");
    return detail;
  }
  if (status === "completed") {
    const created = record.confirmResult?.created || {};
    const skipped = record.confirmResult?.skipped || {};
    const writtenPaths = Array.isArray(record.confirmResult?.writtenPaths) ? record.confirmResult.writtenPaths.filter(Boolean) : [];
    return [
      `已创建 S${Number(created.sources || 0)} · L${Number(created.literatureNotes || 0)} · P${Number(created.permanentNotes || 0)}`,
      `跳过 冲突${Number(skipped.conflicted || 0)} · 无效${Number(skipped.invalid || 0)}`,
      writtenPaths.length ? `写入 ${writtenPaths.join("、")}` : "写入目录待确认"
    ];
  }
  if (status === "rolled_back") {
    const rolledBack = Array.isArray(record.rollbackResult?.rolledBack) ? record.rollbackResult.rolledBack : [];
    const skipped = Array.isArray(record.rollbackResult?.skipped) ? record.rollbackResult.skipped : [];
    const modifiedCount = skipped.filter((item) => String(item?.reason || "").trim() === "modified").length;
    return [
      `已回滚 ${rolledBack.length} 项`,
      `跳过 ${skipped.length} 项`,
      modifiedCount ? `其中 ${modifiedCount} 项因已被修改而保留` : skipped.length ? "存在未回滚文件，请查看详情" : "未发现需要人工处理的回滚冲突"
    ];
  }
  return [];
}

function importHistoryActions(record = {}) {
  const status = String(record.status || record.state || "").trim();
  if (status === "completed") {
    return [
      { action: "load", label: "查看结果" },
      { action: "rollback", label: "回滚" }
    ];
  }
  if (status === "preview") {
    return [{ action: "load", label: "读取记录" }];
  }
  if (status === "rolled_back" || status === "cancelled") {
    return [{ action: "load", label: "查看结果" }];
  }
  return [{ action: "load", label: "查看记录" }];
}

function filteredImportHistoryItems() {
  const statusFilter = String(importState.historyStatusFilter || "all").trim();
  const connectorFilter = String(importState.historyConnectorFilter || "all").trim();
  const riskFilter = String(importState.historyRiskFilter || "all").trim();
  return importState.historyItems.filter((record) => {
    const status = String(record.status || record.state || "").trim();
    const connector = String(record.connector || "").trim();
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (connectorFilter !== "all" && connector !== connectorFilter) return false;
    if (!importHistoryMatchesRisk(record, riskFilter)) return false;
    return true;
  });
}

function renderImportHistory() {
  const el = $("importHistory");
  if (!el) return;
  if (importState.historyLoading) {
    el.innerHTML = `<div class="import-history-empty">正在读取导入历史…</div>`;
    return;
  }
  if (!importState.historyItems.length) {
    el.innerHTML = `<div class="import-history-empty">还没有导入记录。先预览一次 Markdown/Obsidian 导入，这里就会出现历史。</div>`;
    return;
  }

  const activeImportRecordId = String(importState.importRecordId || $("importRecordId")?.value || "").trim();
  const filteredItems = filteredImportHistoryItems();
  if (!filteredItems.length) {
    el.innerHTML = `
      <div class="import-history-empty">当前筛选条件下没有导入记录。试试切回“全部状态”或“全部连接器”。</div>
      <div class="toolbar-note">共 ${importState.historyItems.length} 条历史记录，当前过滤后为 0 条。</div>
    `;
    return;
  }
  el.innerHTML = `
    <div class="import-history-list">
      ${filteredItems
        .map((record) => {
          const recordId = String(record.importRecordId || "").trim();
          const status = String(record.status || record.state || "").trim();
          const actions = importHistoryActions(record);
          const badges = importHistoryAlertBadges(record);
          const details = importHistoryDetailSummary(record);
          return `
            <div class="import-history-item ${recordId && recordId === activeImportRecordId ? "is-active" : ""}" data-import-history-id="${escapeHtml(recordId)}">
              <div class="import-history-item-head">
                <strong>${escapeHtml(record.connector || "import")}</strong>
                <div class="import-history-badge-row">
                  <span class="import-history-badge tone-${escapeHtml(importStatusTone(status))}">${escapeHtml(importStatusLabel(status))}</span>
                  ${badges
                    .map(
                      (item) => `
                        <span class="import-history-badge tone-${escapeHtml(item.tone)}">${escapeHtml(item.text)}</span>
                      `
                    )
                    .join("")}
                </div>
              </div>
              <div class="import-history-item-id">${escapeHtml(recordId)}</div>
              <div class="import-history-item-meta">
                <span>${escapeHtml(importHistorySummary(record))}</span>
                <span>${escapeHtml(formatImportTimestamp(record.updatedAt || record.createdAt))}</span>
              </div>
              ${
                details.length
                  ? `<div class="import-history-detail">
                      ${details.map((item) => `<div class="import-history-detail-line">${escapeHtml(item)}</div>`).join("")}
                    </div>`
                  : ""
              }
              <div class="import-history-actions">
                ${actions
                  .map(
                    (item) => `
                      <button class="mini-btn import-history-action" type="button" data-import-history-action="${escapeHtml(item.action)}" data-import-history-id="${escapeHtml(
                        recordId
                      )}">
                        ${escapeHtml(item.label)}
                      </button>
                    `
                  )
                  .join("")}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
    <div class="toolbar-note">当前显示 ${filteredItems.length} 条${importState.historyItems.length !== filteredItems.length ? ` / 已加载 ${importState.historyItems.length} 条` : ""}${importState.historyTotal > importState.historyItems.length ? ` / 共 ${importState.historyTotal} 条` : ""}。</div>
  `;
}

async function refreshImportHistory({ silent = false } = {}) {
  if (!silent) {
    importState.historyLoading = true;
    renderImportHistory();
  }
  try {
    const result = await listImportRecords(12);
    importState.historyItems = result.items;
    importState.historyTotal = result.total;
  } catch (error) {
    if (!silent) {
      setStatus(`读取导入历史失败：${String(error?.message || error)}`, "warn");
    }
  } finally {
    importState.historyLoading = false;
    renderImportHistory();
  }
}

async function loadImportRecordIntoUi(importRecordId, { statusPrefix = "已读取导入记录" } = {}) {
  const cleanImportRecordId = String(importRecordId || "").trim();
  if (!cleanImportRecordId) throw new Error("importRecordId is required");
  const importRecord = await fetchImportRecord(cleanImportRecordId);
  importState.lastPreview =
    importRecord?.status === "preview"
      ? {
          importRecordId: cleanImportRecordId,
          candidatePreview: importRecord.candidatePreview || null,
          originalityGuard: importRecord.originalityGuard || null
        }
      : null;
  importState.previewFilter = "all";
  syncImportSelection(cleanImportRecordId, importRecord?.candidatePreview, { preserve: true });
  setImportRecordId(cleanImportRecordId);
  showImportResult({
    stage: "record",
    importRecord
  });
  setStatus(`${statusPrefix}：${cleanImportRecordId}`, "ok");
  return importRecord;
}

async function rollbackImportIntoUi(importRecordId, { statusPrefix = "回滚完成" } = {}) {
  const cleanImportRecordId = String(importRecordId || "").trim();
  if (!cleanImportRecordId) throw new Error("importRecordId is required");
  const result = await rollbackImport(cleanImportRecordId);
  setImportRecordId(cleanImportRecordId);
  showImportResult({
    stage: "rollback",
    importRecordId: cleanImportRecordId,
    status: result.status,
    result: result.result
  });
  importState.lastPreview = null;
  await refreshImportHistory({ silent: true });
  await refreshImportedNotesView();
  setStatus(`${statusPrefix}：${cleanImportRecordId}`, "ok");
  return result;
}

function syncImportHistoryFiltersFromUi() {
  importState.historyStatusFilter = String($("importHistoryStatus")?.value || "all").trim();
  importState.historyConnectorFilter = String($("importHistoryConnector")?.value || "all").trim();
  importState.historyRiskFilter = String($("importHistoryRisk")?.value || "all").trim();
}

function resultTitle(stage) {
  const titles = {
    preview: "导入预览完成",
    preview_error: "导入预览失败",
    confirm: "导入写入完成",
    confirm_error: "导入写入失败",
    cancel: "导入已取消",
    cancel_error: "取消导入失败",
    record: "导入记录已读取",
    record_error: "读取导入记录失败",
    rollback: "导入回滚完成",
    rollback_error: "导入回滚失败",
    export_markdown: "Markdown 导出完成",
    export_error: "Markdown 导出失败",
    writing_project: "写作项目已创建",
    writing_project_error: "写作项目创建失败",
    draft_scaffold: "草稿骨架已生成",
    draft_scaffold_error: "草稿骨架生成失败",
    writing_draft_note: "草稿笔记已创建",
    writing_draft_note_error: "草稿笔记创建失败",
    writing_copy_scaffold: "Scaffold Markdown 已复制",
    writing_copy_scaffold_error: "Scaffold 复制失败",
    writing_export_scaffold: "Scaffold Markdown 已导出",
    writing_export_scaffold_error: "Scaffold 导出失败"
  };
  return titles[stage] || "操作结果";
}

function resultTone(payload = {}) {
  const stage = String(payload.stage || "");
  if (stage.includes("error")) return "bad";
  if (Array.isArray(payload.warnings) && payload.warnings.length) return "warn";
  if (payload.status === "blocked" || payload.status === "failed") return "bad";
  if (Number(payload.result?.skipped || 0) > 0) return "warn";
  if (Number(payload.result?.skipped?.invalid || 0) > 0 || Number(payload.result?.skipped?.conflicted || 0) > 0) return "warn";
  return "ok";
}

function resultMetrics(payload = {}) {
  const stage = String(payload.stage || "");
  const metrics = [];
  const push = (label, value) => {
    if (value !== undefined) metrics.push({ label, value: compactValue(value) });
  };

  if (stage === "preview") {
    push("ImportRecord", payload.importRecordId);
    push("连接器", payload.connector);
    push("状态", payload.status);
    for (const [key, value] of primitiveEntries(payload.summary)) push(key, value);
    push("Warnings", Array.isArray(payload.warnings) ? payload.warnings.length : 0);
    return metrics;
  }

  if (stage === "confirm" || stage === "rollback") {
    push("ImportRecord", payload.importRecordId);
    push("状态", payload.status);
    if (payload.result?.selection) {
      const selection = payload.result.selection;
      push("已选候选", `${compactValue(selection.selectedCandidates)}/${compactValue(selection.totalCandidates)}`);
      push("选择模式", selection.mode);
    }
    for (const [key, value] of primitiveEntries(payload.result)) push(key, value);
    return metrics;
  }

  if (stage === "record") {
    push("ImportRecord", payload.importRecord?.importRecordId);
    push("状态", payload.importRecord?.status);
    push("连接器", payload.importRecord?.connector);
    return metrics;
  }

  if (stage === "export_markdown") {
    push("ExportJob", payload.exportJobId);
    push("状态", payload.status);
    push("复制文件", payload.copied);
    push("目标路径", payload.targetPath);
    return metrics;
  }

  if (stage === "writing_project") {
    push("Project", payload.writingProjectId);
    push("标题", payload.title);
    push("篮子笔记", Array.isArray(payload.basketNoteIds) ? payload.basketNoteIds.length : undefined);
    return metrics;
  }

  if (stage === "draft_scaffold") {
    push("Project", payload.writingProjectId);
    push("Scaffold", payload.draftScaffoldId);
    push("章节数", Array.isArray(payload.sections) ? payload.sections.length : undefined);
    return metrics;
  }

  if (stage === "writing_draft_note") {
    push("Project", payload.writingProjectId);
    push("Scaffold", payload.draftScaffoldId);
    push("Note", payload.noteId);
    push("目录", payload.directoryId);
    return metrics;
  }

  if (stage === "writing_copy_scaffold" || stage === "writing_export_scaffold") {
    push("Project", payload.writingProjectId);
    push("Scaffold", payload.draftScaffoldId);
    push("文件", payload.fileName);
    push("字符数", payload.characters);
    return metrics;
  }

  push("代码", payload.code);
  push("消息", payload.message);
  push("状态", payload.status);
  return metrics;
}

function warningItems(payload = {}) {
  const warnings = [];
  if (Array.isArray(payload.warnings)) warnings.push(...payload.warnings);
  if (payload.code) warnings.push({ code: payload.code, message: payload.message || "" });
  const evaluations = payload.originalityGuard?.evaluations;
  if (Array.isArray(evaluations)) {
    for (const item of evaluations) {
      if (item?.status && item.status !== "pass") {
        warnings.push({
          code: `ORIGINALITY_${String(item.status).toUpperCase()}`,
          message: `${item.id || "note"}: ${item.reasons?.join(", ") || item.status}`
        });
      }
    }
  }
  return warnings;
}

function uniqueStrings(items = []) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}

function actionableTextForCode(code, payload = {}) {
  const normalized = String(code || "").trim();
  const map = {
    IMPORT_EMPTY_PAYLOAD: "补充 Payload JSON，或为 Markdown/Obsidian 导入填写一个存在的本机路径。",
    IMPORT_SOURCE_UNREADABLE: "确认导入路径存在、当前进程有读取权限，并尽量使用绝对路径。",
    IMPORT_MARKDOWN_FILE_UNREADABLE: "检查被跳过的 Markdown 文件权限或编码，修复后重新预览导入。",
    IMPORT_MALFORMED_FRONTMATTER: "修正 frontmatter 的 --- 起止边界；预览仍会继续，但建议在确认写入前先处理。",
    IMPORT_NO_MARKDOWN_FILE: "确认目录中包含 .md 文件；如果是 Obsidian vault，请选择 vault 根目录或目标子目录。",
    IMPORT_PAYLOAD_INVALID: "检查 connector 名称和 JSON 结构，确认连接器为 markdown、obsidian、zotero、readwise 或 notebooklm。",
    IMPORT_RECORD_NOT_FOUND: "确认 ImportRecord ID 是否来自当前 Vault；切换 Vault 后需要重新预览。",
    IMPORT_STATUS_INVALID: "确认导入记录处于正确阶段：只有 preview 可确认，只有 completed 可回滚。",
    IMPORT_CONFIRM_REQUIRED: "点击“确认写入”时需要明确 confirm=true；如果只是放弃本次导入，请使用取消。",
    IMPORT_ORIGINALITY_BLOCKED: "先改写被阻止的永久笔记，或在确认接口中显式传入 originalityOverride=true 后再写入。",
    ORIGINALITY_GUARD_WARNING: "检查 warning 笔记的引用定位和转述质量；需要直接写入时可开启 allowDraftOnWarning。",
    ORIGINALITY_GUARD_BLOCKED: "把高相似度文本改写成自己的核心主张，并补充来源定位后重新预览。",
    ORIGINALITY_WARNING: "补充引用定位或增强转述，再重新运行原创性检查。",
    ORIGINALITY_BLOCKED: "降低与文献摘录的相似度，保留证据链但重写永久笔记表述。",
    WRITING_PROJECT_INVALID: "确认标题不为空，并且 basket 里只放原创/永久笔记 ID。",
    DRAFT_SCAFFOLD_INVALID: "先创建有效写作项目，再用返回的 writingProjectId 生成草稿骨架。",
    WRITING_DRAFT_INVALID: "请先生成 scaffold，再保存成草稿笔记。"
  };
  if (map[normalized]) return map[normalized];
  if (payload.message) return `根据错误信息处理：${payload.message}`;
  return "";
}

function actionableTextForReason(reason) {
  const map = {
    core_claim_empty: "补充永久笔记的核心主张，避免只留下标题或空正文。",
    similarity_above_warn_threshold: "把与文献相近的句子改写成自己的判断，并保留引用来源。",
    similarity_above_block_threshold: "当前文本过于接近来源材料，需要重写后再确认导入。",
    citation_locator_missing: "为引用补充页码、章节、时间戳或其他可追溯定位。"
  };
  return map[String(reason || "")] || "";
}

function actionItems(payload = {}, warnings = []) {
  const actions = [];
  for (const warning of warnings) {
    const text = actionableTextForCode(warning?.code, payload);
    if (text) actions.push(text);
  }

  const evaluations = Array.isArray(payload.originalityGuard?.evaluations) ? payload.originalityGuard.evaluations : [];
  for (const item of evaluations) {
    for (const reason of item?.reasons || []) {
      const text = actionableTextForReason(reason);
      if (text) actions.push(text);
    }
  }

  const skipped = payload.result?.skipped;
  if (typeof skipped === "number" && skipped > 0) {
    actions.push("回滚时有文件被跳过，请查看 skippedFiles；如果 reason 是 modified，需要手动对比后决定是否删除。");
  }
  if (Number(skipped?.conflicted || 0) > 0) {
    actions.push("有目标文件已存在，导入没有覆盖；重命名源文件或清理目标文件后重新确认。");
  }
  if (Number(skipped?.invalid || 0) > 0) {
    actions.push("有永久笔记因为原创性 warning 被跳过；修复引用/转述，或允许 warning 作为 draft 写入。");
  }
  if (Array.isArray(payload.result?.skippedFiles) && payload.result.skippedFiles.length) {
    const modified = payload.result.skippedFiles.some((item) => item?.reason === "modified");
    actions.push(modified ? "被修改过的文件不会自动回滚；请打开对应路径手动合并或删除。" : "检查 skippedFiles 中的 reason 和 path，再手动处理未回滚文件。");
  }

  if (payload.stage === "writing_project_error" && /only accepts permanent notes/i.test(payload.message || "")) {
    actions.push("先在原创笔记目录中选择 PermanentNote，再加入写作篮子。");
  }
  if (payload.stage === "writing_project_error" && /basketNoteIds/i.test(payload.message || "")) {
    actions.push("至少加入一条原创笔记 ID；可以先打开一条原创笔记后点击“加入当前笔记”。");
  }
  if (payload.stage === "writing_project_error" && /title/i.test(payload.message || "")) {
    actions.push("补充写作项目标题后再创建。");
  }
  if (payload.stage === "writing_draft_note_error" && /scaffold/i.test(payload.message || "")) {
    actions.push("先点击“生成草稿骨架”，确认预览区已经出现章节和 Markdown。");
  }

  return uniqueStrings(actions).slice(0, 5);
}

function candidatePreviewFromPayload(payload = {}) {
  return payload.candidatePreview || payload.importRecord?.candidatePreview || null;
}

function candidatePreviewItems(candidatePreview) {
  return candidateGroups(candidatePreview).flatMap((group) =>
    group.items
      .filter((item) => item?.id)
      .map((item) => ({
        ...item,
        candidateGroup: group.title
      }))
  );
}

function normalizePreviewOriginalityPlan(originalityGuard = null) {
  const plan = originalityGuard?.plan || {};
  return {
    allowDraftOnWarning: plan.allowDraftOnWarning !== false,
    blockOnBlocked: plan.blockOnBlocked !== false
  };
}

function isConfirmableCandidate(item = {}, originalityGuard = null) {
  if (item.candidateGroup !== "PermanentNote") return true;
  const plan = normalizePreviewOriginalityPlan(originalityGuard);
  if (item.originalityStatus === "blocked") return !plan.blockOnBlocked;
  if (item.originalityStatus === "warning") return plan.allowDraftOnWarning;
  return true;
}

function candidatePreviewItemIds(candidatePreview) {
  return candidatePreviewItems(candidatePreview).map((item) => String(item.id));
}

function syncImportSelection(importRecordId, candidatePreview, { preserve = false } = {}) {
  const cleanRecordId = String(importRecordId || "").trim();
  const candidateIds = candidatePreviewItemIds(candidatePreview);
  const selected = new Set();
  if (preserve && importState.selectionImportRecordId === cleanRecordId) {
    for (const id of candidateIds) {
      if (importState.selectedCandidateIds.has(id)) selected.add(id);
    }
  } else {
    for (const id of candidateIds) selected.add(id);
  }
  importState.selectionImportRecordId = cleanRecordId;
  importState.selectedCandidateIds = selected;
}

function selectedCandidateIdsFor(candidatePreview, importRecordId, selection = null) {
  if (selection && Array.isArray(selection.candidateIds)) {
    return new Set(selection.candidateIds.map((item) => String(item || "").trim()).filter(Boolean));
  }
  if (importState.selectionImportRecordId === String(importRecordId || "").trim()) {
    return new Set(importState.selectedCandidateIds);
  }
  return new Set(candidatePreviewItemIds(candidatePreview));
}

function selectionSummary(candidatePreview, importRecordId, selection = null) {
  const totalIds = candidatePreviewItemIds(candidatePreview);
  const selectedIds = selectedCandidateIdsFor(candidatePreview, importRecordId, selection);
  return {
    selectedIds,
    selectedCount: totalIds.filter((id) => selectedIds.has(id)).length,
    totalCount: totalIds.length,
    excludedCount: totalIds.filter((id) => !selectedIds.has(id)).length
  };
}

function candidateGroups(candidatePreview) {
  if (!candidatePreview) return [];
  return [
    { title: "Source", items: candidatePreview.sources || [] },
    { title: "LiteratureNote", items: candidatePreview.literatureNotes || [] },
    { title: "PermanentNote", items: candidatePreview.permanentNotes || [] }
  ].filter((group) => Array.isArray(group.items) && group.items.length);
}

function candidateBadge(item = {}) {
  return item.originalityStatus || item.status || item.sourceType || item.type || "candidate";
}

function candidateMeta(item = {}) {
  return uniqueStrings([item.id, item.importedFrom, item.locator, item.sourceId]).join(" · ");
}

function candidateReasonText(reason) {
  const map = {
    core_claim_empty: "核心主张为空",
    similarity_above_warn_threshold: "相似度偏高",
    similarity_above_block_threshold: "相似度阻断",
    citation_locator_missing: "缺少引用定位"
  };
  return map[String(reason || "")] || String(reason || "");
}

function candidateTone(item = {}) {
  if (item.originalityStatus === "blocked") return "blocked";
  if (item.originalityStatus === "warning") return "warning";
  if (item.originalityStatus === "pass") return "pass";
  return "neutral";
}

function candidateReasonBadges(item = {}) {
  const reasons = Array.isArray(item.reasons) ? item.reasons : [];
  return reasons
    .map(
      (reason) =>
        `<span class="candidate-reason candidate-reason-${escapeHtml(candidateTone(item))}">${escapeHtml(candidateReasonText(reason))}</span>`
    )
    .join("");
}

function safeCandidateIds(candidatePreview) {
  return candidatePreviewItems(candidatePreview)
    .filter((item) => item.originalityStatus !== "blocked")
    .map((item) => String(item.id));
}

function confirmableCandidateIds(candidatePreview, originalityGuard = null) {
  return candidatePreviewItems(candidatePreview)
    .filter((item) => isConfirmableCandidate(item, originalityGuard))
    .map((item) => String(item.id));
}

function candidateIdsByOriginalityStatus(candidatePreview, originalityStatus) {
  return candidatePreviewItems(candidatePreview)
    .filter((item) => item.originalityStatus === originalityStatus)
    .map((item) => String(item.id));
}

function riskyCandidateIds(candidatePreview) {
  return candidatePreviewItems(candidatePreview)
    .filter((item) => item.originalityStatus === "warning" || item.originalityStatus === "blocked")
    .map((item) => String(item.id));
}

function candidateFilterCounts(candidatePreview, importRecordId, selection = null, originalityGuard = null) {
  const items = candidatePreviewItems(candidatePreview);
  const selectedIds = selectedCandidateIdsFor(candidatePreview, importRecordId, selection);
  const safeIds = new Set(safeCandidateIds(candidatePreview));
  const confirmableIds = new Set(confirmableCandidateIds(candidatePreview, originalityGuard));
  return {
    all: items.length,
    confirmable: items.filter((item) => confirmableIds.has(String(item.id))).length,
    safe: items.filter((item) => safeIds.has(String(item.id))).length,
    risky: items.filter((item) => item.originalityStatus === "warning" || item.originalityStatus === "blocked").length,
    excluded: items.filter((item) => !selectedIds.has(String(item.id))).length,
    warning: items.filter((item) => item.originalityStatus === "warning").length,
    blocked: items.filter((item) => item.originalityStatus === "blocked").length
  };
}

function matchesCandidateFilter(item, filter, selectedIds, originalityGuard = null) {
  const candidateId = String(item?.id || "");
  if (filter === "confirmable") return isConfirmableCandidate(item, originalityGuard);
  if (filter === "safe") return item?.originalityStatus !== "blocked";
  if (filter === "risky") return item?.originalityStatus === "warning" || item?.originalityStatus === "blocked";
  if (filter === "excluded") return !selectedIds.has(candidateId);
  if (filter === "warning") return item?.originalityStatus === "warning";
  if (filter === "blocked") return item?.originalityStatus === "blocked";
  return true;
}

function filterLabel(filter) {
  const labels = {
    all: "全部",
    confirmable: "仅可确认项",
    safe: "仅安全项",
    risky: "仅风险项",
    excluded: "已排除",
    warning: "仅 Warning",
    blocked: "仅 Blocked"
  };
  return labels[filter] || "全部";
}

function resultFocusLabel(reason) {
  const labels = {
    unselected: "未勾选跳过",
    invalid: "原创性跳过",
    conflicted: "文件冲突跳过"
  };
  return labels[String(reason || "").trim()] || "候选";
}

function excludedCandidateItems(candidatePreview, importRecordId, selection = null) {
  const selectedIds = selectedCandidateIdsFor(candidatePreview, importRecordId, selection);
  return candidatePreviewItems(candidatePreview).filter((item) => !selectedIds.has(String(item.id)));
}

function confirmSkippedCandidateIds(payload = {}, candidatePreview = null) {
  const empty = { unselected: [], invalid: [], conflicted: [] };
  if (String(payload.stage || "") !== "confirm" || !candidatePreview) return empty;

  const importRecordId = payload.importRecordId || payload.importRecord?.importRecordId || "";
  const selection = payload.result?.selection || null;
  const items = candidatePreviewItems(candidatePreview);
  const itemIds = items.map((item) => String(item.id || ""));
  const selectedIds = selectedCandidateIdsFor(candidatePreview, importRecordId, selection);
  const unselected = itemIds.filter((id) => !selectedIds.has(id));

  const evaluationById = new Map(
    (Array.isArray(payload.originalityGuard?.evaluations) ? payload.originalityGuard.evaluations : []).map((item) => [
      String(item?.permanentId || item?.id || ""),
      item
    ])
  );
  const plan = normalizePreviewOriginalityPlan(payload.originalityGuard || null);
  const invalid = items
    .filter((item) => item.candidateGroup === "PermanentNote" && selectedIds.has(String(item.id || "")))
    .filter((item) => {
      const evaluation = evaluationById.get(String(item.id || ""));
      const status = String(evaluation?.status || item.originalityStatus || "");
      return status === "warning" && !plan.allowDraftOnWarning;
    })
    .map((item) => String(item.id || ""));

  const invalidSet = new Set(invalid);
  const createdIds = new Set((Array.isArray(payload.result?.createdFiles) ? payload.result.createdFiles : []).map((item) => String(item?.noteId || "")).filter(Boolean));
  const conflicted = itemIds.filter((id) => selectedIds.has(id) && !invalidSet.has(id) && !createdIds.has(id));

  return {
    unselected,
    invalid,
    conflicted
  };
}

function confirmSkipReasonMap(payload = {}, candidatePreview = null) {
  if (String(payload.stage || "") !== "confirm" || !candidatePreview) return {};

  const skippedIds = confirmSkippedCandidateIds(payload, candidatePreview);
  const evaluationById = new Map(
    (Array.isArray(payload.originalityGuard?.evaluations) ? payload.originalityGuard.evaluations : []).map((item) => [
      String(item?.permanentId || item?.id || ""),
      item
    ])
  );
  const map = {};

  for (const candidateId of skippedIds.unselected) {
    map[candidateId] = {
      reason: "unselected",
      tone: "neutral",
      message: "未写入原因：确认前取消勾选。"
    };
  }
  for (const candidateId of skippedIds.invalid) {
    const evaluation = evaluationById.get(candidateId);
    const reasons = Array.isArray(evaluation?.reasons) ? evaluation.reasons.map(candidateReasonText).filter(Boolean) : [];
    map[candidateId] = {
      reason: "invalid",
      tone: "warning",
      message: `未写入原因：原创性 warning，当前未允许按 draft 写入。${reasons.length ? ` ${reasons.join("、")}。` : ""}`.trim()
    };
  }
  for (const candidateId of skippedIds.conflicted) {
    map[candidateId] = {
      reason: "conflicted",
      tone: "bad",
      message: "未写入原因：目标路径已有同名文件，系统没有覆盖。"
    };
  }

  return map;
}

function confirmCreatedPermanentNoteIds(payload = {}) {
  if (String(payload.stage || "") !== "confirm") return [];
  return [...new Set(
    (Array.isArray(payload.result?.createdFiles) ? payload.result.createdFiles : [])
      .filter((item) => String(item?.noteType || "").trim() === "permanent")
      .map((item) => String(item?.noteId || "").trim())
      .filter(Boolean)
  )];
}

function renderImportWritingActions(payload = {}) {
  const noteIds = confirmCreatedPermanentNoteIds(payload);
  if (!noteIds.length) return "";
  return `
    <div class="result-actions-inline">
      <button class="mini-btn" type="button" data-import-writing-action="add-permanent-notes">
        加入写作篮子 ${noteIds.length}
      </button>
      <button class="mini-btn" type="button" data-import-writing-action="add-permanent-notes-open-writing">
        加入并打开写作中心
      </button>
      <button class="mini-btn" type="button" data-import-writing-action="create-writing-project">
        直接创建写作项目
      </button>
      <div class="toolbar-note">把本次新写入的 PermanentNote 直接送进写作中心。</div>
    </div>
  `;
}

function renderExcludedCandidateSummary(candidatePreview, options = {}) {
  const importRecordId = options.importRecordId || "";
  const selection = options.selection || null;
  const excludedItems = excludedCandidateItems(candidatePreview, importRecordId, selection);
  if (!excludedItems.length) return "";
  return `
    <div class="candidate-summary candidate-summary-warn">
      <div class="candidate-summary-title">未写入候选</div>
      <div>以下 ${excludedItems.length} 个候选因为未勾选而没有写入本次导入：</div>
      <div class="candidate-summary-list">
        ${excludedItems
          .slice(0, 6)
          .map(
            (item) => `
              <div class="candidate-summary-item">
                <strong>${escapeHtml(item.title || item.id)}</strong>
                <span>${escapeHtml(item.candidateGroup)}</span>
              </div>
            `
          )
          .join("")}
      </div>
      ${excludedItems.length > 6 ? `<div class="toolbar-note">其余 ${excludedItems.length - 6} 项可在原始 JSON 或重新预览中查看。</div>` : ""}
    </div>
  `;
}

function renderConfirmSkipBreakdown(payload = {}, candidatePreview = null, options = {}) {
  if (String(payload.stage || "") !== "confirm") return "";
  const selection = payload.result?.selection || null;
  const skipped = payload.result?.skipped || {};
  const unselected = Math.max(0, Number(selection?.totalCandidates || 0) - Number(selection?.selectedCandidates || 0));
  const originalitySkipped = Math.max(0, Number(skipped.invalid || 0));
  const conflictedSkipped = Math.max(0, Number(skipped.conflicted || 0));
  const total = unselected + originalitySkipped + conflictedSkipped;
  if (!total) return "";

  const focusReason = String(options.focusReason || "").trim();

  const rows = [
    {
      key: "unselected",
      tone: "neutral",
      label: "未勾选跳过",
      count: unselected,
      detail: "这些候选在确认前被取消勾选，因此本次没有写入。"
    },
    {
      key: "invalid",
      tone: "warning",
      label: "原创性跳过",
      count: originalitySkipped,
      detail: "通常是 PermanentNote 在当前 originality plan 下被判定为 warning/invalid，且不允许按 draft 写入。"
    },
    {
      key: "conflicted",
      tone: "bad",
      label: "文件冲突跳过",
      count: conflictedSkipped,
      detail: "目标路径已有同名文件，系统保持非覆盖写入。"
    }
  ].filter((item) => item.count > 0);

  return `
    <div class="result-skip-breakdown">
      <div class="result-skip-breakdown-title">未写入原因</div>
      <div class="result-skip-breakdown-list">
        ${rows
          .map(
            (item) => `
              <button class="result-skip-item tone-${escapeHtml(item.tone)} ${focusReason === item.key ? "is-active" : ""}" type="button" data-skip-focus="${escapeHtml(
                item.key
              )}">
                <div class="result-skip-item-head">
                  <strong>${escapeHtml(item.label)}</strong>
                  <span>${escapeHtml(item.count)}</span>
                </div>
                <div class="result-skip-item-detail">${escapeHtml(item.detail)}</div>
              </button>
            `
          )
          .join("")}
      </div>
      ${candidatePreview && unselected > 0 ? `<div class="toolbar-note">未勾选的候选明细见下方“未写入候选”。</div>` : ""}
    </div>
  `;
}

function renderCandidatePreview(candidatePreview, options = {}) {
  const groups = candidateGroups(candidatePreview);
  if (!groups.length) return "";
  const importRecordId = options.importRecordId || "";
  const interactive = Boolean(options.interactive);
  const summary = selectionSummary(candidatePreview, importRecordId, options.selection || null);
  const filter = interactive ? importState.previewFilter : "all";
  const filterCounts = candidateFilterCounts(candidatePreview, importRecordId, options.selection || null, options.originalityGuard || null);
  const focusReason = String(options.focusReason || "").trim();
  const focusCandidateIds = new Set((options.focusCandidateIds || []).map((item) => String(item || "").trim()).filter(Boolean));
  const skipReasonMap = options.skipReasonMap || {};
  const hasFocus = !interactive && focusCandidateIds.size > 0;
  const visibleFocusCount = hasFocus ? candidatePreviewItems(candidatePreview).filter((item) => focusCandidateIds.has(String(item.id || ""))).length : 0;
  const total = candidatePreview.total || {};
  const totalText = `${Number(total.sources || 0)} Source / ${Number(total.literatureNotes || 0)} LiteratureNote / ${Number(
    total.permanentNotes || 0
  )} PermanentNote`;
  return `
    <div class="result-candidates">
      <div class="result-candidates-toolbar">
        <div class="result-candidates-title">候选预览：${escapeHtml(totalText)}${candidatePreview.truncated ? "（仅显示前几项）" : ""}</div>
        <div class="toolbar-note">已选 ${summary.selectedCount}/${summary.totalCount}${summary.excludedCount ? `，已排除 ${summary.excludedCount}` : ""}</div>
      </div>
      ${
        interactive
          ? `<div class="result-candidates-toolbar">
              <div class="toolbar-actions">
                <button class="mini-btn" type="button" data-candidate-action="all">全选</button>
                <button class="mini-btn" type="button" data-candidate-action="none">清空</button>
                <button class="mini-btn" type="button" data-candidate-action="confirmable">仅可确认项</button>
                <button class="mini-btn" type="button" data-candidate-action="safe">仅安全项</button>
                <button class="mini-btn" type="button" data-candidate-action="exclude-risky">排除风险项</button>
                <button class="mini-btn" type="button" data-candidate-action="exclude-warning">排除 Warning</button>
                <button class="mini-btn" type="button" data-candidate-action="exclude-blocked">排除 Blocked</button>
                <button class="mini-btn" type="button" data-candidate-action="permanent">仅 PermanentNote</button>
              </div>
              <div class="toolbar-note">确认写入会只处理当前勾选的候选。</div>
            </div>
            <div class="result-candidates-toolbar">
              <div class="toolbar-actions">
                <button class="mini-btn ${filter === "all" ? "is-filter-active" : ""}" type="button" data-candidate-filter="all">全部 ${filterCounts.all}</button>
                <button class="mini-btn ${filter === "confirmable" ? "is-filter-active" : ""}" type="button" data-candidate-filter="confirmable">可确认项 ${filterCounts.confirmable}</button>
                <button class="mini-btn ${filter === "safe" ? "is-filter-active" : ""}" type="button" data-candidate-filter="safe">仅安全项 ${filterCounts.safe}</button>
                <button class="mini-btn ${filter === "risky" ? "is-filter-active" : ""}" type="button" data-candidate-filter="risky">风险项 ${filterCounts.risky}</button>
                <button class="mini-btn ${filter === "excluded" ? "is-filter-active" : ""}" type="button" data-candidate-filter="excluded">已排除 ${filterCounts.excluded}</button>
                <button class="mini-btn ${filter === "warning" ? "is-filter-active" : ""}" type="button" data-candidate-filter="warning">Warning ${filterCounts.warning}</button>
                <button class="mini-btn ${filter === "blocked" ? "is-filter-active" : ""}" type="button" data-candidate-filter="blocked">Blocked ${filterCounts.blocked}</button>
              </div>
              <div class="toolbar-note">当前视图：${escapeHtml(filterLabel(filter))}</div>
            </div>`
          : ""
      }
      ${
        summary.excludedCount
          ? `<div class="candidate-summary candidate-summary-warn">当前有 ${summary.excludedCount} 个候选被排除，确认时不会写入这些项。</div>`
          : ""
      }
      ${
        filter !== "all" && filterCounts[filter] === 0
          ? `<div class="candidate-summary">当前没有匹配“${escapeHtml(filterLabel(filter))}”的候选。</div>`
          : ""
      }
      ${
        hasFocus
          ? `<div class="candidate-focus-banner">
              <div>
                <strong>当前聚焦：</strong>${escapeHtml(resultFocusLabel(focusReason))}${visibleFocusCount ? `（${visibleFocusCount} 项可见）` : "（当前预览中没有可见项）"}
              </div>
              <button class="mini-btn" type="button" data-clear-candidate-focus="1">查看全部</button>
            </div>`
          : ""
      }
      ${!interactive && options.showExcludedSummary ? renderExcludedCandidateSummary(candidatePreview, options) : ""}
      ${groups
        .map(
          (group) => {
            const groupItems = group.items.map((item) => ({
              ...item,
              candidateGroup: group.title
            }));
            const visibleItems = groupItems.filter((item) => matchesCandidateFilter(item, filter, summary.selectedIds, options.originalityGuard || null));
            if (!visibleItems.length) return "";
            return `
            <div class="candidate-group">
              <div class="candidate-group-title">${escapeHtml(group.title)}</div>
              <div class="candidate-list">
                ${visibleItems
                  .map((item) => {
                    const candidateId = String(item.id || "");
                    const checked = summary.selectedIds.has(candidateId);
                    const tone = candidateTone(item);
                    const focusClass = hasFocus ? (focusCandidateIds.has(candidateId) ? "is-focused" : "is-muted") : "";
                    const skipReason = skipReasonMap[candidateId] || null;
                    return `
                      <div class="candidate-item ${checked ? "selected" : "unselected"} ${focusClass} tone-${escapeHtml(tone)}" data-candidate-id="${escapeHtml(
                        candidateId
                      )}">
                        <label class="candidate-check">
                          ${
                            interactive
                              ? `<input class="candidate-checkbox" type="checkbox" data-candidate-id="${escapeHtml(candidateId)}" ${
                                  checked ? "checked" : ""
                                } />`
                              : ""
                          }
                          <div class="candidate-check-body">
                            <div class="candidate-line">
                              <span class="candidate-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title || item.id)}</span>
                              <span class="candidate-badge candidate-badge-${escapeHtml(tone)}">${escapeHtml(candidateBadge(item))}</span>
                            </div>
                            <div class="candidate-meta" title="${escapeHtml(candidateMeta(item))}">${escapeHtml(candidateMeta(item))}</div>
                            ${item.excerpt ? `<div class="candidate-meta" title="${escapeHtml(item.excerpt)}">${escapeHtml(item.excerpt)}</div>` : ""}
                            ${candidateReasonBadges(item) ? `<div class="candidate-reasons">${candidateReasonBadges(item)}</div>` : ""}
                            ${
                              skipReason
                                ? `<div class="candidate-inline-note candidate-inline-note-${escapeHtml(skipReason.tone)}">${escapeHtml(skipReason.message)}</div>`
                                : !checked
                                  ? `<div class="candidate-inline-note">已排除：确认写入时会跳过这一项。</div>`
                                  : ""
                            }
                          </div>
                        </label>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `;
          }
        )
        .join("")}
    </div>
  `;
}

function renderWritingResultDetails(data = {}) {
  const stage = String(data.stage || "");
  if (stage === "writing_project") {
    const notes = Array.isArray(data.basketNotes) ? data.basketNotes : [];
    return `
      <div class="writing-preview">
        <h4>写作篮快照</h4>
        ${
          notes.length
            ? `<ul>${notes
                .map((note) => `<li><strong>${escapeHtml(note.title || note.id)}</strong> ${escapeHtml(note.id || "")}</li>`)
                .join("")}</ul>`
            : `<div class="writing-empty">当前返回里没有篮子明细。</div>`
        }
      </div>
    `;
  }

  if (stage === "draft_scaffold") {
    const sections = Array.isArray(data.sections) ? data.sections : [];
    const markdown = String(data.markdown || "").trim();
    return `
      <div class="writing-preview">
        <h4>草稿骨架快照</h4>
        ${
          sections.length
            ? `<ol>${sections
                .map((section) => `<li><strong>${escapeHtml(section.heading || `Section ${section.order || ""}`)}</strong> ${escapeHtml(section.purpose || "")}</li>`)
                .join("")}</ol>`
            : `<div class="writing-empty">当前返回里没有章节结构。</div>`
        }
        ${markdown ? `<pre>${escapeHtml(markdown)}</pre>` : ""}
      </div>
    `;
  }

  if (stage === "writing_draft_note") {
    return `
      <div class="writing-preview">
        <h4>草稿已落成笔记</h4>
        <ul>
          <li><strong>Note ID</strong> ${escapeHtml(data.noteId || "")}</li>
          <li><strong>目录</strong> ${escapeHtml(data.directoryId || "")}</li>
          <li><strong>标题</strong> ${escapeHtml(data.title || "")}</li>
        </ul>
      </div>
    `;
  }

  return "";
}

function renderResult(el, payload) {
  if (!el) return;
  if (typeof payload === "string") {
    el.textContent = payload;
    return;
  }
  const data = payload || {};
  const stage = String(data.stage || "");
  const tone = resultTone(data);
  const metrics = resultMetrics(data);
  const warnings = warningItems(data);
  const actions = actionItems(data, warnings);
  const candidatePreview = candidatePreviewFromPayload(data);
  const skippedCandidateIds = confirmSkippedCandidateIds(data, candidatePreview);
  const skipReasonMap = confirmSkipReasonMap(data, candidatePreview);
  const importRecordId = data.importRecordId || data.importRecord?.importRecordId || "";
  const interactivePreview = stage === "preview" || (stage === "record" && data.importRecord?.status === "preview");
  const selection = data.result?.selection || data.importRecord?.confirmResult?.selection || null;
  const showExcludedSummary = stage === "confirm" && Boolean(selection?.selectedCandidates < selection?.totalCandidates);
  const raw = JSON.stringify(data, null, 2);
  const subtitle = data.importRecordId || data.exportJobId || data.writingProjectId || data.draftScaffoldId || data.code || data.status || "";

  el.innerHTML = `
    <div class="result-card" data-result-stage="${escapeHtml(stage)}">
      <div class="result-card-head">
        <div>
          <div class="result-title">${escapeHtml(resultTitle(stage))}</div>
          ${subtitle ? `<div class="result-subtitle">${escapeHtml(subtitle)}</div>` : ""}
        </div>
        <div class="result-status ${tone === "ok" ? "" : tone}">${escapeHtml(tone === "bad" ? "failed" : tone === "warn" ? "warning" : "ok")}</div>
      </div>
      ${
        metrics.length
          ? `<div class="result-metrics">${metrics
              .map((item) => `<div class="result-metric"><span>${escapeHtml(item.label)}</span><strong title="${escapeHtml(item.value)}">${escapeHtml(item.value)}</strong></div>`)
              .join("")}</div>`
          : ""
      }
      ${
        warnings.length
          ? `<div class="result-warnings"><div class="result-warnings-title">需要注意</div><ul>${warnings
              .map((item) => `<li><strong>${escapeHtml(item.code || "WARNING")}</strong> ${escapeHtml(item.message || JSON.stringify(item))}</li>`)
              .join("")}</ul></div>`
          : ""
      }
      ${
        actions.length
          ? `<div class="result-actions"><div class="result-actions-title">建议动作</div><ol>${actions
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join("")}</ol></div>`
          : ""
      }
      ${renderImportWritingActions(data)}
      ${renderConfirmSkipBreakdown(data, candidatePreview, { focusReason: importState.resultFocusReason })}
      ${renderCandidatePreview(candidatePreview, {
        interactive: interactivePreview,
        importRecordId,
        selection,
        showExcludedSummary,
        originalityGuard: data.originalityGuard || data.importRecord?.originalityGuard || null,
        focusReason: importState.resultFocusReason,
        focusCandidateIds: skippedCandidateIds[importState.resultFocusReason] || [],
        skipReasonMap
      })}
      ${renderWritingResultDetails(data)}
      <details class="result-json" open>
        <summary>原始 JSON</summary>
        <pre>${escapeHtml(raw)}</pre>
      </details>
    </div>
  `;
}

function showImportResult(payload) {
  importState.resultFocusReason = "";
  importState.lastResultPayload = payload;
  renderResult($("importResult"), payload);
  updateImportConfirmButton();
}

function showExportResult(payload) {
  renderResult($("exportResult"), payload);
}

function showWritingResult(payload) {
  if (payload?.stage === "draft_scaffold" && typeof payload.markdown === "string") {
    writingState.scaffoldMarkdown = payload.markdown;
  }
  renderResult($("writingResult"), payload);
  renderWritingScaffoldPreview();
}

async function ensureNotesLoaded(noteIds) {
  const uniqueIds = [...new Set((noteIds || []).map((item) => String(item || "").trim()).filter(Boolean))];
  for (const noteId of uniqueIds) {
    if (writingNoteById(noteId)) continue;
    try {
      const fetched = await fetchNote(noteId);
      if (!fetched) continue;
      const mapped = mapNoteItem(fetched);
      state.notes = [mapped, ...state.notes.filter((item) => item.id !== mapped.id)];
    } catch {}
  }
}

async function openWritingModule({ statusMessage = "已打开写作中心" } = {}) {
  const statusRevisionAtStart = statusRevision;
  activateModule("writing");
  const writingProjectId = String(writingState.project?.id || "").trim();
  writingState.loadingProjects = true;
  writingState.loadingScaffoldVersions = Boolean(writingProjectId);
  writingState.loadingDraftVersions = Boolean(writingProjectId);
  renderWritingPanel();
  try {
    const [projects, project, scaffoldVersions, draftVersions] = await Promise.all([
      listWritingProjects(8).catch(() => writingState.projects),
      writingProjectId ? fetchWritingProject(writingProjectId).catch(() => writingState.project) : Promise.resolve(null),
      writingProjectId ? listProjectScaffolds(writingProjectId, 12).catch(() => writingState.scaffoldVersions) : Promise.resolve([]),
      writingProjectId ? listProjectDraftVersions(writingProjectId, 12).catch(() => writingState.draftVersions) : Promise.resolve([])
    ]);
    writingState.projects = Array.isArray(projects) ? projects : writingState.projects;
    if (project) writingState.project = project;
    writingState.scaffoldVersions = Array.isArray(scaffoldVersions) ? scaffoldVersions : writingState.scaffoldVersions;
    writingState.draftVersions = Array.isArray(draftVersions) ? draftVersions : writingState.draftVersions;
  } finally {
    writingState.loadingProjects = false;
    writingState.loadingScaffoldVersions = false;
    writingState.loadingDraftVersions = false;
    renderWritingPanel();
  }
  if (statusMessage) setStatus(statusMessage, "ok", { skipIfStaleSince: statusRevisionAtStart, requireModule: "writing" });
}

async function addImportedPermanentNotesToWritingBasket({ openWriting = false } = {}) {
  const noteIds = confirmCreatedPermanentNoteIds(importState.lastResultPayload || {});
  if (!noteIds.length) {
    setStatus("当前导入结果里没有可加入写作篮子的 PermanentNote", "warn");
    return false;
  }
  await ensureNotesLoaded(noteIds);
  addWritingBasketIds(noteIds);
  if (!$("writingTitle")?.value.trim()) {
    const firstNote = noteIds.map((id) => writingNoteById(id)).find(Boolean);
    if (firstNote?.title) $("writingTitle").value = `${firstNote.title} 写作项目`;
  }
  renderWritingPanel();
  if (openWriting) {
    await openWritingModule({ statusMessage: `已把 ${noteIds.length} 条导入永久笔记加入写作篮子，并打开写作中心` });
  } else {
    setStatus(`已把 ${noteIds.length} 条导入永久笔记加入写作篮子`, "ok");
  }
  return true;
}

function suggestedWritingProjectTitle(noteIds = []) {
  const notes = noteIds.map((id) => writingNoteById(id)).filter(Boolean);
  if (notes.length === 1) return `${notes[0].title || notes[0].id} 写作项目`;
  const first = notes[0];
  if (first?.title) return `${first.title} 等 ${notes.length} 条笔记`;
  return `导入笔记写作项目 ${noteIds.length}`;
}

async function createWritingProjectFromImportedPermanentNotes() {
  const noteIds = confirmCreatedPermanentNoteIds(importState.lastResultPayload || {});
  if (!noteIds.length) {
    setStatus("当前导入结果里没有可创建写作项目的 PermanentNote", "warn");
    return false;
  }
  await ensureNotesLoaded(noteIds);
  setWritingBasketIds(noteIds);
  const titleInput = $("writingTitle");
  if (titleInput && !String(titleInput.value || "").trim()) {
    titleInput.value = suggestedWritingProjectTitle(noteIds);
  }
  const title = String(titleInput?.value || "").trim() || suggestedWritingProjectTitle(noteIds);
  try {
    const project = await createWritingProject({
      title,
      goal: String($("writingGoal")?.value || "").trim(),
      audience: String($("writingAudience")?.value || "").trim(),
      tone: String($("writingTone")?.value || "").trim(),
      basketNoteIds: noteIds
    });
    writingState.project = project;
    writingState.scaffold = null;
    writingState.scaffoldMarkdown = "";
    writingState.scaffoldVersions = [];
    writingState.draftVersions = [];
    populateWritingFormFromProject(project);
    showWritingResult({
      stage: "writing_project",
      writingProjectId: project?.id,
      title: project?.title,
      basketNoteIds: project?.basket_note_ids,
      basketNotes: project?.basket_notes
    });
    await openWritingModule({ statusMessage: `已从导入结果创建写作项目：${project?.id}` });
    return true;
  } catch (error) {
    showWritingResult({
      stage: "writing_project_error",
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`从导入结果创建写作项目失败：${String(error?.message || error)}`, "bad");
    return false;
  }
}

async function refreshWritingProjectState() {
  const writingProjectId = String(writingState.project?.id || "").trim();
  if (!writingProjectId) return null;
  try {
    const project = await fetchWritingProject(writingProjectId);
    writingState.project = project;
    renderWritingPanel();
    return project;
  } catch {
    return writingState.project;
  }
}

function activeImportPreviewContext() {
  const directPreview = importState.lastPreview;
  const currentImportRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
  if (directPreview?.importRecordId && directPreview.importRecordId === currentImportRecordId) return directPreview;
  const recordPreview = importState.lastResultPayload?.stage === "record" ? importState.lastResultPayload.importRecord : null;
  if (recordPreview?.status === "preview" && String(recordPreview.importRecordId || "") === currentImportRecordId) {
    return {
      importRecordId: recordPreview.importRecordId,
      candidatePreview: recordPreview.candidatePreview || null,
      originalityGuard: recordPreview.originalityGuard || null
    };
  }
  return directPreview || null;
}

function updateImportConfirmButton() {
  const button = $("btnImportConfirm");
  if (!button) return;
  const preview = activeImportPreviewContext();
  const importRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
  if (!preview || preview.importRecordId !== importRecordId || !preview.candidatePreview) {
    button.disabled = false;
    button.textContent = "确认写入";
    return;
  }
  const summary = selectionSummary(preview.candidatePreview, importRecordId);
  button.disabled = summary.totalCount > 0 && summary.selectedCount === 0;
  button.textContent = `确认写入（${summary.selectedCount}/${summary.totalCount}）`;
}

function rerenderImportResult() {
  if (!importState.lastResultPayload) return;
  renderResult($("importResult"), importState.lastResultPayload);
  updateImportConfirmButton();
}

function setImportResultFocus(reason) {
  importState.resultFocusReason = String(reason || "").trim();
  rerenderImportResult();
}

function applyCandidateSelection(action) {
  const preview = activeImportPreviewContext();
  if (!preview?.candidatePreview) return;
  const importRecordId = String(preview.importRecordId || "").trim();
  const items = candidatePreviewItems(preview.candidatePreview);
  const next = new Set();
  if (action === "all") {
    for (const item of items) next.add(String(item.id));
  } else if (action === "confirmable") {
    for (const id of confirmableCandidateIds(preview.candidatePreview, preview.originalityGuard || null)) next.add(id);
  } else if (action === "safe") {
    for (const id of safeCandidateIds(preview.candidatePreview)) next.add(id);
  } else if (action === "exclude-risky") {
    const riskyIds = new Set(riskyCandidateIds(preview.candidatePreview));
    for (const item of items) {
      const candidateId = String(item.id);
      if (!riskyIds.has(candidateId)) next.add(candidateId);
    }
  } else if (action === "exclude-warning") {
    const warningIds = new Set(candidateIdsByOriginalityStatus(preview.candidatePreview, "warning"));
    for (const item of items) {
      const candidateId = String(item.id);
      if (!warningIds.has(candidateId)) next.add(candidateId);
    }
  } else if (action === "exclude-blocked") {
    const blockedIds = new Set(candidateIdsByOriginalityStatus(preview.candidatePreview, "blocked"));
    for (const item of items) {
      const candidateId = String(item.id);
      if (!blockedIds.has(candidateId)) next.add(candidateId);
    }
  } else if (action === "permanent") {
    for (const item of items) {
      if (item.candidateGroup === "PermanentNote") next.add(String(item.id));
    }
  }
  importState.selectionImportRecordId = importRecordId;
  importState.selectedCandidateIds = next;
  rerenderImportResult();
}

function setCandidateFilter(filter) {
  const normalized = ["all", "confirmable", "safe", "risky", "excluded", "warning", "blocked"].includes(String(filter || ""))
    ? String(filter)
    : "all";
  importState.previewFilter = normalized;
  rerenderImportResult();
}

function parseJsonOrEmpty(raw, label) {
  const text = String(raw || "").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} 不是合法 JSON：${String(error?.message || error)}`);
  }
}

function buildImportPayload(connector) {
  const pathText = String($("importPath")?.value || "").trim();
  const payloadText = String($("importPayload")?.value || "").trim();
  if (payloadText) return parseJsonOrEmpty(payloadText, "Payload");
  if ((connector === "markdown" || connector === "obsidian") && !pathText) {
    throw new Error("markdown/obsidian 预览需要“导入路径”或 Payload JSON");
  }
  return pathText ? { path: pathText } : {};
}

async function refreshImportedNotesView() {
  try {
    await syncDirectoriesFromApi();
    await syncNotesForDirectory(state.selectedFolderId);
    renderAll();
  } catch {}
}

function mapDirectoryItem(item) {
  return {
    id: item.id,
    name: item.title,
    parentId: item.parentDirectoryId,
    isDefault: Boolean(item.isDefault),
    hidden: Boolean(item.isHidden),
    maxCards: Number(item.maxNotes || 500),
    fsPath: item.fsPath || ""
  };
}

function mapNoteItem(item) {
  return {
    id: item.id,
    title: item.title || "未命名笔记",
    folderId: item.directoryId,
    noteType: item.noteType || "original",
    markdownPath: item.markdownPath || "",
    body: item.body || `# ${item.title || "未命名笔记"}\n`,
    tags: [],
    links: [],
    bodyLoaded: Boolean(item.body),
    updatedAt: item.updatedAt || new Date().toISOString()
  };
}

function upsertNotesForDirectory(folderId, mappedNotes) {
  const keep = state.notes.filter((n) => n.folderId !== folderId);
  state.notes = [...mappedNotes, ...keep];
}

function replaceFirstMarkdownTitle(body, title) {
  const cleanTitle = String(title || "未命名笔记").trim() || "未命名笔记";
  const lines = String(body || "").replace(/\r\n/g, "\n").split("\n");
  if (!lines.length || !String(lines[0] || "").trim()) return `# ${cleanTitle}\n`;
  if (/^#{1,6}\s+/.test(lines[0])) {
    lines[0] = `# ${cleanTitle}`;
    return lines.join("\n");
  }
  lines[0] = `# ${cleanTitle}`;
  return lines.join("\n");
}

async function syncDirectoriesFromApi() {
  const items = await fetchDirectories(true);
  if (!items.length) return;
  state.folders = items.map(mapDirectoryItem);
  const selectedExists = state.folders.some((f) => f.id === state.selectedFolderId);
  if (!selectedExists) {
    state.selectedFolderId = state.browserRootId;
  }
}

async function syncNotesForDirectory(folderId) {
  if (!folderId) return;
  const items = await fetchDirectoryNotes(folderId);
  const mapped = items.map(mapNoteItem);
  upsertNotesForDirectory(folderId, mapped);
}

async function syncLoadedNotesForDirectories(directoryIds = []) {
  const ids = [...new Set(directoryIds.map((item) => String(item || "").trim()).filter(Boolean))];
  for (const directoryId of ids) {
    if (!state.notes.some((note) => note.folderId === directoryId)) continue;
    await syncNotesForDirectory(directoryId);
  }
}

function descendantDirectoryIds(directoryId) {
  const result = [];
  const queue = [directoryId];
  const seen = new Set();
  while (queue.length) {
    const currentId = queue.shift();
    if (!currentId || seen.has(currentId)) continue;
    seen.add(currentId);
    result.push(currentId);
    for (const folder of state.folders) {
      if (folder.parentId === currentId) queue.push(folder.id);
    }
  }
  return result;
}

function renamedDirectoryFsPath(folder, nextTitle) {
  if (!folder?.fsPath) return "";
  return joinLocalPath(dirnameLocalPath(folder.fsPath), nextTitle);
}

function movedDirectoryFsPath(folder, targetParentFolder) {
  if (!folder?.fsPath || !targetParentFolder?.fsPath) return "";
  const baseName = basenameLocalPath(folder.fsPath) || folder.name || "folder";
  return joinLocalPath(targetParentFolder.fsPath, baseName);
}

function ensureSelection() {
  const visible = state.folders.filter((f) => !f.hidden);
  const scoped = visible.filter((f) => rootBoxIdFromFolder(state, f.id) === state.browserRootId);
  const source = scoped.length ? scoped : visible;
  if (!folderById(state, state.selectedFolderId) || folderById(state, state.selectedFolderId)?.hidden) {
    state.selectedFolderId = source[0]?.id || state.browserRootId;
  }
  createBoxDialog.setOptions(source);
}

function renderSidebarTitle() {
  const root = folderById(state, state.browserRootId);
  const editorMode = state.module === "explorer";
  const sidebarPrimaryActions = $("sidebarPrimaryActions");
  const filter = $("searchBar");
  const moduleSidebar = $("moduleSidebar");
  const listArea = $("listArea");
  const searchToggle = $("btnToggleSearch");

  if (editorMode) {
    $("sidebarTitle").textContent = displayFolderName(root);
    const quickAction =
      state.browserRootId === "dir_fleeting_default"
        ? "quick-fleeting"
        : state.browserRootId === "dir_literature_default"
          ? "quick-literature"
          : "quick-original";
    document.querySelectorAll(".quick-entry").forEach((entry) => entry.classList.toggle("current-root", entry.dataset.action === quickAction));
    $("explorerActions").classList.add("hidden");
    $("explorerActions").innerHTML = "";
    sidebarPrimaryActions?.classList.remove("hidden");
    const showSearch = Boolean(state.searchVisible || String(state.searchQuery || "").trim());
    filter?.classList.toggle("hidden", !showSearch);
    searchToggle?.classList.toggle("is-ghost", !showSearch);
    listArea?.classList.remove("hidden");
    moduleSidebar?.classList.remove("visible");
    if (moduleSidebar) moduleSidebar.innerHTML = "";
    $("sidebarFoot").textContent = "";
    return;
  }

  const moduleUi = currentModuleUi();
  $("sidebarTitle").textContent = moduleUi.sidebarTitle;
  $("explorerActions").classList.add("hidden");
  $("explorerActions").innerHTML = "";
  sidebarPrimaryActions?.classList.add("hidden");
  filter?.classList.add("hidden");
  listArea?.classList.add("hidden");
  moduleSidebar?.classList.add("visible");
  if (moduleSidebar) moduleSidebar.innerHTML = moduleUi.sidebarHtml;
  $("sidebarFoot").textContent = moduleUi.sidebarFoot;
}

function currentModuleUi() {
  const root = folderById(state, state.browserRootId);
  const rootName = root?.name || "当前目录";
  const configs = {
    imports: {
      sidebarTitle: "导入中心",
      sidebarFoot: "导入是独立流程：选择来源、预览候选、确认写入，再按需回滚。",
      title: "导入与导出",
      summary: "把外部 Markdown、Obsidian、Zotero、Readwise 等内容带入研思录时，这里只服务导入这一个任务，不再混用笔记标签页和 Markdown 工具栏。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>当前目标</h3>
          <p>把外部资料安全导入到 <strong>${escapeHtml(rootName)}</strong> 体系里，先预览，再确认，不直接破坏现有笔记。</p>
        </div>
        <div class="module-sidebar-card">
          <h3>推荐顺序</h3>
          <ol class="module-sidebar-list">
            <li>先选来源与路径</li>
            <li>先看候选预览，再决定是否写入</li>
            <li>导入后再进入书摘笔记或原创笔记继续加工</li>
          </ol>
        </div>
      `
    },
    graph: {
      sidebarTitle: "关系图谱",
      sidebarFoot: "图谱默认围绕当前目录或当前主题，不展示全局大图。",
      title: "关系图谱",
      summary: "图谱页只回答结构问题：这个目录下有哪些关键笔记、它们如何互相链接、哪里还缺连接，而不是把所有信息堆成一张图。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>查看范围</h3>
          <p>当前以 <strong>${escapeHtml(rootName)}</strong> 为范围，只看这一层结构，避免一进来就被全局关系淹没。</p>
        </div>
        <div class="module-sidebar-card">
          <h3>你现在可以做什么</h3>
          <ul class="module-sidebar-list">
            <li>刷新当前目录子图</li>
            <li>查看局部关系与缺失连接</li>
            <li>从节点直接回到对应笔记</li>
          </ul>
        </div>
      `
    },
    writing: {
      sidebarTitle: "写作中心",
      sidebarFoot: "写作中心应从成熟笔记出发，不替代笔记编辑器。",
      title: "写作中心",
      summary: "这里是把原创笔记组织成写作项目和脚手架的地方。页面应围绕写作篮、项目、脚手架展开，而不是和导入、编辑、设置混在一起。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>写作原则</h3>
          <p>先挑选原创笔记进入写作篮，再生成脚手架。这里帮助组织结构，不直接代替你完成最终写作。</p>
        </div>
        <div class="module-sidebar-card">
          <h3>建议路径</h3>
          <ol class="module-sidebar-list">
            <li>创建项目并明确目标</li>
            <li>把相关原创笔记加入写作篮</li>
            <li>生成并迭代 scaffold</li>
          </ol>
        </div>
      `
    },
    settings: {
      sidebarTitle: "设置",
      sidebarFoot: "设置页只处理系统与卡片盒配置，不打断正在写的笔记流程。",
      title: "设置",
      summary: "这里处理 Vault 路径、初始化状态和桌面文件能力。它应该像应用设置页，而不是混进笔记编辑视图。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>当前重点</h3>
          <p>切换卡片盒根目录、检查当前 Vault 状态，并确保本地 Markdown 依然是主内容源。</p>
        </div>
        <div class="module-sidebar-card">
          <h3>注意事项</h3>
          <ul class="module-sidebar-list">
            <li>切换 Vault 会关闭当前标签页</li>
            <li>缓存可以重建，Markdown 主内容不能丢</li>
          </ul>
        </div>
      `
    }
  };
  return configs[state.module] || {
    sidebarTitle: "功能页",
    sidebarFoot: "当前功能页。",
    title: "功能页",
    summary: "当前模块说明。",
    sidebarHtml: ""
  };
}

function renderModuleWorkspaceHeader() {
  const moduleTitle = $("moduleTitle");
  const moduleSummary = $("moduleSummary");
  const moduleHeaderActions = $("moduleHeaderActions");
  if (!moduleTitle || !moduleSummary || !moduleHeaderActions) return;
  if (state.module === "explorer") {
    moduleHeaderActions.innerHTML = "";
    return;
  }
  const moduleUi = currentModuleUi();
  moduleTitle.textContent = moduleUi.title;
  moduleSummary.textContent = moduleUi.summary;
  moduleHeaderActions.innerHTML = `<button class="mini-btn" id="moduleBackToNotes">回到笔记</button>`;
  $("moduleBackToNotes")?.addEventListener("click", () => activateModule("explorer"));
}

function moduleLabel(moduleName = "") {
  const labels = {
    explorer: "笔记编辑",
    imports: "导入导出",
    graph: "关系图谱",
    writing: "写作中心",
    settings: "设置"
  };
  return labels[String(moduleName || "").trim()] || "工作台";
}

function noteTypeLabel(noteType = "") {
  const labels = {
    fleeting: "随笔记",
    literature: "书摘笔记",
    original: "原创笔记",
    permanent: "原创笔记"
  };
  return labels[String(noteType || "").trim().toLowerCase()] || "笔记";
}

function displayFolderName(folder) {
  if (!folder) return "目录";
  if (folder.id === "dir_original_default") return "原创笔记";
  if (folder.id === "dir_fleeting_default") return "随笔目录";
  if (folder.id === "dir_literature_default") return "书摘目录";
  if (!folder.parentId && String(folder.name || "").trim() === "原创目录") return "原创笔记";
  return folder.name || "目录";
}

function directoryPathLabel(directoryId) {
  const folder = folderById(state, directoryId);
  if (!folder) return "未选择目录";
  const names = [displayFolderName(folder)];
  let cursor = folder;
  while (cursor?.parentId) {
    cursor = folderById(state, cursor.parentId);
    if (cursor) names.unshift(displayFolderName(cursor));
  }
  return names.join(" / ");
}

function activeEditorNote() {
  const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
  if (!activeTab) return null;
  return state.notes.find((note) => note.id === activeTab.noteId) || null;
}

function renderStatusMeta() {
  const statusMeta = $("statusMeta");
  if (!statusMeta) return;

  const activeNote = activeEditorNote();
  const dirtyCount = state.tabs.filter((tab) => tab.dirty).length;
  const openCount = state.tabs.length;
  const rootFolder = folderById(state, state.browserRootId);
  const selectedFolder = folderById(state, state.selectedFolderId);

  const chips = [];
  chips.push(`<span class="status-chip active"><strong>${escapeHtml(moduleLabel(state.module))}</strong></span>`);

  if (state.module === "explorer") {
    chips.push(`<span class="status-chip"><strong>${escapeHtml(displayFolderName(rootFolder))}</strong></span>`);
    if (selectedFolder) {
      chips.push(`<span class="status-chip">当前目录 <strong>${escapeHtml(directoryPathLabel(selectedFolder.id))}</strong></span>`);
    }
  } else if (rootFolder) {
    chips.push(`<span class="status-chip">工作范围 <strong>${escapeHtml(displayFolderName(rootFolder))}</strong></span>`);
  }

  chips.push(`<span class="status-chip">标签页 <strong>${openCount}</strong></span>`);
  if (dirtyCount) {
    chips.push(`<span class="status-chip warn">未保存 <strong>${dirtyCount}</strong></span>`);
  }
  if (state.module === "explorer" && activeNote) {
    chips.push(`<span class="status-chip">${escapeHtml(noteTypeLabel(activeNote.noteType))}</span>`);
    chips.push(`<span class="status-chip title">当前笔记 <strong>${escapeHtml(activeNote.title || "未命名笔记")}</strong></span>`);
  }

  statusMeta.innerHTML = chips.join("");
}

function renderWorkspaceStatusHint() {
  const statusHint = $("statusHint");
  if (!statusHint) return;
  if (state.module === "explorer") {
    editor.renderSaveHint();
    return;
  }
  statusHint.textContent = "";
}

function renderAll() {
  ensureSelection();
  renderSidebarTitle();
  renderModulePanels();
  renderGraphPanel();
  renderSettingsPanel();
  renderWritingPanel();
  editor.renderTabs();
  renderStatusMeta();
  renderWorkspaceStatusHint();
  if (state.module === "explorer") {
    explorer.render();
  }
}

function currentVaultPath() {
  return settingsState.vault?.vaultPath || "";
}

function resolveNotePath(note) {
  if (!note) return "";
  if (note.markdownPath && currentVaultPath()) return joinLocalPath(currentVaultPath(), note.markdownPath);
  const folder = folderById(state, note.folderId);
  if (!folder?.fsPath) return "";
  const fileName = `${note.id}.md`;
  return joinLocalPath(folder.fsPath, fileName);
}

function standaloneEditorUrl(noteId = "") {
  const baseUrl = `${window.location.origin}/editor`;
  const id = String(noteId || "").trim();
  return id ? `${baseUrl}?note=${encodeURIComponent(id)}` : baseUrl;
}

function openStandaloneEditorWindow(noteId = "") {
  const url = standaloneEditorUrl(noteId);
  window.open(url, "_blank", "noopener,noreferrer");
  return url;
}

function ensureEditableNoteBody(body = "") {
  const value = String(body || "").replace(/\r\n/g, "\n");
  if (!value.trim()) return "# 未命名笔记\n\n";
  return /\n\s*\n\s*$/.test(value) ? value : `${value}\n\n`;
}

async function createNoteInSelectedFolder(options = {}) {
  const folderId = state.selectedFolderId;
  const preferTitleSelection = options.preferTitleSelection !== false;
  const openInStandalone = options.openInStandalone === true;
  try {
    const created = await createNote({
      directoryId: folderId,
      body: "# 未命名笔记\n\n"
    });
    if (!created) throw new Error("创建笔记失败");
    const note = mapNoteItem({
      ...created,
      body: ensureEditableNoteBody(typeof created?.body === "string" ? created.body : "# 未命名笔记\n\n")
    });
    state.notes.unshift(note);
    if (openInStandalone) {
      openStandaloneEditorWindow(note.id);
    } else {
      openNoteById(note.id, { preferTitleSelection });
    }
    return { note, remote: true };
  } catch (error) {
    const fallback = {
      id: uid("pn"),
      title: "未命名笔记",
      folderId,
      noteType: typeFromFolder(state, folderId),
      body: ensureEditableNoteBody("# 未命名笔记\n\n"),
      tags: [],
      links: [],
      updatedAt: new Date().toISOString()
    };
    state.notes.unshift(fallback);
    if (openInStandalone) {
      openStandaloneEditorWindow(fallback.id);
    } else {
      openNoteById(fallback.id, { preferTitleSelection });
    }
    return { note: fallback, remote: false, error };
  }
}

function renderModulePanels() {
  const graphMode = state.module === "graph";
  const settingsMode = state.module === "settings";
  const writingMode = state.module === "writing";
  const importsMode = state.module === "imports";
  const editorMode = !graphMode && !settingsMode && !writingMode && !importsMode;
  $("editorWorkspace")?.classList.toggle("hidden", !editorMode);
  $("moduleWorkspace")?.classList.toggle("hidden", editorMode);
  $("graphPanel")?.classList.toggle("hidden", !graphMode);
  $("settingsPanel")?.classList.toggle("hidden", !settingsMode);
  $("writingPanel")?.classList.toggle("hidden", !writingMode);
  $("importPanel")?.classList.toggle("hidden", !importsMode);
  $("markdownPanel")?.classList.toggle("hidden", !editorMode);
  $("relatedPanel")?.classList.toggle("hidden", !editorMode);
  renderModuleWorkspaceHeader();
}

function activateModule(moduleName) {
  const normalizedModule = moduleName === "search" ? "imports" : moduleName;
  state.module = normalizedModule;
  document.querySelectorAll(".rail-btn[data-module]").forEach((button) => {
    button.classList.toggle("active", button.dataset.module === normalizedModule);
  });
  renderAll();
}

function renderSettingsPanel() {
  const current = $("settingsCurrentVault");
  const input = $("settingsVaultPath");
  const detail = $("settingsVaultDetail");
  const stats = $("settingsVaultStats");
  if (!current || !input || !detail || !stats) return;
  const vault = settingsState.vault;
  current.textContent = vault?.vaultPath || "尚未读取";
  if (vault?.vaultPath && !String(input.value || "").trim()) input.value = vault.vaultPath;
  if (vault) {
    const initialized = Boolean(vault.initialized);
    const usingDefault = vault.vaultPath && vault.defaultVaultPath && String(vault.vaultPath) === String(vault.defaultVaultPath);
    stats.innerHTML = `
      <span class="settings-stat-badge ${initialized ? "ok" : "warn"}">${initialized ? "已初始化" : "待初始化"}</span>
      <span class="settings-stat-badge">${usingDefault ? "默认工作区" : "自定义工作区"}</span>
      <span class="settings-stat-badge">Markdown 主内容</span>
    `;
    detail.textContent = `默认路径：${vault.defaultVaultPath || "未知"}；当前切换目标会在确认后替换整套目录树与缓存上下文。`;
    return;
  }

  stats.innerHTML = `<span class="settings-stat-badge warn">等待读取</span>`;
  detail.textContent = settingsState.error || "点击“刷新当前 Vault”读取 API 状态。";
}

function isWritingEligibleNote(note) {
  if (!note) return false;
  const noteType = String(note.noteType || "").trim().toLowerCase();
  if (noteType === "permanent") return true;
  return rootBoxIdFromFolder(state, note.folderId) === "dir_original_default";
}

function writingScopeDirectoryIds() {
  const anchorId = state.selectedFolderId || state.browserRootId || "dir_original_default";
  return descendantDirectoryIds(anchorId);
}

function writingCandidateNotes() {
  const scopedDirectoryIds = new Set(writingScopeDirectoryIds());
  return state.notes
    .filter((note) => scopedDirectoryIds.has(note.folderId) && isWritingEligibleNote(note))
    .sort((a, b) => {
      const aTime = Date.parse(a.updatedAt || 0) || 0;
      const bTime = Date.parse(b.updatedAt || 0) || 0;
      if (bTime !== aTime) return bTime - aTime;
      return String(a.title || a.id).localeCompare(String(b.title || b.id), "zh-CN");
    });
}

function writingNoteById(noteId) {
  return state.notes.find((item) => item.id === noteId) || null;
}

function isDirectoryUnderOriginalRoot(directoryId) {
  return rootBoxIdFromFolder(state, directoryId) === "dir_original_default";
}

function parseWritingBasketIds() {
  const raw = String($("writingBasketNoteIds")?.value || "");
  return [...new Set(raw.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean))];
}

function setWritingBasketIds(noteIds) {
  const input = $("writingBasketNoteIds");
  if (!input) return;
  input.value = [...new Set(noteIds.filter(Boolean))].join("\n");
}

function addWritingBasketIds(noteIds) {
  setWritingBasketIds([...parseWritingBasketIds(), ...noteIds]);
}

function removeWritingBasketId(noteId) {
  setWritingBasketIds(parseWritingBasketIds().filter((item) => item !== noteId));
}

function clearWritingBasket() {
  setWritingBasketIds([]);
}

function writingBasketEntries() {
  const cachedById = new Map((writingState.project?.basket_notes || []).map((note) => [note.id, note]));
  return parseWritingBasketIds().map((noteId) => writingNoteById(noteId) || cachedById.get(noteId) || { id: noteId, title: noteId, folderId: "", noteType: "permanent", body: "" });
}

function writingDraftDirectoryId() {
  if (state.selectedFolderId && isDirectoryUnderOriginalRoot(state.selectedFolderId)) return state.selectedFolderId;
  const basketDirectoryId = writingBasketEntries().find((note) => note?.folderId && isDirectoryUnderOriginalRoot(note.folderId))?.folderId;
  return basketDirectoryId || "dir_original_default";
}

function writingDraftTitle() {
  const projectTitle = String(writingState.project?.title || $("writingTitle")?.value || "").trim() || "未命名写作项目";
  return `${projectTitle} 草稿`;
}

function rewriteMarkdownHeading(markdown, title) {
  const cleanTitle = String(title || "").trim() || "未命名草稿";
  const text = String(markdown || "").replace(/\r\n/g, "\n").trim();
  if (!text) return `# ${cleanTitle}\n`;
  if (/^#\s+/.test(text)) return text.replace(/^#\s+.*$/m, `# ${cleanTitle}`);
  return `# ${cleanTitle}\n\n${text}\n`;
}

function writingDraftBody() {
  const headingTitle = writingDraftTitle();
  const scaffoldMarkdown = rewriteMarkdownHeading(writingState.scaffoldMarkdown, headingTitle).trimEnd();
  const projectId = writingState.project?.id || "";
  const scaffoldId = writingState.scaffold?.id || "";
  const references = uniqueStrings([
    projectId ? `WritingProject: ${projectId}` : "",
    scaffoldId ? `DraftScaffold: ${scaffoldId}` : ""
  ]);
  const tail = references.length ? `\n\n---\n${references.join("\n")}\n` : "\n";
  return `${scaffoldMarkdown}${tail}`;
}

function writingScaffoldFileName(title = "") {
  const base = String(title || "writing-project")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${base || "writing-project"}_scaffold.md`;
}

async function copyTextToClipboard(text) {
  const value = String(text || "");
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "fixed";
  textarea.style.left = "-10000px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!success) throw new Error("clipboard unavailable");
}

function downloadTextFile(fileName, text) {
  const blob = new Blob([String(text || "")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  window.__lastWritingExport__ = {
    fileName,
    bytes: blob.size,
    downloadedAt: new Date().toISOString()
  };
  return blob.size;
}

function writingNoteExcerpt(note) {
  const text = String(note?.body || "")
    .replace(/\r\n/g, "\n")
    .replace(/^#.*$/m, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "这条原创笔记还没有正文摘要。";
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function writingNoteMeta(note) {
  const folder = folderById(state, note?.folderId);
  return uniqueStrings([
    note?.id,
    folder?.name,
    note?.noteType === "permanent" || rootBoxIdFromFolder(state, note?.folderId) === "dir_original_default" ? "原创/永久笔记" : note?.noteType
  ]).join(" · ");
}

function renderWritingNoteCard(note, { selected = false, action = "add", actionLabel = "加入篮子" } = {}) {
  return `
    <article class="writing-note-card ${selected ? "selected" : ""}" data-writing-note-id="${escapeHtml(note.id)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(note.title || note.id)}</div>
          <div class="writing-note-meta">${escapeHtml(writingNoteMeta(note))}</div>
        </div>
      </div>
      <div class="writing-note-meta">${escapeHtml(writingNoteExcerpt(note))}</div>
      <div class="writing-note-actions">
        <button class="mini-btn" type="button" data-writing-action="${escapeHtml(action)}" data-writing-note-id="${escapeHtml(note.id)}">${escapeHtml(actionLabel)}</button>
        <button class="mini-btn" type="button" data-writing-action="open" data-writing-note-id="${escapeHtml(note.id)}">打开笔记</button>
      </div>
    </article>
  `;
}

function populateWritingFormFromProject(project) {
  if (!project) return;
  if ($("writingTitle")) $("writingTitle").value = project.title || "";
  if ($("writingGoal")) $("writingGoal").value = project.goal || "";
  if ($("writingAudience")) $("writingAudience").value = project.audience || "";
  if ($("writingTone")) $("writingTone").value = project.tone || "";
  setWritingBasketIds(project.basket_note_ids || []);
}

function renderWritingProjectCard(project) {
  const draftLabel = project?.draft_note?.title || project?.draft_note_id || "未绑定草稿";
  const scaffoldLabel = project?.scaffold_id || "未生成";
  const hasScaffold = Boolean(project?.scaffold_id);
  return `
    <article class="writing-note-card" data-writing-project-id="${escapeHtml(project.id)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(project.title || project.id)}</div>
          <div class="writing-note-meta">${escapeHtml(project.id)} · ${escapeHtml(project.status || "draft")} · 篮子 ${escapeHtml(project.basket_count || 0)}</div>
        </div>
      </div>
      <div class="writing-note-meta">Scaffold：${escapeHtml(scaffoldLabel)}；草稿：${escapeHtml(draftLabel)}</div>
      <div class="writing-note-meta">${escapeHtml(project.goal || "暂无写作目标说明。")}</div>
      <div class="writing-note-actions">
        <button class="mini-btn" type="button" data-writing-project-action="open" data-writing-project-id="${escapeHtml(project.id)}">打开项目</button>
        <button class="mini-btn" type="button" data-writing-project-action="copy-scaffold" data-writing-project-id="${escapeHtml(project.id)}" ${hasScaffold ? "" : "disabled"}>复制 Scaffold</button>
        <button class="mini-btn" type="button" data-writing-project-action="export-scaffold" data-writing-project-id="${escapeHtml(project.id)}" ${hasScaffold ? "" : "disabled"}>导出 .md</button>
      </div>
    </article>
  `;
}

function renderScaffoldVersionCard(version) {
  const isActive = writingState.scaffold?.id === version.id;
  return `
    <article class="writing-note-card ${isActive ? "selected" : ""}" data-writing-scaffold-id="${escapeHtml(version.id)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(version.id)}</div>
          <div class="writing-note-meta">${escapeHtml(version.generated_by || "writing-engine")} · 章节 ${escapeHtml(version.section_count || 0)}</div>
        </div>
      </div>
      <div class="writing-note-meta">生成于：${escapeHtml(version.created_at || version.updated_at || "")}${isActive ? " · 当前预览中" : ""}</div>
      <div class="writing-note-actions">
        <button class="mini-btn" type="button" data-writing-scaffold-action="open" data-writing-scaffold-id="${escapeHtml(version.id)}">打开版本</button>
        <button class="mini-btn" type="button" data-writing-scaffold-action="copy" data-writing-scaffold-id="${escapeHtml(version.id)}">复制</button>
        <button class="mini-btn" type="button" data-writing-scaffold-action="export" data-writing-scaffold-id="${escapeHtml(version.id)}">导出</button>
      </div>
    </article>
  `;
}

function renderDraftVersionCard(version) {
  const noteTitle = version?.note?.title || version?.draft_note_id || "未命名草稿";
  const noteStatus = version?.note?.status || "draft";
  const sourceScaffold = version?.source_scaffold_id || "未记录";
  return `
    <article class="writing-note-card ${version?.is_current ? "selected" : ""}" data-writing-draft-version-id="${escapeHtml(version.id)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">v${escapeHtml(version.version_no || 0)} · ${escapeHtml(noteTitle)}</div>
          <div class="writing-note-meta">${escapeHtml(version.draft_note_id)} · ${escapeHtml(noteStatus)}${version?.is_current ? " · 当前草稿" : ""}</div>
        </div>
      </div>
      <div class="writing-note-meta">来源 Scaffold：${escapeHtml(sourceScaffold)}</div>
      <div class="writing-note-meta">创建时间：${escapeHtml(version.created_at || "")}</div>
      <div class="writing-note-actions">
        <button class="mini-btn" type="button" data-writing-draft-action="open" data-writing-draft-note-id="${escapeHtml(version.draft_note_id)}">打开草稿</button>
      </div>
    </article>
  `;
}

async function loadWritingProjectsList() {
  writingState.loadingProjects = true;
  renderWritingPanel();
  try {
    writingState.projects = await listWritingProjects(8);
  } finally {
    writingState.loadingProjects = false;
    renderWritingPanel();
  }
}

async function loadWritingScaffoldVersions() {
  const writingProjectId = String(writingState.project?.id || "").trim();
  if (!writingProjectId) {
    writingState.scaffoldVersions = [];
    renderWritingPanel();
    return [];
  }
  writingState.loadingScaffoldVersions = true;
  renderWritingPanel();
  try {
    writingState.scaffoldVersions = await listProjectScaffolds(writingProjectId, 12);
    return writingState.scaffoldVersions;
  } finally {
    writingState.loadingScaffoldVersions = false;
    renderWritingPanel();
  }
}

async function loadWritingDraftVersions() {
  const writingProjectId = String(writingState.project?.id || "").trim();
  if (!writingProjectId) {
    writingState.draftVersions = [];
    renderWritingPanel();
    return [];
  }
  writingState.loadingDraftVersions = true;
  renderWritingPanel();
  try {
    writingState.draftVersions = await listProjectDraftVersions(writingProjectId, 12);
    return writingState.draftVersions;
  } finally {
    writingState.loadingDraftVersions = false;
    renderWritingPanel();
  }
}

async function openWritingProject(projectId) {
  const project = await fetchWritingProject(projectId);
  writingState.project = project;
  populateWritingFormFromProject(project);
  if (project?.scaffold_id) {
    try {
      const scaffold = await fetchDraftScaffold(project.scaffold_id);
      writingState.scaffold = scaffold.item || null;
      writingState.scaffoldMarkdown = scaffold.export?.markdown || scaffold.item?.markdown || "";
    } catch {
      writingState.scaffold = null;
      writingState.scaffoldMarkdown = "";
    }
  } else {
    writingState.scaffold = null;
    writingState.scaffoldMarkdown = "";
  }
  await refreshWritingProjectState();
  await loadWritingScaffoldVersions();
  await loadWritingDraftVersions();
  renderWritingPanel();
  return project;
}

async function scaffoldBundleForProject(projectLike = null) {
  const project = projectLike || writingState.project;
  if (!project?.id) throw new Error("writingProjectId is required");
  if (!project?.scaffold_id) throw new Error("scaffold is not available for this project");
  if (writingState.project?.id === project.id && writingState.scaffold?.id === project.scaffold_id && String(writingState.scaffoldMarkdown || "").trim()) {
    return {
      project: writingState.project,
      scaffold: writingState.scaffold,
      markdown: writingState.scaffoldMarkdown
    };
  }
  const fetchedProject = writingState.project?.id === project.id ? writingState.project : await fetchWritingProject(project.id);
  const scaffold = await fetchDraftScaffold(project.scaffold_id);
  if (writingState.project?.id === project.id) {
    writingState.project = fetchedProject;
    writingState.scaffold = scaffold.item || null;
    writingState.scaffoldMarkdown = scaffold.export?.markdown || scaffold.item?.markdown || "";
    renderWritingPanel();
  }
  return {
    project: fetchedProject,
    scaffold: scaffold.item || null,
    markdown: scaffold.export?.markdown || scaffold.item?.markdown || ""
  };
}

async function openScaffoldVersion(scaffoldId) {
  const id = String(scaffoldId || "").trim();
  if (!id) throw new Error("draftScaffoldId is required");
  const scaffold = await fetchDraftScaffold(id);
  writingState.scaffold = scaffold.item || null;
  writingState.scaffoldMarkdown = scaffold.export?.markdown || scaffold.item?.markdown || "";
  renderWritingPanel();
  return scaffold;
}

async function copyWritingScaffold(projectLike = null) {
  const bundle = await scaffoldBundleForProject(projectLike);
  const markdown = String(bundle.markdown || "").trim();
  if (!markdown) throw new Error("scaffold markdown is empty");
  await copyTextToClipboard(markdown);
  const fileName = writingScaffoldFileName(bundle.project?.title);
  showWritingResult({
    stage: "writing_copy_scaffold",
    writingProjectId: bundle.project?.id,
    draftScaffoldId: bundle.scaffold?.id,
    fileName,
    characters: markdown.length
  });
  return { ...bundle, fileName, characters: markdown.length };
}

async function exportWritingScaffold(projectLike = null) {
  const bundle = await scaffoldBundleForProject(projectLike);
  const markdown = String(bundle.markdown || "").trim();
  if (!markdown) throw new Error("scaffold markdown is empty");
  const fileName = writingScaffoldFileName(bundle.project?.title);
  const bytes = downloadTextFile(fileName, `${markdown}\n`);
  showWritingResult({
    stage: "writing_export_scaffold",
    writingProjectId: bundle.project?.id,
    draftScaffoldId: bundle.scaffold?.id,
    fileName,
    characters: markdown.length,
    bytes
  });
  return { ...bundle, fileName, characters: markdown.length, bytes };
}

function renderWritingScaffoldPreview() {
  const el = $("writingScaffoldPreview");
  if (!el) return;
  if (!writingState.scaffold) {
    el.innerHTML = `
      <h4>Scaffold 预览</h4>
      <div class="writing-empty">生成草稿骨架后，这里会显示章节和 Markdown 预览。</div>
    `;
    return;
  }

  const sections = Array.isArray(writingState.scaffold.sections) ? writingState.scaffold.sections : [];
  const questions = Array.isArray(writingState.scaffold.open_questions) ? writingState.scaffold.open_questions : [];
  const markdown = String(writingState.scaffoldMarkdown || "").trim();
  const targetDirectoryId = writingDraftDirectoryId();
  const targetFolder = folderById(state, targetDirectoryId);
  el.innerHTML = `
    <h4>Scaffold 预览</h4>
    <div class="writing-summary">
      Scaffold：${escapeHtml(writingState.scaffold.id || "未命名")}；章节 ${escapeHtml(sections.length || 0)} 个；开放问题 ${escapeHtml(questions.length || 0)} 个。
    </div>
    <div class="writing-summary">
      保存草稿时会写入：${escapeHtml(targetFolder?.name || targetDirectoryId)}。
    </div>
    <div>
      <h4>章节结构</h4>
      ${
        sections.length
          ? `<ol>${sections
              .map((section) => `<li><strong>${escapeHtml(section.heading || `Section ${section.order || ""}`)}</strong> ${escapeHtml(section.purpose || "")}</li>`)
              .join("")}</ol>`
          : `<div class="writing-empty">当前 scaffold 还没有章节。</div>`
      }
    </div>
    <div>
      <h4>Markdown 预览</h4>
      ${markdown ? `<pre>${escapeHtml(markdown)}</pre>` : `<div class="writing-empty">本次返回里还没有 Markdown 内容。</div>`}
    </div>
  `;
}

function renderWritingPanel() {
  const current = $("writingCurrentNote");
  const scopeHint = $("writingScopeHint");
  const basketSummary = $("writingBasketSummary");
  const basketList = $("writingBasketList");
  const candidateSummary = $("writingCandidateSummary");
  const candidateList = $("writingCandidateList");
  const openDraftButton = $("btnWritingOpenDraft");
  const copyScaffoldButton = $("btnWritingCopyScaffold");
  const exportScaffoldButton = $("btnWritingExportScaffold");
  const projectsHint = $("writingProjectsHint");
  const projectsList = $("writingProjectsList");
  const scaffoldVersionsHint = $("writingScaffoldVersionsHint");
  const scaffoldVersionsList = $("writingScaffoldVersionsList");
  const draftVersionsHint = $("writingDraftVersionsHint");
  const draftVersionsList = $("writingDraftVersionsList");
  if (!current) return;
  const note = state.notes.find((item) => item.id === state.selectedFileId);
  current.textContent = note ? `${note.title} (${note.id})` : "尚未选择";

  const scopeFolder = folderById(state, state.selectedFolderId);
  const scopeRoot = folderById(state, rootBoxIdFromFolder(state, state.selectedFolderId));
  if (scopeHint) {
  scopeHint.textContent = `当前作用范围：${scopeRoot?.name || "原创笔记"} / ${scopeFolder?.name || "当前目录"}。这里只显示当前目录及其子目录里的原创笔记。`;
  }

  const basketEntries = writingBasketEntries();
  if (basketSummary) {
    const projectPart = writingState.project?.id ? `当前项目：${writingState.project.id}` : "尚未创建项目";
    const scaffoldPart = writingState.scaffold?.id ? `Scaffold：${writingState.scaffold.id}` : "尚未生成 scaffold";
    const draftPart = writingState.project?.draft_note_id
      ? `草稿：${writingState.project?.draft_note?.title || writingState.project.draft_note_id}`
      : "尚未绑定草稿";
    basketSummary.textContent = basketEntries.length
      ? `已加入 ${basketEntries.length} 条原创笔记。${projectPart}；${scaffoldPart}；${draftPart}。`
      : `篮子里还没有笔记。${projectPart}；${scaffoldPart}；${draftPart}。`;
  }
  if (basketList) {
    basketList.innerHTML = basketEntries.length
      ? basketEntries.map((entry) => renderWritingNoteCard(entry, { selected: true, action: "remove", actionLabel: "移出篮子" })).join("")
      : `<div class="writing-empty">先在左侧打开一条原创笔记点击“加入当前笔记”，或直接把当前目录里的原创笔记批量加入写作篮。</div>`;
  }

  const candidates = writingCandidateNotes();
  const basketIds = new Set(parseWritingBasketIds());
  if (candidateSummary) {
    candidateSummary.textContent = candidates.length
      ? `当前目录内共 ${candidates.length} 条原创笔记，可逐条加入篮子或一次性全部加入。`
    : "当前目录里还没有已加载的原创笔记。可以先回到原创笔记目录创建几条笔记，再来生成 scaffold。";
  }
  if (candidateList) {
    candidateList.innerHTML = candidates.length
      ? candidates
          .map((entry) =>
            renderWritingNoteCard(entry, {
              selected: basketIds.has(entry.id),
              action: basketIds.has(entry.id) ? "remove" : "add",
              actionLabel: basketIds.has(entry.id) ? "移出篮子" : "加入篮子"
            })
          )
          .join("")
      : `<div class="writing-empty">当前目录还没有可用的原创笔记候选。</div>`;
  }

  if (openDraftButton) {
    const hasDraft = Boolean(writingState.project?.draft_note_id);
    openDraftButton.disabled = !hasDraft;
    openDraftButton.textContent = hasDraft ? "打开当前草稿" : "暂无草稿";
  }
  if (copyScaffoldButton) copyScaffoldButton.disabled = !writingState.project?.scaffold_id;
  if (exportScaffoldButton) exportScaffoldButton.disabled = !writingState.project?.scaffold_id;

  if (projectsHint) {
    if (writingState.loadingProjects && writingState.projects.length) projectsHint.textContent = `正在刷新最近项目... 当前显示 ${writingState.projects.length} 个项目。`;
    else if (writingState.loadingProjects) projectsHint.textContent = "正在读取最近项目...";
    else if (writingState.projects.length) projectsHint.textContent = `最近 ${writingState.projects.length} 个项目，按更新时间排序。`;
    else projectsHint.textContent = "还没有写作项目，创建后会出现在这里。";
  }
  if (projectsList) {
    if (writingState.loadingProjects) {
      projectsList.innerHTML = writingState.projects.length
        ? writingState.projects.map(renderWritingProjectCard).join("")
        : `<div class="writing-empty">正在加载最近项目...</div>`;
    } else if (writingState.projects.length) {
      projectsList.innerHTML = writingState.projects.map(renderWritingProjectCard).join("");
    } else {
      projectsList.innerHTML = `<div class="writing-empty">还没有写作项目。先从原创笔记创建一个项目，这里就会出现可恢复入口。</div>`;
    }
  }

  if (scaffoldVersionsHint) {
    if (!writingState.project?.id) scaffoldVersionsHint.textContent = "先创建或打开一个写作项目，这里才会显示版本。";
    else if (writingState.loadingScaffoldVersions && writingState.scaffoldVersions.length) {
      scaffoldVersionsHint.textContent = `正在刷新 scaffold 版本... 当前显示 ${writingState.scaffoldVersions.length} 个版本。`;
    } else if (writingState.loadingScaffoldVersions) scaffoldVersionsHint.textContent = "正在读取 scaffold 版本...";
    else if (writingState.scaffoldVersions.length) scaffoldVersionsHint.textContent = `当前项目共有 ${writingState.scaffoldVersions.length} 个 scaffold 版本。`;
    else scaffoldVersionsHint.textContent = "当前项目还没有 scaffold 版本。";
  }
  if (scaffoldVersionsList) {
    if (!writingState.project?.id) {
      scaffoldVersionsList.innerHTML = `<div class="writing-empty">创建或打开项目后，这里会显示历史 scaffold 版本。</div>`;
    } else if (writingState.loadingScaffoldVersions) {
      scaffoldVersionsList.innerHTML = writingState.scaffoldVersions.length
        ? writingState.scaffoldVersions.map(renderScaffoldVersionCard).join("")
        : `<div class="writing-empty">正在加载 scaffold 版本...</div>`;
    } else if (writingState.scaffoldVersions.length) {
      scaffoldVersionsList.innerHTML = writingState.scaffoldVersions.map(renderScaffoldVersionCard).join("");
    } else {
      scaffoldVersionsList.innerHTML = `<div class="writing-empty">还没有 scaffold 版本。点击“生成草稿骨架”后会开始累积版本。</div>`;
    }
  }

  if (draftVersionsHint) {
    if (!writingState.project?.id) draftVersionsHint.textContent = "先创建或打开一个写作项目，这里才会显示草稿版本。";
    else if (writingState.loadingDraftVersions && writingState.draftVersions.length) {
      draftVersionsHint.textContent = `正在刷新草稿版本... 当前显示 ${writingState.draftVersions.length} 个版本。`;
    } else if (writingState.loadingDraftVersions) draftVersionsHint.textContent = "正在读取草稿版本...";
    else if (writingState.draftVersions.length) draftVersionsHint.textContent = `当前项目共有 ${writingState.draftVersions.length} 个草稿版本。`;
    else draftVersionsHint.textContent = "当前项目还没有草稿版本。";
  }
  if (draftVersionsList) {
    if (!writingState.project?.id) {
      draftVersionsList.innerHTML = `<div class="writing-empty">创建或打开项目后，这里会显示草稿版本。</div>`;
    } else if (writingState.loadingDraftVersions) {
      draftVersionsList.innerHTML = writingState.draftVersions.length
        ? writingState.draftVersions.map(renderDraftVersionCard).join("")
        : `<div class="writing-empty">正在加载草稿版本...</div>`;
    } else if (writingState.draftVersions.length) {
      draftVersionsList.innerHTML = writingState.draftVersions.map(renderDraftVersionCard).join("");
    } else {
      draftVersionsList.innerHTML = `<div class="writing-empty">还没有草稿版本。点击“保存为草稿笔记”后会开始累积版本。</div>`;
    }
  }

  renderWritingScaffoldPreview();
}

async function refreshVaultSettings() {
  try {
    settingsState.vault = await fetchVaultInfo();
    settingsState.error = "";
    renderSettingsPanel();
    return settingsState.vault;
  } catch (error) {
    settingsState.error = String(error?.message || error);
    renderSettingsPanel();
    throw error;
  }
}

function renderGraphPanel() {
  const summary = $("graphSummary");
  const canvas = $("graphCanvas");
  if (!summary || !canvas) return;

  const folder = folderById(state, state.selectedFolderId);
  if (graphState.loading) {
    summary.textContent = `正在加载“${folder?.name || "当前目录"}”的关系图谱...`;
    canvas.innerHTML = `<div class="graph-empty">正在读取 SQLite 链接关系。</div>`;
    return;
  }

  if (graphState.error) {
    summary.textContent = `图谱加载失败：${graphState.error}`;
    canvas.innerHTML = `<div class="graph-empty bad">请先确认 API 正常运行，或保存几条带 [[关联笔记]] 的 Markdown。</div>`;
    return;
  }

  const graph = graphState.item;
  if (!graph) {
    summary.textContent = `当前目录：${folder?.name || "未选择目录"}。点击“刷新图谱”查看本目录内笔记关系。`;
    canvas.innerHTML = `<div class="graph-empty">这里只显示当前目录内的笔记节点和目录内链接，不默认打开全局大图。</div>`;
    return;
  }

  summary.textContent = `${graph.directoryTitle || folder?.name || "当前目录"}：${graph.totalNodes || 0} 个节点，${
    graph.totalEdges || 0
  } 条链接`;
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const relationCounts = edges.reduce((acc, edge) => {
    const key = String(edge.relationType || "associated_with").trim();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const relationSummary = Object.entries(relationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([type, count]) => `${type} × ${count}`)
    .join(" / ");
  const linkedNodeIds = new Set(edges.flatMap((edge) => [edge.fromNoteId, edge.toNoteId]).filter(Boolean));
  const isolatedCount = Math.max(0, nodes.filter((node) => !linkedNodeIds.has(node.id)).length);
  const busiestNode = nodes
    .map((node) => ({
      node,
      degree: edges.filter((edge) => edge.fromNoteId === node.id || edge.toNoteId === node.id).length
    }))
    .sort((a, b) => b.degree - a.degree)[0];
  const highlightedEdge = edges[0] || null;
  canvas.innerHTML = `
    <div class="graph-grid">
      <section class="graph-section">
        <div class="graph-section-head">
          <div>
            <div class="graph-section-title">范围与概览</div>
            <div class="graph-section-note">当前只看目录子图，帮助你快速判断这里的结构是否已经成形。</div>
          </div>
        </div>
        <div class="graph-overview">
          <div class="graph-overview-card">
            <strong>当前范围</strong>
            <small>${escapeHtml(graph.directoryTitle || folder?.name || "当前目录")} 内共有 ${nodes.length} 条笔记节点、${edges.length} 条显式链接。</small>
          </div>
          <div class="graph-overview-card">
            <strong>结构状态</strong>
            <small>${busiestNode?.node?.title ? `连接最密的是「${escapeHtml(busiestNode.node.title)}」` : "还没有明显中心节点"}；${isolatedCount} 条笔记暂时没有进入链接关系。</small>
          </div>
          <div class="graph-overview-card">
            <strong>关系分布</strong>
            <small>${relationSummary || "目前还没有关系类型可统计，先在笔记中建立 [[关联笔记]]。"} </small>
          </div>
        </div>
      </section>
      <section class="graph-section">
        <div class="graph-section-head">
          <div>
            <div class="graph-section-title">节点</div>
            <div class="graph-section-note">从这里进入某条笔记，继续补充观点、标签或链接。</div>
          </div>
        </div>
        <div class="graph-list">
        ${
          nodes.length
            ? nodes
                .map(
                  (node) => `
                    <button class="graph-node" data-open-note="${node.id}">
                      <span class="graph-dot"></span>
                      <span class="graph-node-text">
                        <span class="graph-node-title">${escapeHtml(node.title || node.id)}</span>
                        <span class="graph-node-meta">${escapeHtml(node.id)} · ${escapeHtml(node.noteType || "note")}</span>
                      </span>
                      <small>${node.noteType}</small>
                    </button>
                  `
                )
                .join("")
            : `<div class="graph-empty">当前目录还没有笔记。</div>`
        }
        </div>
      </section>
      <section class="graph-section">
        <div class="graph-section-head">
          <div>
            <div class="graph-section-title">关系与详情</div>
            <div class="graph-section-note">先看有哪些连接已经出现，再决定哪些地方要补证据、补反例或补链接理由。</div>
          </div>
        </div>
        ${
          highlightedEdge
            ? `
              <div class="graph-detail-card">
                <strong>当前示例关系</strong>
                <small>${escapeHtml(highlightedEdge.fromTitle || highlightedEdge.fromNoteId)} → ${escapeHtml(
                  highlightedEdge.toTitle || highlightedEdge.toNoteId
                )}</small>
                <small>类型：${escapeHtml(highlightedEdge.relationType || "associated_with")}；说明：${escapeHtml(
                  highlightedEdge.rationale || "尚未写明，当前来自 Markdown wikilink。"
                )}</small>
              </div>
            `
            : `
              <div class="graph-detail-card">
                <strong>当前还没有关系边</strong>
                <small>你可以回到笔记编辑器，用 [[关联笔记]] 把已有观点串起来，再回来查看局部结构。</small>
              </div>
            `
        }
        <div class="graph-list">
        ${
          edges.length
            ? edges
                .map(
                  (edge) => `
                    <button class="graph-edge" data-open-note="${edge.fromNoteId}">
                      <span class="graph-edge-text">
                        <span class="graph-edge-title">${escapeHtml(edge.fromTitle || edge.fromNoteId)} → ${escapeHtml(
                          edge.toTitle || edge.toNoteId
                        )}</span>
                        <span class="graph-edge-meta">${escapeHtml(edge.rationale || edge.relationType || "关联")} · ${escapeHtml(
                          edge.createdBy || "user"
                        )}</span>
                      </span>
                      <small>${edge.rationale || edge.relationType}</small>
                    </button>
                  `
                )
                .join("")
            : `<div class="graph-empty">当前目录内还没有可显示的 [[关联笔记]] 链接。</div>`
        }
        </div>
      </section>
    </div>
  `;
}

async function refreshDirectoryGraph() {
  graphState.loading = true;
  graphState.error = "";
  renderGraphPanel();
  try {
    graphState.item = await fetchDirectoryGraph(state.selectedFolderId);
  } catch (error) {
    graphState.error = String(error?.message || error);
    graphState.item = null;
  } finally {
    graphState.loading = false;
    renderGraphPanel();
  }
}

async function ensureNoteBodyLoaded(noteId) {
  const note = state.notes.find((n) => n.id === noteId);
  if (!note || note.bodyLoaded) return;
  const expectedNoteBody = note.body;
  const expectedTab = state.tabs.find((t) => t.noteId === note.id);
  const expectedTabBody = expectedTab?.body;
  try {
    const full = await fetchNote(noteId);
    if (!full) return;
    const currentTab = state.tabs.find((t) => t.noteId === note.id);
    if (currentTab?.dirty) {
      note.bodyLoaded = true;
      return;
    }
    const hasLocalEditorChange = currentTab && currentTab.body !== expectedTabBody;
    const hasLocalNoteChange = note.body !== expectedNoteBody;
    if (hasLocalEditorChange || hasLocalNoteChange) {
      note.bodyLoaded = true;
      return;
    }
    note.body = full.body || note.body;
    note.title = full.title || note.title;
    note.markdownPath = full.markdownPath || note.markdownPath;
    note.updatedAt = full.updatedAt || note.updatedAt;
    note.bodyLoaded = true;
    const tab = state.tabs.find((t) => t.noteId === note.id);
    if (tab) {
      tab.body = note.body;
      tab.title = note.title;
      tab.savedBody = note.body;
      tab.savedTitle = note.title;
      tab.dirty = false;
      if (state.activeTabId === tab.id) editor.fillEditorFromTab();
    }
  } catch {}
}

function openNoteById(id, options = {}) {
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  if (activeTab?.dirty && activeTab.noteId !== id) {
    const ok = editor.confirmDiscardDirtyTabs(`当前笔记“${activeTab.title || "未命名笔记"}”有未保存更改，打开其他笔记会保留旧 Tab，但当前视图会切走。是否继续？`);
    if (!ok) {
      state.selectedFileId = activeTab.noteId;
      const activeNote = state.notes.find((n) => n.id === activeTab.noteId);
      if (activeNote) {
        state.selectedFolderId = activeNote.folderId;
        state.browserRootId = rootBoxIdFromFolder(state, activeNote.folderId);
      }
      renderAll();
      return false;
    }
  }
  state.selectedFileId = id;
  const note = state.notes.find((n) => n.id === id);
  if (note) {
    state.selectedFolderId = note.folderId;
    state.browserRootId = rootBoxIdFromFolder(state, note.folderId);
  }
  editor.openNoteTab(id, options);
  renderAll();
  ensureNoteBodyLoaded(id);
  return true;
}

async function handleStateChange(reason, payload = {}) {
  if (reason === "create-note-in-selected-folder") {
    const result = await createNoteInSelectedFolder({ preferTitleSelection: true });
    if (result.remote) {
      setStatus("已在当前目录创建 Markdown 文件（已落盘）", "ok");
    } else {
      setStatus(`API 不可用，已降级本地创建：${String(result.error?.message || result.error)}`, "warn");
    }
    return;
  }

  if (reason === "select-folder") {
    try {
      await syncNotesForDirectory(state.selectedFolderId);
      if (state.module === "graph") await refreshDirectoryGraph();
    } catch (error) {
      setStatus(`目录加载失败，保留本地数据：${String(error?.message || error)}`, "warn");
    }
    renderAll();
    return;
  }

  if (reason === "save-note") {
    const noteId = payload.noteId || state.tabs.find((t) => t.id === state.activeTabId)?.noteId || null;
    if (noteId) {
      const note = state.notes.find((n) => n.id === noteId);
      if (note && payload.title) {
        note.title = payload.title;
        note.body = replaceFirstMarkdownTitle(note.body, payload.title);
        const tab = state.tabs.find((t) => t.noteId === note.id);
        if (tab) {
          tab.title = note.title;
          tab.body = note.body;
          if (state.activeTabId === tab.id) editor.fillEditorFromTab();
        }
      }
      if (note) {
        try {
          const resolvedStatus = payload.originalityStatus === "pass" ? "active" : "draft";
          const updated = await updateNote(note.id, {
            title: note.title,
            body: note.body,
            status: resolvedStatus,
            originalityStatus: payload.originalityStatus,
            originalitySimilarity: payload.originalitySimilarity
          });
          if (updated) {
            note.title = updated.title || note.title;
            note.body = updated.body || note.body;
            note.markdownPath = updated.markdownPath || note.markdownPath;
            note.updatedAt = updated.updatedAt || note.updatedAt;
            note.bodyLoaded = true;
          }
          setStatus("已保存 Markdown（已落盘）", "ok");
          if (state.module === "graph") await refreshDirectoryGraph();
	        } catch (error) {
	          setStatus(`保存失败（仅本地暂存）：${String(error?.message || error)}`, "warn");
            renderAll();
            return false;
	        }
	      }
	    }
	    renderAll();
	    return true;
	  }

  if (reason === "note-move") {
    try {
      const moved = await moveNote(payload.noteId, payload.directoryId);
      const note = state.notes.find((n) => n.id === payload.noteId);
      if (note && moved) {
        note.folderId = moved.directoryId || payload.directoryId;
        note.noteType = typeFromFolder(state, note.folderId);
        note.markdownPath = moved.markdownPath || note.markdownPath;
        note.updatedAt = moved.updatedAt || new Date().toISOString();
      }
      state.selectedFolderId = payload.directoryId;
      setStatus("已移动笔记并落盘", "ok");
    } catch (error) {
      setStatus(`移动失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "note-delete") {
    try {
      await deleteNote(payload.noteId);
      state.notes = state.notes.filter((n) => n.id !== payload.noteId);
      state.tabs = state.tabs.filter((t) => t.noteId !== payload.noteId);
      if (state.activeTabId && !state.tabs.find((t) => t.id === state.activeTabId)) {
        state.activeTabId = state.tabs[0]?.id || null;
      }
      setStatus("已删除笔记并落盘", "ok");
    } catch (error) {
      setStatus(`删除失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "directory-update") {
    const subtreeIds = descendantDirectoryIds(payload.directoryId);
    const currentFolder = state.folders.find((item) => item.id === payload.directoryId);
    try {
      const patch = { ...(payload.patch || {}) };
      if (patch.title && !patch.fsPath) {
        const nextFsPath = renamedDirectoryFsPath(currentFolder, patch.title);
        if (nextFsPath) patch.fsPath = nextFsPath;
      }
      const updated = await updateDirectory(payload.directoryId, patch);
      await syncDirectoriesFromApi();
      await syncLoadedNotesForDirectories(subtreeIds);
      const folder = state.folders.find((f) => f.id === payload.directoryId);
      if (folder && updated) state.browserRootId = rootBoxIdFromFolder(state, folder.id);
      setStatus("目录已更新并落盘", "ok");
    } catch (error) {
      setStatus(`目录更新失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "directory-delete") {
    try {
      await deleteDirectory(payload.directoryId);
      state.folders = state.folders.filter((f) => f.id !== payload.directoryId);
      if (state.selectedFolderId === payload.directoryId) {
        state.selectedFolderId = state.browserRootId;
      }
      setStatus("目录已删除并落盘", "ok");
    } catch (error) {
      setStatus(`目录删除失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "directory-move") {
    const subtreeIds = descendantDirectoryIds(payload.directoryId);
    const folder = state.folders.find((item) => item.id === payload.directoryId);
    const targetParent = folderById(state, payload.parentDirectoryId);
    try {
      const patch = { parentDirectoryId: payload.parentDirectoryId };
      const nextFsPath = movedDirectoryFsPath(folder, targetParent);
      if (nextFsPath) patch.fsPath = nextFsPath;
      const updated = await updateDirectory(payload.directoryId, patch);
      await syncDirectoriesFromApi();
      await syncLoadedNotesForDirectories(subtreeIds);
      if (updated) {
        state.selectedFolderId = payload.directoryId;
        state.browserRootId = rootBoxIdFromFolder(state, payload.directoryId);
      }
      setStatus("目录层级已更新并落盘", "ok");
    } catch (error) {
      setStatus(`目录移动失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "switch-tab" || reason === "folder-context-action" || reason === "file-context-action" || reason === "list-context-action") {
    renderAll();
  }
}

const contextMenu = new ContextMenu($("contextMenu"));
const createBoxDialog = new CreateBoxDialog({
  maskEl: $("newBoxModal"),
  nameEl: $("modalBoxName"),
  parentEl: $("modalParentFolder"),
  fsPathEl: $("modalFsPath"),
  browseEl: $("modalBrowsePath"),
  maxEl: $("modalMaxCards"),
  cancelEl: $("modalCancel"),
  createEl: $("modalCreate"),
  onStatus: setStatus,
  pickDirectory: desktopCommands.browseDirectory
});

createBoxDialog.onCreate = async ({ name, parentId, fsPath, maxCards }) => {
  if (!name) return setStatus("请输入目录名称", "bad");
  const parentFolder = folderById(state, parentId);
  const resolvedPath = fsPath || joinFsPath(parentFolder?.fsPath || "", name);
  try {
    const created = await createDirectory({
      title: name,
      parentDirectoryId: parentId || null,
      directoryType: "custom",
      fsPath: resolvedPath,
      maxNotes: maxCards > 0 ? maxCards : 500
    });
    if (!created) throw new Error("创建目录失败");
    const folder = mapDirectoryItem(created);
    state.folders.push(folder);
    state.selectedFolderId = folder.id;
    state.browserRootId = rootBoxIdFromFolder(state, folder.id);
    createBoxDialog.hide();
    setStatus(`目录“${name}”已创建并落盘，路径：${resolvedPath}`, "ok");
    renderAll();
  } catch (error) {
    setStatus(`创建目录失败：${String(error?.message || error)}`, "bad");
  }
};

const explorer = new ExplorerPane({
  state,
  elements: {
    searchInput: $("searchInput"),
    toggleSearchBtn: $("btnToggleSearch"),
    openNewBoxBtn: $("btnOpenNewBoxDialog"),
    newNoteBtn: $("btnNewNote"),
    listArea: $("listArea")
  },
  contextMenu,
  createBoxDialog,
  onOpenNote: openNoteById,
  onStatus: setStatus,
  onStateChange: handleStateChange,
  pickDirectory: desktopCommands.browseDirectory,
  desktopFile: { revealPath: desktopCommands.revealInFileManager, openPath: desktopCommands.openDirectory },
  resolveNotePath
});

const editor = new EditorPane({
  state,
  elements: {
    tabs: $("tabs"),
    body: $("editorBody"),
    wysiwygHost: $("wysiwygHost"),
    editorHost: $("editorHost"),
    markdownSplit: $("markdownSplit"),
    previewPanel: $("markdownPreviewPanel"),
    preview: $("markdownPreview"),
    editorWrap: $("markdownPanel")?.closest(".editor-wrap"),
    relatedPanel: $("relatedPanel"),
    result: $("resultArea"),
    linkPicker: $("linkPicker"),
    linkSearchInput: $("linkSearchInput"),
    linkSearchList: $("linkSearchList"),
    closeLinkPicker: $("btnCloseLinkPicker"),
    tagPicker: $("tagPicker"),
    tagSearchInput: $("tagSearchInput"),
    tagSearchList: $("tagSearchList"),
    closeTagPicker: $("btnCloseTagPicker"),
    insertLink: $("btnInsertLink"),
    insertAsset: $("btnInsertAsset"),
    insertTag: $("btnInsertTag"),
    codeTools: $("codeTools"),
    codeLanguage: $("codeLanguageSelect"),
    tableTools: $("tableTools"),
    tableAddRow: $("btnTableAddRow"),
    tableAddColumn: $("btnTableAddColumn"),
    assetInput: $("assetFileInput"),
    modeEdit: $("btnModeEdit"),
    modeSplit: $("btnModeSplit"),
    modePreview: $("btnModePreview"),
    showRelated: $("btnShowRelated"),
    hideRelated: $("btnHideRelated"),
    runGuard: $("btnRunGuard"),
    save: $("btnSave"),
    statusHint: $("statusHint")
  },
  onStatus: setStatus,
  onStateChange: handleStateChange,
  onOpenNote: openNoteById,
  onChromeChange: renderStatusMeta
});

$("settingsRefreshVault")?.addEventListener("click", async () => {
  try {
    await refreshVaultSettings();
    setStatus("已刷新当前 Vault 信息", "ok");
  } catch (error) {
    setStatus(`刷新 Vault 信息失败：${String(error?.message || error)}`, "bad");
  }
});

$("settingsBrowseVault")?.addEventListener("click", async () => {
  const picked = await desktopCommands.pickVaultDirectory({ defaultPath: $("settingsVaultPath")?.value || settingsState.vault?.vaultPath || "" });
  if (picked.path) {
    $("settingsVaultPath").value = picked.path;
    setStatus(`已选择 Vault 路径（${picked.source}）`, "ok");
  }
});

$("settingsSwitchVault")?.addEventListener("click", async () => {
  const vaultPath = String($("settingsVaultPath")?.value || "").trim();
  if (!vaultPath) return setStatus("请先选择或输入 Vault 路径", "warn");
  if (!editor.confirmDiscardDirtyTabs("切换 Vault 会关闭当前所有打开的笔记，未保存更改会丢失。是否继续？")) return;
  try {
    const vault = await desktopCommands.switchVault(vaultPath);
    settingsState.vault = vault;
    state.notes = [];
    state.tabs = [];
    state.activeTabId = null;
    state.selectedFileId = null;
    await syncDirectoriesFromApi();
    state.browserRootId = "dir_original_default";
    state.selectedFolderId = "dir_original_default";
    await syncNotesForDirectory(state.selectedFolderId);
    renderAll();
    setStatus(`已切换并初始化 Vault：${vault.vaultPath}`, "ok");
  } catch (error) {
    setStatus(`切换 Vault 失败：${String(error?.message || error)}`, "bad");
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!editor.hasDirtyTabs()) return;
  event.preventDefault();
  event.returnValue = "";
});

$("btnWritingUseCurrent")?.addEventListener("click", () => {
  const note = state.notes.find((item) => item.id === state.selectedFileId);
  if (!note) return setStatus("请先在左侧选择一条原创笔记", "warn");
if (!isWritingEligibleNote(note)) return setStatus("写作篮只接受原创/永久笔记，请先切到原创笔记目录选择笔记", "warn");
  addWritingBasketIds([note.id]);
  if (!$("writingTitle")?.value.trim()) $("writingTitle").value = note.title || "新的写作项目";
  renderWritingPanel();
  setStatus(`已加入写作篮子：${note.title}`, "ok");
});

$("btnWritingAddVisible")?.addEventListener("click", () => {
  const candidates = writingCandidateNotes();
  if (!candidates.length) return setStatus("当前目录没有可加入的原创笔记", "warn");
  addWritingBasketIds(candidates.map((note) => note.id));
  renderWritingPanel();
  setStatus(`已加入当前目录原创笔记：${candidates.length} 条`, "ok");
});

$("btnWritingClearBasket")?.addEventListener("click", () => {
  clearWritingBasket();
  writingState.project = null;
  writingState.scaffold = null;
  writingState.scaffoldMarkdown = "";
  writingState.scaffoldVersions = [];
  writingState.draftVersions = [];
  renderWritingPanel();
  showWritingResult("已清空写作篮。");
  setStatus("已清空写作篮", "ok");
});

$("writingCandidateList")?.addEventListener("click", (event) => {
  const button = event.target?.closest?.("[data-writing-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-action") || "");
  const noteId = String(button.getAttribute("data-writing-note-id") || "");
  if (!noteId) return;
  if (action === "add") {
    addWritingBasketIds([noteId]);
    renderWritingPanel();
    setStatus(`已加入写作篮：${noteId}`, "ok");
    return;
  }
  if (action === "remove") {
    removeWritingBasketId(noteId);
    renderWritingPanel();
    setStatus(`已移出写作篮：${noteId}`, "ok");
    return;
  }
  if (action === "open") {
    openNoteById(noteId);
    setStatus(`已打开原创笔记：${noteId}`, "ok");
  }
});

$("writingBasketList")?.addEventListener("click", (event) => {
  const button = event.target?.closest?.("[data-writing-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-action") || "");
  const noteId = String(button.getAttribute("data-writing-note-id") || "");
  if (!noteId) return;
  if (action === "remove") {
    removeWritingBasketId(noteId);
    renderWritingPanel();
    setStatus(`已移出写作篮：${noteId}`, "ok");
    return;
  }
  if (action === "open") {
    openNoteById(noteId);
    setStatus(`已打开原创笔记：${noteId}`, "ok");
  }
});

$("writingProjectsList")?.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-writing-project-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-project-action") || "");
  const projectId = String(button.getAttribute("data-writing-project-id") || "");
  if (!projectId) return;
  if (action === "open") {
    try {
      await openWritingProject(projectId);
      setStatus(`已恢复写作项目：${projectId}`, "ok");
    } catch (error) {
      setStatus(`打开写作项目失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }

  const project = writingState.projects.find((item) => item.id === projectId) || { id: projectId };
  if (action === "copy-scaffold") {
    try {
      const result = await copyWritingScaffold(project);
      setStatus(`已复制 Scaffold Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`复制 Scaffold 失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "export-scaffold") {
    try {
      const result = await exportWritingScaffold(project);
      setStatus(`已导出 Scaffold Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`导出 Scaffold 失败：${String(error?.message || error)}`, "bad");
    }
  }
});

$("writingScaffoldVersionsList")?.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-writing-scaffold-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-scaffold-action") || "");
  const scaffoldId = String(button.getAttribute("data-writing-scaffold-id") || "");
  if (!scaffoldId) return;
  const version = writingState.scaffoldVersions.find((item) => item.id === scaffoldId) || { id: scaffoldId, writing_project_id: writingState.project?.id };

  if (action === "open") {
    try {
      await openScaffoldVersion(scaffoldId);
      setStatus(`已切换到 scaffold 版本：${scaffoldId}`, "ok");
    } catch (error) {
      setStatus(`打开 scaffold 版本失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }

  const projectLike = {
    ...(writingState.project || {}),
    id: writingState.project?.id || version.writing_project_id,
    scaffold_id: scaffoldId
  };
  if (action === "copy") {
    try {
      const result = await copyWritingScaffold(projectLike);
      setStatus(`已复制 Scaffold Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`复制 Scaffold 失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "export") {
    try {
      const result = await exportWritingScaffold(projectLike);
      setStatus(`已导出 Scaffold Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`导出 Scaffold 失败：${String(error?.message || error)}`, "bad");
    }
  }
});

$("writingDraftVersionsList")?.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-writing-draft-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-draft-action") || "");
  const draftNoteId = String(button.getAttribute("data-writing-draft-note-id") || "");
  if (!draftNoteId) return;
  if (action === "open") {
    try {
      if (!writingNoteById(draftNoteId)) {
        const fetched = await fetchNote(draftNoteId);
        if (fetched) state.notes = [mapNoteItem(fetched), ...state.notes.filter((item) => item.id !== draftNoteId)];
      }
      activateModule("explorer");
      openNoteById(draftNoteId);
      setStatus(`已打开草稿版本：${draftNoteId}`, "ok");
    } catch (error) {
      setStatus(`打开草稿版本失败：${String(error?.message || error)}`, "bad");
    }
  }
});

$("btnWritingRefreshProjects")?.addEventListener("click", async () => {
  try {
    await loadWritingProjectsList();
    setStatus("已刷新最近项目", "ok");
  } catch (error) {
    setStatus(`刷新项目失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingRefreshScaffolds")?.addEventListener("click", async () => {
  try {
    await loadWritingScaffoldVersions();
    setStatus("已刷新 scaffold 版本", "ok");
  } catch (error) {
    setStatus(`刷新 scaffold 版本失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingRefreshDraftVersions")?.addEventListener("click", async () => {
  try {
    await loadWritingDraftVersions();
    setStatus("已刷新草稿版本", "ok");
  } catch (error) {
    setStatus(`刷新草稿版本失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingCreateProject")?.addEventListener("click", async () => {
  const title = String($("writingTitle")?.value || "").trim();
  const basketNoteIds = parseWritingBasketIds();
  if (!title) return setStatus("请先填写写作项目标题", "warn");
  if (!basketNoteIds.length) return setStatus("请先加入至少一条原创笔记", "warn");
  try {
    const project = await createWritingProject({
      title,
      goal: String($("writingGoal")?.value || "").trim(),
      audience: String($("writingAudience")?.value || "").trim(),
      tone: String($("writingTone")?.value || "").trim(),
      basketNoteIds
    });
    writingState.project = project;
    writingState.scaffold = null;
    writingState.scaffoldMarkdown = "";
    showWritingResult({
      stage: "writing_project",
      writingProjectId: project?.id,
      title: project?.title,
      basketNoteIds: project?.basket_note_ids,
      basketNotes: project?.basket_notes
    });
    await loadWritingProjectsList();
    await loadWritingScaffoldVersions();
    await loadWritingDraftVersions();
    renderWritingPanel();
    setStatus(`写作项目已创建：${project?.id}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_project_error",
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`写作项目创建失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingCreateScaffold")?.addEventListener("click", async () => {
  const writingProjectId = writingState.project?.id;
  if (!writingProjectId) return setStatus("请先创建写作项目", "warn");
  try {
    const result = await createDraftScaffold(writingProjectId);
    writingState.scaffold = result.item || null;
    writingState.scaffoldMarkdown = result.export?.markdown || "";
    if (writingState.project) {
      writingState.project = {
        ...writingState.project,
        scaffold_id: result.item?.id || null
      };
    }
    showWritingResult({
      stage: "draft_scaffold",
      writingProjectId,
      draftScaffoldId: result.item?.id,
      sections: result.item?.sections,
      markdown: result.export?.markdown
    });
    await loadWritingProjectsList();
    await loadWritingScaffoldVersions();
    await loadWritingDraftVersions();
    renderWritingPanel();
    setStatus(`草稿骨架已生成：${result.item?.id}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "draft_scaffold_error",
      writingProjectId,
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`草稿骨架生成失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingCopyScaffold")?.addEventListener("click", async () => {
  try {
    const result = await copyWritingScaffold();
    setStatus(`已复制 Scaffold Markdown：${result.fileName}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_copy_scaffold_error",
      writingProjectId: writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      message: String(error?.message || error),
      code: error?.code || null
    });
    setStatus(`复制 Scaffold 失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingExportScaffold")?.addEventListener("click", async () => {
  try {
    const result = await exportWritingScaffold();
    setStatus(`已导出 Scaffold Markdown：${result.fileName}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_export_scaffold_error",
      writingProjectId: writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      message: String(error?.message || error),
      code: error?.code || null
    });
    setStatus(`导出 Scaffold 失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingSaveDraft")?.addEventListener("click", async () => {
  if (!writingState.scaffold || !String(writingState.scaffoldMarkdown || "").trim()) {
    showWritingResult({
      stage: "writing_draft_note_error",
      message: "scaffold is required before creating a draft note",
      code: "WRITING_DRAFT_INVALID"
    });
    return setStatus("请先生成草稿骨架", "warn");
  }

  const directoryId = writingDraftDirectoryId();
  const body = writingDraftBody();
  try {
    const created = await createNote({
      directoryId,
      status: "draft",
      body
    });
    const project = await bindWritingDraftNote(writingState.project?.id, created?.id, writingState.scaffold?.id);
    writingState.project = project;
    const note = mapNoteItem({
      ...created,
      body: typeof created?.body === "string" ? created.body : body
    });
    state.notes = [note, ...state.notes.filter((item) => item.id !== note.id)];
    showWritingResult({
      stage: "writing_draft_note",
      writingProjectId: project?.id || writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      noteId: note.id,
      directoryId,
      title: note.title
    });
    await loadWritingProjectsList();
    await loadWritingScaffoldVersions();
    await loadWritingDraftVersions();
    activateModule("explorer");
    openNoteById(note.id);
    setStatus(`已创建草稿笔记：${note.title}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_draft_note_error",
      writingProjectId: writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`草稿笔记创建失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingOpenDraft")?.addEventListener("click", async () => {
  const draftNoteId = String(writingState.project?.draft_note_id || "").trim();
  if (!draftNoteId) return setStatus("当前项目还没有绑定草稿笔记", "warn");
  try {
    if (!writingNoteById(draftNoteId)) {
      const fetched = await fetchNote(draftNoteId);
      if (fetched) state.notes = [mapNoteItem(fetched), ...state.notes.filter((item) => item.id !== draftNoteId)];
    }
    activateModule("explorer");
    openNoteById(draftNoteId);
    setStatus(`已打开草稿笔记：${draftNoteId}`, "ok");
  } catch (error) {
    setStatus(`打开草稿失败：${String(error?.message || error)}`, "bad");
  }
});

$("graphRefresh")?.addEventListener("click", async () => {
  await refreshDirectoryGraph();
  setStatus("当前目录图谱已刷新", "ok");
});

$("graphCanvas")?.addEventListener("click", (event) => {
  const row = event.target.closest("[data-open-note]");
  if (!row) return;
  openNoteById(row.dataset.openNote);
  setStatus("已从图谱打开笔记", "ok");
});

document.querySelectorAll(".rail-btn[data-module]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    activateModule(btn.dataset.module);
    if (state.module === "graph") {
      await refreshDirectoryGraph();
      setStatus("已打开当前目录关系图谱", "ok");
	    }
	    if (state.module === "settings") {
	      try {
	        await refreshVaultSettings();
	        setStatus("已打开设置", "ok");
	      } catch (error) {
	        setStatus(`设置加载失败：${String(error?.message || error)}`, "warn");
	      }
	    }
	    if (state.module === "writing") {
	      await openWritingModule();
	    }
	  });
	});

document.querySelectorAll("[data-action^='quick-']").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action === "quick-fleeting") {
      state.browserRootId = "dir_fleeting_default";
      state.selectedFolderId = "dir_fleeting_default";
    }
    if (action === "quick-literature") {
      state.browserRootId = "dir_literature_default";
      state.selectedFolderId = "dir_literature_default";
    }
    if (action === "quick-original") {
      state.browserRootId = "dir_original_default";
      state.selectedFolderId = "dir_original_default";
    }
    state.module = "explorer";
    state.selectedFileId = null;
    document.querySelectorAll(".quick-entry").forEach((entry) => entry.classList.toggle("current-root", entry.dataset.action === action));
    document.querySelectorAll(".rail-btn[data-module]").forEach((b) => b.classList.toggle("active", b.dataset.module === "explorer"));
      setStatus(`已切换到 ${folderById(state, state.browserRootId)?.name} 入口`, "ok");
      renderAll();
    });
  });

document.querySelectorAll("[data-action='open-handoff']").forEach((btn) => {
  btn.addEventListener("click", () => {
    const url = `${window.location.origin}/prototype-handoff`;
    window.open(url, "_blank", "noopener,noreferrer");
    setStatus("已打开原型交付板", "ok");
  });
});

document.addEventListener("keydown", (e) => {
  const tag = (e.target?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || e.isComposing) return;

  if (e.key === "F2") {
    if (state.selectedFileId) {
      explorer.handleContextAction("rename", { kind: "file", id: state.selectedFileId });
      renderAll();
      e.preventDefault();
      return;
    }
    if (state.selectedFolderId) {
      explorer.handleContextAction("rename", { kind: "folder", id: state.selectedFolderId });
      renderAll();
      e.preventDefault();
      return;
    }
  }

  if (e.ctrlKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
    if (idx >= 0 && state.tabs.length > 1) {
      const next = e.key === "ArrowLeft" ? (idx - 1 + state.tabs.length) % state.tabs.length : (idx + 1) % state.tabs.length;
      state.activeTabId = state.tabs[next].id;
      editor.fillEditorFromTab();
      renderAll();
      e.preventDefault();
    }
    return;
  }

  if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    if (e.key === "ArrowLeft") {
      const cur = folderById(state, state.selectedFolderId);
      if (cur?.parentId) {
        state.selectedFolderId = cur.parentId;
        setStatus("已定位到上级目录", "ok");
      } else {
        setStatus("当前已在顶层目录", "warn");
      }
    } else {
      const children = childFolders(state, state.selectedFolderId);
      if (children.length) {
        state.selectedFolderId = children[0].id;
        setStatus("已进入子目录", "ok");
      } else {
        const files = notesInFolder(state, state.selectedFolderId);
        if (files.length) {
          openNoteById(files[0].id);
          setStatus("已打开当前目录首个文件", "ok");
        } else {
          setStatus("当前目录无文件", "warn");
        }
      }
    }
    renderAll();
    e.preventDefault();
  }
});

async function bootstrap() {
  $("importResult")?.addEventListener("change", (event) => {
    const checkbox = event.target?.closest?.(".candidate-checkbox");
    if (!checkbox) return;
    const candidateId = String(checkbox.getAttribute("data-candidate-id") || "").trim();
    const importRecordId = String(importState.lastPreview?.importRecordId || "").trim();
    if (!candidateId || !importRecordId) return;
    if (importState.selectionImportRecordId !== importRecordId) {
      importState.selectionImportRecordId = importRecordId;
      importState.selectedCandidateIds = new Set(candidatePreviewItemIds(importState.lastPreview?.candidatePreview));
    }
    if (checkbox.checked) importState.selectedCandidateIds.add(candidateId);
    else importState.selectedCandidateIds.delete(candidateId);
    rerenderImportResult();
  });

  $("importResult")?.addEventListener("click", (event) => {
    const importWritingButton = event.target?.closest?.("[data-import-writing-action]");
    if (importWritingButton) {
      const action = String(importWritingButton.getAttribute("data-import-writing-action") || "").trim();
      if (action === "add-permanent-notes" || action === "add-permanent-notes-open-writing") {
        void addImportedPermanentNotesToWritingBasket({ openWriting: action === "add-permanent-notes-open-writing" });
      } else if (action === "create-writing-project") {
        void createWritingProjectFromImportedPermanentNotes();
      }
      return;
    }
    const clearFocusButton = event.target?.closest?.("[data-clear-candidate-focus]");
    if (clearFocusButton) {
      setImportResultFocus("");
      return;
    }
    const skipFocusButton = event.target?.closest?.("[data-skip-focus]");
    if (skipFocusButton) {
      const nextReason = String(skipFocusButton.getAttribute("data-skip-focus") || "").trim();
      setImportResultFocus(importState.resultFocusReason === nextReason ? "" : nextReason);
      return;
    }
    const actionButton = event.target?.closest?.("[data-candidate-action]");
    if (actionButton) {
      applyCandidateSelection(String(actionButton.getAttribute("data-candidate-action") || ""));
      return;
    }
    const filterButton = event.target?.closest?.("[data-candidate-filter]");
    if (!filterButton) return;
    setCandidateFilter(String(filterButton.getAttribute("data-candidate-filter") || ""));
  });

  $("importHistory")?.addEventListener("click", async (event) => {
    const actionButton = event.target?.closest?.("[data-import-history-action]");
    const item = event.target?.closest?.("[data-import-history-id]");
    const importRecordId = String((actionButton || item)?.getAttribute("data-import-history-id") || "").trim();
    if (!importRecordId) return;
    try {
      const action = String(actionButton?.getAttribute("data-import-history-action") || "load").trim();
      if (action === "rollback") {
        await rollbackImportIntoUi(importRecordId, { statusPrefix: "已从历史记录回滚导入" });
        return;
      }
      await loadImportRecordIntoUi(importRecordId, { statusPrefix: "已从历史记录读取导入记录" });
    } catch (error) {
      const action = String(actionButton?.getAttribute("data-import-history-action") || "load").trim();
      showImportResult({
        stage: action === "rollback" ? "rollback_error" : "record_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null
      });
      setStatus(`${action === "rollback" ? "回滚" : "读取导入记录"}失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("btnImportHistoryRefresh")?.addEventListener("click", async () => {
    await refreshImportHistory();
    setStatus("导入历史已刷新", "ok");
  });

  $("importHistoryStatus")?.addEventListener("change", (event) => {
    importState.historyStatusFilter = String(event.target?.value || "all").trim();
    renderImportHistory();
  });

  $("importHistoryConnector")?.addEventListener("change", (event) => {
    importState.historyConnectorFilter = String(event.target?.value || "all").trim();
    renderImportHistory();
  });

  $("importHistoryRisk")?.addEventListener("change", (event) => {
    importState.historyRiskFilter = String(event.target?.value || "all").trim();
    renderImportHistory();
  });

  $("importRecordId")?.addEventListener("input", (event) => {
    importState.importRecordId = String(event.target?.value || "").trim();
    renderImportHistory();
  });

  $("btnImportPreview")?.addEventListener("click", async () => {
    const connector = String($("importConnector")?.value || "markdown").trim();
    try {
      const payload = buildImportPayload(connector);
      const options = parseJsonOrEmpty($("importOptions")?.value, "Options");
      const preview = await previewImport({ connector, payload, options });
      importState.lastPreview = preview;
      importState.previewFilter = "all";
      syncImportSelection(preview.importRecordId, preview.candidatePreview);
      setImportRecordId(preview.importRecordId);
      showImportResult({
        stage: "preview",
        importRecordId: preview.importRecordId,
        connector: preview.connector,
        status: preview.status,
        summary: preview.summary,
        candidatePreview: preview.candidatePreview,
        warnings: preview.warnings,
        originalityGuard: preview.originalityGuard
      });
      await refreshImportHistory({ silent: true });
      setStatus(`导入预览完成：${preview.importRecordId}`, "ok");
    } catch (error) {
      showImportResult({
        stage: "preview_error",
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`导入预览失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("btnImportConfirm")?.addEventListener("click", async () => {
    const importRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
    if (!importRecordId) return setStatus("请先预览或填写 ImportRecord ID", "warn");
    try {
      const preview = activeImportPreviewContext();
      const selectedIds = preview?.candidatePreview ? [...selectionSummary(preview.candidatePreview, importRecordId).selectedIds] : null;
      if (preview?.candidatePreview && selectedIds && selectedIds.length === 0) {
        return setStatus("请至少勾选一个候选后再确认写入", "warn");
      }
      const result = await confirmImport(importRecordId, selectedIds ? { selectedCandidateIds: selectedIds } : {});
      setImportRecordId(importRecordId);
      showImportResult({
        stage: "confirm",
        importRecordId,
        status: result.status,
        result: result.result,
        originalityGuard: result.originalityGuard,
        candidatePreview: preview?.candidatePreview || null
      });
      importState.lastPreview = null;
      await refreshImportHistory({ silent: true });
      await refreshImportedNotesView();
      setStatus(`导入确认完成：${importRecordId}`, "ok");
    } catch (error) {
      showImportResult({
        stage: "confirm_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`导入确认失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("btnImportCancel")?.addEventListener("click", async () => {
    const importRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
    if (!importRecordId) return setStatus("请先预览或填写 ImportRecord ID", "warn");
    try {
      const result = await cancelImport(importRecordId);
      setImportRecordId(importRecordId);
      showImportResult({
        stage: "cancel",
        importRecordId,
        status: result.status,
        message: result.message
      });
      importState.lastPreview = null;
      await refreshImportHistory({ silent: true });
      setStatus(`已取消导入：${importRecordId}`, "ok");
    } catch (error) {
      showImportResult({
        stage: "cancel_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`取消导入失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("btnImportRefresh")?.addEventListener("click", async () => {
    const importRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
    if (!importRecordId) return setStatus("请先填写 ImportRecord ID", "warn");
    try {
      await loadImportRecordIntoUi(importRecordId);
      await refreshImportHistory({ silent: true });
    } catch (error) {
      showImportResult({
        stage: "record_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null
      });
      setStatus(`读取导入记录失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("btnImportRollback")?.addEventListener("click", async () => {
    const importRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
    if (!importRecordId) return setStatus("请先填写 ImportRecord ID", "warn");
    try {
      await rollbackImportIntoUi(importRecordId);
    } catch (error) {
      showImportResult({
        stage: "rollback_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`回滚失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("btnExportMarkdown")?.addEventListener("click", async () => {
    const targetPath = String($("exportTargetPath")?.value || "").trim();
    if (!targetPath) return setStatus("请先填写 Markdown 导出目标路径", "warn");
    try {
      const result = await exportMarkdown(targetPath);
      showExportResult({
        stage: "export_markdown",
        targetPath,
        exportJobId: result.exportJobId,
        status: result.status,
        copied: result.copied
      });
      setStatus(`Markdown 导出已提交：${result.exportJobId}，复制 ${result.copied} 个文件`, "ok");
    } catch (error) {
      showExportResult({
        stage: "export_error",
        targetPath,
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`Markdown 导出失败：${String(error?.message || error)}`, "bad");
    }
  });

  try {
    await refreshVaultSettings();
    await syncDirectoriesFromApi();
    await syncNotesForDirectory(state.selectedFolderId);
    setStatus(`已连接 API：${getApiBase()}`, "ok");
  } catch (error) {
    renderImportHistory();
    setStatus(`API 连接失败，使用本地原型数据：${String(error?.message || error)}`, "warn");
  }

  try {
    syncImportHistoryFiltersFromUi();
    await refreshImportHistory({ silent: true });
  } catch {}

  renderAll();
  const initialNoteId = new URLSearchParams(window.location.search).get("note") || state.notes[0]?.id || "pn_001";
  const initialNote = state.notes.find((n) => n.id === initialNoteId);
  if (initialNote) {
    state.browserRootId = rootBoxIdFromFolder(state, initialNote.folderId);
    state.selectedFolderId = initialNote.folderId;
    openNoteById(initialNoteId);
  }
}

bootstrap();
