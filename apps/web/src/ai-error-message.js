export function aiErrorMessage(error) {
  const type = error?.details?.providerErrorType || error?.details?.providerError?.error_type || error?.providerResponse?.error?.error_type || "";
  if (type === "timeout") return "AI 响应超时。请重试，或在 AI 设置中选择更轻量的模型。";
  if (type === "auth_error") return "AI 服务认证失败。请在 AI 设置中检查 API Key。";
  if (type === "budget_exceeded") return "AI 服务账户余额不足或额度已用完。请检查服务商账户余额与额度后重试。";
  if (type === "validation_error") return "AI 服务不接受当前请求参数。请检查 API 地址与模型兼容性。";
  if (type === "output_incomplete") return "AI 回复达到输出上限，结果不完整。请减少本次输入，或选择支持更长输出的模型。";
  if (type === "generation_interrupted") return "AI 服务中断了生成，结果不完整。请稍后重试。";
  if (type === "content_policy") return "AI 服务过滤了本次回复。请检查输入内容后再试。";
  if (type === "invalid_response") return "AI 服务未返回有效回复。请检查 API 地址与接口格式，或稍后重试。";
  if (type === "model_unavailable") return "所选模型不可用。请在 AI 设置中检查模型名称。";
  if (type === "rate_limit") return "AI 服务请求过于频繁，请稍后重试。";
  if (type === "provider_unavailable") return "AI 服务暂时不可用，请检查服务是否启动后重试。";
  return String(error?.message || error || "AI 调用失败");
}
