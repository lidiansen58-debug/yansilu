function $(selector) {
  return document.querySelector(selector);
}

const API_BASE =
  window.location.port === "5173" || window.location.port === "4273"
    ? "http://localhost:3000"
    : window.location.origin;

function setHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
}

function setText(element, text) {
  if (!element) return;
  element.textContent = text;
}

function setLoading(button, loading, idleText, loadingText) {
  if (!button) return;
  button.disabled = loading;
  button.textContent = loading ? loadingText : idleText;
}

function createValidator(mode) {
  return {
    email(value) {
      const email = String(value || "").trim();
      if (!email) return mode === "register" ? "请输入邮箱地址。" : "请输入登录邮箱。";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "请输入有效的邮箱地址。";
      return "";
    },
    code(value) {
      const code = String(value || "").trim();
      if (!code) return "请输入验证码。";
      if (code.length < 4) return "验证码长度不正确。";
      return "";
    }
  };
}

function initAuthPage() {
  const form = $("#authForm");
  if (!form) return;

  const mode = document.body.dataset.authMode || "register";
  const validator = createValidator(mode);
  const emailInput = $("#authEmail");
  const codeInput = $("#authCode");
  const continueButton = $("#authContinue");
  const verifyButton = $("#authVerify");
  const resendButton = $("#authResend");
  const backButton = $("#authBack");
  const message = $("#authMessage");
  const success = $("#authSuccess");
  const emailStep = $("#authEmailStep");
  const codeStep = $("#authCodeStep");
  const sentTo = $("#authSentTo");
  const nextPath = form.dataset.nextPath || "/billing";

  let submittedEmail = "";
  let challengeId = "";

  function showMessage(text, tone = "info") {
    if (!message) return;
    setText(message, text);
    message.dataset.tone = tone;
    message.hidden = !text;
  }

  function showSuccess(text) {
    if (!success) return;
    setText(success, text);
    success.hidden = !text;
  }

  function goToCodeStep() {
    submittedEmail = String(emailInput?.value || "").trim();
    setHidden(emailStep, true);
    setHidden(codeStep, false);
    setText(sentTo, submittedEmail);
    showSuccess("");
    codeInput?.focus();
  }

  function goToEmailStep() {
    setHidden(emailStep, false);
    setHidden(codeStep, true);
    showMessage("");
    showSuccess("");
    emailInput?.focus();
  }

  continueButton?.addEventListener("click", async () => {
    const error = validator.email(emailInput?.value);
    if (error) {
      showMessage(error, "error");
      emailInput?.focus();
      return;
    }

    setLoading(continueButton, true, "继续", "发送中...");
    showMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(emailInput?.value || "").trim(),
          mode
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "发送验证码失败。");

      challengeId = String(payload.challengeId || "");
      setLoading(continueButton, false, "继续", "发送中...");
      goToCodeStep();
      showMessage(`验证码已发送。当前开发环境测试码：${payload.codeHint || "123456"}`, "info");
    } catch (fetchError) {
      setLoading(continueButton, false, "继续", "发送中...");
      showMessage(String(fetchError?.message || fetchError), "error");
    }
  });

  verifyButton?.addEventListener("click", async () => {
    const error = validator.code(codeInput?.value);
    if (error) {
      showMessage(error, "error");
      codeInput?.focus();
      return;
    }

    if (!challengeId) {
      showMessage("验证码会话不存在，请返回重新获取验证码。", "error");
      return;
    }

    setLoading(verifyButton, true, "验证并继续", "验证中...");
    showMessage("");
    showSuccess("");
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          code: String(codeInput?.value || "").trim()
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "验证失败。");

      window.localStorage.setItem("yansilu_auth_token", payload?.session?.token || "");
      window.localStorage.setItem("yansilu_auth_email", payload?.session?.user?.email || "");

      setLoading(verifyButton, false, "验证并继续", "验证中...");
      showSuccess(mode === "register" ? "账户创建成功，正在进入账户页..." : "登录成功，正在返回账户页...");
      window.setTimeout(() => {
        window.location.href = nextPath;
      }, 550);
    } catch (fetchError) {
      setLoading(verifyButton, false, "验证并继续", "验证中...");
      showMessage(String(fetchError?.message || fetchError), "error");
    }
  });

  resendButton?.addEventListener("click", async () => {
    if (!submittedEmail) return;

    setLoading(resendButton, true, "重新发送", "发送中...");
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submittedEmail, mode })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "重新发送失败。");

      challengeId = String(payload.challengeId || "");
      setLoading(resendButton, false, "重新发送", "发送中...");
      showMessage(`新的验证码已发送到 ${submittedEmail}。当前测试码：${payload.codeHint || "123456"}`, "info");
    } catch (fetchError) {
      setLoading(resendButton, false, "重新发送", "发送中...");
      showMessage(String(fetchError?.message || fetchError), "error");
    }
  });

  backButton?.addEventListener("click", () => {
    goToEmailStep();
  });
}

initAuthPage();
