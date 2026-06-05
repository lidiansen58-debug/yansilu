import { importConnectorLabel } from "./import-connector-labels.js";

function compactValue(value) {
  if (value === null || value === undefined || value === "") return "未知";
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function uniqueStrings(items = []) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}

function statusValue(status) {
  const labels = {
    preview: "待确认",
    completed: "已导入",
    rolled_back: "已回滚",
    cancelled: "已取消",
    blocked: "已阻止",
    failed: "失败",
    ok: "完成",
    queued: "已排队"
  };
  return labels[String(status || "").trim()] || compactValue(status);
}

function createdFilesFromPayload(payload = {}) {
  const stage = String(payload.stage || "").trim();
  if (stage === "confirm") return Array.isArray(payload.result?.createdFiles) ? payload.result.createdFiles : [];
  if (stage === "record") return Array.isArray(payload.importRecord?.confirmResult?.createdFiles) ? payload.importRecord.confirmResult.createdFiles : [];
  return [];
}

function createdFileCountByType(payload = {}, noteType = "") {
  const normalizedType = String(noteType || "").trim();
  return createdFilesFromPayload(payload).filter((item) => String(item?.noteType || "").trim() === normalizedType).length;
}

function selectionModeValue(mode) {
  const labels = {
    all: "全部",
    partial: "部分",
    subset: "部分",
    none: "未选择"
  };
  return labels[String(mode || "").trim()] || compactValue(mode);
}

function reasonText(reason) {
  const labels = {
    core_claim_empty: "核心观点为空",
    similarity_above_warn_threshold: "与原文过近",
    similarity_above_block_threshold: "与原文高度重复",
    citation_locator_missing: "缺少引用定位"
  };
  return labels[String(reason || "").trim()] || compactValue(reason);
}

function targetDirectorySummary(payload = {}) {
  const targetDirectories =
    Array.isArray(payload.result?.targetDirectories) ? payload.result.targetDirectories :
    Array.isArray(payload.importRecord?.confirmResult?.targetDirectories) ? payload.importRecord.confirmResult.targetDirectories :
    [];
  return targetDirectories.map((item) => String(item?.label || item?.directoryId || "").trim()).filter(Boolean).join(" + ");
}

export function resultTitle(stage) {
  const titles = {
    preview: "导入预览已生成",
    preview_error: "导入预览失败",
    confirm: "导入完成",
    confirm_error: "导入失败",
    cancel: "导入已取消",
    cancel_error: "取消导入失败",
    record: "已读取导入记录",
    record_error: "读取导入记录失败",
    rollback: "回滚完成",
    rollback_error: "回滚失败",
    export_markdown: "导出完成",
    export_error: "导出失败",
    writing_project: "项目已创建",
    writing_project_error: "项目创建失败",
    draft_scaffold: "已生成草稿骨架",
    draft_scaffold_error: "生成草稿骨架失败",
    writing_draft_note: "已保存草稿笔记",
    writing_draft_note_error: "保存草稿笔记失败",
    writing_copy_scaffold: "草稿骨架 Markdown 已复制",
    writing_copy_scaffold_error: "草稿骨架 Markdown 复制失败",
    writing_export_scaffold: "草稿骨架 Markdown 已导出",
    writing_export_scaffold_error: "草稿骨架 Markdown 导出失败"
  };
  return titles[stage] || "操作结果";
}

export function resultTone(payload = {}) {
  const stage = String(payload.stage || "");
  if (stage.includes("error")) return "bad";
  const importRecordStatus = String(payload.importRecord?.status || payload.importRecord?.state || "").trim();
  if (importRecordStatus === "failed") return "bad";
  if (Array.isArray(payload.warnings) && payload.warnings.length) return "warn";
  if (payload.status === "blocked" || payload.status === "failed") return "bad";
  if (Number(payload.result?.skipped || 0) > 0) return "warn";
  if (Number(payload.result?.skipped?.invalid || 0) > 0 || Number(payload.result?.skipped?.conflicted || 0) > 0) return "warn";
  return "ok";
}

export function resultMetrics(payload = {}) {
  const stage = String(payload.stage || "");
  const metrics = [];
  const push = (label, value) => {
    if (value !== undefined && value !== null && value !== "") metrics.push({ label, value: compactValue(value) });
  };

  if (stage === "preview") {
    push("来源", importConnectorLabel(payload.connector));
    push("状态", statusValue(payload.status));
    const summary = payload.summary || {};
    push("候选", `${Number(summary.sources || 0)} 来源 / ${Number(summary.literatureNotes || 0)} 文献 / ${Number(summary.permanentNotes || 0)} 永久`);
    if (Number(summary.warnings || 0) > 0) push("警告", Number(summary.warnings || 0));
    return metrics;
  }

  if (stage === "confirm" || stage === "rollback") {
    push("状态", statusValue(payload.status));
    if (payload.result?.selection) {
      const selection = payload.result.selection;
      push("已选", `${compactValue(selection.selectedCandidates)}/${compactValue(selection.totalCandidates)}`);
      push("范围", selectionModeValue(selection.mode));
    }
    const targets = targetDirectorySummary(payload);
    if (targets) push("写入到", targets);
    const createdFiles = createdFilesFromPayload(payload);
    if (createdFiles.length) {
      push("写入", createdFiles.length);
      const assetCount = createdFileCountByType(payload, "asset");
      if (assetCount > 0) push("资源", assetCount);
    }
    if (typeof payload.result?.rolledBack === "number") push("回滚", payload.result.rolledBack);
    if (typeof payload.result?.skipped === "number") push("保留", payload.result.skipped);
    return metrics;
  }

  if (stage === "record") {
    push("来源", importConnectorLabel(payload.importRecord?.connector));
    push("状态", statusValue(payload.importRecord?.status));
    const summary = payload.importRecord?.summary || {};
    if (summary && Object.keys(summary).length) {
      push("摘要", `${Number(summary.sources || 0)} 来源 / ${Number(summary.literatureNotes || 0)} 文献 / ${Number(summary.permanentNotes || 0)} 永久`);
    }
    const targets = targetDirectorySummary(payload);
    if (targets) push("写入到", targets);
    if (payload.importRecord?.failureResult?.code) push("失败代码", payload.importRecord.failureResult.code);
    return metrics;
  }

  if (stage === "export_markdown") {
    push("状态", statusValue(payload.status));
    push("文件", payload.copied);
    if (payload.directoryLabel || payload.directoryId) push("导出自", payload.directoryLabel || payload.directoryId);
    push("目标", payload.targetPath);
    return metrics;
  }

  if (stage === "writing_project") {
    push("项目", payload.writingProjectId);
    push("标题", payload.title);
    if (Array.isArray(payload.basketNoteIds) && payload.basketNoteIds.length) push("写作篮", payload.basketNoteIds.length);
    return metrics;
  }

  if (stage === "draft_scaffold" || stage === "writing_draft_note" || stage === "writing_copy_scaffold" || stage === "writing_export_scaffold") {
    if (payload.writingProjectId) push("项目", payload.writingProjectId);
    if (payload.draftScaffoldId) push("草稿骨架", payload.draftScaffoldId);
    if (stage === "draft_scaffold" && Array.isArray(payload.sections)) push("章节", payload.sections.length);
    if (stage === "writing_draft_note" && payload.noteId) push("草稿笔记", payload.noteId);
    if (stage === "writing_draft_note" && (payload.directoryLabel || payload.directoryId)) {
      push("目录", payload.directoryLabel || payload.directoryId);
    }
    if ((stage === "writing_copy_scaffold" || stage === "writing_export_scaffold") && payload.fileName) {
      push("文件", payload.fileName);
    }
    if ((stage === "writing_copy_scaffold" || stage === "writing_export_scaffold") && payload.characters) {
      push("字数", payload.characters);
    }
    return metrics;
  }

  push("状态", statusValue(payload.status));
  if (payload.message) push("说明", payload.message);
  return metrics;
}

export function warningItems(payload = {}) {
  const warnings = [];
  if (Array.isArray(payload.warnings)) warnings.push(...payload.warnings);
  if (payload.code) warnings.push({ code: payload.code, message: payload.message || "" });
  if (payload.importRecord?.failureResult?.code || payload.importRecord?.failureResult?.message) {
    warnings.push({
      code: payload.importRecord.failureResult.code || "IMPORT_FAILED",
      message: payload.importRecord.failureResult.message || ""
    });
  }
  const evaluations = payload.originalityGuard?.evaluations;
  if (Array.isArray(evaluations)) {
    for (const item of evaluations) {
      if (item?.status && item.status !== "pass") {
        const joinedReasons = (item.reasons || []).map(reasonText).join("、") || statusValue(item.status);
        warnings.push({
          code: `ORIGINALITY_${String(item.status).toUpperCase()}`,
          message: `${item.id || "note"}：${joinedReasons}`
        });
      }
    }
  }
  return warnings;
}

function actionableTextForCode(code) {
  const map = {
    IMPORT_EMPTY_PAYLOAD: "补充导入路径或 Payload。",
    IMPORT_SOURCE_UNREADABLE: "检查导入路径是否可读。",
    IMPORT_MARKDOWN_FILE_UNREADABLE: "处理无法读取的 Markdown 文件后再试。",
    IMPORT_MALFORMED_FRONTMATTER: "建议先修正 frontmatter 再导入。",
    IMPORT_NO_MARKDOWN_FILE: "确认目录里有可导入的 Markdown 文件。",
    IMPORT_PAYLOAD_INVALID: "检查连接器和 JSON 格式。",
    IMPORT_RECORD_NOT_FOUND: "确认这条记录属于当前 Vault。",
    IMPORT_STATUS_INVALID: "这条记录当前不能执行这个操作。",
    IMPORT_CONFIRM_REQUIRED: "请先预览，再确认导入。",
    IMPORT_CLEANUP_PRESERVE_FAILED: "失败导入的已修改文件未能自动迁移，请先手动处理后再重试。",
    IMPORT_ROLLBACK_RESTORE_CONFLICT: "回滚恢复时发现原路径已经有新内容。当前文件已保留，旧版本已转存到恢复冲突区。",
    IMPORT_ORIGINALITY_BLOCKED: "先改写被阻止的永久笔记，再重新确认。",
    ORIGINALITY_GUARD_WARNING: "先处理原创性警告再继续。",
    ORIGINALITY_GUARD_BLOCKED: "先降低与原文的重复度。",
    ORIGINALITY_WARNING: "补充引用定位或加强转述。",
    WRITING_DRAFT_INVALID: "先点击“生成草稿骨架”，确认预览区已经出现章节和 Markdown。"
  };
  return map[String(code || "").trim()] || "";
}

function actionableTextForReason(reason) {
  const map = {
    core_claim_empty: "补充永久笔记的核心观点。",
    similarity_above_warn_threshold: "把表述改写成你自己的判断。",
    similarity_above_block_threshold: "重写这条永久笔记后再导入。",
    citation_locator_missing: "补充页码、章节或时间定位。"
  };
  return map[String(reason || "")] || "";
}

export function actionItems(payload = {}, warnings = []) {
  const actions = [];
  if (payload.code) {
    const text = actionableTextForCode(payload.code);
    if (text) actions.push(text);
  }
  for (const warning of warnings) {
    if (String(warning?.code || "").trim() === "IMPORT_EMPTY_PAYLOAD") {
      actions.push("补充 Payload JSON。");
    }
    const text = actionableTextForCode(warning?.code);
    if (text) actions.push(text);
  }

  const evaluations = Array.isArray(payload.originalityGuard?.evaluations) ? payload.originalityGuard.evaluations : [];
  for (const item of evaluations) {
    for (const reason of item?.reasons || []) {
      const text = actionableTextForReason(reason);
      if (text) actions.push(text);
    }
  }

  if (Array.isArray(payload.result?.skippedFiles) && payload.result.skippedFiles.length) {
    const modified = payload.result.skippedFiles.some((item) => item?.reason === "modified");
    actions.push(modified ? "有已修改文件被保留，请手动处理。" : "有文件未自动回滚，请检查后处理。");
  }

  if (String(payload.stage || "").trim() === "writing_project_error" && /title is required/i.test(String(payload.message || ""))) {
    actions.push("补充项目标题后再创建。");
  }

  return uniqueStrings(actions).slice(0, 3);
}

export function resultSubtitle(data = {}) {
  return data.importRecordId || data.exportJobId || data.writingProjectId || data.draftScaffoldId || data.code || data.status || "";
}

export function resultStatusLabel(tone) {
  return tone === "bad" ? "失败" : tone === "warn" ? "注意" : "完成";
}

export function resultBrief(payload = {}, tone = resultTone(payload)) {
  const stage = String(payload.stage || "").trim();
  if (tone === "bad") return "这一步没有完成，请先处理下面的问题。";
  if (tone === "warn") return "可以继续，但建议先处理警告。";
  const briefs = {
    preview: "检查候选内容，确认后再导入。",
    confirm: "内容已经写入，可继续整理或写作。",
    cancel: "这次导入没有写入任何新内容。",
    record: "你可以继续确认、回滚，或仅查看这次记录。",
    rollback: "系统已完成可安全回滚的部分。",
    export_markdown: "导出文件已经写到目标目录。",
    writing_project: "项目已创建。下一步可以生成草稿骨架。",
    draft_scaffold: "检查结构后可以复制、导出或继续写。",
    writing_draft_note: "草稿笔记已保存，可以继续修改。",
    writing_copy_scaffold: "草稿骨架 Markdown 已复制，可以粘贴到你的写作环境。",
    writing_export_scaffold: "草稿骨架 Markdown 已导出。"
  };
  return briefs[stage] || "操作已完成。";
}
