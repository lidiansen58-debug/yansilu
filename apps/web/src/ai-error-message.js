export function aiErrorMessage(error) {
  const type = error?.details?.providerErrorType || error?.details?.providerError?.error_type || error?.providerResponse?.error?.error_type || "";
  if (type === "timeout") return "AI 响应超时。请重试，或在 AI 设置中选择更轻量的模型。";
  if (type === "auth_error") return "AI 服务认证失败。请在 AI 设置中检查 API Key。";
  if (type === "model_unavailable") return "所选模型不可用。请在 AI 设置中检查模型名称。";
  if (type === "rate_limit") return "AI 服务请求过于频繁，请稍后重试。";
  if (type === "provider_unavailable") return "AI 服务暂时不可用，请检查服务是否启动后重试。";
  return String(error?.message || error || "AI 调用失败");
}
