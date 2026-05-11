function cleanText(value) {
  return String(value || "").trim();
}

const FORBIDDEN_MVP_TOOLS = new Set(["write_human_note"]);
const BACKGROUND_TRIGGERS = new Set(["background", "scheduled", "scheduled_task", "heartbeat", "cron"]);
const SENSITIVE_PRIVACY_MODES = new Set(["private_project", "local_only", "enterprise_restricted"]);

function normalizeDataBoundary(input) {
  const value = cleanText(input).toLowerCase();
  if (["local", "workspace", "external", "cloud"].includes(value)) return value;
  return "local";
}

function normalizeToolParameters(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  return JSON.parse(JSON.stringify(input));
}

function isBackgroundContext(context = {}) {
  const trigger = cleanText(context.trigger || context.triggerType || context.trigger_type).toLowerCase();
  return context.background === true || BACKGROUND_TRIGGERS.has(trigger);
}

function assertToolAllowed(tool, context = {}) {
  const privacyMode = cleanText(context.privacyMode || context.privacy_mode || context.contextPack?.privacy?.mode) || "normal";

  if (privacyMode === "local_only" && (tool.requiresCloud || tool.requiresNetwork || ["external", "cloud"].includes(tool.dataBoundary))) {
    const error = new Error(`tool is not allowed for local_only privacy mode: ${tool.name}`);
    error.code = "AI_TOOL_PRIVACY_BLOCKED";
    throw error;
  }

  if (isBackgroundContext(context) && tool.permissionLevel === "read_note" && SENSITIVE_PRIVACY_MODES.has(privacyMode)) {
    const error = new Error(`background runs cannot read full notes in ${privacyMode} mode without explicit approval`);
    error.code = "AI_TOOL_BACKGROUND_READ_NOTE_BLOCKED";
    throw error;
  }
}

export function normalizeToolDefinition(input = {}) {
  const name = cleanText(input.name);
  if (!name) throw new Error("tool name is required");
  if (FORBIDDEN_MVP_TOOLS.has(name)) {
    const error = new Error("write_human_note is forbidden for AI tools in MVP");
    error.code = "AI_TOOL_WRITE_HUMAN_NOTE_FORBIDDEN";
    throw error;
  }
  if (typeof input.handler !== "function") {
    const error = new Error(`tool handler is required: ${name}`);
    error.code = "AI_TOOL_HANDLER_REQUIRED";
    throw error;
  }
  return {
    name,
    description: cleanText(input.description),
    permissionLevel: cleanText(input.permissionLevel || input.permission_level) || "read_public",
    dataBoundary: normalizeDataBoundary(input.dataBoundary || input.data_boundary),
    requiresNetwork: input.requiresNetwork === true || input.requires_network === true,
    requiresCloud: input.requiresCloud === true || input.requires_cloud === true,
    parameters: normalizeToolParameters(input.parameters || input.inputSchema || input.input_schema),
    handler: input.handler
  };
}

export function createToolRegistry(definitions = []) {
  const tools = new Map();
  for (const definition of definitions) {
    const tool = normalizeToolDefinition(definition);
    tools.set(tool.name, tool);
  }

  return {
    has(name) {
      return tools.has(cleanText(name));
    },
    get(name) {
      const toolName = cleanText(name);
      const tool = tools.get(toolName);
      if (!tool) {
        const error = new Error(`tool not found: ${toolName}`);
        error.code = "AI_TOOL_NOT_FOUND";
        throw error;
      }
      return tool;
    },
    list() {
      return [...tools.values()].map(({ handler, ...tool }) => tool);
    },
    async call(name, input = {}, context = {}) {
      const tool = this.get(name);
      const startedAt = Date.now();
      try {
        assertToolAllowed(tool, context);
        const output = await tool.handler(input, context);
        return {
          toolName: tool.name,
          permissionLevel: tool.permissionLevel,
          dataBoundary: tool.dataBoundary,
          status: "succeeded",
          input,
          output,
          durationMs: Date.now() - startedAt
        };
      } catch (error) {
        return {
          toolName: tool.name,
          permissionLevel: tool.permissionLevel,
          dataBoundary: tool.dataBoundary,
          status: "failed",
          input,
          output: null,
          durationMs: Date.now() - startedAt,
          error: {
            errorType: error?.code || "AI_TOOL_CALL_FAILED",
            message: String(error?.message || error)
          }
        };
      }
    }
  };
}
