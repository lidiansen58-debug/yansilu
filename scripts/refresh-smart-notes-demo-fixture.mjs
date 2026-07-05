import fs from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const FIXTURE_PATH = path.join(REPO_ROOT, "tests", "fixtures", "demo-smart-notes-product-thinking", "demo.json");

const source = {
  id: "SRC-SMART-NOTES",
  note_type: "source",
  title: "《卡片笔记写作法》方法边界",
  author: "Sönke Ahrens",
  source_kind: "book-method-reference",
  use_boundary: "Demo 只保留方法观念、原创转述和产品判断，不复刻原文，不替代阅读原书。",
  reading_purpose: "把卡片笔记写作法转成研思录里能直接体验的产品流程。",
  tags: ["卡片笔记", "方法边界", "Demo"],
  extraction_scope: "记录、转述、永久笔记、关系、主题索引、写作中心。",
  conversion_policy: "先用自己的话说清楚，再沉淀为可承担的判断，最后进入关系和写作。",
  knowledge_point_ids: [
    "KP-CAPTURE",
    "KP-PARAPHRASE",
    "KP-PERMANENT",
    "KP-RELATION",
    "KP-INDEX",
    "KP-WRITING"
  ]
};

const knowledgePoints = [
  {
    id: "KP-CAPTURE",
    cluster: "capture",
    label: "记录只是入口",
    method_principle: "临时记录只负责抓住还不稳定的想法，不能长期假装成知识。",
    misuse_to_avoid: "把随笔堆满以后，以为自己已经完成整理。",
    product_requirement: "首页要把未处理随笔和文献笔记推到用户面前，并给出下一步动作。"
  },
  {
    id: "KP-PARAPHRASE",
    cluster: "paraphrase",
    label: "转述检验理解",
    method_principle: "文献笔记要用自己的话重说材料，并保留来源边界。",
    misuse_to_avoid: "只贴摘录，让原文替自己思考。",
    product_requirement: "文献笔记模板要分开来源、转述、我的收获和候选永久笔记。"
  },
  {
    id: "KP-PERMANENT",
    cluster: "permanent",
    label: "永久笔记是一条判断",
    method_principle: "永久笔记不是摘要，而是离开原材料也能被复用的一句话判断。",
    misuse_to_avoid: "把漂亮摘要当成自己的观点。",
    product_requirement: "永久笔记要显示论点、理由、边界、来源和下一步可用场景。"
  },
  {
    id: "KP-RELATION",
    cluster: "relation",
    label: "关系让笔记继续思考",
    method_principle: "新笔记要尽快进入旧网络，并说明为什么这样连接。",
    misuse_to_avoid: "只因为标签相同就连线。",
    product_requirement: "关系创建要要求类型和理由，让用户知道这条线以后怎么用。"
  },
  {
    id: "KP-INDEX",
    cluster: "index",
    label: "主题索引是问题入口",
    method_principle: "索引不是文件夹，而是围绕一个问题重新进入多条笔记的路径。",
    misuse_to_avoid: "先建复杂分类，再逼所有笔记归档。",
    product_requirement: "主题索引要显示中心问题、关键笔记、阅读顺序和写作入口。"
  },
  {
    id: "KP-WRITING",
    cluster: "writing",
    label: "写作从已有判断开始",
    method_principle: "写作不是最后才发生，前面的记录、转述和建联都在为写作准备判断。",
    misuse_to_avoid: "打开空白 AI prompt，让系统替用户决定观点。",
    product_requirement: "写作中心要从主题索引和关键笔记生成提纲，并保留缺口和反方。"
  }
];

const permanentNotes = [
  note("PERM-WRITING-STARTS-BEFORE-DRAFT", "写作不是最后一步，而是整理笔记的方向", "writing", [
    "如果只在最后才想写作，前面的记录就容易变成资料仓库。",
    "从第一条材料开始，就要问它以后能回答什么问题。",
    "研思录要让每一步都看得见它离写作还有多远。"
  ], {
    thesis: "写作不是最后一步，而是判断是否值得整理一条笔记的方向。",
    rationale: "卡片笔记法真正有用的地方，是让材料一进入系统就面向未来表达，而不是等资料够多以后才找主题。",
    implication: "导入、首页、关系和写作中心都要围绕同一条主线：这条笔记以后能帮我写什么。",
    boundary: "这不等于每条随笔都要立刻写成文章。它只是要求用户知道下一步要把它推进到哪里。",
    sources: ["LN-WRITING-AS-DAILY-PRACTICE"],
    links: ["[[文献笔记要先转述，再沉淀判断]]", "[[主题索引不是文件夹，而是问题入口]]"]
  }),
  note("PERM-PARAPHRASE-BEFORE-JUDGMENT", "文献笔记要先转述，再沉淀判断", "paraphrase", [
    "转述不是改写句子，而是检查自己是否真的理解。",
    "能说出自己的话，才有资格沉淀永久笔记。",
    "产品要把摘录和我的理解分开。"
  ], {
    thesis: "文献笔记的核心任务，是把材料翻译成用户自己的理解。",
    rationale: "只收藏原句会让人误以为已经理解。转述会逼用户说明材料为什么重要。",
    implication: "文献笔记编辑器要固定显示来源边界、我的转述、我的收获、候选永久笔记。",
    boundary: "转述可以保留不确定。它不要求用户马上给出最终结论。",
    sources: ["LN-PARAPHRASE-IS-FIRST-CHECK"],
    links: ["[[永久笔记是一条用户愿意承担的判断]]", "[[AI 建议只能作为候选，不能替用户下判断]]"]
  }),
  note("PERM-PERMANENT-NOTE-IS-JUDGMENT", "永久笔记是一条用户愿意承担的判断", "permanent", [
    "永久笔记不是摘录，也不是资料卡。",
    "它要写出一个用户愿意以后继续使用、修改或反驳的判断。",
    "标题最好本身就带观点。"
  ], {
    thesis: "永久笔记的最小单位不是知识点，而是一条可承担的判断。",
    rationale: "只有判断能被支持、限定、反驳和用于写作。单纯主题词很难推动思考。",
    implication: "研思录的永久笔记模板要突出论点、理由、边界和来源，而不是只奖励字数。",
    boundary: "判断可以很小，也可以保留条件。小而清楚比大而空更适合进入网络。",
    sources: ["LN-PERMANENT-NOTE-AS-OWNED-CLAIM"],
    links: ["[[关系理由比连线本身更重要]]", "[[边界和反例让永久笔记更可靠]]"]
  }),
  note("PERM-RELATION-REASON-MATTERS", "关系理由比连线本身更重要", "relation", [
    "两条笔记相连，不代表用户真的理解它们的关系。",
    "关系理由要说清楚：支撑、补充、限定、反驳、例子还是桥接。",
    "以后写作时，理由比线条更能提示新段落。"
  ], {
    thesis: "关系理由比关系存在本身更重要。",
    rationale: "没有理由的关系只会让图谱变密。写出理由，才会留下可复用的思考路径。",
    implication: "建联流程要把关系类型和一句理由放在保存之前，而不是保存之后再补。",
    boundary: "不是所有候选关系都要保存。看起来相关但说不出理由时，先放回候选区更诚实。",
    sources: ["LN-LINKING-NEEDS-REASON"],
    links: ["[[为什么要关联笔记？]]", "[[AI 建议只能作为候选，不能替用户下判断]]"]
  }),
  note("PERM-THEME-INDEX-IS-ENTRY", "主题索引不是文件夹，而是问题入口", "index", [
    "文件夹回答“放在哪里”。主题索引回答“下次从哪里继续想”。",
    "它围绕中心问题组织关键笔记，而不是收纳所有相关材料。",
    "成熟的主题索引可以直接进入写作中心。"
  ], {
    thesis: "主题索引的价值，是让用户重新进入一个问题，而不是完成分类。",
    rationale: "真正需要被复用的是问题路径。下次回来时，用户要知道先读哪几条、为什么按这个顺序读。",
    implication: "主题索引要有中心问题、关键笔记、顺序理由和进入写作中心的动作。",
    boundary: "主题索引不必等到资料完整才创建。3 到 7 条关键笔记就可以先搭入口。",
    sources: ["LN-INDEX-AS-QUESTION-ENTRY"],
    links: ["[[如何从主题索引进入写作中心？]]", "[[知识网络的复利来自旧笔记遇到新问题]]"]
  }),
  note("PERM-COMPOUND-INTEREST-FROM-REUSE", "知识网络的复利来自旧笔记遇到新问题", "index", [
    "复利不是笔记数量自动变多。",
    "复利发生在旧判断被新问题重新调用时。",
    "关系和主题索引负责制造这种重逢。"
  ], {
    thesis: "知识网络的复利，来自旧笔记在新问题里被重新使用。",
    rationale: "一条判断如果只服务一次阅读，就很快沉底。它被多个主题索引和写作项目调用时，价值才会变厚。",
    implication: "产品指标不应该只看新增笔记数，还要看复用、互链、进入提纲和被修订的次数。",
    boundary: "复用不是硬塞。只有能提供理由、边界或例子的笔记，才值得被重新调用。",
    sources: ["LN-REUSE-CREATES-COMPOUND-INTEREST"],
    links: ["[[主题索引不是文件夹，而是问题入口]]", "[[写作中心应该从已确认判断生成提纲]]"]
  }),
  note("PERM-MOBILE-CAPTURE-DESKTOP-ORGANIZE", "手机负责快速记录，电脑负责慢慢整理", "capture", [
    "手机适合抓住现场想法。",
    "电脑适合转述、拆分、建联和进入写作。",
    "两端要互动，而不是做两套笔记系统。"
  ], {
    thesis: "手机和电脑的分工，应该围绕同一条处理链路，而不是复制同一个编辑器。",
    rationale: "移动端的优势是快，桌面端的优势是能看见结构。让两端各自做擅长的事，用户更容易持续。",
    implication: "手机记录要带上下一步，电脑首页要接住这些待处理内容。",
    boundary: "电脑不是唯一的整理入口。轻量确认和简单建联也可以在手机上完成，但复杂写作更适合桌面。",
    sources: ["LN-CAPTURE-NEEDS-FOLLOWUP"],
    links: ["[[随笔是捕捉点，不是知识点]]", "[[首页应该奖励处理，而不是奖励收藏]]"]
  }),
  note("PERM-FLEETING-NOTE-IS-CAPTURE", "随笔是捕捉点，不是知识点", "capture", [
    "随笔可以很粗糙。",
    "它的价值是提醒未来的自己：这里还有一段思考没做完。",
    "长期留下来的随笔，要么转换，要么删除。"
  ], {
    thesis: "随笔只负责捕捉，不负责长期表达知识。",
    rationale: "把随笔当知识会制造虚假的完成感。它必须进入转述、永久笔记、写作项目，或者被删除。",
    implication: "随笔列表要显示处理状态、建议去向和已转换笔记。",
    boundary: "有些随笔会直接删除。删除弱随笔也是整理进展。",
    sources: ["LN-CAPTURE-NEEDS-FOLLOWUP"],
    links: ["[[手机负责快速记录，电脑负责慢慢整理]]", "[[如何把一条随笔加工成永久笔记？]]"]
  }),
  note("PERM-TODAY-REVIEW-REWARDS-PROCESSING", "首页应该奖励处理，而不是奖励收藏", "capture", [
    "用户真正需要的是下一步，不是更多库存。",
    "首页要把待处理和待关联的内容摆出来。",
    "完成一个小动作，也比堆十条收藏更健康。"
  ], {
    thesis: "首页的反馈应该奖励处理动作，而不是奖励收藏数量。",
    rationale: "卡片笔记法的难点不是记录，而是持续把未完成材料推进一格。",
    implication: "首页应显示待转述文献、未转换随笔、未建联永久笔记和关系理由缺口。",
    boundary: "整理不等于大扫除。一次只做一个小动作，更适合新手坚持。",
    sources: ["LN-CAPTURE-NEEDS-FOLLOWUP"],
    links: ["[[随笔是捕捉点，不是知识点]]", "[[关系理由比连线本身更重要]]"]
  }),
  note("PERM-AI-SUGGESTION-IS-CANDIDATE", "AI 建议只能作为候选，不能替用户下判断", "writing", [
    "AI 可以帮忙发现候选关系、缺口和提纲。",
    "但它不能替用户承担观点。",
    "保存前必须让用户确认或改写。"
  ], {
    thesis: "AI 建议的正确位置是候选，而不是最终判断。",
    rationale: "永久笔记和关系理由都需要用户承担。AI 如果直接写成结论，会让系统看起来流畅，却削弱思想责任。",
    implication: "所有 AI 生成的关系、摘要和提纲都要有候选态、确认态和改写入口。",
    boundary: "这不是否定 AI。AI 很适合提出可能相关、可能缺失、可能反驳的方向。",
    sources: ["LN-AI-KEEPS-CANDIDATE-STATE"],
    links: ["[[文献笔记要先转述，再沉淀判断]]", "[[关系理由比连线本身更重要]]"]
  }),
  note("PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES", "写作中心应该从已确认判断生成提纲", "writing", [
    "写作中心不应该先问 AI 写什么。",
    "它应该先读取用户已经确认的永久笔记和主题索引。",
    "提纲要显示证据、缺口和反方。"
  ], {
    thesis: "写作中心应该从已确认判断生成提纲，而不是从空白提示词开始。",
    rationale: "如果提纲来自已有笔记，用户能看见每个段落的来源、理由和缺口。",
    implication: "写作项目要记录主题索引、关键笔记、关系理由和文献追溯。",
    boundary: "空白写作仍然可以存在，但 Demo 主路径要展示从笔记长出文章。",
    sources: ["LN-WRITING-AS-DAILY-PRACTICE"],
    links: ["[[写作不是最后一步，而是整理笔记的方向]]", "[[如何从主题索引进入写作中心？]]"]
  }),
  note("PERM-BACKUP-BEATS-IMPORT-EXPORT", "备份与恢复比导入导出更重要", "product", [
    "导入导出解决搬运。",
    "备份恢复解决安心。",
    "个人知识库最怕的是丢失、误删和无法回到旧状态。"
  ], {
    thesis: "对长期笔记系统来说，备份与恢复比导入导出更重要。",
    rationale: "卡片笔记的价值随时间累积。用户真正担心的是多年判断丢失，而不是一次性迁移不够漂亮。",
    implication: "产品路线应优先提供可验证、可恢复、用户可理解的备份机制。",
    boundary: "导入导出仍然重要，但它不能替代持续安全感。",
    sources: ["LN-PRODUCT-ROADMAP-FROM-NOTES"],
    links: ["[[未来产品路线可以从笔记中长出来]]"]
  }),
  note("PERM-ROADMAP-GROWS-FROM-NOTES", "未来产品路线可以从笔记中长出来", "product", [
    "产品路线不是宣传清单。",
    "它可以来自用户反复遇到的问题和笔记里的判断冲突。",
    "笔记网络能让路线讨论更有证据。"
  ], {
    thesis: "研思录的未来产品路线，应该从真实笔记流程中的问题长出来。",
    rationale: "当多条笔记都指向同一个卡点，比如备份、移动端处理、关系确认，就说明它值得进入路线讨论。",
    implication: "写作中心不只服务文章，也能服务产品路线说明、需求判断和版本计划。",
    boundary: "路线仍要做取舍。笔记能提供理由，不能自动替团队决定优先级。",
    sources: ["LN-PRODUCT-ROADMAP-FROM-NOTES"],
    links: ["[[备份与恢复比导入导出更重要]]", "[[手机负责快速记录，电脑负责慢慢整理]]"]
  }),
  note("PERM-BOUNDARY-MAKES-NOTE-RELIABLE", "边界和反例让永久笔记更可靠", "permanent", [
    "好笔记不怕写边界。",
    "边界说明这条判断什么时候不成立。",
    "反例会帮助以后写作更诚实。"
  ], {
    thesis: "永久笔记要写边界，因为边界会让判断更可靠。",
    rationale: "没有边界的判断容易变成口号。写出条件和反例，后续关联和写作才不会过度推论。",
    implication: "永久笔记模板要把边界或反例设为可见字段。",
    boundary: "边界不是削弱观点，而是让观点知道自己能走多远。",
    sources: ["LN-PERMANENT-NOTE-AS-OWNED-CLAIM"],
    links: ["[[永久笔记是一条用户愿意承担的判断]]"]
  }),
  note("PERM-QUOTE-IS-NOT-UNDERSTANDING", "摘录不等于理解", "paraphrase", [
    "摘录能保存材料，但不能证明理解。",
    "理解要表现为转述、追问和可转换的判断。",
    "产品不能只奖励保存成功。"
  ], {
    thesis: "摘录不等于理解，理解必须经过用户自己的转述。",
    rationale: "原文越精彩，用户越容易把保存误认为吸收。文献笔记要刻意拉开这个距离。",
    implication: "来源区和转述区要分开显示，并提醒用户下一步可转成哪条永久笔记。",
    boundary: "摘录仍然有价值，但它只是来源证据，不是用户观点。",
    sources: ["LN-PARAPHRASE-IS-FIRST-CHECK"],
    links: ["[[文献笔记要先转述，再沉淀判断]]"]
  }),
  note("PERM-LINK-TYPES-CREATE-DISCOVERY", "关系类型会改变以后发现新东西的方式", "relation", [
    "支撑关系适合找论据。",
    "限定和反驳适合找边界。",
    "桥接关系适合发现原本不相邻的问题。"
  ], {
    thesis: "不同关系类型，会让用户在写作和洞察时发现不同东西。",
    rationale: "同样两条笔记，如果是支撑，就用于证明；如果是反驳，就用于修正；如果是桥接，就用于打开新主题。",
    implication: "建联界面要用人话解释关系类型，并在写作中心保留这些理由。",
    boundary: "类型不必一次定死。用户可以先保存候选，等读得更清楚再修改。",
    sources: ["LN-LINKING-NEEDS-REASON"],
    links: ["[[关系理由比连线本身更重要]]", "[[关联笔记有哪些关系？如何设置关系？]]"]
  }),
  note("PERM-FIRST-TEN-MINUTES", "第一次使用研思录应该先走一条小闭环", "guide", [
    "新手不要先搭复杂分类。",
    "先走记录、转述、永久笔记、建联、索引、写作中心。",
    "走完一遍，比看完说明更容易理解产品。"
  ], {
    thesis: "第一次使用研思录，应该先走一条小闭环，而不是先设计完整知识库。",
    rationale: "小白真正需要的是体验每一步为什么存在。闭环能让功能变成动作，而不是术语。",
    implication: "Demo 导览要直接打开可操作样例，并避免出现内部编号。",
    boundary: "熟练用户可以跳过导览，但新手主路径必须足够短。",
    sources: ["LN-WRITING-AS-DAILY-PRACTICE"],
    links: ["[[写作不是最后一步，而是整理笔记的方向]]", "[[如何把一条随笔加工成永久笔记？]]"]
  }),
  note("PERM-DEMO-FIRST-RUN-RECOMMENDED", "第一次建议导入 Demo，是为了先看到完整闭环", "guide", [
    "空库适合正式开始，Demo 适合理解研思录为什么这样设计。",
    "Demo 会直接放好随笔、文献笔记、永久笔记、关系、主题索引和写作项目。",
    "新手先走一遍样例，再回到自己的库里记录，会更知道下一步点哪里。"
  ], {
    thesis: "第一次使用时建议先导入 Smart Notes Demo，因为它能把抽象方法变成一条可点击的完整闭环。",
    rationale: "卡片笔记写作法如果只靠说明文字，很容易变成术语。Demo 让用户直接看到一条想法怎样经过记录、转述、建联、主题索引和写作中心。",
    implication: "首页和帮助都应该提供明确的 Demo 入口，并说明导入前会确认、导入后可以随时删除或换回自己的笔记库。",
    boundary: "Demo 不是强制流程，也不会替用户建立真实知识库。它只是一个可照着走的样板。",
    sources: ["LN-WRITING-AS-DAILY-PRACTICE", "LN-CAPTURE-NEEDS-FOLLOWUP"],
    links: ["[[第一次使用研思录应该先走一条小闭环]]", "[[首页应该奖励处理，而不是奖励收藏]]"]
  }),
  note("PERM-HELP-SHOULD-FOLLOW-TASKS", "帮助页应该按任务组织，而不是按功能堆列表", "guide", [
    "新手遇到问题时，通常不知道功能叫什么。",
    "帮助页应该先问用户现在想完成什么任务。",
    "每个帮助入口都要能回到一个真实模块或一条 Demo 笔记。"
  ], {
    thesis: "帮助页应该按任务组织，而不是按功能名称堆列表。",
    rationale: "功能列表适合熟练用户查配置，但小白更关心“我现在卡住了，该点哪里”。任务式帮助能把产品理念、Demo 数据和真实操作连起来。",
    implication: "帮助首页要用“第一次打开”“我有一条想法”“为什么要建联”“怎么进入写作”等问题组织入口，并提供打开首页、主题库、写作中心、备份、手机访问和 AI 设置的按钮。",
    boundary: "任务式帮助不等于隐藏进阶设置。进阶设置仍然存在，只是不要占据新手的第一屏。",
    sources: ["LN-PRODUCT-ROADMAP-FROM-NOTES"],
    links: ["[[第一次建议导入 Demo，是为了先看到完整闭环]]", "[[第一次使用研思录应该先走一条小闭环]]", "[[AI 建议只能作为候选，不能替用户下判断]]"]
  }),
  note("PERM-BEST-PATH-STARTS-FROM-HOME", "研思录的最佳路径，是从首页开始做一个小闭环", "guide", [
    "首页不是普通仪表盘，而是每天开始的工作台。",
    "最好的路径不是先整理全部笔记，而是先推进一条内容。",
    "一条内容走通后，用户才真正理解卡片笔记写作法。"
  ], {
    thesis: "研思录的最佳路径，是从首页开始做一个小闭环。",
    rationale: "卡片笔记写作法的价值不在于一次搭好完整系统，而在于每天把一条材料向前推进：随笔变清楚、材料被转述、判断被确认、关系被写明、主题能进入写作。",
    implication: "首页要把下一步动作放在最前面，帮助和 Demo 都要围绕这条路径解释功能。",
    boundary: "用户可以从任意模块进入，但新手导览和帮助要默认把他们带回首页。",
    sources: ["LN-CAPTURE-NEEDS-FOLLOWUP", "LN-WRITING-AS-DAILY-PRACTICE"],
    links: ["[[首页应该奖励处理，而不是奖励收藏]]", "[[如何把一条随笔加工成永久笔记？]]", "[[如何从主题索引进入写作中心？]]"]
  }),
  note("PERM-UNLINKED-PRACTICE", "待关联练习：保存关系前先写清楚为什么", "relation", [
    "这条笔记故意还没有关系。",
    "请先找一条能互相解释的笔记。",
    "再选择关系类型，并写一句理由。"
  ], {
    thesis: "新手练习建联时，应该先说明为什么相关，再保存关系。",
    rationale: "练习笔记故意留在网络外，便于用户体验从孤立笔记进入关系网的动作。",
    implication: "建联流程要显示候选对象、关系类型和理由输入，而不是只提供连线按钮。",
    boundary: "说不出理由时，不保存关系也是正确动作。",
    sources: [],
    links: ["[[关系理由比连线本身更重要]]", "[[关系类型会改变以后发现新东西的方式]]"],
    role: "unlinked_relation_practice",
    hasRelationContext: false
  })
];

const literatureNotes = [
  literature("LN-WRITING-AS-DAILY-PRACTICE", "阅读一开始就要面向未来写作", "写作不是最后打开文档才开始。阅读时就要问：这条材料未来能支持哪个问题？", "我把这条材料转成产品判断：研思录不该只显示保存成功，还要显示材料离可写作判断还有哪一步。", ["PERM-WRITING-STARTS-BEFORE-DRAFT", "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES"], true),
  literature("LN-CAPTURE-NEEDS-FOLLOWUP", "临时记录必须承诺下一步", "随笔的价值不是快，而是给后续处理留下入口。没有下一步，随笔会变成隐藏债务。", "手机记录要足够轻，但电脑端必须接住它，提醒用户转述、建联或删除。", ["PERM-FLEETING-NOTE-IS-CAPTURE", "PERM-MOBILE-CAPTURE-DESKTOP-ORGANIZE", "PERM-TODAY-REVIEW-REWARDS-PROCESSING", "PERM-DEMO-FIRST-RUN-RECOMMENDED"], true),
  literature("LN-PARAPHRASE-IS-FIRST-CHECK", "用自己的话重说材料", "文献笔记要让用户离开原文说清楚材料含义。只有这样，材料才会变成自己的理解。", "模板要阻止用户把摘录直接当成果。转述区不是装饰，而是理解检测。", ["PERM-PARAPHRASE-BEFORE-JUDGMENT", "PERM-QUOTE-IS-NOT-UNDERSTANDING"], true),
  literature("LN-PERMANENT-NOTE-AS-OWNED-CLAIM", "永久笔记要能脱离原文使用", "永久笔记要独立可读，标题和正文都要能说明一个判断。它不是原材料的存放格。", "产品上要鼓励观点式标题、理由、边界和来源追溯。", ["PERM-PERMANENT-NOTE-IS-JUDGMENT", "PERM-BOUNDARY-MAKES-NOTE-RELIABLE"], true),
  literature("LN-LINKING-NEEDS-REASON", "新笔记要进入旧网络", "一条笔记真正增值，是它被放进有理由的关系里。关系要说明连接方式，而不是只制造密度。", "建联表单要要求类型、理由和追问问题，帮助用户以后从这条线继续写。", ["PERM-RELATION-REASON-MATTERS", "PERM-LINK-TYPES-CREATE-DISCOVERY"], true),
  literature("LN-INDEX-AS-QUESTION-ENTRY", "主题索引围绕问题组织笔记", "索引的作用是让用户下次回到同一个问题时，不必从整个库重新翻找。", "索引卡要显示中心问题、关键笔记和顺序理由，并能进入写作中心。", ["PERM-THEME-INDEX-IS-ENTRY", "PERM-COMPOUND-INTEREST-FROM-REUSE"], true),
  literature("LN-REUSE-CREATES-COMPOUND-INTEREST", "旧笔记在新问题中产生复利", "知识网络活起来，不是因为内容多，而是因为旧内容持续遇到新问题。", "复用次数、进入提纲次数和被修订次数，比纯新增数量更能说明系统健康。", ["PERM-COMPOUND-INTEREST-FROM-REUSE"], false),
  literature("LN-AI-KEEPS-CANDIDATE-STATE", "AI 参与时要保留候选状态", "AI 可以建议关系和提纲，但最终判断必须由用户确认。", "所有 AI 输出都要保留候选态和改写入口，避免把流畅当成正确。", ["PERM-AI-SUGGESTION-IS-CANDIDATE"], false),
  literature("LN-PRODUCT-ROADMAP-FROM-NOTES", "产品路线可以来自笔记中的重复问题", "当多个判断反复指向同一个卡点，它就可能成为产品路线的一部分。", "研思录可以把笔记网络用于产品判断，而不是只用于文章写作。", ["PERM-BACKUP-BEATS-IMPORT-EXPORT", "PERM-ROADMAP-GROWS-FROM-NOTES", "PERM-HELP-SHOULD-FOLLOW-TASKS"], false)
];

const fleetingNotes = [
  fleeting("FN-PHONE-CAPTURE-UNPROCESSED", "手机上先记一句：我总是收藏很多但不会用", "地铁上想到：也许产品不该夸我收藏了很多，而该提醒我下一步要处理哪一条。", "待处理：转成关于首页反馈的永久笔记，或删除。", []),
  fleeting("FN-WRITING-CENTER-PROCESSED", "写作中心不该从空白 prompt 开始", "如果入口先问 AI 想写什么，用户可能跳过自己的判断。写作中心应该从已确认笔记开始。", "已处理：已经沉淀到 [[写作中心应该从已确认判断生成提纲]]。", ["PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES"]),
  fleeting("FN-RELATION-REASON-UNLINKED", "建联时最难的是写为什么相关", "只点连接很容易，写出支撑、限定还是桥接才难。这里需要一个练习样例。", "待关联：打开建联流程，为 [[待关联练习：保存关系前先写清楚为什么]] 找一条相邻笔记。", ["PERM-UNLINKED-PRACTICE"]),
  fleeting("FN-BACKUP-PRODUCT-IDEA", "备份恢复可能比导入导出更让人安心", "长期知识库最怕丢，不是最怕搬。这个判断可以进入产品路线写作项目。", "已处理：已经沉淀到 [[备份与恢复比导入导出更重要]]。", ["PERM-BACKUP-BEATS-IMPORT-EXPORT"])
];

const indexCards = [
  index("THEME-WHAT-IS-PERMANENT-NOTE", "永久笔记是什么？", "什么时候一条记录才算变成永久笔记？", ["PERM-PERMANENT-NOTE-IS-JUDGMENT", "PERM-BOUNDARY-MAKES-NOTE-RELIABLE", "PERM-PARAPHRASE-BEFORE-JUDGMENT"]),
  index("THEME-WHY-LINK-NOTES", "为什么要关联笔记？", "关系能让两条笔记以后一起产生什么新理解？", ["PERM-RELATION-REASON-MATTERS", "PERM-LINK-TYPES-CREATE-DISCOVERY", "PERM-COMPOUND-INTEREST-FROM-REUSE"]),
  index("THEME-COMPOUND-INTEREST", "知识网络为什么会形成复利？", "旧笔记怎样在新问题里变得更有价值？", ["PERM-COMPOUND-INTEREST-FROM-REUSE", "PERM-THEME-INDEX-IS-ENTRY", "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES"]),
  index("THEME-RELATION-TYPES", "关联笔记有哪些关系？如何设置关系？", "支撑、补充、限定、反驳、例子、前提、桥接分别帮我们发现什么？", ["PERM-LINK-TYPES-CREATE-DISCOVERY", "PERM-RELATION-REASON-MATTERS", "PERM-UNLINKED-PRACTICE"]),
  index("THEME-MOBILE-DESKTOP", "手机笔记功能和电脑笔记功能有什么区别？如何形成互动？", "手机记录和电脑整理怎样接成一条链路？", ["PERM-MOBILE-CAPTURE-DESKTOP-ORGANIZE", "PERM-FLEETING-NOTE-IS-CAPTURE", "PERM-TODAY-REVIEW-REWARDS-PROCESSING"]),
  index("THEME-DEMO-FIRST-RUN", "为什么第一次建议导入 Smart Notes Demo？", "为什么先看样例，比先读说明更容易上手？", ["PERM-DEMO-FIRST-RUN-RECOMMENDED", "PERM-FIRST-TEN-MINUTES", "PERM-TODAY-REVIEW-REWARDS-PROCESSING"]),
  index("THEME-FIRST-USE", "第一次使用研思录应该先做什么？", "小白第一次打开时，怎样走完一个最小闭环？", ["PERM-DEMO-FIRST-RUN-RECOMMENDED", "PERM-BEST-PATH-STARTS-FROM-HOME", "PERM-FIRST-TEN-MINUTES", "PERM-FLEETING-NOTE-IS-CAPTURE", "PERM-WRITING-STARTS-BEFORE-DRAFT"]),
  index("THEME-HELP-BEST-PATH", "研思录帮助应该怎样服务新手？", "帮助、Demo 和核心流程怎样一起把新手带到下一步？", ["PERM-HELP-SHOULD-FOLLOW-TASKS", "PERM-DEMO-FIRST-RUN-RECOMMENDED", "PERM-BEST-PATH-STARTS-FROM-HOME", "PERM-AI-SUGGESTION-IS-CANDIDATE"]),
  index("THEME-FLEETING-TO-PERMANENT", "如何把一条随笔加工成永久笔记？", "从粗想法到可承担判断，中间要补哪几步？", ["PERM-FLEETING-NOTE-IS-CAPTURE", "PERM-PARAPHRASE-BEFORE-JUDGMENT", "PERM-PERMANENT-NOTE-IS-JUDGMENT"]),
  index("THEME-INDEX-TO-WRITING", "如何从主题索引进入写作中心？", "什么时候一个主题已经可以生成提纲？", ["PERM-THEME-INDEX-IS-ENTRY", "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES", "PERM-WRITING-STARTS-BEFORE-DRAFT"]),
  index("THEME-AI-CANDIDATE", "AI 建议为什么只能作为候选？", "为什么最终判断必须由用户确认？", ["PERM-AI-SUGGESTION-IS-CANDIDATE", "PERM-PARAPHRASE-BEFORE-JUDGMENT", "PERM-RELATION-REASON-MATTERS"]),
  index("THEME-PRODUCT-ROADMAP", "未来产品路线可以怎样从笔记中长出来？", "哪些产品判断能从笔记网络进入路线讨论？", ["PERM-ROADMAP-GROWS-FROM-NOTES", "PERM-BACKUP-BEATS-IMPORT-EXPORT", "PERM-MOBILE-CAPTURE-DESKTOP-ORGANIZE"])
];

const relations = [
  rel("REL-SUPPORT-WRITING-PARAPHRASE", "PERM-PARAPHRASE-BEFORE-JUDGMENT", "PERM-WRITING-STARTS-BEFORE-DRAFT", "supports", "转述让材料能变成自己的判断，因此支撑“写作从整理开始”的产品判断。"),
  rel("REL-PERMANENT-FOLLOWS-PARAPHRASE", "PERM-PARAPHRASE-BEFORE-JUDGMENT", "PERM-PERMANENT-NOTE-IS-JUDGMENT", "precedes", "没有先转述，永久笔记就容易只是摘录换标题。"),
  rel("REL-QUOTE-QUALIFIES-PARAPHRASE", "PERM-QUOTE-IS-NOT-UNDERSTANDING", "PERM-PARAPHRASE-BEFORE-JUDGMENT", "qualifies", "它说明转述为什么必要：摘录本身只能保存材料，不能证明理解。"),
  rel("REL-BOUNDARY-COMPLEMENTS-JUDGMENT", "PERM-BOUNDARY-MAKES-NOTE-RELIABLE", "PERM-PERMANENT-NOTE-IS-JUDGMENT", "complements", "永久笔记需要判断，也需要边界；两者合在一起才可靠。"),
  rel("REL-AI-CONTRADICTS-AUTO-JUDGMENT", "PERM-AI-SUGGESTION-IS-CANDIDATE", "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES", "qualifies", "AI 可以生成提纲候选，但不能替用户确认写作中心里的判断。"),
  rel("REL-INDEX-BRIDGES-WRITING", "PERM-THEME-INDEX-IS-ENTRY", "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES", "bridges", "主题索引把多条永久笔记组织成入口，正好桥接到写作中心。"),
  rel("REL-REUSE-SUPPORTS-INDEX", "PERM-THEME-INDEX-IS-ENTRY", "PERM-COMPOUND-INTEREST-FROM-REUSE", "supports", "主题索引让旧笔记不断遇到新问题，是知识复利的主要入口。"),
  rel("REL-MOBILE-EXAMPLE-CAPTURE", "PERM-MOBILE-CAPTURE-DESKTOP-ORGANIZE", "PERM-FLEETING-NOTE-IS-CAPTURE", "example_of", "手机记录体现随笔只负责捕捉，后续整理要交给更适合的场景。"),
  rel("REL-TODAY-COMPLEMENTS-MOBILE", "PERM-TODAY-REVIEW-REWARDS-PROCESSING", "PERM-MOBILE-CAPTURE-DESKTOP-ORGANIZE", "complements", "首页补上手机记录之后的桌面处理承诺。"),
  rel("REL-BACKUP-BRIDGES-ROADMAP", "PERM-BACKUP-BEATS-IMPORT-EXPORT", "PERM-ROADMAP-GROWS-FROM-NOTES", "bridges", "备份恢复把长期知识安全和产品路线讨论接起来。"),
  rel("REL-LINK-TYPES-EXTEND-REASON", "PERM-LINK-TYPES-CREATE-DISCOVERY", "PERM-RELATION-REASON-MATTERS", "extends", "它进一步说明不同理由会在未来写作中带来不同发现。"),
  rel("REL-FIRST-USE-RESTATES-FLOW", "PERM-FIRST-TEN-MINUTES", "PERM-WRITING-STARTS-BEFORE-DRAFT", "restates", "第一次使用的闭环，其实是在用最短路径重述从记录到写作的主线。"),
  rel("REL-DEMO-SUPPORTS-FIRST-USE", "PERM-DEMO-FIRST-RUN-RECOMMENDED", "PERM-FIRST-TEN-MINUTES", "supports", "先导入 Demo 能让第一次使用的小闭环变成可点击、可复现的操作路径。"),
  rel("REL-HELP-BRIDGES-DEMO", "PERM-HELP-SHOULD-FOLLOW-TASKS", "PERM-DEMO-FIRST-RUN-RECOMMENDED", "bridges", "帮助页按任务组织，Demo 负责把每个任务变成可点击样例，两者需要互相指向。"),
  rel("REL-HOME-EXTENDS-FIRST-USE", "PERM-BEST-PATH-STARTS-FROM-HOME", "PERM-FIRST-TEN-MINUTES", "extends", "它把第一次导览扩展成日常使用习惯：每天从首页推进一个小闭环。"),
  rel("REL-COLLECTION-CONTRADICTS-PROCESSING", "PERM-TODAY-REVIEW-REWARDS-PROCESSING", "PERM-QUOTE-IS-NOT-UNDERSTANDING", "contradicts", "两者共同反驳“保存越多越好”的误区，一个针对随笔，一个针对摘录。"),
  rel("REL-WRITING-APPEARS-IN-DRAFT", "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES", "PERM-WRITING-STARTS-BEFORE-DRAFT", "appears_in_draft", "写作中心示例会把这两条笔记放进同一个文章提纲，说明产品主张。")
];

const writingProject = {
  id: "WRITE-SMART-NOTES-DEMO",
  title: "为什么研思录要把卡片笔记写作法做进产品里",
  goal: "写一篇给新手看的产品说明，说明研思录怎样把记录、转述、永久笔记、关系、主题索引和写作中心连成一条路。",
  intent: "解释产品判断，不写宣传稿。",
  target_reader: "第一次打开研思录、听过卡片笔记法但不知道怎么开始的人。",
  desired_reader_takeaway: "我不需要先搭复杂分类，只要先走一个小闭环，就能理解研思录的价值。",
  basketNoteIds: [
    "PERM-FIRST-TEN-MINUTES",
    "PERM-WRITING-STARTS-BEFORE-DRAFT",
    "PERM-PARAPHRASE-BEFORE-JUDGMENT",
    "PERM-PERMANENT-NOTE-IS-JUDGMENT",
    "PERM-RELATION-REASON-MATTERS",
    "PERM-THEME-INDEX-IS-ENTRY",
    "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES",
    "PERM-AI-SUGGESTION-IS-CANDIDATE"
  ],
  indexCardIds: ["THEME-FIRST-USE", "THEME-HELP-BEST-PATH", "THEME-WHAT-IS-PERMANENT-NOTE", "THEME-WHY-LINK-NOTES", "THEME-INDEX-TO-WRITING"],
  keyNoteIds: ["PERM-WRITING-STARTS-BEFORE-DRAFT", "PERM-RELATION-REASON-MATTERS", "PERM-THEME-INDEX-IS-ENTRY"],
  outline: [
    outline("sec-1", "先承认新手卡在哪里", ["PERM-FIRST-TEN-MINUTES", "PERM-FLEETING-NOTE-IS-CAPTURE"], ["LN-CAPTURE-NEEDS-FOLLOWUP"]),
    outline("sec-2", "记录和转述为什么不能省", ["PERM-PARAPHRASE-BEFORE-JUDGMENT", "PERM-QUOTE-IS-NOT-UNDERSTANDING"], ["LN-PARAPHRASE-IS-FIRST-CHECK"]),
    outline("sec-3", "永久笔记为什么必须是判断", ["PERM-PERMANENT-NOTE-IS-JUDGMENT", "PERM-BOUNDARY-MAKES-NOTE-RELIABLE"], ["LN-PERMANENT-NOTE-AS-OWNED-CLAIM"]),
    outline("sec-4", "关系和主题索引怎样让笔记继续有用", ["PERM-RELATION-REASON-MATTERS", "PERM-THEME-INDEX-IS-ENTRY", "PERM-COMPOUND-INTEREST-FROM-REUSE"], ["LN-LINKING-NEEDS-REASON", "LN-INDEX-AS-QUESTION-ENTRY"]),
    outline("sec-5", "写作中心为什么从已有判断出发", ["PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES", "PERM-AI-SUGGESTION-IS-CANDIDATE"], ["LN-WRITING-AS-DAILY-PRACTICE", "LN-AI-KEEPS-CANDIDATE-STATE"])
  ],
  template: { type: "writing_project", starting_point: "theme_index_and_confirmed_notes" }
};

const draftScaffold = {
  id: "DRAFT-SMART-NOTES-DEMO",
  writing_project_id: writingProject.id,
  generated_by: "demo-fixture",
  version_note: "从主题索引和关键永久笔记生成的示例提纲。",
  key_note_ids: writingProject.keyNoteIds,
  key_note_path: writingProject.keyNoteIds,
  sections: writingProject.outline.map((section) => ({
    id: section.sectionId,
    title: section.title,
    goal: section.goal,
    note_ids: section.noteTraceIds,
    literature_note_ids: section.literatureTraceIds,
    key_note_ids: section.keyNoteTraceIds,
    open_question: section.openQuestion,
    gap: section.gap,
    counterpoint: section.counterpoint
  }))
};

const finalEssay = {
  id: "ESSAY-SMART-NOTES-DEMO",
  note_type: "final_essay",
  title: "示例文章：从笔记长出产品判断",
  writing_project_id: writingProject.id,
  body: [
    "# 示例文章：从笔记长出产品判断",
    "",
    "这篇示例不是最终稿。它展示写作中心如何从主题索引和关键笔记生成提纲。",
    "",
    "研思录的核心判断是：记录、转述、永久笔记、关系、主题索引和写作中心不是六个孤立功能，而是一条处理链路。",
    "",
    "文章最先引用 [[第一次使用研思录应该先走一条小闭环]]，再展开 [[永久笔记是一条用户愿意承担的判断]] 和 [[关系理由比连线本身更重要]]。最后回到 [[写作中心应该从已确认判断生成提纲]]。"
  ].join("\n")
};

const guideNotes = [
  guide("GUIDE-SMART-NOTES-START", "00 从这里开始：10 分钟走完研思录", [
    "# 00 从这里开始：10 分钟走完研思录",
    "",
    "你不用先学术语。照着这 6 步点一遍，就能看到研思录怎样把卡片笔记写作法做进产品里。",
    "",
    "如果你是第一次打开，建议先导入这套 Smart Notes Demo。它不是正式数据，而是一套可以放心试错的样例库。",
    "",
    "1. 先看 [[手机上先记一句：我总是收藏很多但不会用]]。它是一条还没处理完的随笔。",
    "2. 再看 [[阅读一开始就要面向未来写作]]。它展示材料如何先被转述，而不是直接复制。",
    "3. 打开 [[写作不是最后一步，而是整理笔记的方向]]。这是一条已经确认的永久笔记。",
    "4. 打开 [[待关联练习：保存关系前先写清楚为什么]]。去建联面板里为它找相邻笔记，并补一句为什么相关。",
    "5. 打开 [[为什么要关联笔记？]] 或 [[永久笔记是什么？]]。主题索引会告诉你按什么顺序读。",
    "6. 打开写作项目《为什么研思录要把卡片笔记写作法做进产品里》。看它怎样从主题和关键笔记生成提纲。",
    "",
    "首页就是每天开始的地方。今天只做一个动作也可以：处理一条随笔、转述一条文献笔记、确认一条永久笔记、补一条关系理由，或者从主题索引进入写作中心。"
  ].join("\n")),
  guide("GUIDE-TODAY-NEXT-STEP", "01 今天先做哪一步？", [
    "# 01 今天先做哪一步？",
    "",
    "打开首页，先看系统给出的下一步建议。不要一次处理所有内容，只选一件最小动作。",
    "",
    "- 如果你只有一句粗想法，先写成随笔，并补“下一步处理”。",
    "- 如果你刚读完一段材料，先写文献笔记，用自己的话转述。",
    "- 如果你已经有一个判断，写成永久笔记，并补理由和边界。",
    "- 如果你看到两条笔记互相解释，建立关系，并写清楚为什么。",
    "- 如果 3 条以上笔记围绕同一个问题，建立主题索引。",
    "- 如果主题索引已经有关键笔记，进入写作中心生成提纲。"
  ].join("\n")),
  guide("GUIDE-WHAT-PERMANENT", "02 什么是永久笔记？", [
    "# 02 什么是永久笔记？",
    "",
    "永久笔记不是保存资料。它是一条你愿意以后继续使用、修改或反驳的判断。",
    "",
    "先读 [[永久笔记是一条用户愿意承担的判断]]，再读 [[边界和反例让永久笔记更可靠]]。"
  ].join("\n")),
  guide("GUIDE-WHY-RELATE", "03 为什么要建立关系？", [
    "# 03 为什么要建立关系？",
    "",
    "建立关系不是为了让图谱更好看，而是为了让两条笔记以后能一起帮你思考。",
    "",
    "先读 [[关系理由比连线本身更重要]]，再读 [[关系类型会改变以后发现新东西的方式]]。"
  ].join("\n")),
  guide("GUIDE-WRITABLE-THEME", "04 什么是可写主题？", [
    "# 04 什么是可写主题？",
    "",
    "一个主题有中心问题、关键笔记、关系理由和边界时，就可以先进入写作中心。",
    "",
    "试着打开 [[如何从主题索引进入写作中心？]]。"
  ].join("\n")),
  guide("GUIDE-INDEX-TO-WRITING", "05 怎么从主题进入写作中心？", [
    "# 05 怎么从主题进入写作中心？",
    "",
    "从主题索引进入写作中心时，不是让 AI 从空白开始写，而是让它整理你已经确认的判断。",
    "",
    "先看 [[主题索引不是文件夹，而是问题入口]]，再看 [[写作中心应该从已确认判断生成提纲]]。"
  ].join("\n")),
  guide("GUIDE-HELP-TASKS", "06 遇到问题先看这里：按任务找帮助", [
    "# 06 遇到问题先看这里：按任务找帮助",
    "",
    "帮助不是功能说明书的目录，而是你卡住时的下一步入口。",
    "",
    "- 第一次打开：看 [[第一次建议导入 Demo，是为了先看到完整闭环]] 和 [[研思录的最佳路径，是从首页开始做一个小闭环]]。",
    "- 有一条想法：看 [[随笔是捕捉点，不是知识点]]，再回首页处理。",
    "- 不知道为什么建联：看 [[关系理由比连线本身更重要]]。",
    "- 想写文章：看 [[主题索引不是文件夹，而是问题入口]] 和 [[写作中心应该从已确认判断生成提纲]]。",
    "- 担心迁移和丢失：看 [[备份与恢复比导入导出更重要]]。",
    "- 想用手机：看 [[手机负责快速记录，电脑负责慢慢整理]]。",
    "- 想用 AI：看 [[AI 建议只能作为候选，不能替用户下判断]]。",
    "",
    "如果你不知道从哪里开始，就回到首页，只推进一条内容。"
  ].join("\n")),
  guide("GUIDE-BACKUP-MOBILE-AI", "07 备份、手机和 AI：先知道边界", [
    "# 07 备份、手机和 AI：先知道边界",
    "",
    "备份、手机访问和 AI 都是为了让主流程更安心，不是替代主流程。",
    "",
    "- 备份：保护整个笔记库，适合迁移和防止误删。",
    "- 手机：负责随时记录和轻阅读，复杂整理回电脑端。",
    "- AI / Ollama：提供候选关系、候选提纲和候选命名，最后仍然由用户确认。",
    "",
    "先手工走通记录、建联、主题和写作，再决定是否引入 AI，会更稳。"
  ].join("\n"))
];

function note(id, title, cluster, summary, options) {
  const kp = knowledgePoints.find((point) => point.cluster === cluster) || knowledgePoints[0];
  const links = options.links || [];
  return {
    id,
    note_type: "permanent",
    title,
    cluster,
    cluster_label: kp.label,
    status: "active",
    distillation_status: "confirmed",
    thesis: options.thesis,
    threeLineSummary: summary,
    productImplication: options.implication,
    boundaryOrCounterpoint: options.boundary,
    from_literature_note_ids: options.sources || [],
    tags: ["永久笔记", kp.label, "Smart Notes Demo"],
    body: [
      `# ${title}`,
      "",
      "## 核心论点",
      options.thesis,
      "",
      "## 三句话压缩",
      ...summary.map((item) => `- ${item}`),
      "",
      "## 论证理由",
      options.rationale,
      "",
      "## 产品含义",
      options.implication,
      "",
      "## 边界或反例",
      options.boundary,
      "",
      "## 可以继续看的笔记",
      ...(links.length ? links.map((item) => `- ${item}`) : ["- 待补充"]),
      "",
      "## 下一步动作",
      "把这条判断放进一个主题索引，或者用一条关系理由连接到相邻笔记。"
    ].join("\n"),
    core_claim: options.thesis,
    rationale: options.rationale,
    related_index_ids: [],
    citations: options.sources || [],
    knowledge_point: kp,
    template: {
      type: "permanent_note",
      required_sections: ["核心论点", "三句话压缩", "论证理由", "产品含义", "边界或反例", "可以继续看的笔记"]
    },
    is_key_note: ["PERM-WRITING-STARTS-BEFORE-DRAFT", "PERM-RELATION-REASON-MATTERS", "PERM-THEME-INDEX-IS-ENTRY"].includes(id),
    key_note_role: "topic_anchor",
    key_question: "",
    downstream_index_ids: [],
    use_case: "用于 Demo 教学和写作中心提纲生成。",
    next_question: "这条判断还需要哪条旧笔记来支撑、限定或反驳？",
    demo_role: options.role || "method_demo_note",
    template_completion: { has_relation_context: options.hasRelationContext !== false },
    authorship: { user_confirmed: true, ai_assisted: false },
    originality_status: "pass"
  };
}

function literature(id, title, paraphrase, takeaway, candidates, converted) {
  return {
    id,
    note_type: "literature",
    source_id: source.id,
    title,
    status: converted ? "converted" : "needs_processing",
    tags: ["文献笔记", "转述", "Smart Notes Demo"],
    paraphrase_text: paraphrase,
    my_takeaway: takeaway,
    candidate_permanent_notes: candidates,
    locator: "method-synthesis",
    quote_text: "只保留方法主题边界，不复刻原文。",
    user_question: "这条材料能转成哪一个我愿意承担的判断？",
    topic_candidates: candidates,
    knowledge_point_ids: source.knowledge_point_ids,
    knowledge_points: ["来源边界要清楚", "必须用自己的话重说", "要留下候选永久笔记"],
    questions: ["这条材料以后能支撑哪篇文章？", "它和哪条旧判断有关系？"],
    template: { type: "literature_note" },
    body: [
      `# ${title}`,
      "",
      "## 来源",
      "[[《卡片笔记写作法》方法边界]]",
      "",
      "## 引文边界",
      "本 Demo 只记录主题边界和原创转述，不复刻原文。",
      "",
      "## 我的转述",
      paraphrase,
      "",
      "## 我的收获",
      takeaway,
      "",
      "## 可转换为永久笔记",
      ...candidates.map((id) => `- [[${id}|${titleFor(id)}]]`),
      "",
      "## 处理状态",
      converted ? "已转换为永久笔记，可继续检查关系。" : "待处理：还需要确认要不要转换、关联或删除。"
    ].join("\n"),
    conversion_decision: {
      status: converted ? "converted" : "pending",
      conversion_reason: converted ? "已经形成候选永久笔记。" : "保留为首页待处理样例。",
      key_note_id: candidates[0] || ""
    }
  };
}

function fleeting(id, title, raw, nextAction, processedInto) {
  return {
    id,
    note_type: "fleeting",
    title,
    status: processedInto.length ? "processed" : "needs_processing",
    tags: ["随笔", "首页", "Smart Notes Demo"],
    body: [
      `# ${title}`,
      "",
      "## 原始闪念",
      raw,
      "",
      "## 为什么值得处理",
      "这条随笔暴露了一个产品判断，但还没有足够清楚。",
      "",
      "## 下一步处理",
      nextAction,
      "",
      "## 已转换为",
      ...(processedInto.length ? processedInto.map((id) => `- [[${id}|${titleFor(id)}]]`) : ["- 暂无，留给首页继续整理。"])
    ].join("\n"),
    next_action: nextAction,
    processed_into: processedInto,
    raw_idea: raw,
    capture_context: "手机快速记录或桌面临时捕捉。",
    why_it_matters: "它能帮助用户理解从记录到永久笔记的处理动作。",
    convert_target: processedInto[0] || "",
    converted_to_id: processedInto[0] || "",
    template: { type: "fleeting_note" }
  };
}

function index(id, title, question, noteIds) {
  return {
    id,
    index_type: "topic",
    title,
    central_question: question,
    thesis: `${title} 这张索引用来帮助新手重新进入问题。`,
    threeLineSummary: [
      "先读中心问题。",
      "再按顺序读关键永久笔记。",
      "最后决定是否进入写作中心。"
    ],
    summary: `围绕“${question}”组织关键笔记。`,
    item_note_ids: noteIds,
    tags: ["主题索引", "Smart Notes Demo"],
    ordering_strategy: "manual",
    knowledge_point_ids: source.knowledge_point_ids,
    key_note_ids: noteIds.slice(0, 1),
    items: noteIds.map((noteId, index) => ({
      note_id: noteId,
      order: index + 1,
      rationale: `第 ${index + 1} 步读 [[${noteId}|${titleFor(noteId)}]]，因为它能回答这个主题的一部分。`
    })),
    template: { type: "index_card" },
    noteIds,
    body: [
      `# ${title}`,
      "",
      "## 中心问题",
      question,
      "",
      "## 阅读顺序",
      ...noteIds.map((noteId, index) => `${index + 1}. [[${noteId}|${titleFor(noteId)}]]`),
      "",
      "## 进入写作中心",
      "如果这些笔记已经能回答同一个问题，就可以送进写作中心生成提纲。"
    ].join("\n")
  };
}

function guide(id, title, body) {
  return {
    id,
    note_type: "guide",
    title,
    status: "active",
    tags: ["导览", "Smart Notes Demo"],
    body
  };
}

function rel(id, from, to, relationType, rationale) {
  return {
    id,
    from,
    to,
    relationType,
    status: "confirmed",
    rationale,
    insight_question: "以后写作时，这条关系能提供论据、边界、反方，还是一个新的问题入口？",
    confidence: 0.9
  };
}

function outline(sectionId, title, noteTraceIds, literatureTraceIds) {
  return {
    sectionId,
    title,
    goal: `用 ${title} 帮新手理解一个动作。`,
    noteTraceIds,
    literatureTraceIds,
    keyNoteTraceIds: noteTraceIds.slice(0, 1),
    openQuestion: "这里还需要补一个更贴近日常使用的例子吗？",
    gap: "避免写成抽象方法论，要落到产品界面和用户动作。",
    counterpoint: "如果用户只想轻量记录，这一步会不会显得太重？"
  };
}

function titleFor(id) {
  return {
    "SRC-SMART-NOTES": "《卡片笔记写作法》方法边界",
    "PERM-WRITING-STARTS-BEFORE-DRAFT": "写作不是最后一步，而是整理笔记的方向",
    "PERM-PARAPHRASE-BEFORE-JUDGMENT": "文献笔记要先转述，再沉淀判断",
    "PERM-PERMANENT-NOTE-IS-JUDGMENT": "永久笔记是一条用户愿意承担的判断",
    "PERM-RELATION-REASON-MATTERS": "关系理由比连线本身更重要",
    "PERM-THEME-INDEX-IS-ENTRY": "主题索引不是文件夹，而是问题入口",
    "PERM-COMPOUND-INTEREST-FROM-REUSE": "知识网络的复利来自旧笔记遇到新问题",
    "PERM-MOBILE-CAPTURE-DESKTOP-ORGANIZE": "手机负责快速记录，电脑负责慢慢整理",
    "PERM-FLEETING-NOTE-IS-CAPTURE": "随笔是捕捉点，不是知识点",
    "PERM-TODAY-REVIEW-REWARDS-PROCESSING": "首页应该奖励处理，而不是奖励收藏",
    "PERM-DEMO-FIRST-RUN-RECOMMENDED": "第一次建议导入 Demo，是为了先看到完整闭环",
    "PERM-HELP-SHOULD-FOLLOW-TASKS": "帮助页应该按任务组织，而不是按功能堆列表",
    "PERM-BEST-PATH-STARTS-FROM-HOME": "研思录的最佳路径，是从首页开始做一个小闭环",
    "PERM-AI-SUGGESTION-IS-CANDIDATE": "AI 建议只能作为候选，不能替用户下判断",
    "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES": "写作中心应该从已确认判断生成提纲",
    "PERM-BACKUP-BEATS-IMPORT-EXPORT": "备份与恢复比导入导出更重要",
    "PERM-ROADMAP-GROWS-FROM-NOTES": "未来产品路线可以从笔记中长出来",
    "PERM-BOUNDARY-MAKES-NOTE-RELIABLE": "边界和反例让永久笔记更可靠",
    "PERM-QUOTE-IS-NOT-UNDERSTANDING": "摘录不等于理解",
    "PERM-LINK-TYPES-CREATE-DISCOVERY": "关系类型会改变以后发现新东西的方式",
    "PERM-FIRST-TEN-MINUTES": "第一次使用研思录应该先走一条小闭环",
    "PERM-UNLINKED-PRACTICE": "待关联练习：保存关系前先写清楚为什么",
    "LN-WRITING-AS-DAILY-PRACTICE": "阅读一开始就要面向未来写作",
    "LN-CAPTURE-NEEDS-FOLLOWUP": "临时记录必须承诺下一步",
    "LN-PARAPHRASE-IS-FIRST-CHECK": "用自己的话重说材料",
    "LN-PERMANENT-NOTE-AS-OWNED-CLAIM": "永久笔记要能脱离原文使用",
    "LN-LINKING-NEEDS-REASON": "新笔记要进入旧网络",
    "LN-INDEX-AS-QUESTION-ENTRY": "主题索引围绕问题组织笔记",
    "LN-REUSE-CREATES-COMPOUND-INTEREST": "旧笔记在新问题中产生复利",
    "LN-AI-KEEPS-CANDIDATE-STATE": "AI 参与时要保留候选状态",
    "LN-PRODUCT-ROADMAP-FROM-NOTES": "产品路线可以来自笔记中的重复问题",
    "FN-PHONE-CAPTURE-UNPROCESSED": "手机上先记一句：我总是收藏很多但不会用",
    "FN-WRITING-CENTER-PROCESSED": "写作中心不该从空白 prompt 开始",
    "FN-RELATION-REASON-UNLINKED": "建联时最难的是写为什么相关",
    "FN-BACKUP-PRODUCT-IDEA": "备份恢复可能比导入导出更让人安心",
    "THEME-WHAT-IS-PERMANENT-NOTE": "永久笔记是什么？",
    "THEME-WHY-LINK-NOTES": "为什么要关联笔记？",
    "THEME-COMPOUND-INTEREST": "知识网络为什么会形成复利？",
    "THEME-RELATION-TYPES": "关联笔记有哪些关系？如何设置关系？",
    "THEME-MOBILE-DESKTOP": "手机笔记功能和电脑笔记功能有什么区别？如何形成互动？",
    "THEME-DEMO-FIRST-RUN": "为什么第一次建议导入 Smart Notes Demo？",
    "THEME-FIRST-USE": "第一次使用研思录应该先做什么？",
    "THEME-HELP-BEST-PATH": "研思录帮助应该怎样服务新手？",
    "THEME-FLEETING-TO-PERMANENT": "如何把一条随笔加工成永久笔记？",
    "THEME-INDEX-TO-WRITING": "如何从主题索引进入写作中心？",
    "THEME-AI-CANDIDATE": "AI 建议为什么只能作为候选？",
    "THEME-PRODUCT-ROADMAP": "未来产品路线可以怎样从笔记中长出来？",
    "WRITE-SMART-NOTES-DEMO": "为什么研思录要把卡片笔记写作法做进产品里",
    "DRAFT-SMART-NOTES-DEMO": "从主题索引和关键永久笔记生成的示例提纲",
    "ESSAY-SMART-NOTES-DEMO": "示例文章：从笔记长出产品判断"
  }[id] || id;
}

function attachIndexes() {
  for (const note of permanentNotes) {
    note.related_index_ids = indexCards.filter((card) => card.noteIds.includes(note.id)).map((card) => card.id);
    note.downstream_index_ids = note.related_index_ids;
  }
}

function buildFixture() {
  attachIndexes();
  const fixture = {
    id: "demo-smart-notes-product-thinking-v2",
    title: "Smart Notes Demo：从记录到写作中心",
    generated_at: "2026-07-04T00:00:00.000Z",
    purpose: "让新手通过示例笔记本身理解卡片笔记写作法和研思录的完整使用路径。",
    counts: {},
    sources: [source],
    fleeting_notes: fleetingNotes,
    literature_notes: literatureNotes,
    permanent_notes: permanentNotes,
    index_cards: indexCards,
    relations,
    writing_projects: [writingProject],
    draft_scaffolds: [draftScaffold],
    final_essays: [finalEssay],
    graph: {
      reading_path: [
        "GUIDE-SMART-NOTES-START",
        "GUIDE-HELP-TASKS",
        "FN-PHONE-CAPTURE-UNPROCESSED",
        "LN-WRITING-AS-DAILY-PRACTICE",
        "PERM-WRITING-STARTS-BEFORE-DRAFT",
        "PERM-UNLINKED-PRACTICE",
        "THEME-WHY-LINK-NOTES",
        "WRITE-SMART-NOTES-DEMO",
        "DRAFT-SMART-NOTES-DEMO"
      ],
      key_note_paths: [
        {
          cluster: "writing",
          key_note_id: "PERM-WRITING-STARTS-BEFORE-DRAFT",
          index_card_id: "THEME-INDEX-TO-WRITING",
          supporting_note_ids: ["PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES", "PERM-FIRST-TEN-MINUTES"]
        },
        {
          cluster: "relation",
          key_note_id: "PERM-RELATION-REASON-MATTERS",
          index_card_id: "THEME-WHY-LINK-NOTES",
          supporting_note_ids: ["PERM-LINK-TYPES-CREATE-DISCOVERY", "PERM-UNLINKED-PRACTICE"]
        },
        {
          cluster: "index",
          key_note_id: "PERM-THEME-INDEX-IS-ENTRY",
          index_card_id: "THEME-COMPOUND-INTEREST",
          supporting_note_ids: ["PERM-COMPOUND-INTEREST-FROM-REUSE", "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES"]
        }
      ]
    },
    guide_notes: guideNotes,
    conversion_templates: {
      fleeting_note: "记录粗想法，并写下一步处理。",
      literature_note: "保留来源边界，用自己的话转述。",
      permanent_note: "沉淀为可承担判断。",
      index_card: "围绕一个中心问题组织关键笔记。",
      key_note: "能支撑主题和写作的关键判断。"
    },
    knowledge_extraction: { source_id: source.id, knowledge_points: knowledgePoints },
    key_notes: [
      {
        id: "KEY-WRITING",
        note_id: "PERM-WRITING-STARTS-BEFORE-DRAFT",
        cluster: "writing",
        label: "写作前置",
        key_question: "为什么写作要从整理笔记时开始？",
        role: "cluster_anchor",
        index_card_id: "THEME-INDEX-TO-WRITING",
        writing_use: "解释主路径。"
      },
      {
        id: "KEY-RELATION",
        note_id: "PERM-RELATION-REASON-MATTERS",
        cluster: "relation",
        label: "关系理由",
        key_question: "为什么建联必须写理由？",
        role: "cluster_anchor",
        index_card_id: "THEME-WHY-LINK-NOTES",
        writing_use: "解释图谱价值。"
      },
      {
        id: "KEY-INDEX",
        note_id: "PERM-THEME-INDEX-IS-ENTRY",
        cluster: "index",
        label: "主题索引",
        key_question: "为什么主题索引不是文件夹？",
        role: "cluster_anchor",
        index_card_id: "THEME-COMPOUND-INTEREST",
        writing_use: "解释从主题进入写作。"
      }
    ]
  };
  fixture.counts = {
    sources: fixture.sources.length,
    fleeting_notes: fixture.fleeting_notes.length,
    literature_notes: fixture.literature_notes.length,
    permanent_notes: fixture.permanent_notes.length,
    index_cards: fixture.index_cards.length,
    relations: fixture.relations.length,
    writing_projects: fixture.writing_projects.length,
    draft_scaffolds: fixture.draft_scaffolds.length,
    final_essays: fixture.final_essays.length,
    guide_notes: fixture.guide_notes.length
  };
  return fixture;
}

const fixture = buildFixture();
await fs.writeFile(FIXTURE_PATH, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
console.log(`Wrote ${FIXTURE_PATH}`);
