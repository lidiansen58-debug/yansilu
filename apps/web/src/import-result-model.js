import { importConnectorLabel } from "./import-connector-labels.js";

function primitiveEntries(value = {}) {
  return Object.entries(value || {}).filter(([, item]) => item === null || ["string", "number", "boolean"].includes(typeof item));
}

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
    preview: "预览中",
    completed: "已写入",
    rolled_back: "已回滚",
    cancelled: "已取消",
    blocked: "已阻断",
    failed: "失败",
    ok: "完成"
  };
  return labels[String(status || "").trim()] || compactValue(status);
}

function metricLabel(key) {
  const labels = {
    importRecordId: "导入记录",
    connector: "连接器",
    status: "状态",
    sources: "来源卡片",
    literatureNotes: "文献笔记",
    permanentNotes: "永久笔记",
    warnings: "警告",
    created: "已创建",
    copied: "已复制",
    markdownFiles: "Markdown 文件",
    assetFiles: "资源文件",
    totalFiles: "文件总数",
    targetPath: "目标路径",
    title: "标题",
    basketNoteIds: "篮子笔记",
    sections: "章节数",
    directoryId: "目录",
    fileName: "文件",
    characters: "字符数",
    code: "代码",
    message: "消息"
  };
  return labels[String(key || "").trim()] || compactValue(key);
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
    all: "全部候选",
    partial: "部分候选",
    none: "未选择"
  };
  return labels[String(mode || "").trim()] || compactValue(mode);
}

function reasonText(reason) {
  const labels = {
    core_claim_empty: "核心主张为空",
    similarity_above_warn_threshold: "相似度接近警告阈值",
    similarity_above_block_threshold: "相似度超过阻断阈值",
    citation_locator_missing: "缺少引用定位"
  };
  return labels[String(reason || "").trim()] || compactValue(reason);
}

export function resultTitle(stage) {
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

export function resultTone(payload = {}) {
  const stage = String(payload.stage || "");
  if (stage.includes("error")) return "bad";
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
    if (value !== undefined) metrics.push({ label, value: compactValue(value) });
  };
  const pushStatus = (value) => push("状态", statusValue(value));

  if (stage === "preview") {
    push("导入记录", payload.importRecordId);
    push("连接器", importConnectorLabel(payload.connector));
    pushStatus(payload.status);
    for (const [key, value] of primitiveEntries(payload.summary)) push(metricLabel(key), value);
    push("警告", Array.isArray(payload.warnings) ? payload.warnings.length : 0);
    return metrics;
  }

  if (stage === "confirm" || stage === "rollback") {
    push("导入记录", payload.importRecordId);
    pushStatus(payload.status);
    if (payload.result?.selection) {
      const selection = payload.result.selection;
      push("已选候选", `${compactValue(selection.selectedCandidates)}/${compactValue(selection.totalCandidates)}`);
      push("选择模式", selectionModeValue(selection.mode));
    }
    const createdFiles = createdFilesFromPayload(payload);
    if (createdFiles.length) {
      push("写入文件", createdFiles.length);
      const assetCount = createdFileCountByType(payload, "asset");
      if (assetCount > 0) push("资源文件", assetCount);
    }
    for (const [key, value] of primitiveEntries(payload.result)) push(metricLabel(key), value);
    return metrics;
  }

  if (stage === "record") {
    push("导入记录", payload.importRecord?.importRecordId);
    pushStatus(payload.importRecord?.status);
    push("连接器", importConnectorLabel(payload.importRecord?.connector));
    const createdFiles = createdFilesFromPayload(payload);
    if (createdFiles.length) {
      push("写入文件", createdFiles.length);
      const assetCount = createdFileCountByType(payload, "asset");
      if (assetCount > 0) push("资源文件", assetCount);
    }
    return metrics;
  }

  if (stage === "export_markdown") {
    push("导出任务", payload.exportJobId);
    pushStatus(payload.status);
    push("已复制文件", payload.copied);
    for (const [key, value] of primitiveEntries(payload.copiedBreakdown)) push(metricLabel(key), value);
    push("目标路径", payload.targetPath);
    return metrics;
  }

  if (stage === "writing_project") {
    push("写作项目", payload.writingProjectId);
    push("标题", payload.title);
    push("篮子笔记", Array.isArray(payload.basketNoteIds) ? payload.basketNoteIds.length : undefined);
    return metrics;
  }

  if (stage === "draft_scaffold") {
    push("写作项目", payload.writingProjectId);
    push("Scaffold", payload.draftScaffoldId);
    push("章节数", Array.isArray(payload.sections) ? payload.sections.length : undefined);
    return metrics;
  }

  if (stage === "writing_draft_note") {
    push("写作项目", payload.writingProjectId);
    push("Scaffold", payload.draftScaffoldId);
    push("笔记", payload.noteId);
    push("目录", payload.directoryId);
    return metrics;
  }

  if (stage === "writing_copy_scaffold" || stage === "writing_export_scaffold") {
    push("写作项目", payload.writingProjectId);
    push("Scaffold", payload.draftScaffoldId);
    push("文件", payload.fileName);
    push("字符数", payload.characters);
    return metrics;
  }

  push("代码", payload.code);
  push("消息", payload.message);
  pushStatus(payload.status);
  return metrics;
}

export function warningItems(payload = {}) {
  const warnings = [];
  if (Array.isArray(payload.warnings)) warnings.push(...payload.warnings);
  if (payload.code) warnings.push({ code: payload.code, message: payload.message || "" });
  const evaluations = payload.originalityGuard?.evaluations;
  if (Array.isArray(evaluations)) {
    for (const item of evaluations) {
      if (item?.status && item.status !== "pass") {
        warnings.push({
          code: `ORIGINALITY_${String(item.status).toUpperCase()}`,
          message: `${item.id || "note"}：${(item.reasons || []).map(reasonText).join("、") || statusValue(item.status)}`
        });
      }
    }
  }
  return warnings;
}

function actionableTextForCode(code, payload = {}) {
  const normalized = String(code || "").trim();
  const map = {
    IMPORT_EMPTY_PAYLOAD: "补充 Payload JSON，或为 Markdown/Obsidian 导入填写一个存在的本机路径。",
    IMPORT_SOURCE_UNREADABLE: "确认来源路径存在、当前进程有读取权限，并尽量使用绝对路径。",
    IMPORT_MARKDOWN_FILE_UNREADABLE: "检查被跳过的 Markdown 文件权限或编码，修复后重新预览导入。",
    IMPORT_MALFORMED_FRONTMATTER: "修正 frontmatter 的 --- 起止边界；预览仍会继续，但建议确认写入前先处理。",
    IMPORT_NO_MARKDOWN_FILE: "确认目录中包含 .md 文件；如果是 Obsidian vault，请选择 vault 根目录或目标子目录。",
    IMPORT_PAYLOAD_INVALID: "检查 connector 名称和 JSON 结构，确认连接器是 markdown、obsidian、zotero、readwise 或 notebooklm。",
    IMPORT_RECORD_NOT_FOUND: "确认 ImportRecord ID 来自当前 Vault；切换 Vault 后需要重新预览。",
    IMPORT_STATUS_INVALID: "确认导入记录处于正确阶段：只有预览中记录可确认，只有已写入记录可回滚。",
    IMPORT_CONFIRM_REQUIRED: "点击确认写入时需要明确 confirm=true；如果放弃本次导入，请使用取消。",
    IMPORT_ORIGINALITY_BLOCKED: "先改写被阻断的永久笔记，或在确认接口中显式传入 originalityOverride=true 后再写入。",
    ORIGINALITY_GUARD_WARNING: "检查警告笔记的引用定位和转述质量；需要直接写入时可开启 allowDraftOnWarning。",
    ORIGINALITY_GUARD_BLOCKED: "把高相似度文本改写成自己的核心主张，并补充来源定位后重新预览。",
    ORIGINALITY_WARNING: "补充引用定位或增强转述，再重新运行原创性检查。",
    ORIGINALITY_BLOCKED: "降低与文献摘录的相似度，保留证据链但重写永久笔记表述。",
    WRITING_PROJECT_INVALID: "确认标题不为空，并且篮子里只放永久笔记 ID。",
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

export function actionItems(payload = {}, warnings = []) {
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
    actions.push("有永久笔记因原创性警告被跳过；修复引用或转述，或允许 warning 作为 draft 写入。");
  }
  if (Array.isArray(payload.result?.skippedFiles) && payload.result.skippedFiles.length) {
    const modified = payload.result.skippedFiles.some((item) => item?.reason === "modified");
    actions.push(modified ? "被修改过的文件不会自动回滚；请打开对应路径手动合并或删除。" : "检查 skippedFiles 中的 reason 和 path，再手动处理未回滚文件。");
  }

  if (payload.stage === "writing_project_error" && /only accepts permanent notes/i.test(payload.message || "")) {
    actions.push("先在永久笔记目录中选择永久笔记，再加入写作篮子。");
  }
  if (payload.stage === "writing_project_error" && /basketNoteIds/i.test(payload.message || "")) {
    actions.push("至少加入一条永久笔记 ID；可先打开一条永久笔记后点击“加入当前笔记”。");
  }
  if (payload.stage === "writing_project_error" && /title/i.test(payload.message || "")) {
    actions.push("补充写作项目标题后再创建。");
  }
  if (payload.stage === "writing_draft_note_error" && /scaffold/i.test(payload.message || "")) {
    actions.push("先点击“生成草稿骨架”，确认预览区已经出现章节和 Markdown。");
  }

  return uniqueStrings(actions).slice(0, 5);
}

export function resultSubtitle(data = {}) {
  return data.importRecordId || data.exportJobId || data.writingProjectId || data.draftScaffoldId || data.code || data.status || "";
}

export function resultStatusLabel(tone) {
  return tone === "bad" ? "失败" : tone === "warn" ? "需注意" : "完成";
}

export function resultBrief(payload = {}, tone = resultTone(payload)) {
  const stage = String(payload.stage || "").trim();
  if (tone === "bad") {
    return "先处理下方提示，再重新执行这一步；当前不会写入或覆盖你的笔记。";
  }
  if (tone === "warn") {
    return "可以继续，但建议先看完警告与候选项，再决定是否确认写入。";
  }
  const briefs = {
    preview: "预览已生成。检查候选项，排除不需要的内容后再确认写入。",
    confirm: "内容已写入 Vault。可以进入待转述、写作篮或历史记录继续处理。",
    cancel: "这次导入已经取消，未写入新的笔记内容。",
    record: "记录已读取。你可以继续确认、回滚，或从历史里打开相关队列。",
    rollback: "回滚已完成。被系统保留的文件需要手动检查后再处理。",
    export_markdown: "导出已完成。目标目录中包含 Markdown 笔记和关联资源文件。",
    writing_project: "写作项目已创建。下一步可以生成草稿骨架。",
    draft_scaffold: "草稿骨架已生成。检查结构后可以复制、导出或保存成草稿笔记。",
    writing_draft_note: "草稿笔记已创建。可以回到编辑器继续手写修改。",
    writing_copy_scaffold: "Scaffold Markdown 已复制，可以粘贴到你的写作环境。",
    writing_export_scaffold: "Scaffold Markdown 已导出，可以在目标位置继续整理。"
  };
  return briefs[stage] || "操作已完成。可以查看下方结果，按需继续下一步。";
}
