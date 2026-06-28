export function readStoredSystemMessagesForRuntime(deps = {}) {
  const {
    storage = null,
    key = "",
    limit = 50,
    normalizeSystemMessage = (message) => message
  } = deps;
  try {
    const raw = storage?.getItem?.(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSystemMessage).slice(0, limit);
  } catch {
    return [];
  }
}

export function persistSystemMessagesForRuntime(messages = [], deps = {}) {
  const {
    storage = null,
    key = "",
    limit = 50
  } = deps;
  try {
    storage?.setItem?.(key, JSON.stringify((Array.isArray(messages) ? messages : []).slice(0, limit)));
    return true;
  } catch {
    return false;
  }
}
