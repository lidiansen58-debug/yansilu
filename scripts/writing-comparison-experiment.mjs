export function buildComparisonExperiment(request) {
  const payload = JSON.parse(request.messages[1].content);
  const sections = payload.currentOutline.sections;
  const notes = new Map(payload.notes.map(note => [note.noteId, note]));
  const tasks = [];
  for (const section of sections) {
    const sources = section.sourceNoteIds.map(id => notes.get(id)).filter(Boolean);
    if (sources.length) tasks.push({ id: `source-${section.sectionNumber}`, type: "source",
      section, sources });
  }
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      tasks.push({ id: `pair-${i + 1}-${j + 1}`, type: "pair", sections: [sections[i], sections[j]] });
    }
  }
  return {
    tasks,
    messages: [
      { role: "system", content: "逐项比较给定判断，不改写文章。source 任务：章节观点与来源明确相反才是 conflict，否则 compatible。pair 任务：两节重复同一判断或步骤且无新增作用才是 duplicate；不同方法、总览与展开、相反观点均为 distinct。只输出 JSON，judgments 数组必须为每个任务提供 id、relation、reason。conflict 另填 sourceNoteId；duplicate 另填 sharedClaim，写完整共同判断。reason 必须解释具体的判断，不可照抄规则。" },
      { role: "user", content: JSON.stringify({ tasks: tasks.map(task => task.type === "source"
        ? { id: task.id, type: task.type, chapter: { heading: task.section.heading, claim: task.section.purpose }, sources: task.sources.map(note => ({ noteId: note.noteId, text: note.excerpt })) }
        : { id: task.id, type: task.type, chapters: task.sections.map(section => ({ heading: section.heading, claim: section.purpose })) }) }) }
    ]
  };
}

export function comparisonExperimentChecks(experiment, parsed) {
  if (!Array.isArray(parsed?.judgments) || parsed.judgments.length !== experiment.tasks.length) throw new Error("Comparison experiment omitted a task");
  const judgments = new Map();
  for (const item of parsed.judgments) {
    if (judgments.has(item?.id) || typeof item?.reason !== "string" || !item.reason.trim()) throw new Error("Comparison experiment returned invalid judgment");
    judgments.set(item.id, item);
  }
  const checks = [];
  for (const task of experiment.tasks) {
    const judgment = judgments.get(task.id);
    const allowed = task.type === "source" ? ["conflict", "compatible"] : ["duplicate", "distinct"];
    if (!judgment || !allowed.includes(judgment.relation)) throw new Error("Comparison experiment returned wrong task relation");
    if (judgment.relation === "conflict") {
      const source = task.sources.find(note => note.noteId === judgment.sourceNoteId);
      if (!source) throw new Error("Comparison experiment invented conflict source");
      checks.push({ kind: "contradiction", sectionNumbers: [task.section.sectionNumber], problem: judgment.reason,
        action: "核对本节判断与来源，修正冲突处。", sourceNoteIds: [source.noteId], evidenceQuote: source.excerpt });
    } else if (judgment.relation === "duplicate") {
      if (typeof judgment.sharedClaim !== "string" || !judgment.sharedClaim.trim()) throw new Error("Comparison experiment omitted shared claim");
      checks.push({ kind: "repetition", sectionNumbers: task.sections.map(section => section.sectionNumber),
        problem: judgment.reason, action: "合并重复判断，保留各节新增的内容。", sourceNoteIds: [], repeatedClaim: judgment.sharedClaim,
        sectionEvidence: task.sections.map(section => ({ sectionNumber: section.sectionNumber, quote: section.purpose || section.heading })) });
    }
  }
  return { checks };
}

export function isolatedComparisonTasks(experiment) {
  return experiment.tasks.flatMap(task => task.type === "source"
    ? task.sources.map((source, index) => ({ ...task, id: `${task.id}-${index}`, sources: [source] }))
    : [task]);
}

export function isolatedComparisonMessages(task) {
  return [
    { role: "system", content: task.type === "source"
      ? "核对一个待检验判断与一条来源原文。判断与来源明确相反返回 conflict，否则 compatible。只输出 JSON，必填 relation 和 reason。reason 解释判断与来源的具体差异；不得把待检验判断当来源。"
      : "比较两节是否重复同一判断或步骤而无新增作用。重复返回 duplicate，否则 distinct。不同方法、总览与展开、相反观点不算重复。只输出 JSON，必填 relation 和 reason；duplicate 另填 sharedClaim，写共同的完整判断或步骤。" },
    { role: "user", content: JSON.stringify(task.type === "source"
      ? { claimToVerify: { heading: task.section.heading, claim: task.section.purpose }, sourceText: task.sources[0].excerpt }
      : { chapterA: { heading: task.sections[0].heading, claim: task.sections[0].purpose }, chapterB: { heading: task.sections[1].heading, claim: task.sections[1].purpose } }) }
  ];
}
