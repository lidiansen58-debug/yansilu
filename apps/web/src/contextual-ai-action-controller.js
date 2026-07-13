import {
  CONTEXTUAL_AI_ACTION_STATUS,
  contextualAiActionMeta,
  createContextualAiActionState,
  normalizeContextualAiResult
} from "./contextual-ai-action-model.js";

export function createContextualAiActionController(deps = {}) {
  const states = new Map();

  function stateFor(actionId) {
    if (!states.has(actionId)) states.set(actionId, createContextualAiActionState(actionId));
    return states.get(actionId);
  }

  async function run(actionId, context = {}, runner = async () => null) {
    const meta = contextualAiActionMeta(actionId);
    if (!meta) throw new Error(`Unknown contextual AI action: ${actionId}`);
    const state = stateFor(actionId);
    state.status = CONTEXTUAL_AI_ACTION_STATUS.checking;
    state.error = "";
    state.returnContext = context.returnContext || null;
    deps.onChange?.(state);

    const availability = await (deps.ensureAvailable?.({ actionId, context }) || { ready: true, mode: "local" });
    if (availability?.ready === false) {
      state.status = CONTEXTUAL_AI_ACTION_STATUS.needs_setup;
      deps.onChange?.(state);
      await deps.openEnableFlow?.({ actionId, context, returnContext: state.returnContext });
      return state;
    }

    if (availability.mode === "remote" && context.remoteConfirmed !== true && state.remoteConfirmed !== true) {
      const confirmed = await deps.confirmRemoteContent?.({ actionId, context });
      if (confirmed !== true) {
        state.status = CONTEXTUAL_AI_ACTION_STATUS.needs_remote_confirmation;
        deps.onChange?.(state);
        return state;
      }
      state.remoteConfirmed = true;
    }

    state.status = CONTEXTUAL_AI_ACTION_STATUS.running;
    deps.onChange?.(state);
    try {
      state.result = normalizeContextualAiResult(await runner({ actionId, context }), { kind: meta.resultKind, context });
      state.status = CONTEXTUAL_AI_ACTION_STATUS.awaiting_confirmation;
      deps.onChange?.(state);
    } catch (error) {
      state.status = CONTEXTUAL_AI_ACTION_STATUS.failed;
      state.error = String(error?.message || error || "AI 操作失败");
      deps.onChange?.(state);
    }
    return state;
  }

  async function adopt(actionId, input = {}) {
    const state = stateFor(actionId);
    if (state.status !== CONTEXTUAL_AI_ACTION_STATUS.awaiting_confirmation || !state.result) return state;
    await deps.onAccept?.({ actionId, result: state.result, input, context: state.returnContext });
    state.status = CONTEXTUAL_AI_ACTION_STATUS.adopted;
    deps.onChange?.(state);
    return state;
  }

  async function ignore(actionId) {
    const state = stateFor(actionId);
    if (!state.result && ![
      CONTEXTUAL_AI_ACTION_STATUS.needs_remote_confirmation,
      CONTEXTUAL_AI_ACTION_STATUS.needs_setup,
      CONTEXTUAL_AI_ACTION_STATUS.failed
    ].includes(state.status)) return state;
    const ignoreResult = await deps.onIgnore?.({ actionId, result: state.result, context: state.returnContext, status: state.status });
    if (ignoreResult?.clear === true) {
      states.set(actionId, createContextualAiActionState(actionId));
      const nextState = stateFor(actionId);
      deps.onChange?.(nextState);
      return nextState;
    }
    state.status = CONTEXTUAL_AI_ACTION_STATUS.ignored;
    deps.onChange?.(state);
    return state;
  }

  return { run, adopt, ignore, stateFor };
}
