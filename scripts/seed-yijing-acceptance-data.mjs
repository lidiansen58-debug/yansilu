import fs from "node:fs/promises";
import path from "node:path";

import { createDirectory, listDirectories, updateDirectory } from "../packages/domain/src/catalog-store.mjs";
import {
  createNoteInDirectory,
  createNoteRelation,
  getDirectoryGraph,
  getNoteById,
  updateNoteContent,
  updateNoteRelation
} from "../packages/domain/src/note-catalog-store.mjs";
import { createIndexCard, getIndexCard } from "../packages/domain/src/index-card-store.mjs";
import {
  bindDraftNoteToProject,
  createDraftScaffold,
  createWritingProject,
  getDraftScaffold,
  getWritingProject,
  listProjectDraftVersions
} from "../packages/writing-engine/src/writing-engine.mjs";
import { initVault } from "../packages/domain/src/vault.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const VAULT_PATH = path.resolve(process.env.VAULT_PATH || path.join(REPO_ROOT, "vault-example", "yansilu-vault"));

const directories = [
  {
    id: "dir_acceptance_yijing_original",
    title: "易经验收-原创判断",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    relPath: path.join("notes", "original", "yijing-acceptance-original")
  },
  {
    id: "dir_acceptance_yijing_literature",
    title: "易经验收-文献摘录",
    parentDirectoryId: "dir_literature_default",
    directoryType: "literature_default",
    relPath: path.join("notes", "literature", "yijing-acceptance-literature")
  },
  {
    id: "dir_acceptance_yijing_fleeting",
    title: "易经验收-随笔线索",
    parentDirectoryId: "dir_fleeting_default",
    directoryType: "fleeting_default",
    relPath: path.join("notes", "fleeting", "yijing-acceptance-fleeting")
  }
];

const permanentNotes = [
  {
    id: "pn_accept_yijing_change_default",
    title: "易经：变化是默认状态",
    thesis: "《易经》的核心不是预测答案，而是训练人在变化中识别关系、阶段和行动位置。",
    summary: [
      "变化不是例外，而是处境的基本形态。",
      "判断要从关系与阶段出发，而不是从孤立定义出发。",
      "越想得到唯一答案，越需要先看清问题处在哪个位置。"
    ],
    boundary: "这条判断不等于否认稳定结构；它只说明稳定也是变化关系中的暂时形态。",
    body: [
      "如果把变化看成异常，行动者会把全部精力放在恢复旧秩序上；如果把变化看成默认状态，行动者就会先辨认关系正在怎样移动。",
      "",
      "这条笔记用于测试原创笔记、标题重命名、标签搜索和图谱中心节点。它连接 [[易经：卦是情境模型]] 与 [[易经：爻位让判断进入时机]]。",
      "",
      "#易经 #测试数据 #原创笔记 #情境判断 #变化"
    ].join("\n")
  },
  {
    id: "pn_accept_yijing_hexagram_model",
    title: "易经：卦是情境模型",
    thesis: "卦把散乱的处境压缩成可讨论的结构模型。",
    summary: [
      "卦不是直接答案，而是情境结构的建模方式。",
      "同一事件进入不同卦象，会暴露不同的关系重点。",
      "模型的价值在于迫使人说明判断依据。"
    ],
    boundary: "卦象会压缩现实，所以不能替代具体证据和行动复盘。",
    body: [
      "卦的作用像一张关系草图：它不替你决定，但让你看见哪些因素被放大、哪些因素被遗漏。",
      "",
      "在验收中，这条笔记可测试被关联笔记下方是否出现反向关系，也可测试图谱节点点击与关系编辑。",
      "",
      "#易经 #测试数据 #原创笔记 #模型"
    ].join("\n")
  },
  {
    id: "pn_accept_yijing_line_timing",
    title: "易经：爻位让判断进入时机",
    thesis: "爻位把判断放回时间、位置和阶段，而不是停留在抽象原则。",
    summary: [
      "同一行动在不同位置可能有完全不同的意义。",
      "爻位让人追问现在是开始、推进、过盛还是收束。",
      "时机判断比抽象正确更贴近真实行动。"
    ],
    boundary: "强调时机不等于机会主义；它仍需要边界、角色和责任。",
    body: [
      "爻位提醒我们：判断不是一句原则，而是原则落在某个阶段后的行动选择。",
      "",
      "示例：等待不是不行动，等待可能是在为下一步建立条件。参见 [[易经：需卦把等待变成行动]]。",
      "",
      "#易经 #测试数据 #原创笔记 #时机"
    ].join("\n")
  },
  {
    id: "pn_accept_yijing_qian",
    title: "易经：乾卦的主动性不是蛮力",
    thesis: "乾卦可以被理解为主动生成秩序的能力，而不是单纯强硬推进。",
    summary: [
      "主动性需要阶段感。",
      "过早推进会把创造力变成压迫。",
      "真正的强健包含自我校准。"
    ],
    boundary: "乾卦的主动性若脱离坤卦的承载条件，容易变成单向意志。",
    body: [
      "乾卦测试“支持/限定/张力”三类关系：它支持变化中的主动判断，也被坤卦的承载条件所限定。",
      "",
      "可与 [[易经：坤卦的承载不是被动]] 对照阅读。",
      "",
      "#易经 #测试数据 #原创笔记 #乾卦"
    ].join("\n")
  },
  {
    id: "pn_accept_yijing_kun",
    title: "易经：坤卦的承载不是被动",
    thesis: "坤卦的承载是一种让事物有条件展开的能力，不等于消极顺从。",
    summary: [
      "承载是一种积极的条件建设。",
      "它让主动性有落点，而不是互相抵消。",
      "好的系统既需要生成，也需要容纳。"
    ],
    boundary: "承载若没有选择边界，会退化为无原则吸收。",
    body: [
      "坤卦可以测试与乾卦的互补关系，也适合在写作篮中作为反面边界。",
      "",
      "#易经 #测试数据 #原创笔记 #坤卦"
    ].join("\n")
  },
  {
    id: "pn_accept_yijing_xu_waiting",
    title: "易经：需卦把等待变成行动",
    thesis: "需卦提醒等待不是空耗，而是为行动创造条件。",
    summary: [
      "等待可以是一种主动配置资源的方式。",
      "判断等待是否有效，要看它是否改善下一步条件。",
      "没有准备的等待会滑向拖延。"
    ],
    boundary: "等待不是逃避；如果等待没有改变条件，就需要重新判断。",
    body: [
      "需卦适合测试“限定”关系：它限定乾卦式主动性，也补充爻位对时机的要求。",
      "",
      "#易经 #测试数据 #原创笔记 #需卦 #行动"
    ].join("\n")
  },
  {
    id: "pn_accept_yijing_song_conflict",
    title: "易经：讼卦先分清边界",
    thesis: "讼卦不是鼓励争胜，而是提醒冲突发生时先澄清边界和责任。",
    summary: [
      "冲突不是只靠立场强弱解决。",
      "边界不清会让争论反复升级。",
      "好的判断会区分事实、角色和可谈判范围。"
    ],
    boundary: "澄清边界不等于拒绝协商；它是协商的起点。",
    body: [
      "这条笔记用于测试图谱里的张力边：它会与“变化是默认状态”形成限定关系，也与“中孚”形成互补关系。",
      "",
      "#易经 #测试数据 #原创笔记 #讼卦 #边界"
    ].join("\n")
  },
  {
    id: "pn_accept_yijing_zhongfu_trust",
    title: "易经：中孚把信任做成可验证关系",
    thesis: "中孚的信任不是情绪好感，而是行动前后一致、可被复盘的关系。",
    summary: [
      "信任需要可验证的连续性。",
      "关系判断不能停在口头承诺。",
      "复盘让信任从感觉变成结构。"
    ],
    boundary: "强调验证不等于怀疑一切；它是为了让合作关系可持续。",
    body: [
      "中孚可以作为写作示例中的结尾：当变化、时机、边界都被看见，信任才有结构基础。",
      "",
      "#易经 #测试数据 #原创笔记 #中孚 #关系"
    ].join("\n")
  }
];

const literatureNotes = [
  {
    id: "ln_accept_yijing_xici_quote",
    title: "文献摘录：系辞中的变通观",
    body: [
      "摘录：穷则变，变则通，通则久。",
      "",
      "转述：这里的“变”不是任意改变，而是在旧路径走到尽头后寻找新的关系通路。",
      "",
      "可支持判断：[[易经：变化是默认状态]] 并不是现代管理套话，而有经典语境中的变通观作支撑。",
      "",
      "追问：变通和机会主义之间的边界在哪里？",
      "",
      "#易经 #测试数据 #文献笔记 #系辞"
    ].join("\n")
  },
  {
    id: "ln_accept_yijing_qian_quote",
    title: "文献摘录：乾卦九三的警惕",
    body: [
      "摘录：君子终日乾乾，夕惕若厉，无咎。",
      "",
      "转述：主动性如果没有持续警惕，就会把“健”误解成盲目推进。",
      "",
      "可支持判断：[[易经：乾卦的主动性不是蛮力]]。",
      "",
      "#易经 #测试数据 #文献笔记 #乾卦"
    ].join("\n")
  },
  {
    id: "ln_accept_yijing_kun_quote",
    title: "文献摘录：坤卦厚德载物",
    body: [
      "摘录：地势坤，君子以厚德载物。",
      "",
      "转述：承载不是没有方向，而是提供足够厚的条件，让复杂事物可以安放。",
      "",
      "可支持判断：[[易经：坤卦的承载不是被动]]。",
      "",
      "#易经 #测试数据 #文献笔记 #坤卦"
    ].join("\n")
  }
];

const fleetingNotes = [
  {
    id: "fn_accept_yijing_meeting",
    title: "随笔：会议争论像讼卦",
    body: [
      "今天项目会上大家都在争“谁对”，但真正卡住的是边界没有拆开：事实、责任、风险偏好混在一起。",
      "",
      "可能连接 [[易经：讼卦先分清边界]]。",
      "",
      "#易经 #测试数据 #随笔线索 #会议"
    ].join("\n")
  },
  {
    id: "fn_accept_yijing_waiting",
    title: "随笔：等待不是暂停键",
    body: [
      "如果等待期间能补证据、搭关系、降低风险，它就不是拖延。",
      "",
      "可能连接 [[易经：需卦把等待变成行动]]。",
      "",
      "#易经 #测试数据 #随笔线索 #行动"
    ].join("\n")
  },
  {
    id: "fn_accept_yijing_trust",
    title: "随笔：信任需要复盘材料",
    body: [
      "团队说“相信彼此”太轻了，真正可持续的信任需要能回看承诺、行动和结果是否一致。",
      "",
      "可能连接 [[易经：中孚把信任做成可验证关系]]。",
      "",
      "#易经 #测试数据 #随笔线索 #关系"
    ].join("\n")
  }
];

const relations = [
  ["pn_accept_yijing_change_default", "pn_accept_yijing_hexagram_model", "supports", "变化是默认状态，因此需要卦这样的情境模型来压缩和观察变化结构。", "如果没有模型，变化判断会不会只剩下主观直觉？"],
  ["pn_accept_yijing_hexagram_model", "pn_accept_yijing_line_timing", "extends", "卦给出整体结构，爻位把结构推进到具体阶段和行动位置。", "从整体模型进入局部时机时，最容易丢失什么信息？"],
  ["pn_accept_yijing_qian", "pn_accept_yijing_kun", "complements", "乾的主动生成需要坤的承载条件，否则主动性会缺少落点。", "主动与承载如何避免变成强弱二分？"],
  ["pn_accept_yijing_kun", "pn_accept_yijing_qian", "qualifies", "坤提醒乾不能只靠推进，也要为事物展开创造条件。", "什么时候承载会变成拖慢主动性的借口？"],
  ["pn_accept_yijing_xu_waiting", "pn_accept_yijing_line_timing", "example_of", "需卦把等待解释为时机判断的一个具体案例：等是为了让位置成熟。", "等待中的行动证据应该怎样记录？"],
  ["pn_accept_yijing_song_conflict", "pn_accept_yijing_change_default", "qualifies", "变化会带来冲突，但讼卦提醒不能把所有冲突都浪漫化为成长。", "哪些变化值得顺势而为，哪些变化需要先立边界？"],
  ["pn_accept_yijing_zhongfu_trust", "pn_accept_yijing_song_conflict", "complements", "边界澄清之后，信任才可能从口号变成可验证的关系。", "冲突解决后，哪些复盘材料能重建信任？"],
  ["ln_accept_yijing_xici_quote", "pn_accept_yijing_change_default", "supports", "系辞中的变通观为“变化是默认状态”提供经典语境支撑。", "经典文本中的变通是否能迁移到现代组织判断？"],
  ["ln_accept_yijing_qian_quote", "pn_accept_yijing_qian", "supports", "九三强调终日警惕，说明主动性必须包含自我校准。", "主动性的校准机制应当写成什么可检查标准？"],
  ["ln_accept_yijing_kun_quote", "pn_accept_yijing_kun", "supports", "厚德载物说明承载是积极容纳复杂性的能力。", "承载复杂性和失去边界之间如何区分？"],
  ["fn_accept_yijing_meeting", "pn_accept_yijing_song_conflict", "example_of", "会议争论提供了讼卦边界判断的现实场景。", "把会议冲突拆成事实、角色和风险后，下一步行动是什么？"],
  ["fn_accept_yijing_waiting", "pn_accept_yijing_xu_waiting", "example_of", "等待期间补证据和搭关系，正好说明需卦中的等待可以是一种行动。", "等待是否有效，应该用哪些过程指标判断？"],
  ["fn_accept_yijing_trust", "pn_accept_yijing_zhongfu_trust", "reframes", "随笔把中孚从抽象信任转写成可复盘材料的问题。", "团队信任最小可验证证据是什么？"],
  ["pn_accept_yijing_qian", "pn_accept_yijing_xu_waiting", "contrasts", "乾卦强调主动推进，需卦提醒主动性有时必须通过等待来保存条件。", "主动与等待的分界点在哪里？"]
];

function permanentBody(note) {
  return [
    `# ${note.title}`,
    "",
    note.body,
    "",
    "## 三行摘要",
    "",
    ...note.summary.map((line) => `- ${line}`),
    "",
    "## 边界或反例",
    "",
    note.boundary,
    ""
  ].join("\n");
}

function sourceBody(note) {
  return [`# ${note.title}`, "", note.body, ""].join("\n");
}

async function getMaybe(fn) {
  try {
    return await fn();
  } catch {
    return null;
  }
}

async function ensureDirectory(spec) {
  const existing = (await listDirectories(VAULT_PATH, { includeHidden: true })).find((item) => item.id === spec.id);
  const fsPath = path.join(VAULT_PATH, spec.relPath);
  if (existing) {
    await fs.mkdir(fsPath, { recursive: true });
    return updateDirectory(VAULT_PATH, spec.id, {
      title: spec.title,
      parentDirectoryId: spec.parentDirectoryId,
      fsPath,
      maxNotes: 500
    });
  }
  return createDirectory(VAULT_PATH, {
    id: spec.id,
    title: spec.title,
    parentDirectoryId: spec.parentDirectoryId,
    directoryType: spec.directoryType,
    fsPath,
    maxNotes: 500
  });
}

async function upsertNote(note, directoryId, body, extra = {}) {
  const existing = await getMaybe(() => getNoteById(VAULT_PATH, note.id));
  if (existing) {
    return updateNoteContent(VAULT_PATH, note.id, {
      title: note.title,
      body,
      status: extra.status || existing.status || "draft",
      thesis: extra.thesis,
      threeLineSummary: extra.threeLineSummary,
      distillationStatus: extra.distillationStatus,
      boundaryOrCounterpoint: extra.boundaryOrCounterpoint,
      originalityStatus: extra.originalityStatus,
      originalitySimilarity: extra.originalitySimilarity,
      authorship: extra.authorship
    });
  }
  return createNoteInDirectory(VAULT_PATH, {
    id: note.id,
    directoryId,
    title: note.title,
    body,
    status: extra.status || "draft",
    thesis: extra.thesis,
    threeLineSummary: extra.threeLineSummary,
    distillationStatus: extra.distillationStatus,
    boundaryOrCounterpoint: extra.boundaryOrCounterpoint,
    originalityStatus: extra.originalityStatus,
    originalitySimilarity: extra.originalitySimilarity,
    authorship: extra.authorship,
    authorshipConfirmed: extra.authorshipConfirmed,
    authorshipAiAssisted: extra.authorshipAiAssisted
  });
}

async function upsertRelation([from, to, relationType, rationale, insightQuestion]) {
  const id = `lnk_accept_yijing_${from.replace(/^.._accept_yijing_/, "")}_${to.replace(/^.._accept_yijing_/, "")}_${relationType}`.slice(0, 96);
  const payload = {
    id,
    toNoteId: to,
    relationType,
    rationale,
    insightQuestion,
    createdBy: "user",
    confidence: 1,
    status: "confirmed"
  };
  const item = await createNoteRelation(VAULT_PATH, from, payload);
  if (item?.created === false) {
    return updateNoteRelation(VAULT_PATH, item.id, payload);
  }
  return item;
}

async function ensureIndexAndWriting() {
  const indexId = "idx_accept_yijing_judgment_training";
  const index =
    (await getMaybe(() => getIndexCard(VAULT_PATH, indexId))) ||
    (await createIndexCard(VAULT_PATH, {
      id: indexId,
      directoryId: "dir_acceptance_yijing_original",
      indexType: "topic",
      title: "易经判断训练主题索引",
      summary: "把变化、情境模型、时机、主动性、承载、边界和信任串成一条可写作的判断链。",
      thesis: "易经可以作为不确定处境中的判断训练，而不是答案机器。",
      threeLineSummary: [
        "变化是默认状态，卦象帮助把变化压缩成情境模型。",
        "爻位、需卦和讼卦让判断进入时机、等待与边界。",
        "乾坤与中孚把行动者、承载条件和可信关系连成写作主线。"
      ],
      centralQuestion: "如何把易经从神秘化占问，转化为现代行动者的关系判断训练？",
      items: [
        { noteId: "pn_accept_yijing_change_default", shortLabel: "变化", rationale: "确立整组材料的核心前提。" },
        { noteId: "pn_accept_yijing_hexagram_model", shortLabel: "模型", rationale: "说明卦象如何提供结构化观察。" },
        { noteId: "pn_accept_yijing_line_timing", shortLabel: "时机", rationale: "把判断落到阶段与位置。" },
        { noteId: "pn_accept_yijing_qian", shortLabel: "主动", rationale: "提供行动者模型。" },
        { noteId: "pn_accept_yijing_kun", shortLabel: "承载", rationale: "补足主动性的条件面。" },
        { noteId: "pn_accept_yijing_song_conflict", shortLabel: "边界", rationale: "提供冲突处理的反面压力。" },
        { noteId: "pn_accept_yijing_zhongfu_trust", shortLabel: "信任", rationale: "作为写作结论的关系标准。" }
      ]
    }));

  const projectId = "wp_accept_yijing_writing_demo";
  const project =
    (await getMaybe(() => getWritingProject(VAULT_PATH, projectId))) ||
    (await createWritingProject(VAULT_PATH, {
      id: projectId,
      title: "写作示例：把易经写成判断训练",
      goal: "生成一篇面向知识工作者的文章脚手架，说明易经如何帮助人在不确定中判断。",
      audience: "对笔记、写作和决策方法感兴趣的知识工作者",
      tone: "清晰、克制、可操作",
      intent: "把易经从神秘化理解拉回到关系、时机和行动判断。",
      desiredReaderTakeaway: "读者应看到：好的笔记网络能把经典概念转化为可写作、可复盘的判断链。",
      basketNoteIds: [
        "pn_accept_yijing_change_default",
        "pn_accept_yijing_hexagram_model",
        "pn_accept_yijing_line_timing",
        "pn_accept_yijing_qian",
        "pn_accept_yijing_kun",
        "pn_accept_yijing_song_conflict",
        "pn_accept_yijing_zhongfu_trust"
      ],
      relatedIndexIds: [index.id]
    }));

  const scaffoldId = "ds_accept_yijing_writing_scaffold";
  const scaffold =
    (await getMaybe(() => getDraftScaffold(VAULT_PATH, scaffoldId))) ||
    (await createDraftScaffold(VAULT_PATH, {
      id: scaffoldId,
      writingProjectId: project.id,
      versionNote: "易经验收数据自动生成的第一版文章脚手架。"
    }));

  const draft = await upsertNote(
    {
      id: "pn_accept_yijing_article_draft",
      title: "草稿：易经不是答案机器，而是判断训练"
    },
    "dir_acceptance_yijing_original",
    [
      "# 草稿：易经不是答案机器，而是判断训练",
      "",
      "这是一篇用于验收写作模块的示例草稿。它从“变化是默认状态”出发，经过“卦是情境模型”“爻位让判断进入时机”，再进入乾坤、需卦、讼卦与中孚。",
      "",
      "待扩写段落：",
      "",
      "1. 为什么把易经理解成答案机器会削弱判断力。",
      "2. 卦、爻位和关系图谱如何帮助组织材料。",
      "3. 写作时如何把原创笔记、文献摘录和随笔线索各归其位。",
      "",
      "#易经 #测试数据 #写作草稿"
    ].join("\n"),
    {
      status: "draft",
      thesis: "易经可以被写成一套判断训练方法。",
      threeLineSummary: [
        "先把变化当作默认状态。",
        "再用卦象、爻位和关系把处境结构化。",
        "最后把判断链转成可写作的文章脚手架。"
      ],
      distillationStatus: "draft",
      originalityStatus: "pass",
      originalitySimilarity: 0,
      authorship: { user_confirmed: true, ai_assisted: false },
      boundaryOrCounterpoint: "这篇草稿不处理完整义理史，只服务于产品验收。"
    }
  );

  const versions = await listProjectDraftVersions(VAULT_PATH, project.id, { limit: 20 });
  if (!versions.some((item) => item.draft_note_id === draft.id)) {
    await bindDraftNoteToProject(VAULT_PATH, {
      writingProjectId: project.id,
      draftNoteId: draft.id,
      sourceScaffoldId: scaffold.id,
      versionNote: "验收草稿：从易经主题索引生成的第一版文章。"
    });
  }

  return { index, project: await getWritingProject(VAULT_PATH, project.id), scaffold, draft };
}

async function main() {
  await initVault(VAULT_PATH);
  const ensuredDirectories = [];
  for (const spec of directories) ensuredDirectories.push(await ensureDirectory(spec));

  const createdPermanent = [];
  for (const note of permanentNotes) {
    createdPermanent.push(
      await upsertNote(note, "dir_acceptance_yijing_original", permanentBody(note), {
        status: "active",
        thesis: note.thesis,
        threeLineSummary: note.summary,
        distillationStatus: "confirmed",
        boundaryOrCounterpoint: note.boundary,
        originalityStatus: "pass",
        originalitySimilarity: 0,
        authorship: { user_confirmed: true, ai_assisted: false },
        authorshipConfirmed: true,
        authorshipAiAssisted: false
      })
    );
  }

  const createdLiterature = [];
  for (const note of literatureNotes) {
    createdLiterature.push(await upsertNote(note, "dir_acceptance_yijing_literature", sourceBody(note), { status: "draft" }));
  }

  const createdFleeting = [];
  for (const note of fleetingNotes) {
    createdFleeting.push(await upsertNote(note, "dir_acceptance_yijing_fleeting", sourceBody(note), { status: "draft" }));
  }

  const createdRelations = [];
  for (const relation of relations) createdRelations.push(await upsertRelation(relation));

  const writing = await ensureIndexAndWriting();
  const graph = await getDirectoryGraph(VAULT_PATH, "dir_acceptance_yijing_original");

  const summary = {
    vaultPath: VAULT_PATH,
    directories: ensuredDirectories.map((item) => ({ id: item.id, title: item.title })),
    notes: {
      permanent: createdPermanent.length,
      literature: createdLiterature.length,
      fleeting: createdFleeting.length
    },
    relations: createdRelations.length,
    graph: {
      directoryId: "dir_acceptance_yijing_original",
      totalNodes: graph.totalNodes,
      totalEdges: graph.totalEdges,
      connectedComponentCount: graph.insights?.connectedComponentCount
    },
    writing: {
      indexId: writing.index.id,
      projectId: writing.project.id,
      scaffoldId: writing.scaffold.id,
      draftNoteId: writing.draft.id
    }
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
