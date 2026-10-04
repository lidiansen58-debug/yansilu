// Keep provider-specific wire formats out of the generic adapter.
export function applyOpenAiCompatibleRequestProfile(body, { endpointUrl, purpose, output, localExecution } = {}) {
  let deepseek = false;
  try { deepseek = new URL(endpointUrl).hostname === "api.deepseek.com"; } catch {}
  const connectionTest = purpose === "test_chat" && localExecution !== true;
  if (connectionTest) {
    const requested = Number(body.max_tokens);
    body.max_tokens = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 256) : 256;
  }
  if (!deepseek) return body;
  const structured = ["json_schema", "json_object"].includes(body.response_format?.type)
    || purpose === "potential_relation_refine";
  const schema = body.response_format?.json_schema?.schema || output?.schema;
  if (structured) {
    body.response_format = { type: "json_object" };
    body.messages = [
      ...body.messages,
      { role: "system", content: schema
        ? `Return only a JSON object matching this JSON schema: ${JSON.stringify(schema)}`
        : "Return only a valid JSON object, without Markdown or commentary." }
    ];
  }
  // These short, bounded tasks need a final answer within the output budget.
  if (connectionTest || structured) {
    body.thinking = { type: "disabled" };
  }
  return body;
}
