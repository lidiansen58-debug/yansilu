function compactValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
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

export function importStatusLabel(status) {
  const labels = {
    preview: "预览",
    completed: "已写入",
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
  return `S${Number(summary.sources || 0)} · L${Number(summary.literatureNotes || 0)} · P${Number(summary.permanentNotes || 0)} · W${Number(summary.warnings || 0)}`;
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
  if (status === "completed" && progress && Number(progress.total || 0) > 0 && Number(progress.remaining || 0) === 0) {
    badges.push({
      tone: "ok",
      text: "本批次已处理完"
    });
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

export function importHistoryDetailSummary(record = {}) {
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
    const detail = [
      `已创建 S${Number(created.sources || 0)} · L${Number(created.literatureNotes || 0)} · P${Number(created.permanentNotes || 0)}`,
      `跳过 冲突 ${Number(skipped.conflicted || 0)} · 无效 ${Number(skipped.invalid || 0)}`,
      writtenPaths.length ? `写入 ${writtenPaths.join("、")}` : "未记录写入路径"
    ];
    const progress = record.literatureBatchProgress;
    if (progress && Number(progress.total || 0) > 0) {
      detail.push(
        `文献队列 待转述 ${Number(progress.pending || 0)} · 待提炼 ${Number(progress.refine || 0)} · 可转原创 ${Number(progress.ready || 0)} · 剩余待处理 ${Number(progress.remaining || 0)}`
      );
      if (progress.nextPendingTitle) {
        detail.push(`下一条待处理 ${String(progress.nextPendingTitle)}`);
      } else if (progress.nextReadyTitle) {
        detail.push(`下一条可转原创 ${String(progress.nextReadyTitle)}`);
      }
    }
    return detail;
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

export function importHistoryActions(record = {}) {
  const status = String(record.status || record.state || "").trim();
  if (status === "completed") {
    const actions = [{ action: "load", label: "查看结果" }];
    if (Number(record.literatureBatchProgress?.remaining || 0) > 0) {
      actions.push({ action: "resume-literature-queue", label: "继续下一条待转述" });
    }
    if (Number(record.literatureBatchProgress?.remaining || 0) === 0 && Number(record.literatureBatchProgress?.ready || 0) > 0) {
      actions.push({ action: "promote-literature-batch", label: "转去原创整理" });
    }
    if (Number(record.literatureBatchProgress?.total || 0) > 0) {
      actions.push({ action: "open-literature-queue", label: "打开文献队列" });
    }
    actions.push({ action: "rollback", label: "回滚" });
    return actions;
  }
  if (status === "preview") {
    return [{ action: "load", label: "读取记录" }];
  }
  if (status === "rolled_back" || status === "cancelled") {
    return [{ action: "load", label: "查看结果" }];
  }
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
