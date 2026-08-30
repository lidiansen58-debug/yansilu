import { randomUUID } from "node:crypto";

const operationError = (code, message) => Object.assign(new Error(message), { code });

export function createNoteMoveOperations({ maxEntries = 10000 } = {}) {
  const instanceId = randomUUID();
  const operations = new Map();
  const validate = id => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""))) {
      throw operationError("NOTE_MOVE_OPERATION_INVALID", "无效的移动请求编号");
    }
  };
  const reserve = (id, record) => {
    if (operations.size >= maxEntries) throw operationError("NOTE_MOVE_TRACKER_FULL", "移动记录已满，请重启本地服务后重试。");
    operations.set(id, record);
    return record;
  };
  return {
    prepare(id, noteId) {
      validate(id);
      const record = operations.get(id) || reserve(id, { noteId, state: "ready" });
      if (record.noteId !== noteId) throw operationError("NOTE_MOVE_OPERATION_INVALID", "移动请求与笔记不匹配");
      return { instanceId, state: record.state };
    },
    async run(id, noteId, work, expectedInstanceId) {
      if (!id) return work();
      validate(id);
      if (expectedInstanceId !== instanceId) throw operationError("NOTE_MOVE_SERVICE_CHANGED", "本地服务已重启，本次移动请求不再执行，请核查笔记位置。");
      const previous = operations.get(id);
      if (previous && previous.state !== "ready") {
        if (previous.noteId !== noteId) throw operationError("NOTE_MOVE_OPERATION_INVALID", "移动请求与笔记不匹配");
        throw operationError(previous.state === "cancelled" ? "NOTE_MOVE_CANCELLED" : "NOTE_MOVE_ALREADY_STARTED",
          previous.state === "cancelled" ? "本次移动已取消，未修改笔记。" : "这次移动已经接收，请核查结果，不要重复提交。");
      }
      if (!previous || previous.noteId !== noteId) throw operationError("NOTE_MOVE_OPERATION_INVALID", "移动请求尚未准备或与笔记不匹配");
      const record = previous;
      record.state = "pending";
      try {
        const result = await work();
        record.state = "succeeded";
        return result;
      } catch (error) {
        record.state = "failed";
        record.error = { code: error?.code || "NOTE_MOVE_INVALID", message: String(error?.message || error), details: error?.details };
        throw error;
      }
    },
    check(id, noteId, expectedInstanceId) {
      validate(id);
      if (expectedInstanceId && expectedInstanceId !== instanceId) return { state: "interrupted" };
      // A check fences an undelivered request before reporting that it did not run.
      // Keep tombstones for this process lifetime so a delayed POST cannot revive it.
      const record = operations.get(id) || reserve(id, { noteId, state: "cancelled" });
      if (record.noteId !== noteId) throw operationError("NOTE_MOVE_OPERATION_INVALID", "移动请求与笔记不匹配");
      if (record.state === "ready") record.state = "cancelled";
      return { state: record.state, ...(record.error ? { error: record.error } : {}) };
    }
  };
}
