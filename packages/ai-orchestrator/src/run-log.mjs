function cleanText(value) {
  return String(value || "").trim();
}

function generatedId(prefix = "run") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createInMemoryRunLog() {
  const runs = new Map();

  function getRun(id) {
    const run = runs.get(cleanText(id));
    if (!run) return null;
    return {
      ...run,
      events: run.events.map((event) => ({ ...event }))
    };
  }

  return {
    startRun(input = {}) {
      const id = cleanText(input.agentRunId || input.agent_run_id) || generatedId("run");
      const now = new Date().toISOString();
      const run = {
        agentRunId: id,
        taskId: cleanText(input.taskId || input.task_id),
        agentId: cleanText(input.agentId || input.agent_id),
        agentVersion: cleanText(input.agentVersion || input.agent_version) || "v1",
        trigger: cleanText(input.trigger) || "user_command",
        taskType: cleanText(input.taskType || input.task_type) || "reflection",
        status: "running",
        userMode: cleanText(input.userMode || input.user_mode) || "Auto",
        modelPack: cleanText(input.modelPack || input.model_pack) || "Starter Auto",
        privacyMode: cleanText(input.privacyMode || input.privacy_mode) || "normal",
        providerId: "",
        modelRef: "",
        modelTier: cleanText(input.modelTier || input.model_tier) || "standard",
        contextPackId: "",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: 0, currency: "USD" },
        artifactIds: [],
        events: [],
        error: null,
        startedAt: now,
        endedAt: null,
        createdAt: now
      };
      runs.set(id, run);
      return getRun(id);
    },
    addEvent(agentRunId, event = {}) {
      const id = cleanText(agentRunId);
      const run = runs.get(id);
      if (!run) throw new Error(`agentRunId not found: ${id}`);
      const next = {
        eventId: cleanText(event.eventId || event.event_id) || generatedId("evt"),
        eventType: cleanText(event.eventType || event.event_type) || "event",
        eventOrder: run.events.length + 1,
        status: cleanText(event.status) || "succeeded",
        summary: event.summary || {},
        usage: event.usage || null,
        error: event.error || null,
        createdAt: new Date().toISOString()
      };
      run.events.push(next);
      return { ...next };
    },
    finishRun(agentRunId, updates = {}) {
      const id = cleanText(agentRunId);
      const run = runs.get(id);
      if (!run) throw new Error(`agentRunId not found: ${id}`);
      Object.assign(run, {
        ...updates,
        status: cleanText(updates.status) || run.status,
        endedAt: cleanText(updates.endedAt || updates.ended_at) || new Date().toISOString()
      });
      return getRun(id);
    },
    getRun,
    listRuns() {
      return [...runs.values()].map((run) => getRun(run.agentRunId));
    }
  };
}
