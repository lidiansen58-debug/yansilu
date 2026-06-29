export function systemMessageActionRoute(action = "") {
  const cleanAction = String(action || "").trim();
  if (cleanAction === "open-ai-inbox") return { kind: "ai-inbox", statusType: "ok", statusMessage: "已打开这条消息对应的待确认建议" };
  if (cleanAction === "open-settings-update") return { kind: "settings-update", statusType: "ok", statusMessage: "已打开版本更新设置。" };
  if (cleanAction === "open-note") return {
    kind: "note",
    successStatus: "已打开这条系统消息对应的笔记",
    failureStatus: "没有找到这条系统消息对应的笔记"
  };
  if (cleanAction === "open-note-workflow") return {
    kind: "workflow",
    successStatus: "已打开这条系统消息对应的后续操作",
    failureStatus: "没有找到这条系统消息对应的笔记"
  };
  if (cleanAction === "open-graph" || cleanAction === "open-writing") return {
    kind: "workflow-entry",
    successStatus: "已打开这条系统消息对应的入口",
    failureStatus: "没有找到这条系统消息对应的入口"
  };
  return { kind: "" };
}
