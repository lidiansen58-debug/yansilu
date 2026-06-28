import { uniqueStrings } from "./prototype-collection-utils.js";

export function buildWritingPanelState({
  appState = {},
  writingState = {},
  selectedNote = null,
  scopeFolder = null,
  scopeRoot = null,
  allCandidates = [],
  basketEntries = [],
  basketIds = [],
  sourceIndexSummary = ""
} = {}, deps = {}) {
  const {
    planWritingCandidateFocus = ({ candidateNoteIds = [] } = {}) => ({ noteIds: candidateNoteIds, usingFocusedScope: false, scopeLabel: "", addActionLabel: "" }),
    writingKnownNoteById = () => null,
    isWritingEligibleNote = () => true,
    parseWritingBasketIds = () => basketIds,
    writingRelationCountsReady = () => false,
    writingRelationCountsErrored = () => false,
    deriveBasketWritingReadiness = () => ({ level: "", status: "", hint: "" }),
    describeWritingProjectEntryState = () => ({ status: "", hint: "", canCreateProject: false, actionLabel: "" }),
    describeWritingProjectPreflight = () => ({ level: "", status: "", hint: "" }),
    isWritingStrongModelReady = () => false,
    describeWritingStrongModelStatus = () => ({ status: "", hint: "", buttonLabel: "" }),
    currentWritingContinuationEntry = () => null,
    writingOpenDraftButtonState = () => ({ disabled: true, text: "" }),
    writingScaffoldButtonState = () => ({ disabled: true, text: "" }),
    writingStrongModelButtonState = () => ({ disabled: true, text: "" })
  } = deps;

  const candidateFocusSourceIds = uniqueStrings([
    ...allCandidates.map((entry) => entry?.id).filter(Boolean),
    ...(Array.isArray(writingState.focusedCandidateNoteIds) ? writingState.focusedCandidateNoteIds : [])
  ]);
  const candidateFocusPlan = planWritingCandidateFocus({
    candidateNoteIds: candidateFocusSourceIds,
    focusedNoteIds: writingState.focusedCandidateNoteIds,
    focusedScopeLabel: writingState.focusedCandidateScopeLabel || "当前图谱切片"
  });
  const candidateEntriesById = new Map(allCandidates.map((entry) => [entry.id, entry]));
  const candidates = candidateFocusPlan.usingFocusedScope
    ? candidateFocusPlan.noteIds
        .map((id) => writingKnownNoteById(id) || null)
        .filter((entry) => Boolean(entry) && isWritingEligibleNote(entry))
    : candidateFocusPlan.noteIds.map((id) => candidateEntriesById.get(id) || null).filter(Boolean);
  const resolvedBasketIds = parseWritingBasketIds();
  const relationCountsReady =
    writingRelationCountsReady(resolvedBasketIds, writingState.relationCounts || {}) && !writingState.loadingRelationCounts;
  const relationCountsErrored = writingRelationCountsErrored(resolvedBasketIds, writingState.relationCountErrors || {});
  const basketReadiness = deriveBasketWritingReadiness(resolvedBasketIds, writingKnownNoteById, writingState.relationCounts || {}, {
    relationState: relationCountsErrored ? "error" : relationCountsReady ? "loaded" : "loading"
  });
  const hasProject = Boolean(writingState.project?.id);
  const hasScaffold = Boolean(writingState.scaffold?.id || writingState.project?.scaffold_id);
  const hasDraft = Boolean(writingState.project?.draft_note_id);
  const projectEntry = describeWritingProjectEntryState({
    relationCountsReady,
    relationCountsErrored,
    readinessLevel: basketReadiness.level,
    readinessHint: basketReadiness.hint
  });
  const projectPreflightSummary = describeWritingProjectPreflight(writingState.project?.preflight || null);
  const strongModelReady =
    !relationCountsErrored &&
    relationCountsReady &&
    isWritingStrongModelReady({
      readinessLevel: basketReadiness.level,
      projectPreflightLevel: projectPreflightSummary.level
    });
  const strongModelState = describeWritingStrongModelStatus({
    hasProject,
    relationCountsReady,
    relationCountsErrored,
    readinessLevel: basketReadiness.level,
    readinessHint: basketReadiness.hint,
    projectEntryProjectId: hasProject ? "" : String(projectEntry?.projectId || "").trim(),
    projectEntryActionLabel: hasProject ? "" : String(projectEntry?.actionLabel || "").trim(),
    projectPreflightLevel: projectPreflightSummary.level,
    projectPreflightChecksLength: Array.isArray(writingState.project?.preflight?.checks) ? writingState.project.preflight.checks.length : 0,
    strongModelReady
  });
  const draftContinuation = !hasDraft ? currentWritingContinuationEntry("当前写作篮") : null;
  const openDraftButtonState = writingOpenDraftButtonState({ hasDraft, draftContinuation });
  const scaffoldButtonState = writingScaffoldButtonState({
    hasProject,
    projectPreflightLevel: projectPreflightSummary.level,
    projectEntry
  });
  const strongModelButtonState = writingStrongModelButtonState({
    basketCount: resolvedBasketIds.length,
    loading: writingState.strongModelLoading,
    strongModelReady,
    stateButtonLabel: strongModelState.buttonLabel
  });
  const basketMetricTone = basketEntries.length
    ? relationCountsErrored
      ? "warn"
      : relationCountsReady && (basketReadiness.level === "project_ready" || basketReadiness.level === "strong_model_ready")
        ? "good"
        : "warn"
    : "";
  const projectMetricTone = hasProject || (!hasProject && projectEntry?.projectId) ? "good" : "warn";
  const projectMetricValue = hasProject
    ? writingState.project.id
    : projectEntry?.projectId
      ? projectEntry.status
      : "未创建";
  const projectMetricNote = hasProject
    ? projectPreflightSummary.level === "ready"
      ? "项目条件已齐"
      : projectPreflightSummary.status
    : projectEntry?.actionLabel || "等待创建";
  const draftMetricValue = hasDraft ? "已绑定" : hasScaffold ? "待保存" : "未保存";
  const draftMetricNote = hasDraft
    ? writingState.project?.draft_note?.title || writingState.project?.draft_note_id || "当前草稿可打开"
    : hasScaffold
      ? "确认缺口后保存草稿"
      : "先生成草稿骨架";
  const scopeLabel = `${scopeRoot?.name || "永久笔记"} / ${scopeFolder?.name || "当前目录"}`;

  return {
    selectedNote,
    currentLabel: selectedNote ? `${selectedNote.title} (${selectedNote.id})` : "尚未选择",
    scopeFolder,
    scopeRoot,
    scopeLabel,
    sourceIndexSummary,
    candidateFocusPlan,
    candidates,
    basketEntries,
    basketIds: resolvedBasketIds,
    relationCountsReady,
    relationCountsErrored,
    basketReadiness,
    hasProject,
    hasScaffold,
    hasDraft,
    projectEntry,
    projectPreflightSummary,
    strongModelReady,
    strongModelState,
    openDraftButtonState,
    scaffoldButtonState,
    strongModelButtonState,
    toplineMetrics: [
      {
        label: "写作篮",
        value: basketEntries.length ? `${basketEntries.length} 条` : "0 条",
        note: basketEntries.length ? (hasProject ? "材料就绪" : basketReadiness.status) : "先选择材料",
        tone: basketMetricTone
      },
      {
        label: "项目",
        value: projectMetricValue,
        note: projectMetricNote,
        tone: projectMetricTone
      },
      {
        label: "草稿",
        value: draftMetricValue,
        note: draftMetricNote,
        tone: hasDraft ? "good" : hasScaffold ? "warn" : ""
      }
    ]
  };
}

export function normalizeWritingProjectTitleSeed(title = "") {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return "未命名项目";
  if (cleanTitle.endsWith("写作项目")) return `${cleanTitle.slice(0, -"写作项目".length).trim()} 项目`.trim();
  if (cleanTitle.endsWith("项目")) return cleanTitle;
  return `${cleanTitle} 项目`;
}

export function suggestedWritingProjectTitle(noteIds = [], { noteById = () => null } = {}) {
  const notes = noteIds.map((id) => noteById(id)).filter(Boolean);
  if (notes.length === 1) return normalizeWritingProjectTitleSeed(notes[0].title || notes[0].id);
  const first = notes[0];
  if (first?.title) return normalizeWritingProjectTitleSeed(`${first.title} 等 ${notes.length} 条笔记`);
  return `导入笔记项目 ${noteIds.length}`;
}

export function writingThemeLabels(notes = [], { parseTags = () => [] } = {}) {
  const tags = [...new Set(
    notes
      .flatMap((note) => {
        if (Array.isArray(note.tags) && note.tags.length) return note.tags;
        return parseTags(String(note.body || ""));
      })
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
  )];
  if (tags.length) return tags;
  return [...new Set(notes.map((note) => String(note.title || "").trim()).filter(Boolean))];
}

export function writingThemeSummary(notes = [], deps = {}) {
  const labels = writingThemeLabels(notes, deps);
  if (!labels.length) return "\u8fd8\u6ca1\u6709\u6d6e\u73b0\u51fa\u53ef\u8fdb\u5165\u5199\u4f5c\u7684\u4e3b\u9898";
  const preview = labels.slice(0, 3).join("、");
  return `\u53ef\u8fdb\u5165\u5199\u4f5c\u7684\u4e3b\u9898\u7ea6 ${labels.length} \u4e2a${preview ? `\uff1a${preview}${labels.length > 3 ? " \u7b49" : ""}` : ""}`;
}

export function writingSourceIndexSummary(sourceIndexIds = [], { themeIndexById = () => null } = {}) {
  const sourceIds = uniqueStrings(sourceIndexIds);
  if (!sourceIds.length) return "";
  const titles = sourceIds.map((id) => themeIndexById(id)?.title || id).filter(Boolean);
  const preview = titles.slice(0, 2).join("、");
  return `主题入口：${preview}${titles.length > 2 ? " 等" : ""}`;
}

export function suggestedThemeIndexTitle(noteIds = [], { noteById = () => null, parseTags = () => [] } = {}) {
  const notes = noteIds.map((id) => noteById(id)).filter(Boolean);
  const labels = writingThemeLabels(notes, { parseTags });
  if (labels.length) return `${labels[0]} 主题索引`;
  const first = notes[0];
  if (first?.title) return `${first.title} 主题索引`;
  return "新的主题索引";
}

export function writingBookPlainText(note) {
  return uniqueStrings([
    note?.title,
    note?.thesis,
    ...(Array.isArray(note?.threeLineSummary) ? note.threeLineSummary : []),
    note?.boundaryOrCounterpoint,
    note?.boundary_or_counterpoint,
    note?.body
  ]).join("\n");
}

export function writingBookShortText(value, limit = 36) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

export function writingBookMatchesAny(text, keywords = []) {
  const haystack = String(text || "").toLowerCase();
  return keywords.some((keyword) => haystack.includes(String(keyword || "").toLowerCase()));
}

export function uniqueWritingBookPoolItems(items = []) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      title: String(item?.title || "").trim(),
      note_ids: uniqueStrings(item?.note_ids || item?.noteIds || []),
      role: String(item?.role || "").trim()
    }))
    .filter((item) => item.title || item.note_ids.length)
    .filter((item) => {
      const key = `${item.title}\u0000${item.note_ids.join("\u0000")}\u0000${item.role}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function writingBookSectionFromNote(note, fallbackTitle = "") {
  const thesis = writingBookShortText(note?.thesis || (Array.isArray(note?.threeLineSummary) ? note.threeLineSummary[0] : "") || note?.title || fallbackTitle, 34);
  const boundary = writingBookShortText(note?.boundaryOrCounterpoint || note?.boundary_or_counterpoint || (Array.isArray(note?.threeLineSummary) ? note.threeLineSummary[1] : "") || "需要补一个边界、反例或现实场景", 34);
  return [
    {
      title: `节一：${thesis || "核心判断"}`,
      purpose: "把这一章的核心判断讲清楚。",
      evidence_note_ids: note?.id ? [note.id] : [],
      role: "claim"
    },
    {
      title: `节二：${boundary || "证据与边界"}`,
      purpose: "补足案例、反方或适用边界。",
      evidence_note_ids: note?.id ? [note.id] : [],
      role: "boundary"
    }
  ];
}

export function normalizeWritingBookStructure(value = {}) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const parts = (Array.isArray(raw.parts) ? raw.parts : []).map((part, partIndex) => ({
    id: String(part.id || `part_${partIndex + 1}`).trim(),
    label: String(part.label || `第${partIndex + 1}部`).trim(),
    title: String(part.title || `第${partIndex + 1}部`).trim(),
    purpose: String(part.purpose || "").trim(),
    chapters: (Array.isArray(part.chapters) ? part.chapters : []).map((chapter, chapterIndex) => ({
      id: String(chapter.id || `chapter_${partIndex + 1}_${chapterIndex + 1}`).trim(),
      title: String(chapter.title || `第${chapterIndex + 1}章`).trim(),
      purpose: String(chapter.purpose || "").trim(),
      evidence_note_ids: uniqueStrings(chapter.evidence_note_ids || chapter.evidenceNoteIds || chapter.noteIds || []),
      sections: (Array.isArray(chapter.sections) ? chapter.sections : []).map((section, sectionIndex) => {
        if (typeof section === "string") {
          return {
            id: `section_${partIndex + 1}_${chapterIndex + 1}_${sectionIndex + 1}`,
            title: section,
            purpose: "",
            evidence_note_ids: uniqueStrings(chapter.evidence_note_ids || chapter.noteIds || []),
            role: ""
          };
        }
        return {
          id: String(section?.id || `section_${partIndex + 1}_${chapterIndex + 1}_${sectionIndex + 1}`).trim(),
          title: String(section?.title || `第${sectionIndex + 1}节`).trim(),
          purpose: String(section?.purpose || "").trim(),
          evidence_note_ids: uniqueStrings(section?.evidence_note_ids || section?.evidenceNoteIds || section?.noteIds || []),
          role: String(section?.role || "").trim()
        };
      })
    }))
  }));
  const pools = raw.pools && typeof raw.pools === "object" && !Array.isArray(raw.pools) ? raw.pools : {};
  const normalizePoolItems = (items) =>
    (Array.isArray(items) ? items : [])
      .map((item) =>
        typeof item === "string"
          ? { title: item, note_ids: [], role: "" }
          : {
              title: String(item?.title || "").trim(),
              note_ids: uniqueStrings(item?.note_ids || item?.noteIds || []),
              role: String(item?.role || "").trim()
            }
      )
      .filter((item) => item.title || item.note_ids.length);
  const directionIdeas = (Array.isArray(raw.direction_ideas || raw.directionIdeas) ? raw.direction_ideas || raw.directionIdeas : []).map((idea, index) => ({
    id: String(idea.id || `idea_${index + 1}`).trim(),
    title: String(idea.title || "").trim(),
    reader: String(idea.reader || "").trim(),
    promise: String(idea.promise || "").trim(),
    risk: String(idea.risk || "").trim(),
    note_ids: uniqueStrings(idea.note_ids || idea.noteIds || [])
  })).filter((idea) => idea.title);
  return {
    schema_version: Number(raw.schema_version || raw.schemaVersion || 1) || 1,
    generated_by: String(raw.generated_by || raw.generatedBy || "writing-center-ui").trim(),
    generated_at: String(raw.generated_at || raw.generatedAt || "").trim(),
    mainline: String(raw.mainline || "").trim(),
    reader: String(raw.reader || "").trim(),
    parts,
    pools: {
      cases: normalizePoolItems(pools.cases),
      counterarguments: normalizePoolItems(pools.counterarguments || pools.counters),
      open_questions: (Array.isArray(pools.open_questions || pools.questions) ? pools.open_questions || pools.questions : [])
        .map((item) => String(item?.title || item || "").trim())
        .filter(Boolean)
    },
    direction_ideas: directionIdeas
  };
}

export function writingBookStructureStats(bookStructure = {}) {
  const normalized = normalizeWritingBookStructure(bookStructure);
  return {
    partCount: normalized.parts.length,
    chapterCount: normalized.parts.reduce((sum, part) => sum + part.chapters.length, 0),
    sectionCount: normalized.parts.reduce((sum, part) => sum + part.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.sections.length, 0), 0),
    caseCount: normalized.pools.cases.length,
    counterargumentCount: normalized.pools.counterarguments.length,
    questionCount: normalized.pools.open_questions.length
  };
}

export function deriveWritingBookDesign({
  notes = [],
  project = null,
  scaffold = null,
  title = "",
  goal = "",
  audience = ""
} = {}) {
  const usableNotes = (Array.isArray(notes) ? notes : []).filter(Boolean);
  const projectTitle = String(title || project?.title || "AI时代易经与人生").trim();
  const projectGoal = String(goal || project?.goal || "").trim();
  const projectAudience = String(audience || project?.audience || "").trim();
  const mainline =
    projectGoal ||
    (projectTitle.includes("易经")
      ? "把易经从神秘答案转译为AI时代的变化判断、行动复盘和人生选择方法。"
      : `围绕“${projectTitle}”建立一条可被案例、反方和章节持续推进的书稿主线。`);
  const specs = [
    {
      label: "第一部",
      title: "重新理解易经：从占问答案到变化语言",
      keywords: ["易经", "卦", "象", "占", "神秘", "误用", "答案", "变化", "经典"],
      fallbackChapters: ["易经到底在处理什么问题", "从符号到判断：不要把卦当成答案"]
    },
    {
      label: "第二部",
      title: "AI时代的人生判断：时位、关系与行动",
      keywords: ["AI", "模型", "时代", "人生", "判断", "选择", "行动", "关系", "工作", "学习"],
      fallbackChapters: ["当模型变强，人还需要什么判断", "把时位感变成可复盘的行动"]
    },
    {
      label: "第三部",
      title: "把方法落地：案例、反方与长期修正",
      keywords: ["案例", "复盘", "反方", "边界", "失败", "实践", "方法", "长期", "修正"],
      fallbackChapters: ["用案例训练变化感", "反方池：这套方法在哪里会失效"]
    }
  ];
  const assigned = specs.map(() => []);
  const used = new Set();
  usableNotes.forEach((note) => {
    const text = writingBookPlainText(note);
    const index = specs.findIndex((spec) => writingBookMatchesAny(text, spec.keywords));
    if (index >= 0) {
      assigned[index].push(note);
      used.add(note.id);
    }
  });
  usableNotes
    .filter((note) => !used.has(note.id))
    .forEach((note, index) => assigned[index % specs.length].push(note));
  if (usableNotes.length) {
    assigned.forEach((group) => {
      if (!group.length) group.push(usableNotes[group.length % usableNotes.length]);
    });
  }
  const parts = specs.map((spec, partIndex) => {
    const group = assigned[partIndex].slice(0, 4);
    const chapters = (group.length ? group : spec.fallbackChapters.map((heading) => ({ id: "", title: heading }))).map((note, chapterIndex) => {
      const chapterTitle = note?.id ? note.title || spec.fallbackChapters[chapterIndex % spec.fallbackChapters.length] : note.title;
      return {
        id: `chapter_${partIndex + 1}_${chapterIndex + 1}`,
        title: `第${chapterIndex + 1}章 ${chapterTitle}`,
        purpose: note?.id ? `用「${note.title || note.id}」推进这一章的判断。` : "补充章节判断、证据与读者路径。",
        sections: writingBookSectionFromNote(note, chapterTitle),
        evidence_note_ids: note?.id ? [note.id] : []
      };
    });
    return {
      id: spec.label,
      label: spec.label,
      title: spec.title,
      purpose: partIndex === 0 ? "建立读者入口和概念框架。" : partIndex === 1 ? "推进核心判断和行动方法。" : "处理案例、反方和长期修正。",
      chapters
    };
  });
  const scaffoldQuestions = uniqueStrings([
    ...(Array.isArray(scaffold?.open_questions) ? scaffold.open_questions : []),
    ...(Array.isArray(scaffold?.sections) ? scaffold.sections.flatMap((section) => section?.open_questions || []) : [])
  ]);
  const scaffoldCounterpoints = uniqueStrings(
    Array.isArray(scaffold?.sections) ? scaffold.sections.flatMap((section) => section?.counterpoints || []) : []
  );
  const casePool = uniqueWritingBookPoolItems(
    usableNotes
      .filter((note) => writingBookMatchesAny(writingBookPlainText(note), ["案例", "例子", "AI", "模型", "人生", "决策", "复盘", "工作", "关系", "学习"]))
      .map((note) => ({ title: `${note.title || note.id}（${note.id}）`, note_ids: note.id ? [note.id] : [], role: "case" }))
  ).slice(0, 6);
  const counterPool = uniqueWritingBookPoolItems([
    ...scaffoldCounterpoints.map((counterpoint) => ({ title: counterpoint, note_ids: [], role: "counterargument" })),
    ...usableNotes
      .map((note) => ({
        title: writingBookShortText(note?.boundaryOrCounterpoint || note?.boundary_or_counterpoint || "", 58),
        note_ids: note?.id ? [note.id] : [],
        role: "counterargument"
      }))
      .filter((item) => item.title),
    ...usableNotes
      .filter((note) => writingBookMatchesAny(writingBookPlainText(note), ["反方", "边界", "误用", "失败", "风险", "局限"]))
      .map((note) => ({ title: `${note.title || note.id}（${note.id}）`, note_ids: note.id ? [note.id] : [], role: "counterargument" }))
  ]).slice(0, 6);
  const questionPool = uniqueStrings([
    ...scaffoldQuestions,
    projectAudience ? `这本书对${projectAudience}的第一章入口是什么？` : "目标读者最容易误解易经和AI的哪一点？",
    "哪些卦例、现实案例和反方材料必须补齐，才像一本书而不是长文？",
    "主线是否需要先去神秘化，再进入AI时代的人生方法？"
  ]).slice(0, 6);
  const fallbackCasePool = usableNotes
    .slice(0, 4)
    .map((note) => ({ title: `${note.title || note.id}（${note.id}）`, note_ids: note.id ? [note.id] : [], role: "case" }));
  return normalizeWritingBookStructure({
    schema_version: 1,
    generated_by: "writing-center-ui",
    generated_at: new Date().toISOString(),
    title: projectTitle,
    mainline,
    reader: projectAudience,
    parts,
    pools: {
      cases: casePool.length ? casePool : fallbackCasePool,
      counterarguments: counterPool.length
        ? counterPool
        : [{ title: "还需要主动补充反方：易经是否会被误用成确定性答案？AI是否会削弱人的判断？", note_ids: [], role: "counterargument" }],
      open_questions: questionPool
    }
  });
}

export function deriveWritingLocalBookIdeas({ notes = [], project = null, title = "" } = {}) {
  const usableNotes = (Array.isArray(notes) ? notes : []).filter(Boolean);
  const noteCount = usableNotes.length;
  const projectTitle = String(project?.title || title || "AI时代易经与人生").trim();
  const evidence = usableNotes.slice(0, 3).map((note) => note.id);
  return [
    {
      title: "判断力训练型",
      reader: "给AI时代需要做复杂选择的知识工作者",
      promise: "把易经当作训练时位感、边界感和复盘能力的方法，而不是求答案的工具。",
      risk: noteCount < 5 ? "案例还偏少，最好补充3-5个真实决策场景。" : "需要避免章节变成方法清单。",
      noteIds: evidence
    },
    {
      title: "去神秘化解释型",
      reader: "给想理解易经但警惕玄学化的现代读者",
      promise: "先拆掉占卜式误解，再解释卦象如何帮助人描述变化、位置和关系。",
      risk: "需要保留经典质感，避免只剩现代管理学翻译。",
      noteIds: evidence
    },
    {
      title: "AI时代人生方法型",
      reader: "给在模型、职业和生活变化中寻找稳定方法的人",
      promise: `围绕《${projectTitle || "AI时代易经与人生"}》建立一条从技术冲击到人生选择的书稿主线。`,
      risk: "AI与易经的连接要靠案例和反方检验，不能只做概念类比。",
      noteIds: evidence
    }
  ];
}

export function resetWritingLocalBookIdeasState(writingState = {}) {
  writingState.localBookIdeas = [];
  writingState.localBookIdeasGeneratedAt = "";
  return writingState;
}

export function syncWritingLocalBookIdeasFromProjectState(writingState = {}, project = null) {
  const normalized = normalizeWritingBookStructure(project?.book_structure || {});
  writingState.localBookIdeas = normalized.direction_ideas;
  writingState.localBookIdeasGeneratedAt = normalized.direction_ideas.length ? normalized.generated_at || "" : "";
  return writingState;
}
