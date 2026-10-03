const GUIDE_ID = "GUIDE-SHORT-PRACTICE";
const MATERIAL_ID = "LN-SHORT-PRACTICE";
const PROJECT_ID = "WRITE-SHORT-PRACTICE";
const questions = [
  ["PERM-PRACTICE-EXPLAIN", "我的观点：怎样检查理解", "用自己的话解释，为什么能检查理解？"],
  ["PERM-PRACTICE-REUSE", "我的观点：怎样留下可复用的笔记", "什么样的笔记，离开原材料以后还能使用？"],
  ["PERM-PRACTICE-WRITE", "我的观点：怎样让阅读帮助写作", "阅读时做什么，能让以后的写作更容易开始？"]
];

export function withShortSmartNotesPractice(fixture) {
  if (!String(fixture?.id || "").startsWith("demo-smart-notes-product-thinking")) return fixture;
  const sourceIds = ["LN-PARAPHRASE-IS-FIRST-CHECK", "LN-PERMANENT-NOTE-AS-OWNED-CLAIM", "LN-WRITING-AS-DAILY-PRACTICE"];
  const sources = sourceIds.map((id) => fixture.literature_notes?.find((note) => note.id === id));
  if (sources.some((note) => !note)) throw new Error("短练习缺少原有转述材料");
  const excerpts = sources.map((note) => {
    const paragraph = String(note.body || "").match(/## 我的转述\s*\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim();
    if (!paragraph) throw new Error(`短练习材料没有转述正文：${note.id}`);
    return { title: note.title, paragraph };
  });
  const reading = excerpts.map(({ paragraph }) => paragraph).join("\n\n");
  const materialTitle = "练习材料：让读书笔记帮助写作";
  const permanent = questions.map(([id, title, startingQuestion]) => ({
    id, title, note_type: "permanent", status: "draft", thesis: "", startingQuestion,
    distillation_status: "draft", originality_status: "needs_review",
    authorship: { user_confirmed: false, ai_assisted: false },
    tags: ["动手练习"],
    body: `# ${title}\n\n## 我想回答的问题\n${startingQuestion}\n\n## 阅读材料\n${reading}\n\n## 我的判断\n\n## 为什么\n\n## 适用条件\n\n## 来源\n[[${materialTitle}]]`
  }));
  const practice = {
    literature_notes: [{ id: MATERIAL_ID, title: materialTitle, note_type: "literature", status: "active", tags: ["动手练习"],
      body: `# ${materialTitle}\n\n## 转述\n${reading}\n\n## 来源\n以上来自现有 Demo 的原创转述，不是原书引文。\n\n${excerpts.map(({ title }) => `- [[${title}]]`).join("\n")}` }],
    permanent_notes: permanent,
    guide_notes: [{ id: GUIDE_ID, title: "00 动手练习：从材料写成短文", note_type: "guide", status: "active", tags: ["动手练习"],
      body: `# 00 动手练习：从材料写成短文\n\n围绕“怎样让读书笔记帮助写作”，留下三个自己的判断，再写成一篇短文。不需要 AI，也不必读完全部示例。\n\n先读[[${materialTitle}]]。每一步都从上方练习按钮进入，再操作和保存，进度才会推进；正文链接只用于阅读参考。\n\n1. 点上方“写下我的判断”，在“怎样检查理解”的“打磨笔记”中写自己的判断，点“保存当前观点”。\n2. 下一步再点上方“写下我的判断”，写下“怎样留下可复用的笔记”的判断并保存。\n3. 下一步再点上方“写下我的判断”，写下“怎样让阅读帮助写作”的判断并保存。补充说明和适用条件可按需填写。\n4. 点上方“打开并关联”，为前两条观点保存一句关系理由，例如解释“独立读懂”怎样帮助检查理解。正文链接和手动关联同样进入网络；类型拿不准时选“只是有关”。\n5. 点上方“查看短文提纲”，核对由三个判断组成的提纲和每节来源，开始写草稿，写一段自己的解释，再点“保存草稿”。\n6. 点上方“打开短文草稿”，在“更多”中选择“导出文章 .md”，选笔记库以外的目录，打开导出的文件核对正文。\n\n只有实际保存和导出才算完成。回到同一个笔记库可继续已完成的进度；继续这篇短文时打开已有提纲或草稿，不必重新创建。完整示例保留在“写作 Demo”中，示例观点不代表你的判断。` }],
    index_cards: [{ id: "INDEX-SHORT-PRACTICE", title: "怎样让读书笔记帮助写作", centralQuestion: "我怎样把读过的内容变成可检查、可复用的判断，并用于写作？", indexType: "topic", orderingStrategy: "manual", noteIds: permanent.map((note) => note.id), summary: "用自己的三个判断组织一篇短文。" }],
    writing_projects: [{ id: PROJECT_ID, title: "怎样让读书笔记帮助写作", goal: "用自己的判断，说明怎样检查理解、留下可复用笔记并开始写作。", target_reader: "刚开始整理读书笔记的人", basketNoteIds: permanent.map((note) => note.id), indexCardIds: ["INDEX-SHORT-PRACTICE"], deferScaffold: true }]
  };
  const result = { ...fixture };
  for (const [key, items] of Object.entries(practice)) result[key] = [...(fixture[key] || []), ...items];
  result.practiceGuideId = GUIDE_ID;
  result.practiceProjectId = PROJECT_ID;
  result.counts = { ...fixture.counts };
  for (const [key, items] of Object.entries(practice)) result.counts[key] = (Number(fixture.counts?.[key]) || 0) + items.length;
  return result;
}
