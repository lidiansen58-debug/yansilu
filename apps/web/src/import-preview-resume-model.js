export function importPreviewInputKey(values = {}) {
  return JSON.stringify([values.connector || "obsidian", String(values.path || "").trim(),
    String(values.payload || "").trim(), String(values.options || "").trim()]);
}

export function canResumeImportPreview(state = {}, values = {}) {
  return Boolean(state.lastPreview?.importRecordId && state.previewRequest
    && state.lastPreview.importRecordId === values.importRecordId
    && importPreviewInputKey(state.previewRequest) === importPreviewInputKey(values));
}

export function syncImportPreviewEntry(getElement, state, values) {
  const matching = canResumeImportPreview(state, values);
  const busy = state.previewResumeBusy === true;
  const button = getElement("btnImportPreview");
  if (button) {
    button.textContent = busy ? "正在核对…" : !matching ? "预览笔记"
      : state.lastPreview.status === "preview" ? "继续核对" : "查看导入状态";
    button.disabled = busy;
  }
  const restart = getElement("btnImportRepreview");
  if (restart) { restart.hidden = !matching; restart.disabled = busy; }
}

export function importRequestMatches(record, request) {
  const canonical = value => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  return record.connector === request.connector
    && JSON.stringify(canonical(record.payload || {})) === JSON.stringify(canonical(request.payload || {}))
    && JSON.stringify(canonical(record.options || {})) === JSON.stringify(canonical(request.options || {}));
}
