import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const fixturePath = path.join(repoRoot, "tests", "fixtures", "demo-smart-notes-product-thinking", "demo.json");
const demo = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

const generatedIds = new Set([
  "PERM-CAPTURE-IS-INBOX-NOT-KNOWLEDGE",
  "PERM-LITERATURE-NOTE-KEEPS-SOURCE-BOUNDARY",
  "PERM-OWN-WORDS-ARE-FIRST-THINKING",
  "PERM-ATOMIC-NOTE-ANSWERS-ONE-QUESTION",
  "PERM-TITLE-SHOULD-BE-A-CLAIM",
  "PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION",
  "PERM-SUPPORT-RELATION-BECOMES-EVIDENCE",
  "PERM-CONTRAST-RELATION-CREATES-ARGUMENT",
  "PERM-LIMIT-RELATION-PROTECTS-OVERCLAIM",
  "PERM-BRIDGE-RELATION-FINDS-NEW-THEME",
  "PERM-EXAMPLE-RELATION-MAKES-ABSTRACT-USABLE",
  "PERM-GAP-RELATION-POINTS-TO-NEXT-READING",
  "PERM-RELATION-REASON-WRITES-FUTURE-PARAGRAPH",
  "PERM-INDEX-CARD-STARTS-WITH-CENTRAL-QUESTION",
  "PERM-INDEX-CARD-KEEPS-READING-ORDER",
  "PERM-INDEX-CARD-IS-LIVING-OUTLINE",
  "PERM-TAGS-ARE-FAST-FILTERS-INDEXES-ARE-QUESTIONS",
  "PERM-WRITING-USES-RELATION-ROLES",
  "PERM-OUTLINE-NEEDS-EVIDENCE-COUNTERPOINT-BOUNDARY",
  "PERM-DRAFT-SHOULD-KEEP-NOTE-TRACE",
  "PERM-HELP-ARTICLES-CAN-BE-DEMO-OUTPUT",
  "PERM-HOME-AS-DAILY-DESK",
  "PERM-DEMO-IS-PRACTICE-GROUND",
  "PERM-AI-SHOULD-ASK-FOR-CONFIRMATION",
  "THEME-RELATION-TYPES-TO-WRITING",
  "THEME-INDEX-NOTE-PRACTICE",
  "THEME-WRITING-FROM-RELATIONS",
  "THEME-YANSILU-DAILY-PATH",
  "THEME-AI-HUMAN-CONFIRMATION",
  "THEME-DEMO-AS-HELP",
  "WRITE-RELATION-TO-WRITING-PRACTICE",
  "DRAFT-RELATION-TO-WRITING-PRACTICE",
  "ESSAY-RELATION-TYPES-HELP",
  "ESSAY-YANSILU-BEST-PRACTICE",
  "GUIDE-RELATION-TYPES",
  "GUIDE-INDEX-PRACTICE",
  "GUIDE-WRITING-FROM-RELATIONS",
  "GUIDE-DEMO-PRACTICE"
]);

for (const key of ["permanent_notes", "index_cards", "writing_projects", "draft_scaffolds", "final_essays", "guide_notes"]) {
  demo[key] = (demo[key] || []).filter((item) => !generatedIds.has(item.id));
}
demo.relations = (demo.relations || []).filter((item) => !String(item.id || "").startsWith("REL-DEMO-"));

demo.title = "Smart Notes Demo：卡片笔记写作法 x 研思录";
demo.purpose =
  "给第一次使用者一套可试错的样例：从首页处理一条材料，建一条关系，进入主题和写作中心。";

function note({
  id,
  title,
  cluster,
  clusterLabel,
  thesis,
  summary,
  why,
  boundary,
  product,
  writing,
  links = []
}) {
  const linkText = links.length
    ? links.map((item) => `- [[${item}]]`).join("\n")
    : "- 回到主题索引，继续找能回答同一个问题的笔记。";
  return {
    id,
    note_type: "permanent",
    title,
    cluster,
    cluster_label: clusterLabel,
    status: "active",
    distillation_status: "confirmed",
    thesis,
    threeLineSummary: summary,
    productImplication: product,
    boundaryOrCounterpoint: boundary,
    tags: ["永久笔记", clusterLabel, "Smart Notes Demo"],
    body: `# ${title}

## 核心论点
${thesis}

## 三句话压缩
- ${summary[0]}
- ${summary[1]}
- ${summary[2]}

## 为什么重要
${why}

## 在研思录里怎么用
${product}

## 边界或反例
${boundary}

## 写作时怎么用
${writing}

## 可以继续看的笔记
${linkText}

## 下一步动作
把这条笔记和一条相邻笔记建立关系，并用一句话写清楚为什么相关。`,
    core_claim: thesis,
    rationale: why,
    use_boundary: boundary,
    writing_use: writing,
    template: { type: "permanent_note" }
  };
}

const newPermanentNotes = [
  note({
    id: "PERM-CAPTURE-IS-INBOX-NOT-KNOWLEDGE",
    title: "记录是入口，不是知识本身",
    cluster: "capture",
    clusterLabel: "记录入口",
    thesis: "一条随笔只说明你抓住了材料，还不能说明它已经变成知识。",
    summary: ["随笔的价值是把现场、灵感和问题先留下。", "它必须被转述、判断或关联，才会进入长期知识网络。", "首页应该提醒用户处理下一条，而不是奖励无限收藏。"],
    why: "很多新手失败不是因为记得太少，而是把“已经收藏”误认为“已经理解”。",
    boundary: "有些灵感可以短暂停留在随笔里；问题是不能长期堆在那里。",
    product: "首页把待处理材料放在最前面，让用户每天从一个小动作开始。",
    writing: "写作时可以用它解释为什么研思录不把收集数量当成核心指标。",
    links: ["随笔是捕捉点，不是知识点", "首页应该奖励处理，而不是奖励收藏"]
  }),
  note({
    id: "PERM-LITERATURE-NOTE-KEEPS-SOURCE-BOUNDARY",
    title: "文献笔记要保留来源边界",
    cluster: "paraphrase",
    clusterLabel: "转述理解",
    thesis: "文献笔记必须让用户分清“作者说了什么”和“我理解成什么”。",
    summary: ["来源边界能防止把别人的观点误当成自己的判断。", "转述不是复制，而是第一次理解检查。", "永久笔记可以引用来源，但不能被来源替代。"],
    why: "卡片笔记法强调用自己的话工作，来源边界让这件事可检查。",
    boundary: "保留来源不等于做学术脚注系统；Demo 只保留足够回看和追溯的信息。",
    product: "文献笔记模板应把摘录、转述、候选永久笔记分开。",
    writing: "写作时它能提供出处、例子和论证来源，但观点仍要来自永久笔记。",
    links: ["文献笔记要先转述，再沉淀判断", "摘录不等于理解"]
  }),
  note({
    id: "PERM-OWN-WORDS-ARE-FIRST-THINKING",
    title: "用自己的话重说，是第一次思考",
    cluster: "paraphrase",
    clusterLabel: "转述理解",
    thesis: "把材料重说成自己的语言，是从收藏走向理解的第一步。",
    summary: ["复制能保存信息，但不能证明理解。", "重说会暴露自己没看懂的地方。", "只有重说之后，才容易提炼成一条永久笔记。"],
    why: "新手常把“高亮很多句子”当成阅读成果，而真正的成果是能不能说清它解决什么问题。",
    boundary: "有些原文值得保留，但原文应服务于判断，而不是替代判断。",
    product: "导入 Demo 后，用户能看到文献笔记如何进入永久笔记。",
    writing: "写作时可作为“为什么不要直接从摘录开始写”的论据。",
    links: ["文献笔记要先转述，再沉淀判断", "摘录不等于理解"]
  }),
  note({
    id: "PERM-ATOMIC-NOTE-ANSWERS-ONE-QUESTION",
    title: "一条永久笔记最好只回答一个问题",
    cluster: "permanent",
    clusterLabel: "永久笔记",
    thesis: "永久笔记越像一个可复用判断，越应该只回答一个清楚问题。",
    summary: ["一条笔记塞太多观点，会让以后建联和写作都变难。", "一个问题对应一个判断，关系理由才容易写清。", "多个判断可以通过主题索引重新组织。"],
    why: "原子化不是追求碎片，而是让笔记以后能被不同主题复用。",
    boundary: "复杂思想可以拆成多条永久笔记，再用主题索引串起来。",
    product: "永久笔记详情应突出论点、理由、边界和相关笔记。",
    writing: "写作中心可以把多条原子判断组合成段落，而不是把一条大笔记硬拆。",
    links: ["永久笔记是一条用户愿意承担的判断", "主题索引不是文件夹，而是问题入口"]
  }),
  note({
    id: "PERM-TITLE-SHOULD-BE-A-CLAIM",
    title: "永久笔记标题应该像一句判断",
    cluster: "permanent",
    clusterLabel: "永久笔记",
    thesis: "永久笔记标题最好直接表达判断，而不是只写主题名。",
    summary: ["“关系”太宽，“关系理由比连线本身更重要”更有方向。", "判断型标题能让用户在列表里快速回想这条笔记的立场。", "它也更容易进入主题索引和写作提纲。"],
    why: "标题是笔记再次被发现时最先出现的线索。标题模糊，旧笔记就很难复用。",
    boundary: "有些探索中的笔记可以先用临时标题，但确认后应该改成判断。",
    product: "Demo 永久笔记尽量用人话标题，避免内部编号和术语堆叠。",
    writing: "写作时，判断型标题常常可以直接变成段落中心句。",
    links: ["永久笔记是一条用户愿意承担的判断", "一条永久笔记最好只回答一个问题"]
  }),
  note({
    id: "PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION",
    title: "关系类型是在告诉未来自己怎么读这两条笔记",
    cluster: "relation",
    clusterLabel: "关系管理",
    thesis: "关系类型不是给图谱上色，而是在提醒未来自己该如何把两条笔记一起读。",
    summary: ["支持关系提醒你找论据。", "反驳或限定关系提醒你不要过度下结论。", "桥接关系提醒你可能发现一个新主题。"],
    why: "同样两条笔记，关系类型不同，后续产生的洞察和文章结构也不同。",
    boundary: "类型不必过细；新手先用少数几类高价值关系就够了。",
    product: "建联界面应让用户先选类型，再写一句为什么相关。",
    writing: "写作时关系类型可以变成段落角色：证据、反方、限制、例子或过渡。",
    links: ["关系理由比连线本身更重要", "关系类型会改变以后发现新东西的方式"]
  }),
  note({
    id: "PERM-SUPPORT-RELATION-BECOMES-EVIDENCE",
    title: "支持关系以后会变成文章里的证据",
    cluster: "relation",
    clusterLabel: "关系管理",
    thesis: "当一条笔记支持另一条笔记时，它通常能在写作中承担证据角色。",
    summary: ["支持关系回答“为什么这个判断站得住”。", "它适合连接原则和例子、判断和来源、主张和观察。", "写作中心可以把支持关系转成论据段。"],
    why: "新手如果只知道“相关”，写作时仍然不知道该怎么用；支持关系给了明确用途。",
    boundary: "支持不是重复。两条笔记如果只是同义改写，应该合并或择一保留。",
    product: "关系详情可以显示“这条关系在写作中可作为论据”。",
    writing: "用来写“为什么研思录要让用户写关系理由”的论证段。",
    links: ["关系类型是在告诉未来自己怎么读这两条笔记", "写作中心应该从已确认判断生成提纲"]
  }),
  note({
    id: "PERM-CONTRAST-RELATION-CREATES-ARGUMENT",
    title: "反驳关系会逼出更清楚的观点",
    cluster: "relation",
    clusterLabel: "关系管理",
    thesis: "反驳关系不是制造冲突，而是帮助用户发现判断的边界。",
    summary: ["好文章通常需要承认反方。", "反驳关系能提示哪里需要解释、限定或改写。", "它让知识网络不只是同温层。"],
    why: "只连支持关系，图谱会越来越像观点堆叠；加入反驳关系，判断才会更可靠。",
    boundary: "反驳关系要写清楚反驳点，不要把情绪不同当成观点冲突。",
    product: "AI 建议里的冲突关系必须由用户确认，避免误伤笔记。",
    writing: "写作时可以用它生成“可能的反对意见”和“回应”。",
    links: ["边界和反例让永久笔记更可靠", "AI 建议只能作为候选，不能替用户下判断"]
  }),
  note({
    id: "PERM-LIMIT-RELATION-PROTECTS-OVERCLAIM",
    title: "限定关系能防止一条好判断被说过头",
    cluster: "relation",
    clusterLabel: "关系管理",
    thesis: "限定关系让用户知道一个判断在哪些条件下成立。",
    summary: ["许多笔记不是错，而是适用范围有限。", "限定关系能把边界显性化。", "它让写作不容易变成绝对化口号。"],
    why: "卡片笔记法追求可持续思考，不追求一次写出永远正确的结论。",
    boundary: "限定不等于削弱观点，而是让观点更可相信。",
    product: "建联时提供“限定/边界”类型，有助于形成更可靠的知识网络。",
    writing: "用来写“在什么情况下这个建议不适用”的段落。",
    links: ["边界和反例让永久笔记更可靠", "反驳关系会逼出更清楚的观点"]
  }),
  note({
    id: "PERM-BRIDGE-RELATION-FINDS-NEW-THEME",
    title: "桥接关系常常预示一个新主题正在出现",
    cluster: "relation",
    clusterLabel: "关系管理",
    thesis: "当两组原本分散的笔记被一条理由连接起来，新主题可能就出现了。",
    summary: ["桥接关系连接不同簇的判断。", "它常常说明用户发现了一个更大的问题。", "多个桥接关系可以触发主题索引。"],
    why: "知识网络的价值不在于同类归档，而在于让远处的判断发生新的组合。",
    boundary: "桥接不能靠牵强类比，必须能说清共同问题。",
    product: "可写主题发现应优先看桥接和反复出现的中心问题。",
    writing: "桥接关系可以成为文章的转折段或新选题来源。",
    links: ["主题索引不是文件夹，而是问题入口", "知识网络的复利来自旧笔记遇到新问题"]
  }),
  note({
    id: "PERM-EXAMPLE-RELATION-MAKES-ABSTRACT-USABLE",
    title: "例子关系让抽象原则变得可操作",
    cluster: "relation",
    clusterLabel: "关系管理",
    thesis: "抽象原则需要被例子关系落地，用户才知道它怎么用。",
    summary: ["方法论笔记容易正确但空。", "例子关系把原则连接到具体界面、动作或场景。", "它能帮助帮助文章少讲道理、多给操作。"],
    why: "小白用户最需要的不是完整理论，而是“我现在该点哪里，点完会发生什么”。",
    boundary: "例子不是证明全部情况，只是帮助理解。",
    product: "Demo 应该把功能本身做成示例笔记，让用户通过笔记学习产品。",
    writing: "写帮助文章时，用例子关系把方法论转换成可执行步骤。",
    links: ["帮助页应该按任务组织，而不是按功能堆列表", "第一次建议导入 Demo，是为了先看到完整闭环"]
  }),
  note({
    id: "PERM-GAP-RELATION-POINTS-TO-NEXT-READING",
    title: "缺口关系告诉你下一步该补什么",
    cluster: "relation",
    clusterLabel: "关系管理",
    thesis: "当两条笔记之间缺少证据、反例或中间环节时，这个缺口本身就是下一步任务。",
    summary: ["缺口关系不是失败，而是研究方向。", "它可以提示继续阅读、继续观察或补一条永久笔记。", "写作时，缺口能提醒用户不要急着下结论。"],
    why: "好的知识系统应该让用户看见“不知道什么”，而不是只展示已经整理好的部分。",
    boundary: "缺口关系不要太泛，要写清缺的是证据、定义、案例还是反方。",
    product: "AI 建议可以提示缺口，但保存前仍要用户确认。",
    writing: "写作时可以把缺口放进“仍需进一步观察”的部分。",
    links: ["AI 建议只能作为候选，不能替用户下判断", "反驳关系会逼出更清楚的观点"]
  }),
  note({
    id: "PERM-RELATION-REASON-WRITES-FUTURE-PARAGRAPH",
    title: "关系理由是在替未来文章预写一小段",
    cluster: "relation",
    clusterLabel: "关系管理",
    thesis: "每次写清关系理由，都是在为未来文章准备一句可用的过渡或论证。",
    summary: ["关系理由说明两条笔记为什么要一起出现。", "这句话以后常常可以改写成段落中的连接句。", "所以建联不是维护图谱，而是在积累写作结构。"],
    why: "很多用户卡在写作，是因为笔记之间缺少可解释的连接。关系理由把连接提前写出来。",
    boundary: "关系理由不用长，关键是说清关系角色。",
    product: "建联浮层应让用户在查看笔记、选择类型、写理由、保存之间顺畅完成。",
    writing: "直接用作文章中的“因此、但是、在这种情况下”的连接。",
    links: ["关系理由比连线本身更重要", "支持关系以后会变成文章里的证据"]
  }),
  note({
    id: "PERM-INDEX-CARD-STARTS-WITH-CENTRAL-QUESTION",
    title: "主题索引应该从一个中心问题开始",
    cluster: "index",
    clusterLabel: "主题索引",
    thesis: "主题索引的第一行应该是问题，而不是分类名。",
    summary: ["问题能决定哪些笔记该进来。", "问题也能决定阅读顺序和写作方向。", "没有中心问题，主题索引容易退化成文件夹。"],
    why: "卡片笔记法的索引不是为了摆放资料，而是为了下一次重新进入思考。",
    boundary: "中心问题可以迭代，不需要第一次就完美。",
    product: "主题索引页应突出中心问题、关键笔记、为什么属于同一主题。",
    writing: "中心问题可以直接转成文章标题或提纲主问题。",
    links: ["主题索引不是文件夹，而是问题入口", "永久笔记标题应该像一句判断"]
  }),
  note({
    id: "PERM-INDEX-CARD-KEEPS-READING-ORDER",
    title: "主题索引要保存一条可读顺序",
    cluster: "index",
    clusterLabel: "主题索引",
    thesis: "主题索引不只列出笔记，还应该告诉用户先读哪条、再读哪条。",
    summary: ["阅读顺序能降低再次进入主题的成本。", "它让新手知道从哪里开始。", "写作时，阅读顺序也常常变成提纲顺序。"],
    why: "如果主题索引只是链接列表，用户下次仍然要重新判断。",
    boundary: "阅读顺序不是永久固定，写作目标变化时可以调整。",
    product: "Demo 的主题索引应展示关键笔记和阅读顺序。",
    writing: "用于说明“为什么主题索引是写作前的整理台”。",
    links: ["主题索引应该从一个中心问题开始", "05 怎么从主题进入写作中心？"]
  }),
  note({
    id: "PERM-INDEX-CARD-IS-LIVING-OUTLINE",
    title: "主题索引是会继续生长的文章前身",
    cluster: "index",
    clusterLabel: "主题索引",
    thesis: "当主题索引不断加入关键笔记、边界和反方，它就会自然接近文章提纲。",
    summary: ["主题索引不是草稿，但比普通分类更接近写作。", "它把材料按问题组织起来。", "写作中心只是把这条结构进一步显性化。"],
    why: "很多文章不是从空白页开始，而是从一个已经被反复整理的问题开始。",
    boundary: "主题索引还不负责语言润色，它负责结构和判断。",
    product: "写作中心应从主题索引接入，而不是让用户从空白 prompt 开始。",
    writing: "可作为“从主题进入写作”的核心论点。",
    links: ["写作中心应该从已确认判断生成提纲", "主题索引要保存一条可读顺序"]
  }),
  note({
    id: "PERM-TAGS-ARE-FAST-FILTERS-INDEXES-ARE-QUESTIONS",
    title: "标签用来快速筛选，主题索引用来继续思考",
    cluster: "index",
    clusterLabel: "主题索引",
    thesis: "标签和主题索引不是同一种东西：标签帮你找，索引帮你想。",
    summary: ["标签适合粗筛和状态标记。", "主题索引适合围绕问题组织关键笔记。", "把两者混在一起，会让系统既难找也难写。"],
    why: "许多笔记软件把分类当成核心，但卡片笔记写作更需要问题和关系。",
    boundary: "标签仍然有用，只是不应该承担写作结构。",
    product: "研思录可以保留标签，但核心路径应围绕首页、关系、主题索引和写作中心。",
    writing: "帮助用户理解为什么“建更多文件夹”不是最佳起点。",
    links: ["主题索引不是文件夹，而是问题入口", "主题索引应该从一个中心问题开始"]
  }),
  note({
    id: "PERM-WRITING-USES-RELATION-ROLES",
    title: "写作时要按关系角色调用笔记",
    cluster: "writing",
    clusterLabel: "从关系到写作",
    thesis: "写作中心不只是拿几条笔记拼接，而是按关系角色组织证据、反方、边界和例子。",
    summary: ["支持关系可以成为论据。", "反驳和限定关系可以成为边界。", "桥接关系可以成为新选题或段落转折。"],
    why: "如果关系在整理时写清楚，写作时就不需要重新猜每条笔记有什么用。",
    boundary: "关系角色提供结构，不替代作者的表达和取舍。",
    product: "写作中心应优先展示“这组笔记能回答什么问题”。",
    writing: "直接指导文章提纲如何从笔记网络生成。",
    links: ["关系类型是在告诉未来自己怎么读这两条笔记", "写作中心应该从已确认判断生成提纲"]
  }),
  note({
    id: "PERM-OUTLINE-NEEDS-EVIDENCE-COUNTERPOINT-BOUNDARY",
    title: "好提纲需要证据、反方和边界",
    cluster: "writing",
    clusterLabel: "从关系到写作",
    thesis: "一份可用提纲不只列观点，还要包含证据、反方和适用边界。",
    summary: ["只有观点，文章会像口号。", "只有证据，文章会像资料整理。", "加入反方和边界，文章才更可信。"],
    why: "卡片笔记法积累的不是素材数量，而是可组合的判断结构。",
    boundary: "短文不一定每部分都写完整，但至少要知道缺在哪里。",
    product: "写作中心生成提纲时应提示缺口和反方，而不只是生成段落标题。",
    writing: "作为写作中心帮助说明的核心内容。",
    links: ["反驳关系会逼出更清楚的观点", "限定关系能防止一条好判断被说过头"]
  }),
  note({
    id: "PERM-DRAFT-SHOULD-KEEP-NOTE-TRACE",
    title: "草稿应该能追溯到关键笔记",
    cluster: "writing",
    clusterLabel: "从关系到写作",
    thesis: "从笔记生成草稿时，关键段落应该能追溯到支撑它的笔记。",
    summary: ["追溯让用户知道一句话从哪里来。", "它方便回头检查证据和边界。", "也能防止 AI 或模板把观点写偏。"],
    why: "研思录强调用户确认，因为真正重要的是用户自己的判断链。",
    boundary: "不是每句话都要标注来源，但关键判断应该能回到笔记。",
    product: "写作项目应保留关键笔记、主题索引和提纲之间的联系。",
    writing: "可用于解释为什么写作中心不是普通 AI 写作器。",
    links: ["AI 建议只能作为候选，不能替用户下判断", "写作时要按关系角色调用笔记"]
  }),
  note({
    id: "PERM-HELP-ARTICLES-CAN-BE-DEMO-OUTPUT",
    title: "帮助文章也可以由 Demo 笔记生长出来",
    cluster: "product",
    clusterLabel: "产品理念",
    thesis: "产品帮助不应该只是说明按钮，而应该展示一条从笔记到文章的真实路径。",
    summary: ["用户最容易相信自己能做到的，是看到 Demo 已经走过一遍。", "帮助文章可以引用 Demo 的主题索引和永久笔记。", "这样帮助本身也成为卡片笔记写作法的成果。"],
    why: "如果帮助和 Demo 分离，用户要在文档和产品之间来回翻译；把二者打通，学习成本更低。",
    boundary: "帮助文章要短、按任务组织，不要变成方法论长书。",
    product: "设置里的帮助可以放从 Demo 生成的最佳实践文章。",
    writing: "可作为“研思录如何把方法论内置到产品里”的例子。",
    links: ["帮助页应该按任务组织，而不是按功能堆列表", "主题索引是会继续生长的文章前身"]
  }),
  note({
    id: "PERM-HOME-AS-DAILY-DESK",
    title: "首页应该像每天整理知识的工作台",
    cluster: "product",
    clusterLabel: "产品理念",
    thesis: "首页不是永久笔记盒，也不是导航页，而是每天开始整理知识的工作台。",
    summary: ["用户每天只需要知道下一步最该处理什么。", "材料、永久笔记、关系、主题和写作都可以从这里进入。", "首页要减少选择压力，而不是堆满所有可能。"],
    why: "研思录的核心价值在连续小闭环，不在一次性搭建完整系统。",
    boundary: "高级功能可以存在，但不应该抢占新手首屏。",
    product: "首页卡片应围绕“处理材料、补关系、整理主题、进入写作”组织。",
    writing: "用于解释为什么“整理台”最终叫首页。",
    links: ["首页应该奖励处理，而不是奖励收藏", "研思录的最佳路径，是从首页开始做一个小闭环"]
  }),
  note({
    id: "PERM-DEMO-IS-PRACTICE-GROUND",
    title: "Demo 应该是可练习的样例库，不是静态说明书",
    cluster: "product",
    clusterLabel: "产品理念",
    thesis: "Smart Notes Demo 的目标是让用户亲手走完一遍，而不是读完一篇介绍。",
    summary: ["示例数据要包含待处理、已处理和可写作的不同状态。", "用户可以安全地建联、打开主题、进入写作中心。", "练一遍比读十条说明更容易理解产品。"],
    why: "小白用户通常不是不知道概念，而是不知道下一步该怎么做。",
    boundary: "Demo 不应该污染用户正式库；导入前需要用户确认。",
    product: "首次启动要明确展示“一键导入示例库 / 体验 Demo”。",
    writing: "帮助文章可以把 Demo 路径写成练习清单。",
    links: ["第一次建议导入 Demo，是为了先看到完整闭环", "帮助文章也可以由 Demo 笔记生长出来"]
  }),
  note({
    id: "PERM-AI-SHOULD-ASK-FOR-CONFIRMATION",
    title: "AI 只能提出候选，保存前必须由用户确认",
    cluster: "product",
    clusterLabel: "产品理念",
    thesis: "AI 在研思录里负责减轻发现成本，不负责替用户决定知识网络。",
    summary: ["AI 可以提示关系、主题和提纲。", "但关系理由、是否采纳、是否归档必须由用户确认。", "这样才能保护用户自己的判断链。"],
    why: "卡片笔记写作法的核心是主动判断；如果 AI 自动决定，系统会变成另一种黑箱。",
    boundary: "本地规则和 AI 都可能有价值，但都必须保持候选状态。",
    product: "AI 建议页应该清楚显示“未确认前不会改动笔记”。",
    writing: "用于解释研思录为什么不是自动写作工具。",
    links: ["AI 建议只能作为候选，不能替用户下判断", "草稿应该能追溯到关键笔记"]
  })
];

demo.permanent_notes.push(...newPermanentNotes);

function relation(id, from, to, relationType, rationale, insightQuestion) {
  return {
    id,
    from,
    to,
    relationType,
    status: "confirmed",
    rationale,
    insight_question: insightQuestion,
    confidence: 0.88
  };
}

demo.relations.push(
  relation("REL-DEMO-CAPTURE-INBOX", "PERM-CAPTURE-IS-INBOX-NOT-KNOWLEDGE", "PERM-FLEETING-NOTE-IS-CAPTURE", "supports", "“记录是入口”支撑“随笔只是捕捉点”，两者一起说明随笔不能长期停留。", "写作时可把这条关系用作“为什么不能只收藏”的论据。"),
  relation("REL-DEMO-SOURCE-BOUNDARY", "PERM-LITERATURE-NOTE-KEEPS-SOURCE-BOUNDARY", "PERM-PARAPHRASE-BEFORE-JUDGMENT", "supports", "来源边界让转述更可靠，避免把作者观点直接当成自己的判断。", "写作时可作为“为什么文献笔记要分层”的证据。"),
  relation("REL-DEMO-OWN-WORDS", "PERM-OWN-WORDS-ARE-FIRST-THINKING", "PERM-QUOTE-IS-NOT-UNDERSTANDING", "contradicts", "“用自己的话重说”直接反驳“摘录就是理解”的误用。", "可在文章中形成一个反方回应：为什么高亮很多不等于学会。"),
  relation("REL-DEMO-ATOMIC-CLAIM", "PERM-ATOMIC-NOTE-ANSWERS-ONE-QUESTION", "PERM-PERMANENT-NOTE-IS-JUDGMENT", "qualifies", "永久笔记是判断，但这个判断还需要足够原子，才能被复用和建联。", "这条限定关系能防止把大段总结误当成永久笔记。"),
  relation("REL-DEMO-TITLE-CLAIM", "PERM-TITLE-SHOULD-BE-A-CLAIM", "PERM-PERMANENT-NOTE-IS-JUDGMENT", "complements", "判断型标题让永久笔记的立场在列表里直接可见。", "可用于解释为什么 Demo 不使用内部编号当标题。"),
  relation("REL-DEMO-RELATION-TYPE", "PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION", "PERM-LINK-TYPES-CREATE-DISCOVERY", "supports", "关系类型会改变发现方式，因为它规定了未来一起阅读两条笔记的方法。", "可在帮助里解释“为什么建联时要选类型”。"),
  relation("REL-DEMO-SUPPORT-EVIDENCE", "PERM-SUPPORT-RELATION-BECOMES-EVIDENCE", "PERM-WRITING-USES-RELATION-ROLES", "example_of", "支持关系是“按关系角色调用笔记”的一个具体例子。", "写作时可把它作为证据角色的说明。"),
  relation("REL-DEMO-CONTRAST-ARGUMENT", "PERM-CONTRAST-RELATION-CREATES-ARGUMENT", "PERM-OUTLINE-NEEDS-EVIDENCE-COUNTERPOINT-BOUNDARY", "supports", "反驳关系为提纲补充反方，让文章不只是单向陈述。", "可用于生成“反方与回应”段落。"),
  relation("REL-DEMO-LIMIT-BOUNDARY", "PERM-LIMIT-RELATION-PROTECTS-OVERCLAIM", "PERM-BOUNDARY-MAKES-NOTE-RELIABLE", "supports", "限定关系把边界写出来，正好支撑“边界让笔记可靠”。", "可在写作中提醒哪些结论不能说过头。"),
  relation("REL-DEMO-BRIDGE-THEME", "PERM-BRIDGE-RELATION-FINDS-NEW-THEME", "PERM-THEME-INDEX-IS-ENTRY", "precedes", "桥接关系常常先于主题索引出现，因为它提示多个问题正在汇合。", "可用于解释可写主题如何从关系网络中浮现。"),
  relation("REL-DEMO-EXAMPLE-USABLE", "PERM-EXAMPLE-RELATION-MAKES-ABSTRACT-USABLE", "PERM-HELP-ARTICLES-CAN-BE-DEMO-OUTPUT", "supports", "例子关系让帮助文章从抽象说明变成可练习路径。", "写帮助时可先找例子关系，再写操作步骤。"),
  relation("REL-DEMO-GAP-NEXT", "PERM-GAP-RELATION-POINTS-TO-NEXT-READING", "PERM-AI-SHOULD-ASK-FOR-CONFIRMATION", "complements", "缺口可以由 AI 提示，但是否补、怎么补仍要用户确认。", "可说明 AI 在知识整理里是提醒者，不是裁判。"),
  relation("REL-DEMO-REASON-PARAGRAPH", "PERM-RELATION-REASON-WRITES-FUTURE-PARAGRAPH", "PERM-RELATION-REASON-MATTERS", "supports", "关系理由重要，是因为它以后能转化为文章里的连接句。", "这条关系可直接进入写作中心的“关系与写作”段落。"),
  relation("REL-DEMO-INDEX-QUESTION", "PERM-INDEX-CARD-STARTS-WITH-CENTRAL-QUESTION", "PERM-THEME-INDEX-IS-ENTRY", "supports", "中心问题让主题索引成为入口，而不是文件夹。", "写作时可把中心问题变成文章主问题。"),
  relation("REL-DEMO-INDEX-ORDER", "PERM-INDEX-CARD-KEEPS-READING-ORDER", "PERM-INDEX-CARD-STARTS-WITH-CENTRAL-QUESTION", "complements", "中心问题决定主题边界，阅读顺序决定下次如何进入。", "可解释主题索引为什么比链接列表更有价值。"),
  relation("REL-DEMO-INDEX-OUTLINE", "PERM-INDEX-CARD-IS-LIVING-OUTLINE", "PERM-INDEX-CARD-KEEPS-READING-ORDER", "supports", "阅读顺序不断稳定后，主题索引就接近文章提纲。", "可用于从主题索引进入写作中心的说明。"),
  relation("REL-DEMO-TAGS-INDEX", "PERM-TAGS-ARE-FAST-FILTERS-INDEXES-ARE-QUESTIONS", "PERM-THEME-INDEX-IS-ENTRY", "qualifies", "主题索引不是反对标签，而是说明标签不能替代问题入口。", "可帮助新手避免一开始就沉迷分类。"),
  relation("REL-DEMO-WRITING-ROLES", "PERM-WRITING-USES-RELATION-ROLES", "PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION", "supports", "关系类型在整理时给出阅读指令，在写作时就能变成段落角色。", "可作为“关系如何帮助写作”的核心关系。"),
  relation("REL-DEMO-OUTLINE-TRACE", "PERM-DRAFT-SHOULD-KEEP-NOTE-TRACE", "PERM-OUTLINE-NEEDS-EVIDENCE-COUNTERPOINT-BOUNDARY", "complements", "提纲需要证据和边界，追溯则保证这些内容能回到原笔记。", "可解释写作中心为什么要保留关键笔记路径。"),
  relation("REL-DEMO-HELP-DEMO", "PERM-HELP-ARTICLES-CAN-BE-DEMO-OUTPUT", "PERM-DEMO-IS-PRACTICE-GROUND", "supports", "如果 Demo 是可练习路径，帮助文章就可以直接从 Demo 输出。", "可将帮助页和示例库打通，降低学习成本。"),
  relation("REL-DEMO-HOME-PATH", "PERM-HOME-AS-DAILY-DESK", "PERM-BEST-PATH-STARTS-FROM-HOME", "supports", "“首页是工作台”支撑“最佳路径从首页开始”。", "写新手导览时，这条关系可以说明为什么每天先回到首页。"),
  relation("REL-DEMO-AI-CONFIRM", "PERM-AI-SHOULD-ASK-FOR-CONFIRMATION", "PERM-AI-SUGGESTION-IS-CANDIDATE", "supports", "AI 必须请求确认，是“AI 建议只是候选”的产品化落点。", "可用于解释 AI 建议页为什么不自动改动笔记。"),
  relation("REL-DEMO-FIRST-TEN", "PERM-FIRST-TEN-MINUTES", "PERM-DEMO-IS-PRACTICE-GROUND", "example_of", "十分钟导览是 Demo 作为练习场的具体路径。", "可用于新手导入后的第一屏说明。"),
  relation("REL-DEMO-FIRST-RUN-SUPPORTS-FIRST-USE", "PERM-DEMO-FIRST-RUN-RECOMMENDED", "PERM-FIRST-TEN-MINUTES", "supports", "先导入 Demo 能让第一次使用的小闭环变成可点击、可复现的操作路径。", "可用于解释为什么第一次打开时建议先体验示例库。"),
  relation("REL-DEMO-INDEX-WRITING", "PERM-INDEX-CARD-IS-LIVING-OUTLINE", "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES", "precedes", "主题索引先稳定问题和关键笔记，写作中心再生成提纲。", "可解释主题到写作的交接点。")
);

function indexCard({ id, title, centralQuestion, noteIds, summary }) {
  const titleById = new Map(demo.permanent_notes.map((item) => [item.id, item.title]));
  return {
    id,
    index_type: "topic",
    title,
    central_question: centralQuestion,
    thesis: summary,
    threeLineSummary: ["先读中心问题。", "再按顺序读关键永久笔记。", "最后决定是否进入写作中心。"],
    summary,
    item_note_ids: noteIds,
    tags: ["主题索引", "Smart Notes Demo"],
    ordering_strategy: "manual",
    knowledge_point_ids: ["KP-CAPTURE", "KP-PARAPHRASE", "KP-PERMANENT", "KP-RELATION", "KP-INDEX", "KP-WRITING"],
    key_note_ids: [noteIds[0]],
    items: noteIds.map((noteId, index) => ({
      note_id: noteId,
      order: index + 1,
      rationale: `第 ${index + 1} 步读这条笔记，因为它能回答“${centralQuestion}”的一部分。`
    })),
    template: { type: "index_card" },
    noteIds,
    body: `# ${title}

## 中心问题
${centralQuestion}

## 阅读顺序
${noteIds.map((noteId, index) => `${index + 1}. [[${titleById.get(noteId) || noteId}]]`).join("\n")}

## 为什么这些笔记属于同一主题
${summary}

## 进入写作中心
如果这些笔记已经能回答同一个问题，就可以送进写作中心生成提纲。`
  };
}

demo.index_cards.push(
  indexCard({
    id: "THEME-RELATION-TYPES-TO-WRITING",
    title: "关系类型如何帮助后续洞察和写作？",
    centralQuestion: "不同关系类型在洞察和写作中分别承担什么角色？",
    noteIds: [
      "PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION",
      "PERM-SUPPORT-RELATION-BECOMES-EVIDENCE",
      "PERM-CONTRAST-RELATION-CREATES-ARGUMENT",
      "PERM-LIMIT-RELATION-PROTECTS-OVERCLAIM",
      "PERM-BRIDGE-RELATION-FINDS-NEW-THEME",
      "PERM-RELATION-REASON-WRITES-FUTURE-PARAGRAPH"
    ],
    summary: "这组笔记把建联从“连起来”推进到“以后怎么读、怎么写、怎么发现新问题”。"
  }),
  indexCard({
    id: "THEME-INDEX-NOTE-PRACTICE",
    title: "主题索引笔记应该怎么创建和维护？",
    centralQuestion: "怎样判断一组笔记已经值得建立主题索引？",
    noteIds: [
      "PERM-INDEX-CARD-STARTS-WITH-CENTRAL-QUESTION",
      "PERM-INDEX-CARD-KEEPS-READING-ORDER",
      "PERM-INDEX-CARD-IS-LIVING-OUTLINE",
      "PERM-TAGS-ARE-FAST-FILTERS-INDEXES-ARE-QUESTIONS",
      "PERM-THEME-INDEX-IS-ENTRY"
    ],
    summary: "这组笔记说明主题索引不是分类，而是围绕中心问题组织关键笔记和阅读顺序。"
  }),
  indexCard({
    id: "THEME-WRITING-FROM-RELATIONS",
    title: "如何从关系网络进入写作？",
    centralQuestion: "关系理由、关系类型和主题索引如何变成提纲与草稿？",
    noteIds: [
      "PERM-WRITING-USES-RELATION-ROLES",
      "PERM-OUTLINE-NEEDS-EVIDENCE-COUNTERPOINT-BOUNDARY",
      "PERM-DRAFT-SHOULD-KEEP-NOTE-TRACE",
      "PERM-INDEX-CARD-IS-LIVING-OUTLINE",
      "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES"
    ],
    summary: "这组笔记展示写作不是从空白页开始，而是从已确认判断、关系角色和主题索引中长出来。"
  }),
  indexCard({
    id: "THEME-YANSILU-DAILY-PATH",
    title: "研思录每天最推荐的使用路径是什么？",
    centralQuestion: "第一次和每天打开研思录时，应该按什么顺序行动？",
    noteIds: [
      "PERM-HOME-AS-DAILY-DESK",
      "PERM-DEMO-IS-PRACTICE-GROUND",
      "PERM-FIRST-TEN-MINUTES",
      "PERM-BEST-PATH-STARTS-FROM-HOME",
      "PERM-CAPTURE-IS-INBOX-NOT-KNOWLEDGE"
    ],
    summary: "这组笔记把产品首页、Demo、每日整理和小闭环连成一个新手可执行路径。"
  }),
  indexCard({
    id: "THEME-AI-HUMAN-CONFIRMATION",
    title: "为什么 AI 建议必须由用户确认？",
    centralQuestion: "AI 在卡片笔记写作法里应该帮助什么，又不能替代什么？",
    noteIds: [
      "PERM-AI-SHOULD-ASK-FOR-CONFIRMATION",
      "PERM-AI-SUGGESTION-IS-CANDIDATE",
      "PERM-GAP-RELATION-POINTS-TO-NEXT-READING",
      "PERM-DRAFT-SHOULD-KEEP-NOTE-TRACE"
    ],
    summary: "这组笔记说明 AI 可以降低发现成本，但不能替用户决定关系、主题和观点。"
  }),
  indexCard({
    id: "THEME-DEMO-AS-HELP",
    title: "Smart Notes Demo 如何帮助新手学会研思录？",
    centralQuestion: "为什么示例库本身应该成为帮助和练习材料？",
    noteIds: [
      "PERM-DEMO-IS-PRACTICE-GROUND",
      "PERM-HELP-ARTICLES-CAN-BE-DEMO-OUTPUT",
      "PERM-EXAMPLE-RELATION-MAKES-ABSTRACT-USABLE",
      "PERM-DEMO-FIRST-RUN-RECOMMENDED"
    ],
    summary: "这组笔记说明 Demo 不是静态说明书，而是可点击、可建联、可写作的练习场。"
  })
);

const mainProject = demo.writing_projects.find((item) => item.id === "WRITE-SMART-NOTES-DEMO");
if (mainProject) {
  for (const id of [
    "PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION",
    "PERM-WRITING-USES-RELATION-ROLES",
    "PERM-HOME-AS-DAILY-DESK",
    "PERM-DEMO-IS-PRACTICE-GROUND"
  ]) {
    if (!mainProject.basketNoteIds.includes(id)) mainProject.basketNoteIds.push(id);
  }
  for (const id of [
    "THEME-RELATION-TYPES-TO-WRITING",
    "THEME-INDEX-NOTE-PRACTICE",
    "THEME-WRITING-FROM-RELATIONS",
    "THEME-YANSILU-DAILY-PATH"
  ]) {
    if (!mainProject.indexCardIds.includes(id)) mainProject.indexCardIds.push(id);
  }
}

demo.writing_projects.push({
  id: "WRITE-RELATION-TO-WRITING-PRACTICE",
  title: "关系类型如何把笔记网络变成文章结构",
  goal: "写一篇给新手看的帮助文章，说明支持、反驳、限定、桥接、例子和缺口关系如何服务洞察与写作。",
  intent: "把建联从“画线”解释成“为未来文章准备结构”。",
  target_reader: "已经导入 Demo，但不知道关系类型有什么用的新手用户。",
  desired_reader_takeaway: "我建联时写的类型和理由，以后会变成证据、反方、边界、例子和段落过渡。",
  basketNoteIds: [
    "PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION",
    "PERM-SUPPORT-RELATION-BECOMES-EVIDENCE",
    "PERM-CONTRAST-RELATION-CREATES-ARGUMENT",
    "PERM-LIMIT-RELATION-PROTECTS-OVERCLAIM",
    "PERM-BRIDGE-RELATION-FINDS-NEW-THEME",
    "PERM-GAP-RELATION-POINTS-TO-NEXT-READING",
    "PERM-RELATION-REASON-WRITES-FUTURE-PARAGRAPH",
    "PERM-WRITING-USES-RELATION-ROLES"
  ],
  indexCardIds: ["THEME-RELATION-TYPES", "THEME-RELATION-TYPES-TO-WRITING", "THEME-WRITING-FROM-RELATIONS"],
  keyNoteIds: [
    "PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION",
    "PERM-RELATION-REASON-WRITES-FUTURE-PARAGRAPH",
    "PERM-WRITING-USES-RELATION-ROLES"
  ],
  outline: [
    {
      sectionId: "sec-1",
      title: "关系类型是未来阅读说明",
      goal: "解释关系类型不是装饰，而是未来如何重读两条笔记。",
      noteTraceIds: ["PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION", "PERM-RELATION-REASON-MATTERS"],
      keyNoteTraceIds: ["PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION"],
      gap: "需要给出一个非常小的建联例子。",
      counterpoint: "如果用户只想快速记录，关系类型会不会显得复杂？"
    },
    {
      sectionId: "sec-2",
      title: "支持、反驳和限定分别进入文章哪里",
      goal: "把常见关系类型映射到证据、反方和边界。",
      noteTraceIds: [
        "PERM-SUPPORT-RELATION-BECOMES-EVIDENCE",
        "PERM-CONTRAST-RELATION-CREATES-ARGUMENT",
        "PERM-LIMIT-RELATION-PROTECTS-OVERCLAIM"
      ],
      keyNoteTraceIds: ["PERM-SUPPORT-RELATION-BECOMES-EVIDENCE"],
      gap: "需要提醒用户不要只连支持关系。",
      counterpoint: "反驳关系如果写不清，会不会造成误解？"
    },
    {
      sectionId: "sec-3",
      title: "桥接和缺口关系怎样带来新主题",
      goal: "说明洞察不是凭空出现，而是从远处笔记和缺口里浮现。",
      noteTraceIds: ["PERM-BRIDGE-RELATION-FINDS-NEW-THEME", "PERM-GAP-RELATION-POINTS-TO-NEXT-READING"],
      keyNoteTraceIds: ["PERM-BRIDGE-RELATION-FINDS-NEW-THEME"],
      gap: "需要展示从桥接关系到主题索引的过程。",
      counterpoint: "桥接关系不能牵强附会。"
    }
  ],
  template: { type: "writing_project", starting_point: "relation_type_and_theme_index" }
});

demo.draft_scaffolds.push({
  id: "DRAFT-RELATION-TO-WRITING-PRACTICE",
  writing_project_id: "WRITE-RELATION-TO-WRITING-PRACTICE",
  generated_by: "demo-fixture",
  version_note: "从关系类型主题索引生成的帮助文章提纲。",
  key_note_ids: [
    "PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION",
    "PERM-RELATION-REASON-WRITES-FUTURE-PARAGRAPH",
    "PERM-WRITING-USES-RELATION-ROLES"
  ],
  key_note_path: [
    "PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION",
    "PERM-RELATION-REASON-WRITES-FUTURE-PARAGRAPH",
    "PERM-WRITING-USES-RELATION-ROLES"
  ],
  sections: [
    {
      id: "sec-1",
      title: "关系类型是未来阅读说明",
      goal: "说明为什么建联时要选类型。",
      note_ids: ["PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION", "PERM-LINK-TYPES-CREATE-DISCOVERY"],
      key_note_ids: ["PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION"],
      open_question: "是否需要减少新手一开始看到的类型数量？",
      gap: "补一个支持关系的例子。",
      counterpoint: "类型太多会带来负担。"
    },
    {
      id: "sec-2",
      title: "支持、反驳、限定对应文章角色",
      goal: "把关系转成证据、反方和边界。",
      note_ids: [
        "PERM-SUPPORT-RELATION-BECOMES-EVIDENCE",
        "PERM-CONTRAST-RELATION-CREATES-ARGUMENT",
        "PERM-LIMIT-RELATION-PROTECTS-OVERCLAIM"
      ],
      key_note_ids: ["PERM-SUPPORT-RELATION-BECOMES-EVIDENCE"],
      open_question: "示例是否足够贴近日常？",
      gap: "需要补一个真实主题索引例子。",
      counterpoint: "不要把关系类型当成必须完成的表格。"
    },
    {
      id: "sec-3",
      title: "桥接和缺口产生新主题",
      goal: "说明洞察从关系网络里浮现。",
      note_ids: ["PERM-BRIDGE-RELATION-FINDS-NEW-THEME", "PERM-GAP-RELATION-POINTS-TO-NEXT-READING"],
      key_note_ids: ["PERM-BRIDGE-RELATION-FINDS-NEW-THEME"],
      open_question: "是否需要引导用户如何创建主题索引？",
      gap: "补主题索引入口截图或说明。",
      counterpoint: "桥接关系必须有共同问题。"
    }
  ]
});

demo.final_essays.push(
  {
    id: "ESSAY-RELATION-TYPES-HELP",
    note_type: "final_essay",
    title: "帮助文章：关系类型以后怎么用于写作",
    writing_project_id: "WRITE-RELATION-TO-WRITING-PRACTICE",
    body: `# 帮助文章：关系类型以后怎么用于写作

关系不是为了让图谱更热闹，而是为了让你以后知道这两条笔记怎么一起用。

最常用的关系可以这样理解：

- 支持：以后可以当证据。先看 [[支持关系以后会变成文章里的证据]]。
- 反驳：提醒你补反方和回应。先看 [[反驳关系会逼出更清楚的观点]]。
- 限定：说明这个判断在哪些条件下成立。先看 [[限定关系能防止一条好判断被说过头]]。
- 例子：让抽象观点落地。先看 [[例子关系让抽象原则变得可操作]]。
- 桥接：把两个原本分散的问题连起来。先看 [[桥接关系常常预示一个新主题正在出现]]。
- 缺口：提醒你还缺证据、案例或反方。先看 [[缺口关系告诉你下一步该补什么]]。

保存关系时只写一句人话：为什么这两条笔记要放在一起。[[关系理由是在替未来文章预写一小段]]，以后会变成文章里的证据、边界、反方或过渡。`
  },
  {
    id: "ESSAY-YANSILU-BEST-PRACTICE",
    note_type: "final_essay",
    title: "帮助文章：第一次使用研思录怎么走",
    writing_project_id: "WRITE-SMART-NOTES-DEMO",
    body: `# 帮助文章：第一次使用研思录怎么走

研思录的核心价值是一句话：让笔记生长为思想。

第一次使用不要先研究所有功能。打开首页，只做一个小闭环：

1. 处理一条材料：把随笔或文献笔记改写成自己的判断。先看 [[记录是入口，不是知识本身]]。
2. 形成一条永久笔记：标题尽量像一句判断。先看 [[永久笔记标题应该像一句判断]]。
3. 建一条关系：给它找一条真正相关的笔记，并写一句为什么相关。先看 [[关系理由是在替未来文章预写一小段]]。
4. 整理成主题：几条笔记能回答同一个问题时，再建主题索引。先看 [[主题索引应该从一个中心问题开始]]。
5. 进入写作：从主题进入写作中心生成提纲，而不是从空白开始。

Demo 只是样例数据，不是规定动作。你可以放心点、改、建联；看懂一遍以后，再回到自己的笔记库。`
  }
);

function guide(id, title, body) {
  return { id, note_type: "guide", title, status: "active", tags: ["导览", "Smart Notes Demo"], body };
}

demo.guide_notes.push(
  guide(
    "GUIDE-RELATION-TYPES",
    "08 关系类型怎么选？",
    `# 08 关系类型怎么选？

先别追求分类完美。关系类型只回答一个问题：这两条笔记以后怎么一起用？

- 支持：可当证据。
- 反驳：可当反方。
- 限定：说明边界。
- 例子：帮助落地。
- 桥接：连接两个问题。
- 缺口：提示下一步要补什么。

保存前写一句话：它们为什么相关。写不清就先不要保存。`
  ),
  guide(
    "GUIDE-INDEX-PRACTICE",
    "09 主题索引怎么写？",
    `# 09 主题索引怎么写？

主题索引不是文件夹。它只做三件事：提出一个问题，放入能回答它的关键笔记，保存一个阅读顺序。

可以这样写：

1. 我想继续想什么？
2. 哪几条永久笔记能回答这个问题？
3. 下次回来先读哪条？
4. 还缺证据、反方、例子还是边界？

先看 [[主题索引应该从一个中心问题开始]]，再看 [[主题索引要保存一条可读顺序]]。`
  ),
  guide(
    "GUIDE-WRITING-FROM-RELATIONS",
    "10 从关系网络进入写作",
    `# 10 从关系网络进入写作

写作不是把笔记复制到一起，而是先判断每条笔记在文章里承担什么角色。

支持关系可以变成证据，反驳关系可以变成反方，限定关系可以变成边界，桥接关系可以变成过渡，缺口关系可以变成下一步研究。

先打开 [[关系类型如何帮助后续洞察和写作？]]，再看写作项目《关系类型如何把笔记网络变成文章结构》。重点看：提纲为什么能从已有笔记长出来。`
  ),
  guide(
    "GUIDE-DEMO-PRACTICE",
    "11 Demo 里可以怎么练习？",
    `# 11 Demo 里可以怎么练习？

这套 Demo 不是正式资料库，只是给你练手。

建议只练四步：

1. 处理一条材料。
2. 给一条永久笔记补关系。
3. 打开一个主题索引。
4. 从主题进入写作中心。

目标不是学完所有概念，而是知道下一次该点哪里。`
  )
);

demo.graph = demo.graph || {};
demo.graph.reading_path = [
  "GUIDE-SMART-NOTES-START",
  "GUIDE-RELATION-TYPES",
  "GUIDE-INDEX-PRACTICE",
  "GUIDE-WRITING-FROM-RELATIONS",
  "FN-PHONE-CAPTURE-UNPROCESSED",
  "LN-WRITING-AS-DAILY-PRACTICE",
  "PERM-CAPTURE-IS-INBOX-NOT-KNOWLEDGE",
  "PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION",
  "THEME-RELATION-TYPES-TO-WRITING",
  "THEME-WRITING-FROM-RELATIONS",
  "WRITE-RELATION-TO-WRITING-PRACTICE"
];
demo.graph.key_note_paths = [
  ...(demo.graph.key_note_paths || []),
  {
    cluster: "relation",
    key_note_id: "PERM-RELATION-TYPE-IS-A-READING-INSTRUCTION",
    index_card_id: "THEME-RELATION-TYPES-TO-WRITING",
    supporting_note_ids: [
      "PERM-SUPPORT-RELATION-BECOMES-EVIDENCE",
      "PERM-CONTRAST-RELATION-CREATES-ARGUMENT",
      "PERM-LIMIT-RELATION-PROTECTS-OVERCLAIM"
    ]
  },
  {
    cluster: "index",
    key_note_id: "PERM-INDEX-CARD-STARTS-WITH-CENTRAL-QUESTION",
    index_card_id: "THEME-INDEX-NOTE-PRACTICE",
    supporting_note_ids: [
      "PERM-INDEX-CARD-KEEPS-READING-ORDER",
      "PERM-INDEX-CARD-IS-LIVING-OUTLINE",
      "PERM-TAGS-ARE-FAST-FILTERS-INDEXES-ARE-QUESTIONS"
    ]
  }
];
const seenKeyNotePaths = new Set();
demo.graph.key_note_paths = demo.graph.key_note_paths.filter((item) => {
  const key = `${item.cluster || ""}:${item.key_note_id || ""}:${item.index_card_id || ""}`;
  if (seenKeyNotePaths.has(key)) return false;
  seenKeyNotePaths.add(key);
  return true;
});

demo.knowledge_extraction = demo.knowledge_extraction || { source_id: "SRC-SMART-NOTES", knowledge_points: [] };
const knownKnowledgePointIds = new Set((demo.knowledge_extraction.knowledge_points || []).map((item) => item.id));
for (const item of [
  {
    id: "KP-RELATION-TYPES",
    cluster: "relation",
    label: "关系类型决定后续用途",
    method_principle: "关系类型告诉未来自己如何一起阅读两条笔记。",
    misuse_to_avoid: "只写“相关”，导致以后不知道这条线有什么用。",
    product_requirement: "建联时提供少量清楚类型，并要求一句可读理由。"
  },
  {
    id: "KP-INDEX-PRACTICE",
    cluster: "index",
    label: "主题索引要有中心问题和阅读顺序",
    method_principle: "索引是重新进入问题的路径，不是把笔记装进文件夹。",
    misuse_to_avoid: "把索引当分类，缺少中心问题和顺序。",
    product_requirement: "主题索引要显示中心问题、关键笔记、为什么同属一题和写作入口。"
  },
  {
    id: "KP-WRITING-ROLES",
    cluster: "writing",
    label: "写作按关系角色组织笔记",
    method_principle: "支持、反驳、限定、例子、桥接和缺口都可以转化为文章结构。",
    misuse_to_avoid: "把笔记直接拼接成文章。",
    product_requirement: "写作中心要显示证据、反方、边界和缺口。"
  }
]) {
  if (!knownKnowledgePointIds.has(item.id)) demo.knowledge_extraction.knowledge_points.push(item);
}

function updateById(collection, id, patch) {
  const item = (demo[collection] || []).find((entry) => entry.id === id);
  if (item) Object.assign(item, patch);
}

updateById("guide_notes", "GUIDE-SMART-NOTES-START", {
  title: "00 从这里开始：10 分钟走完研思录",
  body: `# 00 从这里开始：10 分钟走完研思录

你不用先学术语。照着 6 步试一遍：记录 -> 转述 -> 永久笔记 -> 建立关系 -> 主题索引 -> 写作中心。

研思录想帮你做到一件事：**让笔记生长为思想。**

建议照这个顺序点：

1. 看 [[手机上先记一句：我总是收藏很多但不会用]]，它是一条还没处理的随笔。
2. 看 [[阅读一开始就要面向未来写作]]，它展示材料如何先被转述。
3. 看 [[写作不是最后一步，而是整理笔记的方向]]，它是一条已经成形的永久笔记。
4. 给 [[待关联练习：保存关系前先写清楚为什么]] 找一条相关笔记，并写一句关系理由。
5. 打开 [[03 为什么要建立关系？|为什么要关联笔记？]] 或 [[02 什么是永久笔记？|永久笔记是什么？]]，先看能打开的导览笔记，再理解主题索引怎么组织相关笔记。
6. 打开写作项目《为什么研思录要把卡片笔记写作法做进产品里》，看它怎样从主题和关键笔记生成提纲。

今天只做一个动作也可以。先动手，再理解。`
});

updateById("guide_notes", "GUIDE-TODAY-NEXT-STEP", {
  title: "01 今天先做哪一步？",
  body: `# 01 今天先做哪一步？

回到首页，只看“现在最重要”的那一件事。

- 有随笔或文献笔记：先处理一条材料。
- 有孤立永久笔记：补一条真正相关的关系。
- 有几条笔记围绕同一问题：整理成主题。
- 主题已经清楚：进入写作中心生成提纲。

不要一次理解所有功能。一天推进一步就够。`
});

updateById("guide_notes", "GUIDE-WHAT-PERMANENT", {
  title: "02 什么是永久笔记？",
  body: `# 02 什么是永久笔记？

永久笔记不是摘抄，也不是临时想法。它是一句你愿意以后反复使用的判断。

好用的永久笔记通常有三点：

- 标题像一句清楚判断。
- 正文说明为什么这样判断。
- 能和其他笔记建立关系。

先看 [[永久笔记标题应该像一句判断]]，再看 [[文献笔记要先转述，再沉淀判断]]。`
});

updateById("guide_notes", "GUIDE-WHY-RELATE", {
  title: "03 为什么要建立关系？",
  body: `# 03 为什么要建立关系？

关联不是为了让图谱好看，而是为了写清两条笔记为什么要放在一起。

以后写作时，关系会帮你找到证据、反方、边界、例子和下一步缺口。

先读 [[关系理由比连线本身更重要]]，再读 [[关系类型会改变以后发现新东西的方式]]。`
});

updateById("guide_notes", "GUIDE-WRITABLE-THEME", {
  title: "04 什么是可写主题？",
  body: `# 04 什么是可写主题？

可写主题不是一个大分类，而是一个已经有几条笔记可以回答的问题。

判断方法很简单：这组笔记能不能支撑一篇短文章？

先看 [[主题索引不是文件夹，而是问题入口]]，再看 [[主题索引应该从一个中心问题开始]]。`
});

updateById("guide_notes", "GUIDE-INDEX-TO-WRITING", {
  title: "05 怎么从主题进入写作中心？",
  body: `# 05 怎么从主题进入写作中心？

先确认主题和关键笔记，再进入写作中心。

写作中心不是从空白开始写文章，而是把你已经确认的笔记整理成提纲。

先看 [[写作不是最后一步，而是整理笔记的方向]]，再看 [[写作中心应该从已确认判断生成提纲]]。`
});

updateById("guide_notes", "GUIDE-HELP-TASKS", {
  title: "06 遇到问题先看这里：按任务找帮助",
  body: `# 06 遇到问题先看这里：按任务找帮助

不知道下一步时，先回首页。

常见任务：

- 想体验产品：导入 Smart Notes Demo。
- 有一条想法：写成随笔。
- 有一段材料：写成文献笔记。
- 判断已经清楚：转成永久笔记。
- 两条笔记有关：建立关系。
- 一组笔记回答同一问题：整理成主题。
- 想写文章：从主题进入写作中心。`
});

updateById("guide_notes", "GUIDE-BACKUP-MOBILE-AI", {
  title: "07 备份、手机和 AI：先知道边界",
  body: `# 07 备份、手机和 AI：先知道边界

- 备份：把整个笔记库加密打包，适合迁移电脑或保存版本。
- 手机访问：适合随手记录、拍资料、轻量查看；复杂整理回电脑做。
- AI：只给建议，最终是否保存由你确认。

这三个功能都服务主路径，不应该抢走“处理笔记、建立关系、进入写作”的注意力。`
});

for (const key of [
  "sources",
  "fleeting_notes",
  "literature_notes",
  "permanent_notes",
  "index_cards",
  "relations",
  "writing_projects",
  "draft_scaffolds",
  "final_essays",
  "guide_notes"
]) {
  demo.counts[key] = Array.isArray(demo[key]) ? demo[key].length : 0;
}

fs.writeFileSync(fixturePath, `${JSON.stringify(demo, null, 2)}\n`, "utf8");
console.log(JSON.stringify(demo.counts, null, 2));
