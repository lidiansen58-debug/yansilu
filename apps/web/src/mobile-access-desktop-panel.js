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
    return `<div class="mobile-access-empty">还没有已配对的手机。扫码后需要在这里确认。</div>`;
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

function pendingRows(pending = [], escapeHtml = escapeHtmlValue) {
  if (!pending.length) {
    return `<div class="mobile-access-empty">手机扫码后，请求会出现在这里。</div>`;
  }
  return pending.map((request) => `
    <div class="mobile-access-request">
      <div>
        <strong>${escapeHtml(request.deviceName || "手机浏览器")}</strong>
        <span>请求时间 ${escapeHtml(formatTime(request.createdAt))} · ${escapeHtml(request.clientHint || "等待确认")}</span>
      </div>
      <button class="mini-btn primary" type="button" data-mobile-pair-confirm="${escapeHtml(request.id)}">允许连接</button>
    </div>
  `).join("");
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
            <div class="settings-card-note">手机端只用于随身记录和轻量查看。</div>
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
          <div class="settings-card-note">把手机当成随身采集入口即可：扫码发起连接后，还需要在电脑端确认一次。</div>
        </div>
        <span class="settings-stat-badge">${escapeHtml(pairing.ttlSeconds ? `${pairing.ttlSeconds}s` : "待刷新")}</span>
      </div>
      ${error ? `<div class="mobile-access-error">${escapeHtml(error)}</div>` : ""}
      <div class="mobile-access-layout">
        <div class="mobile-access-qr" aria-label="手机访问二维码">
          ${item?.qrSvg || `<div class="mobile-access-empty">二维码待生成</div>`}
        </div>
        <div class="mobile-access-copy">
          <div class="mobile-access-kicker">第 1 步：手机扫码</div>
          <div class="mobile-access-url">${escapeHtml(item?.accessUrl || "")}</div>
          <div class="mobile-access-code">
            <span>临时配对码</span>
            <strong>${escapeHtml(pairing.pairCode || "------")}</strong>
          </div>
          <p>这个配对码会在 ${escapeHtml(formatTime(pairing.expiresAt) || "短时间内")} 过期。手机扫码后，请在下方点“允许连接”。</p>
          <p>电脑端只要记住 3 步：保持研思录运行 -> 让手机扫码 -> 在“待确认手机”里允许连接。以后不再使用时，再撤销设备。</p>
          <div class="import-actions">
            <button class="mini-btn is-subtle" type="button" data-mobile-access-refresh ${loading ? "disabled" : ""}>刷新状态</button>
            <button class="mini-btn" type="button" data-mobile-access-rotate ${actionLoading ? "disabled" : ""}>换一个配对码</button>
          </div>
        </div>
      </div>

      <div class="mobile-access-section">
        <div class="mobile-access-section-head">
          <strong>待确认手机</strong>
          <span>只有你点“允许连接”后，这台手机才能访问当前电脑上的笔记。</span>
        </div>
        <div class="mobile-access-list">${pendingRows(item?.pendingRequests || [], escapeHtml)}</div>
      </div>

      <div class="mobile-access-section">
        <div class="mobile-access-section-head">
          <strong>已配对设备</strong>
          <span>不再使用时可以直接撤销；撤销后，这台手机需要重新扫码才能再访问。</span>
        </div>
        <div class="mobile-access-list">${deviceRows(item?.devices || [], escapeHtml)}</div>
      </div>

      <div class="mobile-access-note">建议只在同一 Wi-Fi / 局域网内使用。当前版本按本地访问设计，不要把访问地址直接暴露到公网。手机更适合记录和查看，重整理仍建议回到电脑完成。</div>
    </div>
  `;
}
