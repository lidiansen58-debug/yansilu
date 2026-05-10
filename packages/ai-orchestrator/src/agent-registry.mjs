const DEFAULT_AGENTS = [
  {
    agentId: "reflection_agent",
    agentVersion: "v1",
    purpose: "Create high-signal reflection prompts from bounded note context.",
    defaultModelTier: "strong_reasoning",
    requiredCapabilities: ["structured_output"],
    allowedTools: ["create_ai_artifact"],
    outputArtifactTypes: ["ReflectionPrompt", "QuestionCard"],
    canRunInBackground: false,
    canWriteHumanNote: false
  },
  {
    agentId: "connection_agent",
    agentVersion: "v1",
    purpose: "Create candidate relationships among notes and sources.",
    defaultModelTier: "cheap_fast",
    requiredCapabilities: ["structured_output"],
    allowedTools: ["search_notes", "read_note", "create_link_suggestion", "create_ai_artifact"],
    outputArtifactTypes: ["LinkSuggestion", "ConflictSuggestion"],
    canRunInBackground: true,
    canWriteHumanNote: false
  }
];

function cleanText(value) {
  return String(value || "").trim();
}

export function normalizeAgentDefinition(input = {}) {
  const agentId = cleanText(input.agentId || input.agent_id);
  if (!agentId) throw new Error("agentId is required");

  const canWriteHumanNote = input.canWriteHumanNote === true || input.can_write_human_note === true;
  const allowedTools = Array.isArray(input.allowedTools || input.allowed_tools)
    ? [...(input.allowedTools || input.allowed_tools)]
    : [];

  if (canWriteHumanNote || allowedTools.includes("write_human_note")) {
    const error = new Error("AI agents cannot write human-authored notes in MVP");
    error.code = "AI_AGENT_WRITE_HUMAN_NOTE_FORBIDDEN";
    throw error;
  }

  return {
    agentId,
    agentVersion: cleanText(input.agentVersion || input.agent_version) || "v1",
    purpose: cleanText(input.purpose),
    defaultModelTier: cleanText(input.defaultModelTier || input.default_model_tier) || "standard",
    requiredCapabilities: Array.isArray(input.requiredCapabilities || input.required_capabilities)
      ? [...(input.requiredCapabilities || input.required_capabilities)]
      : [],
    allowedTools,
    outputArtifactTypes: Array.isArray(input.outputArtifactTypes || input.output_artifact_types)
      ? [...(input.outputArtifactTypes || input.output_artifact_types)]
      : [],
    canRunInBackground: input.canRunInBackground === true || input.can_run_in_background === true,
    canWriteHumanNote: false
  };
}

export function createAgentRegistry(definitions = DEFAULT_AGENTS) {
  const agents = new Map();
  for (const definition of definitions) {
    const normalized = normalizeAgentDefinition(definition);
    agents.set(normalized.agentId, normalized);
  }

  return {
    get(agentId) {
      const id = cleanText(agentId);
      const agent = agents.get(id);
      if (!agent) {
        const error = new Error(`agentId not found: ${id}`);
        error.code = "AI_AGENT_NOT_FOUND";
        throw error;
      }
      return agent;
    },
    list() {
      return [...agents.values()];
    }
  };
}

export const defaultAgentDefinitions = DEFAULT_AGENTS;
