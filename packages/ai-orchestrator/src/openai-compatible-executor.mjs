function cleanText(value) {
  return String(value || "").trim();
}

function normalizeEndpointUrl(value = "") {
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

function normalizeHeaders(headers = {}) {
  const result = {};
  for (const [key, value] of Object.entries(headers || {})) {
    const name = cleanText(key);
    if (!name || value === undefined || value === null || value === "") continue;
    result[name.toLowerCase()] = String(value);
  }
  return result;
}

function requiresSecret(authMode = "") {
  return ["platform_managed", "workspace_managed", "byok_advanced", "enterprise_secret"].includes(cleanText(authMode));
}

async function resolveSecret(auth = {}, options = {}) {
  const authMode = cleanText(auth.authMode || auth.auth_mode);
  const secretRef = cleanText(auth.secretRef || auth.secret_ref || options.secretRef || options.secret_ref);
  if (!requiresSecret(authMode)) return "";

  if (typeof options.secretResolver === "function") {
    const value = await options.secretResolver({ secretRef, authMode, providerId: options.providerId, endpointUrl: options.endpointUrl });
    return cleanText(value);
  }

  const secrets = options.secrets || {};
  if (secretRef && secrets[secretRef]) return cleanText(secrets[secretRef]);

  if (secretRef.startsWith("env:")) {
    const envName = secretRef.slice(4);
    return cleanText(process.env[envName]);
  }

  return "";
}

function authHeaders(secret, auth = {}, options = {}) {
  if (!secret) return {};
  const headerName = cleanText(options.authHeaderName || options.auth_header_name) || "authorization";
  const authScheme = cleanText(options.authScheme || options.auth_scheme) || "Bearer";
  return {
    [headerName.toLowerCase()]: authScheme ? `${authScheme} ${secret}` : secret
  };
}

export async function buildOpenAiCompatibleFetchRequest(compatibleRequest = {}, options = {}) {
  const endpointUrl = normalizeEndpointUrl(options.endpointUrl || options.endpoint_url || compatibleRequest.endpointUrl);
  const method = cleanText(compatibleRequest.method) || "POST";
  const auth = {
    ...(compatibleRequest.auth || {}),
    authMode: cleanText(options.authMode || options.auth_mode || compatibleRequest.auth?.authMode),
    secretRef: cleanText(options.secretRef || options.secret_ref || compatibleRequest.auth?.secretRef)
  };
  const secret = await resolveSecret(auth, {
    ...options,
    providerId: compatibleRequest.metadata?.providerId,
    endpointUrl
  });

  if (requiresSecret(auth.authMode) && !secret) {
    const error = new Error("Provider secret is not configured.");
    error.status = 401;
    error.code = "missing_secret";
    throw error;
  }

  const headers = {
    ...normalizeHeaders(compatibleRequest.headers),
    ...normalizeHeaders(options.headers),
    ...normalizeHeaders(options.extraHeaders || options.extra_headers),
    ...authHeaders(secret, auth, options)
  };

  return {
    url: endpointUrl,
    init: {
      method,
      headers,
      body: JSON.stringify(compatibleRequest.body || {})
    },
    metadata: {
      ...compatibleRequest.metadata,
      authMode: auth.authMode,
      secretRef: auth.secretRef,
      secretConfigured: Boolean(secret)
    }
  };
}

async function responseJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text } };
  }
}

function providerRequestId(response) {
  if (!response?.headers || typeof response.headers.get !== "function") return "";
  return cleanText(response.headers.get("x-request-id") || response.headers.get("x-openai-request-id") || response.headers.get("cf-ray"));
}

export function createOpenAiCompatibleExecutor(options = {}) {
  return async function executeOpenAiCompatibleRequest(compatibleRequest = {}) {
    if (options.networkEnabled !== true && options.network_enabled !== true) {
      const error = new Error("OpenAI-compatible network execution is disabled.");
      error.status = 0;
      error.code = "network_disabled";
      throw error;
    }

    const fetchImpl = options.fetchImpl || options.fetch_impl || globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      const error = new Error("No fetch implementation is available for provider execution.");
      error.status = 0;
      error.code = "fetch_unavailable";
      throw error;
    }

    const fetchRequest = await buildOpenAiCompatibleFetchRequest(compatibleRequest, options);
    const response = await fetchImpl(fetchRequest.url, fetchRequest.init);
    const json = await responseJson(response);

    if (!response.ok) {
      const error = new Error(cleanText(json.error?.message || json.message) || "Provider request failed.");
      error.status = Number(response.status || 0);
      error.code = cleanText(json.error?.code || json.error?.type || json.code) || "provider_http_error";
      error.providerRequestId = providerRequestId(response);
      throw error;
    }

    return json;
  };
}
