const API_BASE =
  window.location.port === "5173" || window.location.port === "4273"
    ? "http://localhost:3000"
    : window.location.origin;

function text(el, value) {
  if (el) el.textContent = value;
}

async function logout() {
  const token = window.localStorage.getItem("yansilu_auth_token") || "";
  try {
    if (token) {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  } catch {}
  window.localStorage.removeItem("yansilu_auth_token");
  window.localStorage.removeItem("yansilu_auth_email");
  window.location.href = "/";
}

async function initSessionUi() {
  const guestEls = document.querySelectorAll("[data-guest-only]");
  const authEls = document.querySelectorAll("[data-auth-only]");
  const emailEls = document.querySelectorAll("[data-session-email]");
  const planEls = document.querySelectorAll("[data-session-plan]");
  const logoutEls = document.querySelectorAll("[data-session-logout]");
  const token = window.localStorage.getItem("yansilu_auth_token") || "";

  logoutEls.forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      logout();
    });
  });

  if (!token) {
    guestEls.forEach((el) => (el.hidden = false));
    authEls.forEach((el) => (el.hidden = true));
    return;
  }

  try {
    const [meRes, billingRes] = await Promise.all([
      fetch(`${API_BASE}/api/v1/me`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/api/v1/billing/status`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const mePayload = await meRes.json();
    const billingPayload = await billingRes.json();
    if (!meRes.ok || !billingRes.ok) throw new Error("session invalid");

    guestEls.forEach((el) => (el.hidden = true));
    authEls.forEach((el) => (el.hidden = false));
    emailEls.forEach((el) => text(el, mePayload?.session?.user?.email || ""));
    planEls.forEach((el) => text(el, String(billingPayload?.item?.plan || "free").toUpperCase()));
  } catch {
    window.localStorage.removeItem("yansilu_auth_token");
    window.localStorage.removeItem("yansilu_auth_email");
    guestEls.forEach((el) => (el.hidden = false));
    authEls.forEach((el) => (el.hidden = true));
  }
}

initSessionUi();
