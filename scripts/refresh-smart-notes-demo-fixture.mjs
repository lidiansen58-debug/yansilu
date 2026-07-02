import fs from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const FIXTURE_PATH = path.join(REPO_ROOT, "tests", "fixtures", "demo-smart-notes-product-thinking", "demo.json");

const RELATION_TYPE_LABELS = {
  supports: "支撑",
  complements: "补充",
  contrasts: "对照",
  contradicts: "反驳",
  extends: "推进",
  precedes: "前提",
  follows: "后续",
  qualifies: "限定",
  example_of: "例子",
  counterexample_to: "反例",
  same_topic: "同主题",
  unexpected_connection: "意外相关",
  bridges: "桥接",
  restates: "重述",
  reframes: "改写问题",
  appears_in_draft: "进入写作",
  belongs_to_topic: "主题归属",
  duplicates: "重复重叠"
};

const LEGACY_RELATION_TYPE_MAP = {
  refines: "qualifies",
  leads_to: "precedes",
  tension: "contradicts",
  gap: "bridges",
  evidence_for: "supports",
  depends_on: "follows",
  duplicates_or_overlaps: "duplicates",
  source_gap: "same_topic",
  writing_move: "appears_in_draft"
};

const RELATION_TYPE_OVERRIDES = {
  "REL-SN-006": "reframes",
  "REL-SN-011": "restates",
  "REL-SN-018": "complements",
  "REL-SN-027": "unexpected_connection",
  "REL-SN-032": "contradicts"
};

const CLUSTER_META = {
  writing_first: {
    summaryLine: "它把写作从结果改成入口，要求系统始终显示材料离成文还差哪一步。",
    surface: "写作入口、写作篮、草稿骨架与回溯链路",
    scenario: "适合验收从永久笔记进入写作项目时，页面是否真的承接了上一步判断。",
    boundary: "它强调写作前置，但不要求用户在捕捉瞬间就把所有判断一次写完。",
    questionSeed: "如果把这条判断删掉，写作链路最先失真的会是哪一步？"
  },
  fleeting_capture: {
    summaryLine: "它提醒用户快速记下来的不是成果，而是一笔必须尽快处理的认知欠账。",
    surface: "随笔列表、清理队列、下一步动作提示与删除确认",
    scenario: "适合验收随笔列表是否把“待处理”解释成具体动作，而不是静态堆积。",
    boundary: "它要求及时处理，但不意味着每条随笔都必须被升格为永久笔记。",
    questionSeed: "如果没有后续处理动作，这条随笔最可能在哪里误导用户？"
  },
  literature_understanding: {
    summaryLine: "它把文献笔记从摘录容器改成理解容器，要求用户留下转述与追问。",
    surface: "文献笔记模板、来源边界、转述区、候选永久笔记与追问区",
    scenario: "适合验收文献笔记页面是否把摘录、转述、收获和候选判断明显分开。",
    boundary: "它要求用户说自己的话，但不要求每条文献笔记立刻得出最终结论。",
    questionSeed: "如果只保留摘录而拿掉转述，这条材料还剩下多少属于用户自己的理解？"
  },
  permanent_quality: {
    summaryLine: "它把永久笔记定义为可承担判断，而不是看起来完整的漂亮摘要。",
    surface: "永久笔记模板、三句话压缩、边界字段、来源追溯与确认状态",
    scenario: "适合验收永久笔记详情页是否让观点、理由、边界和来源一眼可见。",
    boundary: "它要求明确立场，但不意味着观点必须强硬到不允许修正。",
    questionSeed: "如果有人挑战这条笔记，最先被追问的会是理由、边界还是来源？"
  },
  relation_graph: {
    summaryLine: "它要求关系边不仅存在，还要解释连接方式、冲突位置和后续追问。",
    surface: "关系创建表单、关系理由、洞察问题、图谱筛选与复查队列",
    scenario: "适合验收图谱是不是在帮助用户继续思考，而不是只把节点连得更密。",
    boundary: "它重视显式关系，但不要求每个相邻主题都被过早定性。",
    questionSeed: "如果拿掉这条关系理由，图谱里还剩下什么值得继续相信？"
  },
  index_structure: {
    summaryLine: "它把索引卡从分类目录改成重返问题现场的入口与排序工具。",
    surface: "索引卡中心问题、条目顺序、关键笔记锚点与成熟度判断",
    scenario: "适合验收索引卡是否让用户从中心问题重新进入，而不是从头翻整库。",
    boundary: "它强调围绕问题组织，但不意味着所有主题都只能有一条进入路径。",
    questionSeed: "如果这张索引卡拿掉中心问题，它还剩下真正的组织力吗？"
  },
  habits_feedback: {
    summaryLine: "它把系统活性理解成很多小处理动作组成的连续反馈，而不是偶尔的大整理。",
    surface: "处理节奏、反馈提示、旧笔记再进入、复盘入口与连续性提醒",
    scenario: "适合验收系统是否持续奖励处理、连接和回看，而不是只奖励新增数量。",
    boundary: "它强调连续处理，但不要求用户维持机械化的固定频率。",
    questionSeed: "如果缺少反馈回路，这条习惯最容易在哪一步中断？"
  },
  anti_patterns_metrics: {
    summaryLine: "它把真正的进展定义为理解转化和写作准备，而不是收藏量与导入量。",
    surface: "仪表盘、准备度指标、虚假进展提醒与反模式诊断",
    scenario: "适合验收系统指标是否在奖励理解，而不是奖励看起来很忙。",
    boundary: "它批评浅层活跃，但不意味着量化指标本身没有价值。",
    questionSeed: "如果继续奖励错误指标，用户最可能把哪种动作误认成进步？"
  },
  ai_authorship: {
    summaryLine: "它把 AI 放在候选、追问和对照的位置，把承担判断的责任留给用户。",
    surface: "AI 建议状态、作者确认、来源追溯、边界提示与保存前确认",
    scenario: "适合验收 AI 相关界面是否清楚标出哪些内容只是建议，哪些内容已被用户承担。",
    boundary: "它限制 AI 越权，但不否认 AI 在发现缺口、生成候选时的真实帮助。",
    questionSeed: "如果去掉用户确认，这条 AI 建议会在哪个瞬间伪装成用户自己的判断？"
  }
};

const LITERATURE_DETAILS = {
  "LN-SN-001": {
    angle: "读书时真正重要的不是多存一条材料，而是让材料一进入系统就和未来要写的问题发生关系。",
    takeaway: "产品上最该被放大的不是“保存成功”，而是“这条材料下一步要变成什么判断”。"
  },
  "LN-SN-002": {
    angle: "临时捕捉之所以有价值，不在于快，而在于它给后续处理保留了一个明确入口。",
    takeaway: "随笔页如果只展示时间线，不展示处理承诺，就会把灵感变成拖欠。"
  },
  "LN-SN-003": {
    angle: "用自己的话写下阅读笔记，本质上是在检验材料有没有真正穿过自己的判断系统。",
    takeaway: "文献笔记编辑器必须让“摘录”和“我的转述”物理分开，避免用户误把相邻摆放当成理解。"
  },
  "LN-SN-004": {
    angle: "一条永久笔记如果离开原场景就无法理解，说明它还只是现场记录，而不是能迁移的思想单位。",
    takeaway: "永久笔记模板需要鼓励观点式标题、明确论证和可见边界。"
  },
  "LN-SN-005": {
    angle: "笔记真正开始增值的时刻，不是被保存，而是被放进一条有理由的关系里。",
    takeaway: "图谱不应该默认奖励连线数量，而应该奖励写得清楚的关系理由。"
  },
  "LN-SN-006": {
    angle: "只按主题归档会让人以为自己已经整理完成，却遮住了判断之间真实的前后与轻重。",
    takeaway: "索引卡需要围绕问题和顺序组织，而不是围绕目录树组织。"
  },
  "LN-SN-007": {
    angle: "系统之所以会“活起来”，不是因为它拥有很多内容，而是因为旧内容持续遇到新问题。",
    takeaway: "反馈设计要把“重新进入旧笔记”解释成进展，而不是沉没成本。"
  },
  "LN-SN-008": {
    angle: "写作之所以会突然变容易，往往不是灵感来了，而是前面已经做完了大部分判断工作。",
    takeaway: "写作中心应优先显示已经成熟的判断与缺口，而不是从空白 prompt 起步。"
  },
  "LN-SN-009": {
    angle: "方法的关键不在收藏，而在固定地把未完成材料推进到下一状态。",
    takeaway: "日常处理队列比一次性导入能力更能代表系统是不是健康。"
  },
  "LN-SN-010": {
    angle: "再好的容器也不会自动产生理解；容器只是在承载处理动作时才有价值。",
    takeaway: "产品不应把页面布局和资料规模包装成系统本身的成果。"
  },
  "LN-SN-011": {
    angle: "一个值得继续使用的档案，应该让不同观点彼此可比、可冲突、可修订，而不是只是被收藏。",
    takeaway: "评价系统质量时，应该看它是否鼓励用户比较、反驳和重写。"
  },
  "LN-SN-012": {
    angle: "好的笔记流程会把一条论点如何形成的路径保留下来，而不是只保留最后一句漂亮结论。",
    takeaway: "AI 参与时尤其要保留候选状态和推理痕迹，避免流畅输出直接冒充作者观点。"
  },
  "LN-SN-013": {
    angle: "快速捕捉不是为了宣布自己想明白了，而是为了提醒未来的自己：这里还有一段思考没做完。",
    takeaway: "随笔模板最重要的字段不是正文长度，而是下一步处理动作。"
  },
  "LN-SN-014": {
    angle: "文献笔记最值得保存的痕迹，是“我在这里和来源发生了什么理解碰撞”，而不是原文被摘下了多少。",
    takeaway: "来源定位、转述和候选永久笔记应该共同出现，形成清楚的转换链。"
  },
  "LN-SN-015": {
    angle: "永久笔记之所以面向未来，是因为它必须能够在不同问题场景下被重新调用，而不是一次性消费。",
    takeaway: "永久笔记的质量应更多由可迁移性决定，而不是由文风完整度决定。"
  },
  "LN-SN-016": {
    angle: "只有写得出关系理由的连接，才会把两条笔记变成一条新的理解路径。",
    takeaway: "关系创建如果不要求理由和洞察问题，用户很快就会回到“随手连线”的旧习惯。"
  },
  "LN-SN-017": {
    angle: "索引与入口点的价值，在于它们能让人重新走回一个复杂主题，而不用每次从全部档案重来。",
    takeaway: "索引卡不仅要列出条目，还要说明为什么按这个顺序进入。"
  },
  "LN-SN-018": {
    angle: "真正有生命力的结构，往往是在处理和连接中慢慢浮出来，而不是一开始就被目录规定好。",
    takeaway: "系统应允许主题成熟度逐步出现，而不是强迫用户先定一个固定分类。"
  },
  "LN-SN-019": {
    angle: "好的实践常常不是大步骤，而是一连串很小、但方向明确的处理决策。",
    takeaway: "产品反馈应该鼓励连续推进，而不是鼓励偶尔高强度整理。"
  },
  "LN-SN-020": {
    angle: "最终写作如果只是来源的拼贴，说明前面的理解与判断阶段并没有真正发生。",
    takeaway: "文章结构必须能回溯到永久笔记，而永久笔记又能回溯到文献笔记。"
  },
  "LN-SN-021": {
    angle: "旧笔记遇到新问题时产生的惊讶，是系统开始自己反馈用户的标志，而不是错误。",
    takeaway: "图谱和索引卡需要让旧材料再次被看见，而不是只把最新内容顶上来。"
  },
  "LN-SN-022": {
    angle: "当收藏动作替代了转化动作，用户会获得一种忙碌感，却失去真正的判断进展。",
    takeaway: "产品要敢于提醒“你保存了很多，但还没有形成观点”。"
  },
  "LN-SN-023": {
    angle: "系统最好的提示不是夸用户做了多少，而是明确告诉用户下一步应该继续哪条思路。",
    takeaway: "界面中的“下一步动作”应成为主反馈，而不是躲在详情深处。"
  },
  "LN-SN-024": {
    angle: "真正成功的流程，不只是给出最终论点，而是能解释论点是怎么一步步长出来的。",
    takeaway: "这正是 demo 数据必须保留来源、转述、判断、关系、索引和写作链路的原因。"
  }
};

const WRITING_SECTION_DETAILS = {
  "sec-1": {
    openQuestion: "这里是否还需要补一个更贴近真实用户的“资料很多却无法开写”的场景片段？",
    gap: "要避免把问题写成泛泛的效率焦虑，必须指出“没形成判断”才是写不出来的根源。",
    counterpoint: "如果用户的真实目标只是保存素材，这一节应如何说明研思录的边界？"
  },
  "sec-2": {
    openQuestion: "这一节是否需要展示一条从文献笔记到写作篮的具体转换路径？",
    gap: "需要把“写作前置”具体落到页面状态和下一步动作，避免停留在方法口号。",
    counterpoint: "如果用户先只想轻量捕捉，这种写作前置设计会不会显得太重？"
  },
  "sec-3": {
    openQuestion: "是否需要补一个“摘录看起来很完整，但仍然不是理解”的反例？",
    gap: "需要说明文献笔记不是过渡废料，而是形成个人理解的真正现场。",
    counterpoint: "如果用户对原文保持高度忠诚，转述是否会让他担心失真？"
  },
  "sec-4": {
    openQuestion: "这里是否要展示一条带边界字段的永久笔记，说明“承担判断”具体长什么样？",
    gap: "需要避免把永久笔记写成格式要求清单，而要说明它如何支撑未来写作。",
    counterpoint: "如果观点还不稳定，什么情况下仍然值得先保存为永久笔记？"
  },
  "sec-5": {
    openQuestion: "是否要补一张关系图截图式路径，展示“关系理由”怎样影响后续写作？",
    gap: "需要说明关系和索引卡不是附加装饰，而是决定能否重新进入主题的结构层。",
    counterpoint: "如果关系还不清楚，系统应该鼓励保留候选，还是要求用户立即定性？"
  },
  "sec-6": {
    openQuestion: "这里是否要加入一个 AI 建议被用户拒绝或重写的例子？",
    gap: "需要把“AI 可以帮忙”与“AI 不能代替确认”之间的边界讲得更具体。",
    counterpoint: "在什么情况下，用户会觉得这些确认步骤太多，进而想把责任交给 AI？"
  },
  "sec-7": {
    openQuestion: "结尾是否需要给出一条可照做的最小起步路径，让 demo 不只是展示而是可模仿？",
    gap: "需要把方法总结回日常动作，避免读者读完后只记住概念而不知道怎么开始。",
    counterpoint: "如果用户没有完整读过原书，这套演示还能否独立教会他开始实践？"
  }
};

function noteNumber(id = "") {
  const match = String(id).match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function pick(list = [], seed = 0, fallback = "") {
  if (!Array.isArray(list) || !list.length) return fallback;
  return list[((seed % list.length) + list.length) % list.length];
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function textValue(value) {
  return String(value || "").trim();
}

function normalizeRelationType(type, relation, index) {
  if (RELATION_TYPE_OVERRIDES[relation.id]) return RELATION_TYPE_OVERRIDES[relation.id];
  const raw = String(type || "").trim().toLowerCase();
  let normalized = LEGACY_RELATION_TYPE_MAP[raw] || raw;
  if (normalized === "supports" && relation.from.startsWith("PN-SN-") && relation.to.startsWith("PN-SN-") && index % 9 === 0) {
    normalized = "complements";
  } else if (normalized === "qualifies" && relation.from.startsWith("PN-SN-") && relation.to.startsWith("PN-SN-") && index % 4 === 0) {
    normalized = "restates";
  } else if (normalized === "same_topic" && relation.from.startsWith("PN-SN-") && relation.to.startsWith("PN-SN-") && index % 5 === 0) {
    normalized = "unexpected_connection";
  } else if (normalized === "precedes" && relation.from.startsWith("PN-SN-") && relation.to.startsWith("PN-SN-") && index % 6 === 0) {
    normalized = "reframes";
  } else if (normalized === "contradicts" && relation.from.startsWith("PN-SN-") && relation.to.startsWith("PN-SN-") && index % 7 === 0) {
    normalized = "contrasts";
  }
  return normalized;
}

function relationReason(type, fromTitle, toTitle) {
  switch (type) {
    case "supports":
      return `“${fromTitle}”给“${toTitle}”补上了更直接的理由或证据；如果拿掉前者，后者的说服力会明显变弱。`;
    case "complements":
      return `“${fromTitle}”和“${toTitle}”处理的是同一问题的不同侧面，把两者并排后，判断会从单线条变成立体结构。`;
    case "contrasts":
      return `“${fromTitle}”与“${toTitle}”形成了必要对照：它们看似靠近，但强调的风险、动作或重心并不相同。`;
    case "contradicts":
      return `“${fromTitle}”对“${toTitle}”构成了真正冲突；沿着前者继续追问，会迫使读者重新检查后者的成立条件。`;
    case "extends":
      return `“${fromTitle}”把“${toTitle}”往前推进了一步：前者不是重复，而是在后者之上多展开了一个新场景或新动作。`;
    case "precedes":
      return `在处理顺序上，“${fromTitle}”应该先于“${toTitle}”；前一步不到位，后一步就容易变成空转。`;
    case "follows":
      return `“${fromTitle}”最好放在“${toTitle}”之后理解，因为前者默认后者已经给出了必要前提。`;
    case "qualifies":
      return `“${fromTitle}”不是推翻“${toTitle}”，而是替它补上边界、适用范围或容易被说过头的地方。`;
    case "example_of":
      return `“${fromTitle}”可以被当成“${toTitle}”的一个具体例子，它把抽象说法压到了更容易检查的场景里。`;
    case "counterexample_to":
      return `“${fromTitle}”是“${toTitle}”的反例：它不一定整体推翻后者，但能暴露后者最容易失效的条件。`;
    case "same_topic":
      return `“${fromTitle}”与“${toTitle}”明显属于同一主题，但现在还不足以直接判断是支撑、限定还是反驳。`;
    case "unexpected_connection":
      return `“${fromTitle}”与“${toTitle}”看上去距离较远，但并置之后会意外暴露一个值得继续追问的新问题。`;
    case "bridges":
      return `“${fromTitle}”可以把“${toTitle}”所在问题域接进当前主线；它们之间这条边的价值，在于补上读者会卡住的中间台阶。`;
    case "restates":
      return `“${fromTitle}”像是在用另一种语气重述“${toTitle}”；两者判断接近，但入口和强调点不同。`;
    case "reframes":
      return `“${fromTitle}”把“${toTitle}”改写成了另一种问题框架，因此能帮助读者从不同角度重新进入同一材料。`;
    case "appears_in_draft":
      return `“${fromTitle}”已经进入最终文章路径；这条边记录的是它在写作中的实际出场，而不是只停留在档案里。`;
    case "belongs_to_topic":
      return `“${fromTitle}”归到“${toTitle}”这条关键笔记之下，说明它服务的是同一个中心问题，而不是孤立保存的一条材料。`;
    case "duplicates":
      return `“${fromTitle}”与“${toTitle}”已经出现明显重叠；保留这条边是为了提醒后续合并、拆分或重写。`;
    default:
      return `“${fromTitle}”与“${toTitle}”之间存在需要被显式说明的关系，这条边用于保留后续追问入口。`;
  }
}

function relationQuestion(type, fromTitle, toTitle) {
  switch (type) {
    case "supports":
      return `如果暂时拿掉“${fromTitle}”，“${toTitle}”还剩下哪些理由能够继续站住？`;
    case "complements":
      return `把“${fromTitle}”和“${toTitle}”放在一起后，哪一个被忽略的侧面开始变得可见？`;
    case "contrasts":
      return `“${fromTitle}”与“${toTitle}”最容易被混成同一句话的地方，到底差在哪里？`;
    case "contradicts":
      return `如果同时接受“${fromTitle}”和“${toTitle}”，哪一个判断会先出现逻辑冲突？`;
    case "extends":
      return `“${fromTitle}”究竟把“${toTitle}”推进到了哪个原本没有被说出的新场景？`;
    case "precedes":
      return `为什么“${fromTitle}”必须先发生，后面才轮得到“${toTitle}”？`;
    case "follows":
      return `理解“${fromTitle}”之前，读者必须先从“${toTitle}”拿到什么前提？`;
    case "qualifies":
      return `“${fromTitle}”到底替“${toTitle}”补上了哪条边界或失败条件？`;
    case "example_of":
      return `“${fromTitle}”把“${toTitle}”这条抽象判断落到了哪个可检查的例子里？`;
    case "counterexample_to":
      return `“${fromTitle}”暴露了“${toTitle}”在哪种条件下会失效或被说过头？`;
    case "same_topic":
      return `“${fromTitle}”和“${toTitle}”虽然同题，但下一步最该补的是支撑、限定还是冲突？`;
    case "unexpected_connection":
      return `“${fromTitle}”与“${toTitle}”这条意外相关，真正打开的新问题是什么？`;
    case "bridges":
      return `在“${fromTitle}”与“${toTitle}”之间，读者原本会卡住的那个推理台阶到底是什么？`;
    case "restates":
      return `“${fromTitle}”和“${toTitle}”只是换句话说，还是它们其实各自承担了不同入口？`;
    case "reframes":
      return `“${fromTitle}”把“${toTitle}”从哪一种问题框架改写成了另一种？`;
    case "appears_in_draft":
      return `“${fromTitle}”进入文章后，它承担的是证据、转折、边界还是结论角色？`;
    case "belongs_to_topic":
      return `“${fromTitle}”为什么更适合归到“${toTitle}”这条主线，而不是独立成另一条主题？`;
    case "duplicates":
      return `“${fromTitle}”与“${toTitle}”到底应该合并、拆开，还是分别承担不同复用场景？`;
    default:
      return `“${fromTitle}”与“${toTitle}”之间还缺哪一步说明，关系才算真正成立？`;
  }
}

function focusForTitle(title = "") {
  const text = String(title);
  if (/写作|文章|段落|草稿|prompt/i.test(text)) return "写作入口与论证承接";
  if (/随笔|捕捉|记录|清理/.test(text)) return "快速捕捉与后续处理承诺";
  if (/摘录|转述|文献|来源|原文/.test(text)) return "从材料到个人理解的所有权迁移";
  if (/永久笔记|判断|观点|边界|反例/.test(text)) return "可承担判断、来源与边界";
  if (/关系|图谱|链接|桥接|张力|冲突/.test(text)) return "关系理由、冲突保留与图谱可读性";
  if (/索引卡|主题|入口|结构/.test(text)) return "中心问题、进入顺序与主题组织";
  if (/反馈|习惯|复盘|持续|队列/.test(text)) return "处理节奏与反馈连续性";
  if (/收藏|导入|高亮|指标|进度/.test(text)) return "虚假进展与正确指标";
  if (/AI|作者|确认|推理路径/.test(text)) return "AI 建议与作者责任边界";
  return "材料如何转成可复用判断";
}

function relationSectionLines(noteId, relations, titlesById) {
  const lines = [];
  for (const relation of relations.slice(0, 4)) {
    const fromSelf = relation.from === noteId;
    const otherId = fromSelf ? relation.to : relation.from;
    const otherTitle = titlesById.get(otherId) || otherId;
    const typeLabel = RELATION_TYPE_LABELS[relation.relationType] || relation.relationType;
    const verb = fromSelf ? "指向" : "来自";
    lines.push(`- ${typeLabel} ${verb} ${otherId}: ${otherTitle}`);
  }
  return lines.length ? lines : ["- 待补充与相邻笔记的显式关系。"];
}

function buildLiteratureBody(note, detail, keyNoteTitle, clusterMeta) {
  const candidates = asArray(note.candidate_permanent_notes)
    .map((id) => `- ${id}: ${keyNoteTitle.get(id) || id}`)
    .join("\n");
  const questions = asArray(note.questions).map((item) => `- ${item}`).join("\n");
  const knowledge = asArray(note.knowledge_points).map((item) => `- ${item}`).join("\n");
  return [
    `# ${note.title}`,
    "",
    "## 来源",
    `${note.source_id} · ${note.locator}`,
    "",
    "## 引文边界",
    note.quote_text,
    "",
    "## 我的转述",
    note.paraphrase_text,
    "",
    "## 知识点提取",
    knowledge,
    "",
    "## 和当前模板的对应",
    "- 来源边界：只保留主题、定位和转化方向，不复刻原文。",
    "- 原创转述：必须说明这条材料为什么值得被继续处理。",
    "- 候选判断：把它可能沉淀成的永久笔记提前写出来。",
    "- 待追问问题：为下一轮处理留下明确入口。",
    "",
    "## 我的收获",
    note.my_takeaway,
    "",
    "## 可转换为永久笔记",
    candidates || "- 待确认",
    "",
    "## 转换判断",
    note.conversion_decision.conversion_reason,
    "",
    "## 待追问问题",
    questions || `- ${clusterMeta.questionSeed}`,
    "",
    `## Demo 检查点`,
    `- 这条文献笔记是否已经把“${focusForTitle(note.title)}”从来源材料翻成用户自己的处理动作？`,
    `- 它是否为后续永久笔记提供了清楚的候选入口，而不是停留在“保存了一条材料”？`
  ].join("\n");
}

function buildPermanentBody(note, sourceTitles, indexTitles, relationLines, clusterMeta, keyNoteTitle) {
  const summary = asArray(note.threeLineSummary).map((item) => `- ${item}`).join("\n");
  const methodPrinciple = textValue(note.knowledge_point?.method_principle || note.knowledge_point?.principle);
  const misuseToAvoid = textValue(note.knowledge_point?.misuse_to_avoid);
  const productRequirement = textValue(note.knowledge_point?.product_requirement);
  const sourceTrace = sourceTitles.length
    ? sourceTitles.map((item) => `- ${item}`).join("\n")
    : "- 暂无文献笔记追溯";
  const indexTrace = indexTitles.length
    ? indexTitles.map((item) => `- ${item}`).join("\n")
    : "- 暂未进入索引卡";
  const keyPlacement = note.is_key_note
    ? `这是 ${note.cluster_label} 的关键笔记，用来把该组知识点引到中心问题与索引卡入口。`
    : `这条笔记服务于 ${note.supports_key_note_id}：${keyNoteTitle}，负责把一个更小、更具体的判断送进主线。`;
  return [
    `# ${note.title}`,
    "",
    "## 核心论点",
    note.core_claim,
    "",
    "## 知识点提取",
    `- 方法论命题：${methodPrinciple}`,
    `- 本笔记承担的子问题：${note.title}`,
    `- 反面误用：${misuseToAvoid}`,
    `- 产品设计要求：${productRequirement}`,
    `- 所属知识点：${note.knowledge_point.id} ${note.knowledge_point.label}`,
    "",
    "## 三句话压缩",
    summary,
    "",
    "## 论证理由",
    note.rationale,
    "",
    "## 来源追溯",
    sourceTrace,
    "",
    "## 转换过程",
    `- 原始材料先在 ${sourceTitles[0] ? sourceTitles[0].replace(/^- /, "") : "文献笔记"} 中被转述和边界化。`,
    `- 这里进一步把“${focusForTitle(note.title)}”压成单一、可承担的判断：${note.core_claim}。`,
    `- 这条判断随后进入索引与写作链路：`,
    indexTrace,
    "",
    "## 关联关系",
    ...relationLines,
    "",
    "## 产品含义",
    note.productImplication,
    "",
    "## 使用场景",
    note.use_case,
    "",
    "## 关键笔记定位",
    keyPlacement,
    "",
    "## 边界或反例",
    note.boundaryOrCounterpoint,
    "",
    "## 下一步追问",
    note.next_question
  ].join("\n");
}

function buildEssayBody() {
  return [
    "# 为什么研思录不是普通笔记软件",
    "",
    "## 1. 保存很多资料，为什么仍然写不出来",
    "很多笔记产品默认把“保存下来”当成成功。但真正让知识工作者卡住的，往往不是资料不够，而是资料没有变成自己愿意承担的判断。资料越多，未处理的库存越大，空白页焦虑也就越强。",
    "",
    "## 2. 《卡片笔记写作法》给我们的启发，不是复制卡片形式",
    "这套 demo 想展示的不是某种笔记外形，而是一条从来源到文章的转换链。来源负责边界，文献笔记负责转述，永久笔记负责判断，关系负责解释连接，索引卡负责重返问题，写作项目负责把判断组织成结构。",
    "",
    "## 3. 为什么写作应该被前置",
    "一条材料一进入系统，就应该带着“它以后要支持什么问题、进入什么判断、还差哪一步”的信息。这样写作就不再是最后临时拼装，而是贯穿在阅读、整理、连接和重写中的持续动作。",
    "",
    "## 4. 文献笔记不是摘录容器，而是理解现场",
    "如果用户只是把原文搬进系统，理解其实还停留在作者那里。文献笔记真正要留下的，是来源边界、我的转述、我为什么觉得它重要，以及它可能转成哪几条永久笔记。这一步决定了材料是否开始成为“我的思考”。",
    "",
    "## 5. 永久笔记为什么是这套系统的核心",
    "永久笔记不是漂亮摘要，而是一条用户愿意承担的判断。它必须有核心论点、三句话压缩、来源追溯、边界或反例，以及清楚的下一步问题。只有这样的笔记，才有资格进入索引卡、图谱和写作项目。",
    "",
    "## 6. 关系和索引卡，决定系统会不会“回答回来”",
    "笔记数量不会自动变成理解网络。真正让系统开始反馈用户的，是有理由的关系和围绕中心问题组织的索引卡。关系说明为什么连接，索引卡说明从哪里重新进入。它们共同把档案从堆积状态变成可重返的思考场。",
    "",
    "## 7. AI 可以帮忙，但不能替用户承担判断",
    "AI 适合做的是追问、对照、暴露缺口和生成候选。它可以提示哪些关系值得看、哪些笔记可能重复、哪些论点还缺边界。但只要进入永久笔记确认、关系确认和文章立场，责任就必须重新回到用户身上。",
    "",
    "## 8. 这份 demo 想教给用户的最小实践",
    "先确定来源边界；再写一条真正属于自己的文献转述；从中沉淀出一条永久笔记；给它补上理由、边界和关系；把几条成熟判断组织成索引卡；最后再进入写作。研思录不是帮用户记更多，而是帮用户把材料一步步变成自己的判断与文章。",
    "",
    "## 9. 所以，研思录不是普通笔记软件",
    "它不是一个更大的收藏箱，也不是一个会自动写作的提示框。它更像一台思考工作台：让材料、转述、判断、关系、索引和写作彼此接力，并且把这条路径完整保留下来，供用户反复进入、修正和复用。"
  ].join("\n");
}

async function main() {
  const fixture = JSON.parse(await fs.readFile(FIXTURE_PATH, "utf8"));
  const titlesById = new Map();
  for (const listName of ["sources", "fleeting_notes", "literature_notes", "permanent_notes", "index_cards", "writing_projects", "draft_scaffolds", "final_essays", "guide_notes"]) {
    for (const item of asArray(fixture[listName])) {
      if (item?.id) titlesById.set(item.id, item.title || item.id);
    }
  }

  const knowledgeById = new Map(asArray(fixture.knowledge_extraction?.knowledge_points).map((item) => [item.id, item]));
  const keyNoteMap = new Map(asArray(fixture.key_notes).map((item) => [item.cluster, item.note_id]));
  const permanentById = new Map(asArray(fixture.permanent_notes).map((item) => [item.id, item]));
  const indexById = new Map(asArray(fixture.index_cards).map((item) => [item.id, item]));
  const literatureById = new Map(asArray(fixture.literature_notes).map((item) => [item.id, item]));

  fixture.relations = asArray(fixture.relations).map((relation, index) => {
    const normalizedType = normalizeRelationType(relation.relationType, relation, index);
    const fromTitle = titlesById.get(relation.from) || relation.from;
    const toTitle = titlesById.get(relation.to) || relation.to;
    return {
      ...relation,
      relationType: normalizedType,
      rationale: relationReason(normalizedType, fromTitle, toTitle),
      insight_question: relationQuestion(normalizedType, fromTitle, toTitle)
    };
  });

  const relationsByNote = new Map();
  for (const relation of fixture.relations) {
    if (!relationsByNote.has(relation.from)) relationsByNote.set(relation.from, []);
    if (!relationsByNote.has(relation.to)) relationsByNote.set(relation.to, []);
    relationsByNote.get(relation.from).push(relation);
    relationsByNote.get(relation.to).push(relation);
  }

  fixture.literature_notes = asArray(fixture.literature_notes).map((note, index) => {
    const knowledgePointId = asArray(note.knowledge_point_ids)[0];
    const point = knowledgeById.get(knowledgePointId);
    const clusterMeta = CLUSTER_META[point?.cluster] || CLUSTER_META.writing_first;
    const detail = LITERATURE_DETAILS[note.id];
    const candidates = asArray(note.candidate_permanent_notes);
    const keyTargetId = candidates[0];
    const focus = focusForTitle(note.title);
    const paraphraseText = [
      `围绕“${note.title}”这一主题，真正需要被用户处理的不是多记一条材料，而是把“${focus}”翻成下一步可执行的判断动作。`,
      detail.angle,
      `换句话说，这条材料只有在用户能说明它准备支撑哪条永久笔记、要回答哪个问题时，才算真正进入了系统。`
    ].join("");
    const myTakeaway = `${detail.takeaway} 这条文献笔记最适合用来演示 ${clusterMeta.surface} 是怎样接住一条来源材料的。`;
    const keyTitleMap = new Map(asArray(fixture.permanent_notes).map((item) => [item.id, item.title]));
    const questions = [
      note.user_question,
      `如果把这条材料转成 ${keyTargetId}，我真正愿意承担的那一句判断是什么？`
    ];
    const conversionReason = `它已经把“${focus}”从来源主题翻成了可继续承担的判断入口，适合沉淀到 ${keyTargetId} 所在主线，而不是停留在材料摘录层。`;
    const updated = {
      ...note,
      paraphrase_text: paraphraseText,
      my_takeaway: myTakeaway,
      questions,
      quote_text: `本样例不复刻书中原文；此处只记录主题边界：${note.title}。`,
      body: "",
      conversion_decision: {
        ...(note.conversion_decision || {}),
        target_template: "permanent_note",
        conversion_reason: conversionReason,
        key_note_id: keyTargetId
      }
    };
    updated.body = buildLiteratureBody(updated, detail, keyTitleMap, clusterMeta);
    return updated;
  });

  fixture.permanent_notes = asArray(fixture.permanent_notes).map((note, index) => {
    const point = note.knowledge_point || knowledgeById.get(note.knowledge_point?.id);
    const methodPrinciple = textValue(point?.method_principle || point?.principle);
    const clusterMeta = CLUSTER_META[note.cluster] || CLUSTER_META.writing_first;
    const keyNoteId = keyNoteMap.get(note.cluster);
    const keyNoteTitle = permanentById.get(keyNoteId)?.title || keyNoteId;
    const sourceNoteIds = asArray(note.from_literature_note_ids);
    const sourceTitles = sourceNoteIds.map((id) => {
      const lit = literatureById.get(id);
      return lit ? `${id}: ${lit.title}` : `${id}`;
    });
    const indexIds = asArray(note.related_index_ids);
    const indexTitles = indexIds.map((id) => {
      const card = indexById.get(id);
      return card ? `${id}: ${card.title}` : `${id}`;
    });
    const roleLine = note.is_key_note
      ? `这条笔记把“${note.cluster_label}”压成一个能带动整组笔记继续生长的中心判断。`
      : `这条笔记把“${note.cluster_label}”里的一个局部风险或动作拆出来，方便单独复用、比较和进入写作。`;
    const actionLine = `在研思录里，它最直接影响的是 ${clusterMeta.surface}。`;
    const rationale = note.is_key_note
      ? `作为 ${note.cluster_label} 的锚点，这条判断把“${methodPrinciple}”与“${note.key_question}”接到一起。它不是在解释一本书，而是在给后续笔记和页面设计提供统一检验标准。`
      : `这条笔记从 ${sourceTitles[0] ? sourceTitles[0].replace(/^- /, "") : "上游材料"} 中抽出一个更小但更可执行的主张：当我们讨论“${note.title}”时，真正要落地的是“${focusForTitle(note.title)}”。它服务于 ${keyNoteTitle} 这条主线，因此比大而全的总结更适合进入索引卡和写作项目。`;
    const productImplication = `${clusterMeta.summaryLine} 因而在产品中，${clusterMeta.surface} 必须把“${note.title}”对应的处理动作解释清楚，而不是只展示状态名。`;
    const boundary = `${clusterMeta.boundary} 对“${note.title}”这条判断来说，真正需要防止的是把它说成没有条件、没有顺序、也没有反例的万能原则。`;
    const useCase = `${clusterMeta.scenario} 这条笔记特别适合检查“${note.title}”有没有被页面、关系或索引结构正确承接。`;
    const nextQuestion = `${clusterMeta.questionSeed} 对“${note.title}”而言，下一步最值得补的是哪条反例、哪条关系，或哪张索引卡入口？`;
    const noteRelations = relationsByNote.get(note.id) || [];
    const relationLines = relationSectionLines(note.id, noteRelations, titlesById);
    const updated = {
      ...note,
      thesis: note.title,
      core_claim: note.title,
      threeLineSummary: [
        `${note.title}。`,
        roleLine,
        actionLine
      ],
      productImplication,
      boundaryOrCounterpoint: boundary,
      rationale,
      use_case: useCase,
      next_question: nextQuestion,
      template_completion: {
        has_core_claim: true,
        has_rationale: true,
        has_source_trace: sourceNoteIds.length > 0,
        has_boundary: true,
        has_relation_context: noteRelations.length > 0
      }
    };
    updated.body = buildPermanentBody(updated, sourceTitles, indexTitles, relationLines, clusterMeta, keyNoteTitle);
    return updated;
  });

  fixture.index_cards = asArray(fixture.index_cards).map((card, index) => {
    const itemDetails = asArray(card.items).map((item, itemIndex) => {
      const note = permanentById.get(item.note_id);
      const key = itemIndex === 0
        ? "先用它定锚中心问题。"
        : itemIndex === asArray(card.items).length - 1
          ? "把主题收束到后续写作或追问入口。"
          : `补上这组主题里的第 ${itemIndex + 1} 层判断，避免中心问题被一句话讲完。`;
      return {
        ...item,
        short_label: note?.title || item.short_label,
        rationale: `${key} 这里重点检查“${note?.title || item.note_id}”如何服务“${card.central_question}”。`
      };
    });
    const keyTitles = asArray(card.key_note_ids).map((id) => permanentById.get(id)?.title || id).join("、");
    return {
      ...card,
      threeLineSummary: [
        `${card.title}。`,
        `这张索引卡围绕“${card.central_question}”组织一组已经成熟的永久笔记，而不是只做主题收纳。`,
        `它的真正用途是让用户以后能从 ${keyTitles} 重新进入这个问题，而不用从整库重读。`
      ],
      summary: `围绕“${card.central_question}”，先由关键笔记定锚，再按条目顺序展开支撑、边界、反例与后续追问。这张索引卡用于演示主题如何从永久笔记网络中涌现，而不是先被目录规定。`,
      items: itemDetails
    };
  });

  fixture.writing_projects = asArray(fixture.writing_projects).map((project) => ({
    ...project,
    goal: "写一篇可以直接给新用户阅读的完整 demo 文章，说明研思录为什么不是资料仓库，而是一条把材料转成判断、关系、索引与写作路径的思考工作台。",
    intent: "用产品经理视角把《卡片笔记写作法》的方法论拆成可观察的产品设计：来源边界、文献转述、永久判断、显式关系、索引入口和写作承接。",
    target_reader: "保存了很多资料却总觉得写不出来的知识工作者、内容创作者、研究型产品经理与第一次接触卡片笔记法的新用户。",
    desired_reader_takeaway: "用户读完后应该能说清楚：研思录不是帮我存更多，而是逼我把材料变成自己愿意承担的判断，并把这条判断一路带进关系、索引和文章。"
  }));

  fixture.draft_scaffolds = asArray(fixture.draft_scaffolds).map((scaffold) => ({
    ...scaffold,
    version_note: "Demo scaffold regenerated from the current literature-note and permanent-note templates.",
    sections: asArray(scaffold.sections).map((section) => {
      const detail = WRITING_SECTION_DETAILS[section.id];
      return {
        ...section,
        open_questions: [detail.openQuestion],
        gaps: [detail.gap],
        counterpoints: [detail.counterpoint]
      };
    }),
    key_note_path: asArray(scaffold.key_note_path).map((item) => ({
      ...item,
      writing_use: `在写作中，${item.note_id} 会先承担“${item.label}”这一组问题的入口判断，再把读者送往对应索引卡与段落结构。`
    }))
  }));

  fixture.final_essays = asArray(fixture.final_essays).map((essay) => ({
    ...essay,
    body: buildEssayBody()
  }));

  fixture.guide_notes = asArray(fixture.guide_notes).map((guide) => ({
    ...guide,
    title: "00-先从这里开始：五步走完整流程",
    body: [
      "# 00-先从这里开始：五步走完整流程",
      "",
      "这个 Demo 不是《卡片笔记写作法》的替代摘要，而是一条可以动手走完的路径：材料怎样变成自己的判断，判断怎样进入关系网，关系怎样变成主题索引笔记和写作提纲。",
      "",
      "## 第一次打开先走五步",
      "",
      "1. 先看一条材料如何变成永久笔记：打开 `SRC-SMART-NOTES`，再看 `FN-SN-001`、`LN-SN-001` 和 `PN-SN-001`。你要看的不是格式，而是一本书里的想法怎样先被转述，再变成“我愿意承担的一句话判断”。",
      "2. 再让一条未关联笔记进入关系网：打开 `PN-SN-101`。找一条真正相关的旧笔记，选择它们的关系，写一句“为什么要这样连”，再保存。保存以后，它就不只是单独放着的一张卡片，而是能和旧判断互相解释。",
      "3. 接着看多条永久笔记如何形成主题索引笔记：打开 `IC-SN-001`、`IC-SN-005` 或 `IC-SN-010`。先读中心问题，再按顺序读里面列出的永久笔记。主题索引笔记不是文章，它只是一个入口，帮你下次重新进入同一个问题。",
      "4. 然后从主题索引进入写作中心生成提纲：打开写作项目 `WP-SN-PM-001`，再看 `DS-SN-PM-001`。重点看主题索引笔记和永久笔记怎样被放进写作项目，形成提纲和草稿骨架。",
      "5. 最后做一次定期回顾：检查有没有孤立笔记、过宽标签、没有理由的关系，以及已经可以写成文章的主题。回顾的目的不是大整理，而是决定下一步最该补哪一个小动作。",
      "",
      "## 卢曼方法在这里怎么落地",
      "",
      "卢曼式卡片盒的核心，不是把笔记写得漂亮，也不是把分类做得很细。它要求每条新判断都尽快进入已有网络，并且让旧笔记在新问题里重新变得有用。",
      "",
      "在研思录里，这件事被拆成几个能照做的动作：来源材料说明边界，文献笔记用自己的话转述，永久笔记沉淀判断，关系说明连接理由，主题索引笔记提供入口，写作中心把已有判断组织成提纲。",
      "",
      "## 什么是好关系",
      "",
      "关联笔记不是把两个标题放在一起，也不是因为标签相同就连线。它要回答一个很朴素的问题：这两条笔记放在一起，能让哪个判断更清楚？",
      "",
      "一条值得保存的关系至少要说清楚一种动作：它支持另一条笔记、反驳另一条笔记、限制另一条笔记、补上中间桥梁，或帮助以后写出一个段落。",
      "",
      "## 什么时候建立主题索引笔记",
      "",
      "不要等资料全部读完才建立主题索引。更好的时机是：已经有 3 到 7 条永久笔记围绕同一个问题，至少有一条支持关系，至少有一条边界、反例或张力，还有一个值得继续追问的问题。",
      "",
      "达到这个状态，就可以先建一张主题索引笔记。它不是文章，也不是最终结论，而是一个入口：下次你想继续这个问题时，可以从这里重新进入。",
      "",
      "## 如何定期回顾",
      "",
      "每周或每隔几天，用 10 分钟看四类东西就够了：孤立笔记有没有进入关系网；标签是不是大到什么都能放进去；关系有没有写清为什么；主题索引笔记里有没有已经可以写成文章的主题。",
      "",
      "回顾不是为了把系统收拾整齐，而是为了让下一步动作变得清楚。",
      "",
      "这个 Demo 的重点不是研思录能保存多少材料，而是它能不能帮助你持续完成三件事：写出自己的判断，给判断建立有理由的关系，再把关系组织成可以重新进入、可以写作的主题。"
    ].join("\n")
  }));

  fixture.graph = {
    ...fixture.graph,
    mermaid: `flowchart LR\n${fixture.relations.map((relation) => `  ${relation.from.replace(/[^a-z0-9]+/gi, "_")} -->|${relation.relationType}| ${relation.to.replace(/[^a-z0-9]+/gi, "_")}`).join("\n")}`,
    relation_type_counts: fixture.relations.reduce((accumulator, relation) => {
      accumulator[relation.relationType] = (accumulator[relation.relationType] || 0) + 1;
      return accumulator;
    }, {})
  };

  await fs.writeFile(FIXTURE_PATH, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  console.log(`Refreshed ${FIXTURE_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
