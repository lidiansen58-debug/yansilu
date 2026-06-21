const SNAPSHOT_LABELS = Object.freeze({
  inboxList: "系统消息列表",
  inboxDetail: "系统消息详情",
  inboxDecision: "系统消息处理",
  suggestionsList: "待确认建议列表",
  suggestionDetail: "建议详情",
  suggestionDecision: "建议处理结果",
  scheduledTasksList: "后台任务列表",
  scheduledTaskAction: "后台任务操作"
});

const SNAPSHOT_ORDER = Object.freeze([
  "suggestionDecision",
  "scheduledTaskAction",
  "suggestionsList",
  "scheduledTasksList",
  "inboxDecision",
  "inboxList",
  "inboxDetail",
  "suggestionDetail"
]);

function escapeHtmlValue(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCapturedAt(value = "") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value || "刚刚");
  return date.toLocaleString("zh-CN");
}

export function automationRunHistoryItems(snapshots = {}) {
  return SNAPSHOT_ORDER
    .map((key) => {
      const snapshot = snapshots?.[key] || null;
      if (!snapshot) return null;
      return {
        key,
        title: SNAPSHOT_LABELS[key] || key,
        capturedAt: snapshot.capturedAt || "",
        runtime: snapshot.runtime || null,
        canonical: snapshot.canonical || null
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const timeA = new Date(a.capturedAt).getTime();
      const timeB = new Date(b.capturedAt).getTime();
      return (Number.isFinite(timeB) ? timeB : 0) - (Number.isFinite(timeA) ? timeA : 0);
    });
}

function renderDiagnosticPayload(item) {
  return `
    <details class="settings-automation-run-diagnostics">
      <summary>诊断数据</summary>
      <div class="settings-canonical-grid">
        <div class="settings-canonical-block">
          <div class="settings-canonical-label">运行态</div>
          <pre class="settings-code settings-canonical-code">${escapeHtmlValue(JSON.stringify(item.runtime, null, 2) || "null")}</pre>
        </div>
        <div class="settings-canonical-block">
          <div class="settings-canonical-label">标准载荷</div>
          <pre class="settings-code settings-canonical-code">${escapeHtmlValue(JSON.stringify(item.canonical, null, 2) || "null")}</pre>
        </div>
      </div>
    </details>
  `;
}

export function renderSettingsAutomationRunHistory({ snapshots = {} } = {}) {
  const items = automationRunHistoryItems(snapshots);
  if (!items.length) {
    return `<div class="settings-canonical-empty">还没有运行记录。</div>`;
  }
  return `
    <div class="settings-automation-run-list">
      ${items.slice(0, 5).map((item) => `
        <article class="settings-automation-run-row">
          <div class="settings-automation-run-main">
            <strong>${escapeHtmlValue(item.title)}</strong>
            <span>${escapeHtmlValue(formatCapturedAt(item.capturedAt))}</span>
          </div>
          ${renderDiagnosticPayload(item)}
        </article>
      `).join("")}
    </div>
  `;
}
