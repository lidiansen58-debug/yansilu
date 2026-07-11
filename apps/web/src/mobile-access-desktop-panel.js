function escapeHtmlValue(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTime(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function deviceRows(devices = [], escapeHtml = escapeHtmlValue) {
  if (!devices.length) {
    return `<div class="mobile-access-empty">暂无已配对设备。</div>`;
  }
  return devices.map((device) => {
    const revoked = Boolean(device.revokedAt);
    return `
      <div class="mobile-access-device ${revoked ? "is-revoked" : ""}">
        <div>
          <strong>${escapeHtml(device.name || "手机浏览器")}</strong>
          <span>${revoked ? `已撤销 · ${escapeHtml(formatTime(device.revokedAt))}` : `最近访问 · ${escapeHtml(formatTime(device.lastSeenAt) || "尚未访问")}`}</span>
        </div>
        <button class="mini-btn is-subtle" type="button" data-mobile-device-revoke="${escapeHtml(device.id)}" ${revoked ? "disabled" : ""}>撤销</button>
      </div>
    `;
  }).join("");
}

function pendingApprovalCard(pending = [], escapeHtml = escapeHtmlValue, actionLoading = "") {
  if (!pending.length) {
    return `
      <div class="mobile-access-approval is-waiting">
        <div>
          <div class="mobile-access-kicker">等待连接</div>
          <strong>扫码后在这里允许连接</strong>
        </div>
      </div>
    `;
  }

  return `
    <div class="mobile-access-approval is-pending">
      <div>
        <div class="mobile-access-kicker">待确认</div>
        <strong>${escapeHtml(pending.length > 1 ? `${pending.length} 台手机等待确认` : "有一台手机等待确认")}</strong>
      </div>
      <div class="mobile-access-approval-list">
        ${pending.map((request) => `
          <div class="mobile-access-approval-row">
            <div>
              <strong>${escapeHtml(request.deviceName || "手机浏览器")}</strong>
              <span>${escapeHtml(formatTime(request.createdAt) || "刚刚")} · ${escapeHtml(request.clientHint || "等待确认")}</span>
            </div>
            <button class="mini-btn primary mobile-access-approval-button" type="button" data-mobile-pair-confirm="${escapeHtml(request.id)}" ${actionLoading === request.id ? "disabled" : ""}>允许连接</button>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

export function renderMobileAccessDesktopPanel({
  state = {},
  escapeHtml = escapeHtmlValue
} = {}) {
  const item = state.item || null;
  const loading = Boolean(state.loading);
  const actionLoading = Boolean(state.actionLoading);
  const error = String(state.error || "").trim();
  if (!item && loading) {
    return `
      <div class="mobile-access-card">
        <div class="settings-card-head">
          <div>
            <div class="settings-card-title">手机访问</div>
            <div class="settings-card-note">正在准备二维码和配对码。</div>
          </div>
        </div>
        <div class="mobile-access-empty">正在读取这台电脑的手机访问状态...</div>
      </div>
    `;
  }

  if (!item && error) {
    return `
      <div class="mobile-access-card">
        <div class="settings-card-head">
          <div>
            <div class="settings-card-title">手机访问</div>
          <div class="settings-card-note">手机访问暂不可用。</div>
          </div>
        </div>
        <div class="mobile-access-error">${escapeHtml(error)}</div>
        <button class="mini-btn primary" type="button" data-mobile-access-refresh>重试</button>
      </div>
    `;
  }

  const pairing = item?.pairing || {};
  return `
    <div class="mobile-access-card">
      <div class="settings-card-head">
        <div>
          <div class="settings-card-title">手机访问</div>
          <div class="settings-card-note">扫码连接手机。</div>
        </div>
        <span class="settings-stat-badge">${escapeHtml(pairing.ttlSeconds ? `${pairing.ttlSeconds}s` : "待刷新")}</span>
      </div>
      ${error ? `<div class="mobile-access-error">${escapeHtml(error)}</div>` : ""}
      <div class="mobile-access-layout">
        <div class="mobile-access-qr" aria-label="手机访问二维码">
          ${item?.qrSvg || `<div class="mobile-access-empty">二维码待生成</div>`}
        </div>
        <div class="mobile-access-copy">
          <div class="mobile-access-kicker">扫码连接</div>
          <div class="mobile-access-url">${escapeHtml(item?.accessUrl || "")}</div>
          <div class="mobile-access-code">
            <span>临时配对码</span>
            <strong>${escapeHtml(pairing.pairCode || "------")}</strong>
          </div>
          ${pendingApprovalCard(item?.pendingRequests || [], escapeHtml, actionLoading)}
          <div class="import-actions">
            <button class="mini-btn is-subtle" type="button" data-mobile-access-refresh ${loading ? "disabled" : ""}>刷新二维码</button>
            <button class="mini-btn" type="button" data-mobile-access-rotate ${actionLoading ? "disabled" : ""}>生成新二维码</button>
          </div>
        </div>
      </div>

      <div class="mobile-access-section">
        <div class="mobile-access-section-head">
          <strong>已配对设备</strong>
        </div>
        <div class="mobile-access-list">${deviceRows(item?.devices || [], escapeHtml)}</div>
      </div>

    </div>
  `;
}
