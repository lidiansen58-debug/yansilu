import { captureActionConfirmationContext } from "./action-confirmation-context.js";

function importErrorDetailsText(details) {
  const valueText = (value) => {
    if (typeof value === "string") return value.trim();
    try {
      return JSON.stringify(value) || "";
    } catch {
      return String(value || "").trim();
    }
  };
  if (typeof details === "string") return details.trim();
  if (Array.isArray(details)) {
    return details
      .map(valueText)
      .filter(Boolean)
      .slice(0, 3)
      .join("；");
  }
  if (!details || typeof details !== "object") return "";
  return Object.entries(details)
    .map(([key, value]) => {
      const text = valueText(value);
      return text ? `${key}: ${text}` : "";
    })
    .filter(Boolean)
    .slice(0, 3)
    .join("；");
}

export function describeSettingsDemoImportError(error = null) {
  const code = String(error?.code || "").trim();
  const message = String(error?.message || error || "未知错误").trim() || "未知错误";
  const detail = importErrorDetailsText(error?.details);
  const cause = String(error?.cause?.message || "").trim();
  const recovery = code === "desktop_api_unavailable" || code === "api_unavailable"
    ? "本地服务没有准备好。请完全退出研思录后重新打开，再重试。"
    : code === "request_timeout"
      ? "等待本地服务超过预期时间。请稍等片刻后重试；仍失败请重启研思录。"
      : "";
  return [
    `导入失败：${message}`,
    code ? `错误代码：${code}` : "",
    detail ? `详情：${detail}` : "",
    cause ? `原因：${cause}` : "",
    recovery
  ].filter(Boolean).join("\n");
}

export async function runSettingsDemoImport(button, deps) {
  const { $, handleStateChange, setStatus } = deps;
  const isCurrent = captureActionConfirmationContext(() => deps);
  const previousText = button.textContent;
  const status = $("settingsImportSmartNotesDemoStatus");
  const setImportFeedback = (message, tone = "") => {
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  };
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = "\u6b63\u5728\u5bfc\u5165...";
  setImportFeedback("正在导入示例笔记与写作，完成后可在普通目录中查看。", "busy");
  try {
    const imported = await handleStateChange("seed-smart-notes-demo", { source: "settings-help" });
    if (imported === false) {
      setImportFeedback("已取消导入。需要时可再次点击按钮。", "");
      if (isCurrent()) setStatus("已取消 Demo 导入。", "");
    } else {
      setImportFeedback("示例已导入，可回到首页继续整理。", "ok");
    }
  } catch (error) {
    const description = describeSettingsDemoImportError(error);
    setImportFeedback(description, "bad");
    if (isCurrent()) setStatus(description, "bad");
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.textContent = previousText;
  }
}
