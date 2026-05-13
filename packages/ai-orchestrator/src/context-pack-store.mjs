function cleanText(value) {
  return String(value || "").trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeLimit(value) {
  const limit = Number(value || 50);
  if (!Number.isFinite(limit)) return 50;
  return Math.max(1, Math.min(200, Math.floor(limit)));
}

function contextPackId(input = {}) {
  return cleanText(input.contextPackId || input.context_pack_id || input.id);
}

function matchesFilter(contextPack = {}, filter = {}) {
  const agentRunId = cleanText(filter.agentRunId || filter.agent_run_id);
  const taskId = cleanText(filter.taskId || filter.task_id);
  const privacyMode = cleanText(filter.privacyMode || filter.privacy_mode);

  if (agentRunId && contextPack.agentRunId !== agentRunId) return false;
  if (taskId && contextPack.taskId !== taskId) return false;
  if (privacyMode && contextPack.privacy?.mode !== privacyMode) return false;
  return true;
}

export function createInMemoryContextPackStore() {
  const contextPacks = new Map();

  function getContextPack(id) {
    const contextPack = contextPacks.get(cleanText(id));
    return contextPack ? clone(contextPack) : null;
  }

  return {
    createContextPack(contextPack = {}) {
      const id = contextPackId(contextPack);
      if (!id) {
        const error = new Error("contextPackId is required");
        error.code = "AI_CONTEXT_PACK_ID_REQUIRED";
        throw error;
      }
      if (contextPacks.has(id)) {
        const error = new Error(`contextPackId already exists: ${id}`);
        error.code = "AI_CONTEXT_PACK_ALREADY_EXISTS";
        throw error;
      }
      contextPacks.set(id, clone(contextPack));
      return getContextPack(id);
    },
    getContextPack,
    listContextPacks(filter = {}) {
      return [...contextPacks.values()]
        .filter((contextPack) => matchesFilter(contextPack, filter))
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
        .slice(0, normalizeLimit(filter.limit))
        .map(clone);
    },
    countContextPacks(filter = {}) {
      return [...contextPacks.values()].filter((contextPack) => matchesFilter(contextPack, filter)).length;
    },
    close() {}
  };
}
