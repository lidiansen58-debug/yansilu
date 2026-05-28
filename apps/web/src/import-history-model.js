import { importConnectorLabel } from "./import-connector-labels.js";

function compactValue(value) {
  if (value === null || value === undefined || value === "") return "未知";
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function candidateCountText(summary = {}) {
  return `${Number(summary.sources || 0)} 来源卡片 / ${Number(summary.literatureNotes || 0)} 文献笔记 / ${Number(summary.permanentNotes || 0)} 永久笔记`;
}

function createdFileCounts(record = {}) {
  const files = Array.isArray(record.confirmResult?.createdFiles) ? record.confirmResult.createdFiles : [];
  return {
    total: files.length,
    assets: files.filter((item) => String(item?.noteType || "").trim() === "asset").length
  };
}

export function formatImportTimestamp(value) {
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

export function importHistoryConnectorLabel(connector) {
  return importConnectorLabel(connector);
}

export function importStatusLabel(status) {
  const labels = {
    preview: "预览中",
    completed: "已完成",
    rolled_back: "已回滚",
    cancelled: "已取消"
  };
  return labels[String(status || "").trim()] || compactValue(status);
}

export function importStatusTone(status) {
  const tones = {
    preview: "neutral",
    completed: "ok",
    rolled_back: "warn",
    cancelled: "muted"
  };
  return tones[String(status || "").trim()] || "neutral";
}

export function importHistorySummary(record = {}) {
  const summary = record.summary || {};
  return `来源 ${Number(summary.sources || 0)} / 文献 ${Number(summary.literatureNotes || 0)} / 永久 ${Number(summary.permanentNotes || 0)} / 警告 ${Number(summary.warnings || 0)}`;
}

export function importHistoryOriginalityCounts(record = {}) {
  const evaluations = Array.isArray(record.originalityGuard?.evaluations) ? record.originalityGuard.evaluations : [];
  return {
    blocked: evaluations.filter((item) => String(item?.status || "").trim() === "blocked").length,
    warning: evaluations.filter((item) => String(item?.status || "").trim() === "warning").length
  };
}

export function importHistoryAlertBadges(record = {}) {
  const status = String(record.status || record.state || "").trim();
  const badges = [];
  const summaryWarnings = Number(record.summary?.warnings || 0);
  const originality = importHistoryOriginalityCounts(record);
  const progress = record.literatureBatchProgress;
  const warningCount = Math.max(summaryWarnings, originality.warning);

  if (warningCount > 0) {
    badges.push({ tone: "warn", text: `警告 ${warningCount}` });
  }
  if (originality.blocked > 0) {
    badges.push({ tone: "bad", text: `阻断 ${originality.blocked}` });
  }
  if (status === "rolled_back") {
    const skipped = Array.isArray(record.rollbackResult?.skipped) ? record.rollbackResult.skipped : [];
    const modifiedCount = skipped.filter((item) => String(item?.reason || "").trim() === "modified").length;
    if (modifiedCount > 0) badges.push({ tone: "warn", text: `保留 ${modifiedCount}` });
  }
  if (status === "completed" && progress && Number(progress.total || 0) > 0 && Number(progress.remaining || 0) === 0) {
    badges.push({ tone: "ok", text: "文献队列已清空" });
  }
  return badges;
}

export function importHistoryMatchesRisk(record = {}, riskFilter = "all") {
  const normalized = String(riskFilter || "all").trim();
  if (normalized === "all") return true;

  const summaryWarnings = Number(record.summary?.warnings || 0);
  const originality = importHistoryOriginalityCounts(record);
  const skipped = Array.isArray(record.rollbackResult?.skipped) ? record.rollbackResult.skipped : [];
  const modifiedCount = skipped.filter((item) => String(item?.reason || "").trim() === "modified").length;

  if (normalized === "warning") return summaryWarnings > 0 || originality.warning > 0 || skipped.length > 0;
  if (normalized === "blocked") return originality.blocked > 0;
  if (normalized === "modified") return modifiedCount > 0;
  return true;
}

export function importHistoryRiskHint(record = {}) {
  const status = String(record.status || record.state || "").trim();
  const summaryWarnings = Number(record.summary?.warnings || 0);
  const originality = importHistoryOriginalityCounts(record);

  if (originality.blocked > 0) {
    return "阻断项默认不会写入；先改写高相似度内容，或在确认时显式覆盖原创性保护。";
  }
  if (summaryWarnings > 0 || originality.warning > 0) {
    return "警告项建议先补充引用定位或增强转述，再确认写入。";
  }
  if (status === "rolled_back") {
    const skipped = Array.isArray(record.rollbackResult?.skipped) ? record.rollbackResult.skipped : [];
    const modifiedCount = skipped.filter((item) => String(item?.reason || "").trim() === "modified").length;
    if (modifiedCount > 0) return "已修改文件被保留，请手动核对后再决定合并或删除。";
  }
  return "";
}

export function importHistoryQueueProgressText(progress = null) {
  if (!progress || Number(progress.total || 0) <= 0) return "";
  const total = Number(progress.total || 0);
  const remaining = Number(progress.remaining || 0);
  const handled = Math.max(0, total - remaining);
  return `文献队列 已处理 ${handled}/${total} / 待转述 ${Number(progress.pending || 0)} / 待提炼 ${Number(progress.refine || 0)} / 可转永久笔记 ${Number(progress.ready || 0)}`;
}

export function importHistoryDetailSummary(record = {}) {
  const status = String(record.status || record.state || "").trim();

  if (status === "preview") {
    const summary = record.summary || {};
    const originality = importHistoryOriginalityCounts(record);
    const detail = [`候选 ${candidateCountText(summary)}`];
    const signals = [];
    if (Number(summary.warnings || 0) > 0) signals.push(`普通警告 ${Number(summary.warnings || 0)}`);
    if (originality.warning > 0) signals.push(`原创性警告 ${originality.warning}`);
    if (originality.blocked > 0) signals.push(`原创性阻断 ${originality.blocked}`);
    detail.push(signals.length ? `需要人工检查：${signals.join(" / ")}` : "当前预览未发现需要额外处理的风险项。");
    const hint = importHistoryRiskHint(record);
    if (hint) detail.push(hint);
    return detail;
  }

  if (status === "completed") {
    const created = record.confirmResult?.created || {};
    const skipped = record.confirmResult?.skipped || {};
    const writtenPaths = Array.isArray(record.confirmResult?.writtenPaths) ? record.confirmResult.writtenPaths.filter(Boolean) : [];
    const files = createdFileCounts(record);
    const detail = [
      `已创建 ${candidateCountText(created)}`,
      `跳过 冲突 ${Number(skipped.conflicted || 0)} / 无效 ${Number(skipped.invalid || 0)}`,
      writtenPaths.length ? `写入 ${writtenPaths.join("、")}` : "未记录写入路径"
    ];
    if (files.assets > 0) detail.push(`随导入写入资源 ${files.assets} 个 / 文件总数 ${files.total}`);

    const queueText = importHistoryQueueProgressText(record.literatureBatchProgress);
    if (queueText) {
      detail.push(queueText);
      if (record.literatureBatchProgress?.nextPendingTitle) {
        detail.push(`下一条待处理 ${String(record.literatureBatchProgress.nextPendingTitle)}`);
      } else if (record.literatureBatchProgress?.nextReadyTitle) {
        detail.push(`下一条可转永久笔记 ${String(record.literatureBatchProgress.nextReadyTitle)}`);
      }
    }
    return detail;
  }

  if (status === "rolled_back") {
    const rolledBack = Array.isArray(record.rollbackResult?.rolledBack) ? record.rollbackResult.rolledBack : [];
    const skipped = Array.isArray(record.rollbackResult?.skipped) ? record.rollbackResult.skipped : [];
    const modifiedCount = skipped.filter((item) => String(item?.reason || "").trim() === "modified").length;
    const detail = [
      `已回滚 ${rolledBack.length} 项`,
      `跳过 ${skipped.length} 项`,
      modifiedCount ? `其中 ${modifiedCount} 项因已被修改而保留` : skipped.length ? "存在未回滚文件，请查看详情" : "未发现需要人工处理的回滚冲突"
    ];
    const hint = importHistoryRiskHint(record);
    if (hint) detail.push(hint);
    return detail;
  }

  return [];
}

export function importHistoryActions(record = {}) {
  const status = String(record.status || record.state || "").trim();

  if (status === "completed") {
    const actions = [{ action: "load", label: "查看结果" }];
    if (Number(record.literatureBatchProgress?.remaining || 0) > 0) {
      actions.push({ action: "resume-literature-queue", label: "继续处理" });
    }
    if (Number(record.literatureBatchProgress?.remaining || 0) === 0 && Number(record.literatureBatchProgress?.ready || 0) > 0) {
      actions.push({ action: "promote-literature-batch", label: "转去永久笔记整理" });
    }
    if (Number(record.literatureBatchProgress?.total || 0) > 0) {
      actions.push({ action: "open-literature-queue", label: "打开文献队列" });
    }
    actions.push({ action: "rollback", label: "回滚" });
    return actions;
  }

  if (status === "preview") return [{ action: "load", label: "继续处理" }];
  if (status === "rolled_back" || status === "cancelled") return [{ action: "load", label: "查看结果" }];
  return [{ action: "load", label: "查看记录" }];
}

export function filterImportHistoryItems(items = [], filters = {}) {
  const statusFilter = String(filters.status || "all").trim();
  const connectorFilter = String(filters.connector || "all").trim();
  const riskFilter = String(filters.risk || "all").trim();
  return (Array.isArray(items) ? items : []).filter((record) => {
    const status = String(record.status || record.state || "").trim();
    const connector = String(record.connector || "").trim();
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (connectorFilter !== "all" && connector !== connectorFilter) return false;
    if (!importHistoryMatchesRisk(record, riskFilter)) return false;
    return true;
  });
}
