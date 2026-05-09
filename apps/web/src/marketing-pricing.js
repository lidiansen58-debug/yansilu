const API_BASE =
  window.location.port === "5173" || window.location.port === "4273"
    ? "http://localhost:3000"
    : window.location.origin;

function setPricingStatus(message, tone = "info", hidden = false) {
  const el = document.querySelector("[data-pricing-status]");
  if (!el) return;
  el.hidden = hidden;
  el.dataset.tone = tone;
  el.textContent = message;
}

async function startUpgrade(plan = "pro", button) {
  const token = window.localStorage.getItem("yansilu_auth_token") || "";
  if (!token) {
    window.location.href = "/register";
    return;
  }

  const idleText = button?.textContent || "升级到 Pro";
  if (button) {
    button.disabled = true;
    button.textContent = "跳转中...";
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/billing/checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        plan,
        successUrl: `${window.location.origin}/checkout/success`,
        cancelUrl: `${window.location.origin}/checkout/cancel`
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message || "创建支付会话失败。");
    }
    window.location.href = payload?.item?.checkoutUrl || "/checkout/success";
  } catch (error) {
    if (button) {
      button.disabled = false;
      button.textContent = idleText;
    }
    setPricingStatus(String(error?.message || error), "error", false);
  }
}

async function syncPricingState() {
  const token = window.localStorage.getItem("yansilu_auth_token") || "";
  const upgradeButton = document.querySelector("[data-upgrade-plan]");
  const manageLink = document.querySelector("[data-pricing-manage]");
  const proMeta = document.querySelector("[data-pricing-pro-meta]");

  if (manageLink) manageLink.hidden = true;

  if (!token) {
    setPricingStatus("登录后可以直接升级到 Pro，或先免费开始。", "info", false);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/billing/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message || "读取订阅状态失败。");
    }

    const currentPlan = String(payload?.item?.plan || "free").toLowerCase();
    if (currentPlan === "pro") {
      if (upgradeButton) {
        upgradeButton.disabled = true;
        upgradeButton.textContent = "当前已是 Pro";
      }
      if (manageLink) manageLink.hidden = false;
      if (proMeta) {
        proMeta.textContent = "你已经处于完整方案，可以直接前往账户页管理订阅。";
      }
      setPricingStatus("当前账户已经是 Pro，可以直接前往账户页管理订阅。", "info", false);
      return;
    }

    if (upgradeButton) {
      upgradeButton.disabled = false;
      upgradeButton.textContent = "升级到 Pro";
    }
    if (proMeta) {
      proMeta.textContent = "适合长期研究、知识写作和高频输出的用户。";
    }
    setPricingStatus("当前账户仍在 Free，可随时升级到 Pro。", "info", false);
  } catch (error) {
    setPricingStatus(String(error?.message || error), "error", false);
  }
}

function initPricingPage() {
  document.querySelectorAll("[data-upgrade-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      startUpgrade(String(button.dataset.upgradePlan || "pro"), button);
    });
  });
  syncPricingState();
}

initPricingPage();
