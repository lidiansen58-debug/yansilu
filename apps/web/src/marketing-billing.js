const API_BASE =
  window.location.port === "5173" || window.location.port === "4273"
    ? "http://localhost:3000"
    : window.location.origin;

function setMessage(element, text, tone = "info", hidden = false) {
  if (!element) return;
  element.hidden = hidden;
  element.dataset.tone = tone;
  element.textContent = text;
}

function billingModeMessage(mode) {
  return mode === "stripe"
    ? "当前已切换到 Stripe 模式，升级和订阅管理会跳转到真实支付入口。"
    : "当前使用本地 mock 流程，适合演示注册、升级和账单状态变化。";
}

async function initBillingPage() {
  const planEl = document.querySelector("[data-billing-plan]");
  const statusEl = document.querySelector("[data-billing-status]");
  const emailEl = document.querySelector("[data-billing-email]");
  const renewEl = document.querySelector("[data-billing-renews]");
  const planMetaEl = document.querySelector("[data-billing-plan-meta]");
  const planActionEl = document.querySelector("[data-billing-plan-action]");
  const manageButtonEl = document.querySelector("[data-billing-manage]");
  const modeEl = document.querySelector("[data-billing-mode]");
  const modeMessageEl = document.querySelector("[data-billing-mode-message]");
  const portalMessageEl = document.querySelector("[data-billing-portal-message]");
  if (!planEl || !statusEl || !emailEl) return;

  const token = window.localStorage.getItem("yansilu_auth_token") || "";
  const searchParams = new URLSearchParams(window.location.search);
  const portalState = searchParams.get("portal") || "";

  if (portalState === "mock") {
    setMessage(
      portalMessageEl,
      "这里是本地 mock 订阅入口。接入 Stripe 后，这个按钮会跳到真实的 Stripe Customer Portal。",
      "info",
      false
    );
  }

  if (!token) {
    statusEl.textContent = "未登录";
    setMessage(modeMessageEl, "登录后可以查看你的方案、续费时间和订阅入口。", "info", false);
    return;
  }

  try {
    const [meRes, billingRes] = await Promise.all([
      fetch(`${API_BASE}/api/v1/me`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/api/v1/billing/status`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const mePayload = await meRes.json();
    const billingPayload = await billingRes.json();
    if (!meRes.ok || !billingRes.ok) {
      throw new Error(mePayload?.error?.message || billingPayload?.error?.message || "读取账户状态失败。");
    }

    const currentPlan = String(billingPayload?.item?.plan || "free").toLowerCase();
    const billingMode = String(billingPayload?.mode || "mock");

    planEl.textContent = currentPlan.toUpperCase();
    statusEl.textContent = String(billingPayload?.item?.status || "free");
    emailEl.textContent = String(mePayload?.session?.user?.email || "");
    if (modeEl) modeEl.textContent = billingMode.toUpperCase();
    setMessage(modeMessageEl, billingModeMessage(billingMode), "info", false);

    if (planMetaEl) {
      planMetaEl.textContent =
        currentPlan === "pro"
          ? "你已经处于帮助知识长成智慧的完整写作支持方案。"
          : "适合开始建立基础工作流。";
    }

    if (planActionEl) {
      planActionEl.textContent = currentPlan === "pro" ? "查看定价" : "升级到 Pro";
      planActionEl.setAttribute("href", "/pricing");
      planActionEl.classList.toggle("btn-secondary", currentPlan === "pro");
      planActionEl.classList.toggle("btn-primary", currentPlan !== "pro");
    }

    if (renewEl) {
      renewEl.textContent = billingPayload?.item?.renewsAt
        ? new Date(billingPayload.item.renewsAt).toLocaleString()
        : "-";
    }

    if (manageButtonEl) {
      const canManage = currentPlan === "pro";
      manageButtonEl.hidden = !canManage;
      manageButtonEl.disabled = false;
      manageButtonEl.textContent = billingMode === "stripe" ? "管理 Stripe 订阅" : "查看订阅入口";
      manageButtonEl.onclick = async () => {
        const idleText = manageButtonEl.textContent;
        manageButtonEl.disabled = true;
        manageButtonEl.textContent = "跳转中...";
        setMessage(portalMessageEl, "", "info", true);
        try {
          const response = await fetch(`${API_BASE}/api/v1/billing/portal-session`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              returnUrl: `${window.location.origin}/billing`
            })
          });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload?.error?.message || "创建订阅入口失败。");
          }
          window.location.href = payload?.item?.portalUrl || "/billing";
        } catch (error) {
          manageButtonEl.disabled = false;
          manageButtonEl.textContent = idleText;
          const text = String(error?.message || error);
          const isStripeReadyError = text.includes("stripe customer is not ready");
          setMessage(
            portalMessageEl,
            isStripeReadyError
              ? "这个账户还没有同步到 Stripe customer。先完成一次真实 Stripe Checkout，之后这里就能直接管理订阅。"
              : text,
            isStripeReadyError ? "info" : "error",
            false
          );
        }
      };
    }
  } catch {
    statusEl.textContent = "读取失败";
    setMessage(modeMessageEl, "当前无法读取账单状态，请稍后重试。", "error", false);
  }
}

initBillingPage();
