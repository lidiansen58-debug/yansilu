export function buildWorkspaceStatusHintModel(input = {}) {
  const {
    activeNote = null,
    activeBody = "",
    noteType = "",
    focusMode = false,
    growthStage = "提炼中",
    hasGeneratedOriginal = false,
    generatedOriginalNoteId = "",
    isPermanentLike = false
  } = input;

  if (!activeNote) {
    return {
      visible: true,
      helperAction: "noop",
      targetNoteId: "",
      kicker: "下一步推荐",
      title: "先打开一条笔记",
      body: "从随笔、文献或永久笔记里任选一条开始。后续会根据当前上下文提示相关任务和推荐下一步。",
      actionText: "知道了"
    };
  }

  if (!focusMode) {
    return { visible: false };
  }

  const focusedJudgment = growthStage === "提炼中" ? "核心判断" : "关键判断与边界";
  return {
    visible: true,
    helperAction: "noop",
    targetNoteId: "",
    kicker: "专注模式",
    title: "现在只保留当前笔记",
    body: `专注模式会收起左侧导航和回链，只留下正文与关键按钮。先把${focusedJudgment}写清楚，再决定是否补连接与标签。`,
    actionText: "保持专注"
  };

  if (noteType === "literature") {
    if (hasGeneratedOriginal) {
      return {
        visible: true,
        helperAction: "open-generated-original",
        targetNoteId: generatedOriginalNoteId,
        kicker: "文献笔记",
        title: "这条文献已经长出永久笔记",
        body: "你可以继续补文献里的证据与边界，也可以直接跳到那条永久笔记里继续提炼自己的判断。",
        actionText: "打开永久笔记"
      };
    }
    return {
      visible: true,
      helperAction: "noop",
      targetNoteId: "",
      kicker: "文献笔记",
      title: "先把原文转成你的判断",
      body: "文献笔记现在和其它笔记共用同一个编辑器。等你觉得材料已经能支撑一个明确判断时，再点“记录永久笔记”。",
      actionText: "继续整理"
    };
  }

  if (isPermanentLike) {
    return {
      visible: true,
      helperAction: "noop",
      targetNoteId: "",
      kicker: "永久笔记",
      title: `当前在${growthStage}`,
      body: "先把观点写清楚，再决定是否补连接、标签和证据。原创性检测现在会以浮窗方式提醒，不再把确认操作压在编辑器底部。",
      actionText: "继续提炼"
    };
  }

  if (hasGeneratedOriginal) {
    return {
      visible: true,
      helperAction: "open-generated-original",
      targetNoteId: generatedOriginalNoteId,
      kicker: "随笔笔记",
      title: "这条随笔已经沉淀为永久笔记",
      body: "原始想法还可以继续补，但它已经对应到一条永久笔记。你可以直接跳过去继续完善核心判断。",
      actionText: "打开永久笔记"
    };
  }

  return {
    visible: true,
    helperAction: "noop",
    targetNoteId: "",
    kicker: "随笔笔记",
    title: `当前在${growthStage}`,
    body: "随笔只负责抓住还不稳定的想法，不必在这里完成所有整理。等你判断它值得长期保留时，再点“记录永久笔记”。",
    actionText: "继续记录"
  };
}
