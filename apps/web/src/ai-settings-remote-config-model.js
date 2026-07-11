const REMOTE_API_KEY_SECRET_REF = "local:settings-remote-api-key";

function cleanText(value = "") {
  return String(value || "").trim();
}

export function remoteApiKeySecretRef() {
  return REMOTE_API_KEY_SECRET_REF;
}

export function normalizeOpenAiCompatibleBaseUrl(value = "") {
  const text = cleanText(value).replace(/\/+$/, "");
  if (!text) return "";
  try {
    const url = new URL(text);
    const pathname = url.pathname.replace(/\/+$/, "");
    if (/\/chat\/completions$/i.test(pathname)) return url.toString().replace(/\/+$/, "");
    url.pathname = `${pathname || ""}/chat/completions`.replace(/\/{2,}/g, "/");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return text;
  }
}

export function displayOpenAiCompatibleBaseUrl(value = "") {
  const text = cleanText(value).replace(/\/+$/, "");
  if (!text) return "";
  try {
    const url = new URL(text);
    url.pathname = url.pathname.replace(/\/chat\/completions\/?$/i, "") || "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return text.replace(/\/chat\/completions\/?$/i, "");
  }
}

export function apiKeyPreview(value = "") {
  const text = cleanText(value);
  if (!text) return "";
  if (text.length <= 8) return "已填写";
  return `${text.slice(0, 3)}...${text.slice(-4)}`;
}

export function remoteSecretsForPayload(aiState = {}) {
  const apiKey = cleanText(aiState.remoteApiKey);
  return apiKey
    ? {
        [REMOTE_API_KEY_SECRET_REF]: apiKey
      }
    : {};
}

export function remoteDeletedSecretsForPayload(aiState = {}) {
  const apiKey = cleanText(aiState.remoteApiKey);
  const draftTouched = aiState.providerDraftTouched || {};
  return !apiKey && draftTouched.secretRef ? [REMOTE_API_KEY_SECRET_REF] : [];
}

export function remoteSecretRefForState(aiState = {}) {
  return cleanText(aiState.remoteApiKey) ? REMOTE_API_KEY_SECRET_REF : cleanText(aiState.secretRef);
}
