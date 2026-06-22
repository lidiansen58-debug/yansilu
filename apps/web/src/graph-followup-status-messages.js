export function graphFollowupOpenedNoteStatus({ action = "" } = {}) {
  const cleanAction = String(action || "").trim().toLowerCase();
  if (cleanAction === "relations-edit") return { message: "已从图谱打开笔记，继续完善当前关系说明", tone: "ok" };
  if (cleanAction === "bridge") return { message: "已从图谱打开笔记，继续建立桥接关联", tone: "ok" };
  if (cleanAction === "relations") return { message: "已从图谱打开笔记，继续写关系说明", tone: "ok" };
  if (cleanAction === "isolate-keep") return { message: "已打开笔记，请在边界里写下为什么暂时保持独立", tone: "ok" };
  if (cleanAction === "isolate-hold") return { message: "已打开笔记，请先写下暂存观察说明", tone: "warn" };
  if (cleanAction === "boundary" || cleanAction === "tension") {
    return { message: "已从图谱打开笔记，继续补反例、边界或例外条件", tone: "ok" };
  }
  return { message: "已从图谱打开笔记", tone: "ok" };
}
