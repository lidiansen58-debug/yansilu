export function aiTestReply(result = {}) {
  const status = String(result?.status || "").trim();
  if (status && !["succeeded", "partial", "ok"].includes(status)) {
    const error = new Error(result?.error?.message || "AI 测试未成功，请检查配置后重试。");
    error.details = { providerErrorType: result?.error?.error_type || "unknown" };
    throw error;
  }
  const content = String(result?.output?.content || "").trim();
  if (content) return content;
  const json = result?.output?.json;
  if (json && typeof json === "object" && Object.keys(json).length) return JSON.stringify(json, null, 2);
  throw new Error("AI 服务没有返回回复，请重试或检查模型是否可用。");
}
