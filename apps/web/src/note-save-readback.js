const uncertain = cause => Object.assign(new Error("保存结果尚未确认，修改仍保留。请检查本地服务和文件后再操作，不要重复覆盖。"), { code: "NOTE_SAVE_RESULT_UNCERTAIN", cause });
const validRevision = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export async function saveNoteWithReadback({ noteId, payload, write, check, operationId }) {
  try {
    const note = await write({ ...payload, operationId });
    if (note?.id === noteId && typeof note.body === "string" && validRevision(note.fileRevision)) return note;
    throw Object.assign(new Error("保存响应不完整"), { code: "NOTE_SAVE_RESPONSE_MISSING" });
  } catch (error) {
    if (!["api_unavailable", "request_timeout", "NOTE_SAVE_RESPONSE_MISSING"].includes(error?.code)) throw error;
    try {
      const result = await check(operationId);
      if (result?.state === "completed" && result.note?.id === noteId
        && typeof result.note.body === "string" && validRevision(result.fileRevision)
        && result.note.fileRevision === result.fileRevision) return result.note;
      if (result?.state === "changed") throw Object.assign(new Error("保存后笔记又发生变化，请保留当前修改并核对文件。"), { code: "NOTE_SAVE_CONFLICT" });
    } catch (verificationError) {
      if (verificationError?.code === "NOTE_SAVE_CONFLICT") throw verificationError;
      throw uncertain(verificationError);
    }
    throw uncertain(error);
  }
}
