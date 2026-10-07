import { importConnectorLabel } from "./import-connector-labels.js";
import { candidatePreviewItems, isConfirmableCandidate } from "./import-candidate-preview-model.js";

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
    confirming: "正在导入",
    interrupted: "导入曾中断，结果待核查",
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

function warningSummaryText(code, fallback = "") {
  const labels = {
    IMPORT_EMPTY_PAYLOAD: "缺少导入路径或 Payload。",
    IMPORT_SOURCE_UNREADABLE: "导入路径无法读取。",
    IMPORT_MARKDOWN_FILE_UNREADABLE: "有 Markdown 文件无法读取。",
    IMPORT_MALFORMED_FRONTMATTER: "有笔记的 frontmatter 格式不完整。",
    IMPORT_NON_UTF8_MARKDOWN_DECODED: "有笔记不是 UTF-8，已按兼容编码读取。",
    IMPORT_MARKDOWN_ENCODING_UNSUPPORTED: "有笔记编码异常，已被跳过以避免乱码导入。",
    IMPORT_TITLE_NORMALIZED: "有标题已被规范成单行。",
    IMPORT_TEXT_SUSPECT_CORRUPTION: "有笔记内容疑似已损坏。",
    IMPORT_NO_MARKDOWN_FILE: "目录里没有可导入的 Markdown 文件。",
    IMPORT_SELECTION_EMPTY: "当前预览没有可导入内容。",
    IMPORT_PAYLOAD_INVALID: "导入参数格式不正确。",
    IMPORT_RECORD_NOT_FOUND: "没有找到这条导入记录。",
    IMPORT_STATUS_INVALID: "这条导入记录当前不能继续。",
    IMPORT_CONFIRM_REQUIRED: "请先预览，再确认导入。",
    IMPORT_CLEANUP_PRESERVE_FAILED: "失败导入的残留文件没有完全清理。",
    IMPORT_ROLLBACK_RESTORE_CONFLICT: "回滚时发现原路径已有新内容。",
    IMPORT_ORIGINALITY_BLOCKED: "永久笔记因原创性检查被阻止。",
    ORIGINALITY_GUARD_WARNING: "有永久笔记需要先处理原创性警告。",
    ORIGINALITY_GUARD_BLOCKED: "有永久笔记未通过原创性检查。",
    ORIGINALITY_WARNING: "有永久笔记需要补充原创性信息。"
  };
  return labels[String(code || "").trim()] || String(fallback || "").trim() || compactValue(code);
}

function warningDetailText(code, message = "") {
  const detail = String(message || "").trim();
  if (!detail) return "";
  if (["ORIGINALITY_GUARD_BLOCKED", "ORIGINALITY_GUARD_WARNING"].includes(code)) return "";
  const summary = warningSummaryText(code, "");
  return detail && detail !== summary ? detail : "";
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
    confirm_pending: "导入结果待核查",
    confirm_error: "导入失败",
    cancel: "导入已取消",
    cancel_error: "取消导入失败",
    record: "已读取导入记录",
    record_error: "读取导入记录失败",
    rollback: "回滚完成",
    rollback_error: "回滚失败",
    export_markdown: "导出完成",
    export_error: "导出失败",
    writing_project: "可写主题已确定",
    writing_project_error: "确定可写主题失败",
    draft_scaffold: "已生成文章提纲",
    draft_scaffold_error: "生成文章提纲失败",
    writing_draft_note: "已保存草稿笔记",
    writing_draft_note_error: "保存草稿笔记失败",
    writing_copy_scaffold: "文章提纲 Markdown 已复制",
    writing_copy_scaffold_error: "文章提纲 Markdown 复制失败",
    writing_export_scaffold: "文章提纲 Markdown 已导出",
    writing_export_scaffold_error: "文章提纲 Markdown 导出失败"
  };
  return titles[stage] || "操作结果";
}

export function resultTone(payload = {}) {
  const stage = String(payload.stage || "");
  if (stage === "confirm_pending") return "warn";
  if (stage.includes("error")) return "bad";
  const importRecordStatus = String(payload.importRecord?.status || payload.importRecord?.state || "").trim();
  if (importRecordStatus === "failed") return "bad";
  if (["interrupted", "confirming"].includes(importRecordStatus)) return "warn";
  if (payload.status === "blocked" || payload.status === "failed") return "bad";
  if ((payload.warnings || payload.importRecord?.warnings || []).length) return "warn";
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
    push("可导入内容", `${Number(summary.sources || 0)} 来源 / ${Number(summary.literatureNotes || 0)} 文献 / ${Number(summary.permanentNotes || 0)} 永久`);
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
    const recovery = payload.importRecord?.recoveryResult;
    if (recovery) {
      push("文件已核对", recovery.files.filter(item => item.status === "verified").length);
      push("文件已变化", recovery.files.filter(item => item.status === "changed").length);
      push("文件已缺失", recovery.files.filter(item => item.status === "missing").length);
      if (recovery.pending) push("待核查", recovery.pending.noteId);
    }
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
    push("主题", payload.writingProjectId);
    push("标题", payload.title);
    if (Array.isArray(payload.basketNoteIds) && payload.basketNoteIds.length) push("相关笔记", payload.basketNoteIds.length);
    return metrics;
  }

  if (stage === "draft_scaffold" || stage === "writing_draft_note" || stage === "writing_copy_scaffold" || stage === "writing_export_scaffold") {
    if (payload.writingProjectId) push("主题", payload.writingProjectId);
    if (payload.draftScaffoldId) push("文章提纲", payload.draftScaffoldId);
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

  push("状态", statusValue(payload.importRecord?.status || payload.status));
  if (payload.message) push("说明", payload.message);
  return metrics;
}

export function warningItems(payload = {}) {
  const warnings = [];
  const recovery = payload.importRecord?.recoveryResult;
  if (recovery) {
    warnings.push({ code: "IMPORT_INTERRUPTED", message: "导入中断，不会自动重复执行。",
      detail: recovery.checkpointAvailable ? "下列文件按当前实际内容核对；待核查项不算导入成功。" : "旧记录没有逐项检查点，请手动核对笔记库。" });
    for (const file of recovery.files) warnings.push({ code: "IMPORT_RECOVERY_FILE",
      message: `${file.status === "verified" ? "内容已核对" : file.status === "changed" ? "内容已变化" : "文件已缺失"}：${file.relativePath}` });
    if (recovery.pending) warnings.push({ code: "IMPORT_RECOVERY_PENDING", message: `结果未确认：${recovery.pending.noteId}` });
  }
  const sourceWarnings = payload.warnings || payload.importRecord?.warnings;
  if (Array.isArray(sourceWarnings)) {
    warnings.push(
      ...sourceWarnings.map((item) => ({
        ...item,
        message: warningSummaryText(item?.code, item?.message),
        detail: warningDetailText(item?.code, item?.message)
      }))
    );
  }
  if (payload.code && payload.stage !== "confirm_pending") {
    warnings.push({
      code: payload.code,
      message: warningSummaryText(payload.code, payload.message || ""),
      detail: warningDetailText(payload.code, payload.message || "")
    });
  }
  if (payload.importRecord?.failureResult?.code || payload.importRecord?.failureResult?.message) {
    warnings.push({
      code: payload.importRecord.failureResult.code || "IMPORT_FAILED",
      message: warningSummaryText(payload.importRecord.failureResult.code || "IMPORT_FAILED", payload.importRecord.failureResult.message || ""),
      detail: warningDetailText(payload.importRecord.failureResult.code || "IMPORT_FAILED", payload.importRecord.failureResult.message || "")
    });
  }
  const evaluations = payload.originalityGuard?.evaluations || payload.importRecord?.originalityGuard?.evaluations;
  const previewNotes = payload.candidatePreview?.permanentNotes || payload.importRecord?.candidatePreview?.permanentNotes || [];
  const titleById = new Map(previewNotes.map(note => [String(note.id || ""), String(note.title || "")]));
  if (Array.isArray(evaluations)) {
    for (const item of evaluations) {
      if (item?.status && item.status !== "pass") {
        const joinedReasons = (item.reasons || []).map(reasonText).join("、") || statusValue(item.status);
        warnings.push({
          code: `ORIGINALITY_${String(item.status).toUpperCase()}`,
          message: `${titleById.get(String(item.permanentId || item.id || "")) || item.permanentId || item.id || "永久笔记"}：${joinedReasons}`
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
    IMPORT_NON_UTF8_MARKDOWN_DECODED: "重点核对中文标题、标签和正文，确认不是乱码再导入。",
    IMPORT_MARKDOWN_ENCODING_UNSUPPORTED: "把源文件转成 UTF-8，或修正异常编码后重新预览。",
    IMPORT_TITLE_NORMALIZED: "检查标题是否符合预期，必要时先修正源文件标题。",
    IMPORT_TEXT_SUSPECT_CORRUPTION: "源文件内容疑似已损坏；先修正编码或原文后再导入。",
    IMPORT_NO_MARKDOWN_FILE: "确认目录里有可导入的 Markdown 文件。",
    IMPORT_SELECTION_EMPTY: "当前预览没有可导入内容；请先处理被跳过的文件或重新预览。",
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
    WRITING_DRAFT_INVALID: "先点击“生成文章提纲”，确认预览区已经出现章节和 Markdown。"
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

function previewCandidateTotal(payload = {}) {
  const summary = payload.summary || payload.importRecord?.summary;
  if (!summary || typeof summary !== "object") return null;
  const hasCandidateCounts =
    summary.sources !== undefined || summary.literatureNotes !== undefined || summary.permanentNotes !== undefined;
  if (!hasCandidateCounts) return null;
  return Number(summary.sources || 0) + Number(summary.literatureNotes || 0) + Number(summary.permanentNotes || 0);
}

export function actionItems(payload = {}, warnings = []) {
  const actions = [];
  const deferredOriginality = previewHasDeferredOriginality(payload);
  if (deferredOriginality) actions.push("先导入来源和文献笔记，再用自己的话整理成观点。");
  if (payload.code) {
    const text = actionableTextForCode(payload.code);
    if (text) actions.push(text);
  }
  for (const warning of warnings) {
    if (deferredOriginality && String(warning?.code || "").startsWith("ORIGINALITY_")) continue;
    if (String(warning?.code || "").trim() === "IMPORT_EMPTY_PAYLOAD") {
      actions.push("补充 Payload JSON。");
    }
    const text = actionableTextForCode(warning?.code);
    if (text) actions.push(text);
  }

  const rawEvaluations = payload.originalityGuard?.evaluations || payload.importRecord?.originalityGuard?.evaluations;
  const evaluations = Array.isArray(rawEvaluations) ? rawEvaluations : [];
  for (const item of evaluations) {
    if (deferredOriginality) continue;
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
    actions.push("补充主题标题后再确定可写主题。");
  }

  if (String(payload.stage || "").trim() === "preview" && previewCandidateTotal(payload) === 0) {
    actions.push("当前预览没有可导入内容；请先处理被跳过的文件或重新预览。");
  }

  return uniqueStrings(actions).slice(0, 3);
}

export function resultSubtitle(data = {}) {
  return data.importRecordId || data.exportJobId || data.writingProjectId || data.draftScaffoldId || data.code || data.status || "";
}

export function resultStatusLabel(tone, payload = {}) {
  if (tone !== "bad" && payload.stage === "preview") return "待确认";
  if (payload.stage === "record") return statusValue(payload.importRecord?.status);
  if (payload.stage === "confirm_pending") return "待核查";
  return tone === "bad" ? "失败" : tone === "warn" ? "注意" : "完成";
}

function previewHasDeferredOriginality(payload = {}) {
  if (payload.stage !== "preview" && !(payload.stage === "record" && payload.importRecord?.status === "preview")) return false;
  const items = candidatePreviewItems(payload.candidatePreview || payload.importRecord?.candidatePreview);
  const guard = payload.originalityGuard || payload.importRecord?.originalityGuard;
  return items.some(item => !isConfirmableCandidate(item, guard))
    && items.some(item => item.candidateGroup !== "PermanentNote");
}

export function resultBrief(payload = {}, tone = resultTone(payload)) {
  if (payload.stage === "confirm_pending") return payload.code === "IMPORT_CONFIRM_RETRYABLE"
    ? "服务端确认尚未开始写入，可以再次点击确认安全重试。"
    : "尚未确认最终结果，请先核查这次导入。";
  const stage = String(payload.stage || "").trim();
  if (tone === "bad") return "这一步没有完成，请先处理下面的问题。";
  if (stage === "preview" && previewCandidateTotal(payload) === 0) {
    return "当前没有可确认导入的内容，请先处理警告里的文件问题。";
  }
  if (previewHasDeferredOriginality(payload)) return "未通过检查的永久笔记暂不导入；仍可导入来源和文献笔记，之后再整理。";
  if (stage === "preview" && Number(payload.summary?.permanentNotes || 0) > 0) return "已有永久笔记按草稿保留，导入后确认自己的观点。";
  if (stage === "record") {
    const status = payload.importRecord?.status || payload.importRecord?.state;
    if (status === "interrupted") return "这次导入曾中断，请先核对已写入和未确认的文件，不要重复导入。";
    if (status === "confirming") return "这次导入仍在进行，请等待并核查结果，不要重复确认。";
    if (status === "cancelled") return "这次导入已取消，没有新增笔记。";
    if (status === "completed") return "这次导入已完成，可查看明细或继续整理。";
    if (status === "preview") return "检查可导入内容，确认后再导入。";
    return "核对这次记录的实际状态与文件。";
  }
  if (stage === "confirm" && (Number(payload.result?.skipped?.invalid || 0) + Number(payload.result?.skipped?.conflicted || 0)) > 0) {
    return "有笔记未写入，请展开“跳过与保留”核对。";
  }
  if (stage === "confirm" && Number(payload.result?.selection?.selectedCandidates) < Number(payload.result?.selection?.totalCandidates)) {
    return "已导入所选内容，未选择的笔记没有写入。";
  }
  if (stage === "confirm" && Number(payload.result?.created?.permanentNotes || 0) > 0) return "已有永久笔记已保留为草稿，确认观点后再用于写作。";
  if (tone === "warn") return "可以继续，但建议先处理警告。";
  const briefs = {
    preview: "检查可导入内容，确认后再导入。",
    confirm: "内容已经写入，可继续整理或写作。",
    cancel: "这次导入没有写入任何新内容。",
    rollback: "系统已完成可安全回滚的部分。",
    export_markdown: "导出文件已经写到目标目录。",
    writing_project: "可写主题已确定。下一步可以生成文章提纲。",
    draft_scaffold: "检查结构后可以复制、导出或继续写。",
    writing_draft_note: "草稿笔记已保存，可以继续修改。",
    writing_copy_scaffold: "文章提纲 Markdown 已复制，可以粘贴到你的写作环境。",
    writing_export_scaffold: "文章提纲 Markdown 已导出。"
  };
  return briefs[stage] || "操作已完成。";
}
