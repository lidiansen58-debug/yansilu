export function localAiPreviewOptionsForAction(action = "") {
  const value = String(action || "").trim();
  if ([
    "settings_quick_setup",
    "settings_refresh",
    "runtime_mode_change",
    "graph_module_open",
    "graph_analysis",
    "graph_connect",
    "theme_index",
    "note_analysis",
    "writing_check",
    "ai_summary"
  ].includes(value)) {
    return { silent: true, render: false };
  }
  return {};
}

export function localAiGraphActionRequiresReady(action = "") {
  return ["graph_analysis", "graph_connect"].includes(String(action || "").trim());
}

export function ollamaStopRuntimeUiOutcome(result = {}, runtime = result?.runtime || {}) {
  const stopStatus = String(result?.status || "").trim();
  const remainingManagedPids = Array.isArray(result?.remainingManagedPids || result?.remaining_managed_pids)
    ? (result.remainingManagedPids || result.remaining_managed_pids)
    : [];
  const managedStopPending = stopStatus === "stopping" || remainingManagedPids.length > 0;
  if (stopStatus === "manual_stop_required") {
    return {
      status: "manual_stop_required",
      managedStopPending: false,
      clearModels: false,
      error: String(result?.message || "manual stop required").trim(),
      messageKind: "manual_stop_required",
      tone: "warn"
    };
  }
  if (stopStatus === "stopped") {
    return {
      status: "stopped",
      managedStopPending: false,
      clearModels: true,
      error: "",
      messageKind: "stopped",
      tone: "ok"
    };
  }
  if (stopStatus === "stopping") {
    return {
      status: "stopping",
      managedStopPending: true,
      clearModels: false,
      error: String(result?.message || "waiting for local AI process to exit").trim(),
      messageKind: "stopping",
      tone: "warn"
    };
  }
  if (runtime?.status === "unavailable") {
    return {
      status: "stopped",
      managedStopPending: false,
      clearModels: true,
      error: "",
      messageKind: "stopped",
      tone: "ok"
    };
  }
  return {
    status: "still_available",
    managedStopPending,
    clearModels: false,
    error: String(result?.message || runtime?.message || "local AI is still reachable").trim(),
    messageKind: "still_available",
    tone: "warn"
  };
}
