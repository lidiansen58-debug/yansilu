const API_BASE =
  window.location.port === "5173" || window.location.port === "4273"
    ? "http://localhost:3000"
    : window.location.origin;

function setStatusMessage(el, text, tone = "info") {
  if (!el) return;
  el.dataset.tone = tone;
  el.textContent = text;
}

async function initCheckoutSuccess() {
  const statusEl = document.querySelector("[data-checkout-status]");
  const planEl = document.querySelector("[data-checkout-plan]");
  const billingStatusEl = document.querySelector("[data-checkout-billing-status]");
  const modeEl = document.querySelector("[data-checkout-mode]");
  const token = window.localStorage.getItem("yansilu_auth_token") || "";

  if (!statusEl || !planEl || !billingStatusEl || !modeEl) return;
  if (!token) {
    setStatusMessage(statusEl, "当前没有检测到登录状态，请先登录后再查看升级结果。", "error");
    return;
  }

  try {
    const billingRes = await fetch(`${API_BASE}/api/v1/billing/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const billingPayload = await billingRes.json();
    if (!billingRes.ok) {
      throw new Error(billingPayload?.error?.message || "读取订阅状态失败。");
    }

    const currentPlan = String(billingPayload?.item?.plan || "free").toLowerCase();
    const billingStatus = String(billingPayload?.item?.status || "free");
    const mode = String(billingPayload?.mode || "mock");

    planEl.textContent = currentPlan.toUpperCase();
    billingStatusEl.textContent = billingStatus;
    modeEl.textContent = mode.toUpperCase();

    if (currentPlan === "pro") {
      setStatusMessage(
        statusEl,
        mode === "stripe"
          ? "订阅已经处于 Pro 状态。你可以前往账单页继续管理 Stripe 订阅。"
          : "本地演示账户已经处于 Pro 状态。你可以前往账单页查看订阅详情。",
        "info"
      );
      return;
    }

    if (mode === "stripe") {
      setStatusMessage(
        statusEl,
        "已从 Stripe 返回，但本地状态还没更新。如果你刚完成支付，稍等几秒让 webhook 同步后再刷新这个页面。",
        "info"
      );
      return;
    }

    setStatusMessage(statusEl, "正在为当前演示账户激活 Pro 权益...", "info");
    const response = await fetch(`${API_BASE}/api/v1/billing/mock-complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message || "激活失败。");
    }

    planEl.textContent = String(payload?.item?.plan || "pro").toUpperCase();
    billingStatusEl.textContent = String(payload?.item?.status || "active");
    setStatusMessage(statusEl, "当前演示账户已经升级到 Pro，可以继续前往账单页查看详情。", "info");
  } catch (error) {
    setStatusMessage(statusEl, String(error?.message || error), "error");
  }
}

initCheckoutSuccess();
