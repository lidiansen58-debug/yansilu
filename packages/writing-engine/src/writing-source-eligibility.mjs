export function assertWritingSourcesEligible(notes = []) {
  for (const note of notes) {
    const reason = !note.authorship?.user_confirmed
      ? "这条永久笔记还没完成作者确认。"
      : note.status !== "active"
        ? "这条永久笔记还未通过原创性检查，请检查后再加入写作。"
        : "";
    if (reason) throw new Error(`“${note.title || "来源笔记"}”：${reason} 请在“相关笔记”中处理后重试。`);
  }
}
