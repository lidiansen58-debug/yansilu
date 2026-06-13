import fs from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const FIXTURE_DIR = path.join(REPO_ROOT, "tests", "fixtures", "acceptance");
const DOCS_DIR = path.join(REPO_ROOT, "docs");
const JSON_PATH = path.join(FIXTURE_DIR, "yijing-rich-acceptance.json");
const DOC_PATH = path.join(DOCS_DIR, "YIJING_RICH_ACCEPTANCE_SAMPLE.md");

const generatedAt = "2026-05-15T16:15:00+08:00";

const fleetingNotes = [
  {
    id: "fn_yj_001",
    note_type: "fleeting",
    title: "看到泰卦时想到：顺利也有风险",
    status: "draft",
    tags: ["易经", "随笔", "泰卦", "风险"],
    body:
      "今天重新看泰卦，第一反应不是顺利，而是顺利时人最容易失去边界感。所谓通泰可能只是关系暂时畅通，并不等于以后也会自然畅通。可以把它发展成一条原创笔记：顺利不是免检状态，而是更需要复盘关系是否仍然相称。"
  },
  {
    id: "fn_yj_002",
    note_type: "fleeting",
    title: "占问像是把焦虑变成可讨论的问题",
    status: "draft",
    tags: ["易经", "随笔", "占问", "问题框架"],
    body:
      "占问的动作本身很有意思：人先承认自己看不清，然后把一团焦虑压缩成一个可以被追问的问题。即使不把它理解为神秘预测，这个动作也有价值。也许《易经》的现代意义不在给答案，而在训练人把处境说清楚。"
  }
];

const literatureNotes = [
  {
    id: "ln_yj_001",
    note_type: "literature",
    source: "《周易》卦爻辞",
    title: "乾坤与爻位提供情境判断的基础词汇",
    location: "乾卦、坤卦及相关爻辞",
    status: "draft",
    tags: ["易经", "文献笔记", "卦爻辞", "乾坤"],
    excerpt: "乾坤、初九、九二、上九等表达，反复把行动放回位置与阶段。",
    paraphrase:
      "卦爻辞并不是把一个问题直接化成答案，而是先提供情境结构：整体卦象、局部爻位、行动状态和结果评价相互配合。乾坤尤其适合做基础样本，因为它们把创生、承载、进退、边界这些问题放在同一个判断框架里。",
    questions: ["同一行动为什么在不同爻位上意义不同？", "乾坤是否应该被理解为互补关系，而不是强弱关系？"],
    candidateTopics: ["时位判断", "乾坤互补", "行动边界"],
    readingFocus: [
      "先把卦、爻、辞分开看，再观察它们如何共同限制一个判断。",
      "不要急着把吉凶翻译成结果好坏，要追问行动和位置是否相称。"
    ],
    extractionPlan: [
      "抽取“卦是情境模型”“爻位提供阶段差异”“吉凶是时位反馈”三组永久笔记。",
      "每条永久笔记都要带一个现代验收场景，方便在图谱、写作篮和关系面板中检查。"
    ],
    demoUse: "用于展示文献笔记如何被拆成多个可复用的永久笔记，而不是直接变成文章段落。",
    candidateNoteIds: ["YJ-A02", "YJ-A04", "YJ-A05", "YJ-A07", "YJ-A08"]
  },
  {
    id: "ln_yj_002",
    note_type: "literature",
    source: "《系辞传》",
    title: "变化、阴阳与通变构成易经的判断背景",
    location: "系辞上、系辞下",
    status: "draft",
    tags: ["易经", "文献笔记", "系辞", "变化"],
    excerpt: "关于阴阳、变通、观象取义的论述，把易从占辞推进到思维方式。",
    paraphrase:
      "《系辞传》把《易》的重点从单个占辞提升到变化哲学：世界不是先稳定再偶尔变化，而是在不断变化中形成相对稳定的关系。阴阳不是两个实体阵营，而是一套互相规定、互相转化的关系词。",
    questions: ["变化如果是常态，稳定性该如何重新定义？", "象为什么能帮助判断，而不只是修辞？"],
    candidateTopics: ["变化常态", "阴阳关系", "象与判断"],
    readingFocus: [
      "把“变化”读成默认背景，而不是意外扰动。",
      "把阴阳、象、通变都放回关系判断，避免把它们当成神秘标签。"
    ],
    extractionPlan: [
      "抽取“变化不是扰动”“阴阳不是善恶二分”“象是观察入口”等基础节点。",
      "用这些节点连接现代决策、慢读、复盘和多路径理解。"
    ],
    demoUse: "用于展示抽象文献如何变成网络中心节点，并支撑跨主题的多跳路径。",
    candidateNoteIds: ["YJ-A01", "YJ-A03", "YJ-A06", "YJ-A10", "YJ-E07", "YJ-E08"]
  },
  {
    id: "ln_yj_003",
    note_type: "literature",
    source: "王弼、程朱以来的义理诠释传统",
    title: "义理诠释提供去神秘化阅读的入口",
    location: "历代易学义理解释的通论脉络",
    status: "draft",
    tags: ["易经", "文献笔记", "义理", "解释"],
    excerpt: "义理易学常把卦象解释为修身、处世、政治与判断的结构。",
    paraphrase:
      "义理传统提醒我们，《易经》不能只被缩减为预测技术。它也可以被读作处境判断、行动修正和德性养成的文本。这个传统并不消除象数，而是要求象数最后回到可解释、可承担的判断上。",
    questions: ["去神秘化是否会损失经典的开放性？", "义理解释如何避免把卦象讲成空泛道德？"],
    candidateTopics: ["去神秘化", "义理解释", "经典开放性"],
    readingFocus: [
      "把去神秘化理解为把责任带回判断者，而不是把经典讲空。",
      "检查义理解释是否仍能落回行动边界、反例和可追溯来源。"
    ],
    extractionPlan: [
      "抽取“占问暴露问题框架”“神秘化让判断外包”“去神秘化不等于去意义”等解释边界笔记。",
      "让反工具化、反对意见和写作追溯进入关系网络，避免 demo 只展示单向支持。"
    ],
    demoUse: "用于展示经典主题如何被转化为面向普通用户的解释型写作项目。",
    candidateNoteIds: ["YJ-C01", "YJ-C02", "YJ-C03", "YJ-C07", "YJ-E03", "YJ-E10"]
  }
];

const indexCards = [
  {
    id: "idx_yj_core",
    type: "topic",
    title: "卦象与变化模型",
    centralQuestion: "《易经》如何把变化中的处境压缩成可讨论的判断模型？",
    noteIds: ["YJ-A01", "YJ-A02", "YJ-A03", "YJ-A04", "YJ-A05", "YJ-A06", "YJ-A07", "YJ-A08", "YJ-A09", "YJ-A10"]
  },
  {
    id: "idx_yj_action",
    type: "topic",
    title: "时位中的行动者",
    centralQuestion: "人在不确定中如何根据时位调整进退、边界与承担？",
    noteIds: ["YJ-B01", "YJ-B02", "YJ-B03", "YJ-B04", "YJ-B05", "YJ-B06", "YJ-B07", "YJ-B08", "YJ-B09", "YJ-B10"]
  },
  {
    id: "idx_yj_interpretation",
    type: "nearby",
    title: "去神秘化与解释边界",
    centralQuestion: "如何把《易经》从答案机器重新读成判断训练，而不抹掉经典的开放性？",
    noteIds: ["YJ-C01", "YJ-C02", "YJ-C03", "YJ-C04", "YJ-C05", "YJ-C06", "YJ-C07", "YJ-C08", "YJ-C09", "YJ-C10"]
  },
  {
    id: "idx_yj_modern",
    type: "topic",
    title: "现代决策训练",
    centralQuestion: "时位、关系和反馈意识如何进入产品、组织与个人决策？",
    noteIds: ["YJ-D01", "YJ-D02", "YJ-D03", "YJ-D04", "YJ-D05", "YJ-D06", "YJ-D07", "YJ-D08", "YJ-D09", "YJ-D10"]
  },
  {
    id: "idx_yj_writing",
    type: "sequence",
    title: "从笔记网络到写作",
    centralQuestion: "如何把易经主题笔记组织成可追溯的文章骨架？",
    noteIds: [
      "YJ-E01",
      "YJ-E02",
      "YJ-E03",
      "YJ-E04",
      "YJ-E05",
      "YJ-E06",
      "YJ-E07",
      "YJ-E08",
      "YJ-E09",
      "YJ-E10",
      "YJ-E11",
      "YJ-E12",
      "YJ-E13",
      "YJ-E14",
      "YJ-E15"
    ]
  }
];

const originalNoteSeed = [
  ["YJ-A01", "变化不是扰动而是背景", "变不是异常，而是所有判断默认要面对的背景。", "这条笔记把《易经》的第一层价值从预测未来转到理解变化。若变化是背景，判断就不能追求一次性定论，而要关注关系如何持续更新。", "可用于检验图谱中核心节点是否能支撑卦、爻、吉凶、现代决策等多个方向。", ["ln_yj_002"], "idx_yj_core"],
  ["YJ-A02", "卦把混乱处境压缩成模型", "卦不是答案，而是把复杂处境压缩成可讨论结构的模型。", "一个卦像一张简化地图：它舍弃许多细节，却保留最能推动判断的关系。用户测试时，可以把它当作从材料到观点的压缩样例。", "适合连接占问、现代模型、写作结构和图谱可视化。", ["ln_yj_001", "ln_yj_002"], "idx_yj_core"],
  ["YJ-A03", "阴阳不是善恶二分", "阴阳不是两个道德阵营，而是互为条件的关系结构。", "把阴阳读成善恶会让判断变得粗糙；读成互为条件，才会看到相反因素如何共同维持局面。这个观点能测试矛盾关系与互补关系是否被区分。", "可作为冲突处理、乾坤互补、关系词误读的基础节点。", ["ln_yj_002"], "idx_yj_core"],
  ["YJ-A04", "爻位让判断带上阶段", "爻位让同一行动在不同阶段呈现不同意义。", "《易经》的判断不是只问做不做，而是问此时此位该如何做。爻位把抽象判断落到阶段、位置和边界，避免把原则讲成永恒口号。", "适合验收路径查找：从变化背景走到具体行动反馈。", ["ln_yj_001"], "idx_yj_core"],
  ["YJ-A05", "吉凶是时位反馈", "吉凶不是命运判决，而是行动与时位是否相称的反馈。", "如果把吉凶看作反馈，用户就会从求结果转向看关系。所谓吉，常常是行动和位置暂时相称；所谓凶，则提醒关系已经错位。", "这是写作方案的主轴节点，也适合测试高入度节点。", ["ln_yj_001"], "idx_yj_core"],
  ["YJ-A06", "象是观察入口", "象不是装饰性比喻，而是把抽象关系变得可观察的入口。", "象让读者先看见形态，再进入判断。它不是为了神秘化，而是帮助人把难以命名的处境抓成一个可讨论的图形。", "可连接象数、读易难点和现代模型表达。", ["ln_yj_002"], "idx_yj_core"],
  ["YJ-A07", "卦辞像情境标题", "卦辞更像情境标题，而不是完整结论。", "卦辞常常给出一个高度压缩的判断入口，真正的推理要在爻位、象和处境中展开。把卦辞当终局答案，会过早关闭解释空间。", "用于检验从标题到段落骨架的写作转换。", ["ln_yj_001"], "idx_yj_core"],
  ["YJ-A08", "爻辞把结构落到动作", "爻辞把卦的整体结构转化为具体行动提示。", "如果说卦提供结构，爻辞就把结构拆成不同位置上的行动差异。它能防止读者停留在抽象原则上，也能测试笔记是否具备可复用行动含义。", "适合连接写作中的段落论证和行动者模型。", ["ln_yj_001"], "idx_yj_core"],
  ["YJ-A09", "变卦提示趋势但不替人行动", "变卦提示问题的发展趋势，但不能替代人的承担。", "趋势不是命令。变卦可以迫使人看到局势正在移动，却不能免除判断者选择、负责和修正的任务。", "用于测试限定关系和反工具化观点。", ["ln_yj_001", "ln_yj_003"], "idx_yj_core"],
  ["YJ-A10", "卦序是理解路径", "卦序可以被看作理解变化的路径，而不只是排列顺序。", "卦序让相邻处境之间形成学习路线：从一个状态如何进入另一个状态，为什么某种顺利之后会出现新的问题。", "可用来生成图谱中的序列索引和写作过渡。", ["ln_yj_002"], "idx_yj_core"],
  ["YJ-B01", "中正优先于绝对正确", "中正比绝对正确更接近《易经》的判断观。", "绝对正确常常假装处境不存在；中正则要求行动和位置、力量、关系相称。它不是折中主义，而是反对离开时位谈原则。", "适合连接吉凶、谦、组织策略和行动者模型。", ["ln_yj_003"], "idx_yj_action"],
  ["YJ-B02", "时机改变行动意义", "同一个行动在不同时间和位置上会变成不同判断。", "时机不是附加条件，而是行动意义的一部分。过早、过迟、过强、过弱都会改变一个选择的伦理和效果。", "适合测试 supports 与 qualifies 的差异。", ["ln_yj_001"], "idx_yj_action"],
  ["YJ-B03", "君子是情境中的行动者", "《易经》中的君子不是标签，而是在时位中承担修正的人。", "君子并不只是道德称号，而是一种行动者模型：能观察处境、控制力量、承认反馈、及时修正。", "是写作中从模型进入人的承担的关键节点。", ["ln_yj_003"], "idx_yj_action"],
  ["YJ-B04", "小人是不承担关系后果的模型", "小人不是固定身份，而是不愿承担关系后果的行动模式。", "若君子代表能在时位中调整，小人就代表只看眼前收益、拒绝看关系反馈的模式。这样的解释能避免把经典变成身份贴标签。", "适合形成对照关系，检验图谱冲突与对比展示。", ["ln_yj_003"], "idx_yj_action"],
  ["YJ-B05", "进退都是行动", "进与退都不是被动状态，而是需要判断的行动。", "在《易经》中，退避、等待、止损都可能是主动选择。行动不等于前进，判断也不等于不断加速。", "可用于现代决策和风险管理段落。", ["ln_yj_001"], "idx_yj_action"],
  ["YJ-B06", "等待不是消极", "等待可以是一种保持时位敏感的积极行动。", "等待的价值在于不让焦虑抢先替人做决定。它不是拖延，而是承认条件尚未形成，先保存观察和调整能力。", "适合和进退、复盘、决策停顿建立关系。", ["ln_yj_001"], "idx_yj_action"],
  ["YJ-B07", "戒惧让力量保持边界", "戒惧不是恐惧，而是让力量不越界的自我约束。", "乾卦里的警惕意识说明，强并不自动通向好结果。力量越大，越需要边界感，否则吉凶会从优势转为风险。", "可连接风险管理、履险和趋势非命令。", ["ln_yj_001"], "idx_yj_action"],
  ["YJ-B08", "谦不是自我贬低", "谦不是否定自己，而是让能力回到合适位置。", "谦的重点不是弱化主体，而是防止能力脱离关系。它让人有能力而不压迫，有判断而不自满。", "可作为中正观的例证节点。", ["ln_yj_003"], "idx_yj_action"],
  ["YJ-B09", "履险需要礼的距离感", "面对风险时，礼提供人与危险之间的距离感。", "履卦式的处境提醒人：风险并不总能被消除，但可以通过位置、节制和边界来处理。礼在这里不是形式，而是风险距离管理。", "适合连接戒惧、风险管理和冲突处理。", ["ln_yj_001"], "idx_yj_action"],
  ["YJ-B10", "复归是修正能力", "复归不是倒退，而是在偏离后重新取得判断位置。", "复的价值在于承认偏离，并把修正变成新行动的起点。它让系统不靠完美开始，而靠持续回到可判断的位置。", "适合现代复盘和慢读场景。", ["ln_yj_002"], "idx_yj_action"],
  ["YJ-C01", "占问先暴露问题框架", "占问的第一价值是暴露提问者如何框定处境。", "人在占问前必须把焦虑压缩成问题。这个压缩过程本身就有认知价值：它显示用户把什么当成关键、把什么排除在外。", "可连接随笔 fn_yj_002 与写作开头。", ["ln_yj_003"], "idx_yj_interpretation"],
  ["YJ-C02", "神秘化让判断外包", "把《易经》只当神秘预测，会把判断责任外包给答案。", "神秘化阅读最危险的地方不是保留敬畏，而是取消主体承担。用户只追问结果，就不会追问自己在关系中的位置。", "可形成与去神秘化、现代化、反工具化的冲突关系。", ["ln_yj_003"], "idx_yj_interpretation"],
  ["YJ-C03", "去神秘化不等于去意义", "去神秘化不是把《易经》变空，而是把意义带回判断实践。", "去神秘化不是否认经典有开放性，而是拒绝把开放性偷换成不可追问。意义应该能回到处境、行动和责任中被讨论。", "适合验收 contradicts 与 qualifies 的区别。", ["ln_yj_003"], "idx_yj_interpretation"],
  ["YJ-C04", "占筮仪式降低冲动决策", "占筮仪式至少可以被理解为延迟冲动决策的装置。", "仪式感会迫使人停顿、提问、等待解释。即使不接受预测前提，这种停顿也能让行动从反射变成判断。", "可连接现代复杂决策前的停顿。", ["ln_yj_003"], "idx_yj_interpretation"],
  ["YJ-C05", "经典的含混是复用空间", "《易经》的含混性使它能够进入多种处境，而不是只能服务单一答案。", "含混不是缺陷本身，关键在于是否有解释纪律。开放文本允许复用，但每次复用都必须说明处境和判断依据。", "可连接笔记网络、多路径理解和解释边界。", ["ln_yj_002", "ln_yj_003"], "idx_yj_interpretation"],
  ["YJ-C06", "断语必须回到处境", "任何断语离开具体处境都会从判断变成口号。", "易经式短句容易被摘成格言，但格言化会损失时位。真正的解释要问这句话在什么位置、面对什么力量、限制什么误用。", "适合测试文献笔记到原创笔记的转化质量。", ["ln_yj_001"], "idx_yj_interpretation"],
  ["YJ-C07", "义理和象数可以互相校验", "义理解释和象数观察应互相校验，而不是彼此排斥。", "只有义理容易空泛，只有象数容易神秘化。两者相互校验时，象让判断有形，义理让象回到可承担的意义。", "可连接象、去神秘化和解释不确定性。", ["ln_yj_003"], "idx_yj_interpretation"],
  ["YJ-C08", "读易的难点是把象转成判断", "读《易》的难点不在看见象，而在把象转成可负责的判断。", "很多解释停在形象联想上，缺少从形象到行动边界的桥。真正的笔记需要写清楚：这个象改变了我对处境的哪一部分判断。", "适合作为写作桥接节点。", ["ln_yj_002"], "idx_yj_interpretation"],
  ["YJ-C09", "解释必须保留不确定性", "好的易经解释应保留不确定性，而不是假装已经穷尽处境。", "解释越有力，越要标明边界。保留不确定性不是软弱，而是承认未来仍会改变当前判断条件。", "可连接反对意见、决策信心和趋势判断。", ["ln_yj_003"], "idx_yj_interpretation"],
  ["YJ-C10", "误读常来自把关系词当实体词", "许多误读来自把阴阳、吉凶、中正等关系词当成实体标签。", "关系词一旦被实体化，就会变成固定阵营、固定结果和固定身份。读易要不断把这些词放回关系之中。", "适合连接阴阳误读和义理校验。", ["ln_yj_002"], "idx_yj_interpretation"],
  ["YJ-D01", "易经训练复杂决策前的停顿", "《易经》的现代价值之一，是训练复杂决策前的停顿。", "停顿不是为了拖慢效率，而是为了重新看见关系。越复杂的处境，越需要在行动前确认问题框架、位置和风险边界。", "可用于验收写作方案的现代转化段。", ["ln_yj_003"], "idx_yj_modern"],
  ["YJ-D02", "组织策略需要时位意识", "组织策略不能只看目标，还要看所处阶段和位置。", "同样的扩张、收缩、招聘或削减，在不同阶段有完全不同的意义。时位意识能让组织避免把正确动作放在错误时间。", "可连接中正、爻位和产品阶段判断。", ["ln_yj_001"], "idx_yj_modern"],
  ["YJ-D03", "产品判断看阶段而非愿望", "产品判断应优先看阶段条件，而不是只看愿望强度。", "很多产品失败不是因为愿望不够，而是因为阶段错配：用户认知、渠道、能力、现金流尚未形成同一个卦象。", "适合做面向产品团队的验收写作素材。", ["ln_yj_001"], "idx_yj_modern"],
  ["YJ-D04", "个人成长不是线性加法", "个人成长更像在不同处境中换位，而不是能力线性相加。", "易经式成长不是不断叠技能，而是学会识别自己在哪个阶段、应当进还是守、该显还是藏。", "可连接卦序、复归和慢读。", ["ln_yj_002"], "idx_yj_modern"],
  ["YJ-D05", "风险管理是一种吉凶阅读", "风险管理可以被理解为持续阅读行动和时位是否相称。", "风险不是只在坏事发生前才存在。优势过度、行动过早、边界过松都可能把吉转为凶。", "可连接戒惧、履险和吉凶反馈。", ["ln_yj_001"], "idx_yj_modern"],
  ["YJ-D06", "冲突处理先辨互补条件", "处理冲突时，应先辨认对立背后的互补条件。", "阴阳关系提醒人，很多冲突不是消灭一方，而是重新安排互相制约和互相成就的条件。", "可连接阴阳、组织关系和反实体化误读。", ["ln_yj_002"], "idx_yj_modern"],
  ["YJ-D07", "复盘要问位置是否变了", "复盘不只问做得对不对，还要问位置是否已经变化。", "很多复盘只评价动作，却忽略动作发生时的位置。时位变了，原本正确的策略可能变成旧答案。", "可连接复归、慢读和多路径理解。", ["ln_yj_001"], "idx_yj_modern"],
  ["YJ-D08", "模型不是答案而是提问器", "模型的价值不是替人回答，而是帮助人提出更清楚的问题。", "把卦理解为模型，关键是让它保持提问功能。模型若被崇拜，就会重新变成答案机器。", "可连接占问、卦模型和好的关联说明。", ["ln_yj_002"], "idx_yj_modern"],
  ["YJ-D09", "决策信心来自关系看清", "决策信心不来自消除不确定性，而来自看清关键关系。", "复杂处境无法被完全掌控，但可以被更清楚地描述。信心来自知道哪些条件支持行动，哪些条件仍然开放。", "可连接解释不确定性和现代决策。", ["ln_yj_003"], "idx_yj_modern"],
  ["YJ-D10", "最坏的预测是把趋势当命令", "把趋势当成命令，是对《易经》和现代模型的共同误用。", "趋势只说明某种方向正在形成，不说明主体已经无需判断。它最多改变风险地图，不能取消行动者的责任。", "可连接变卦、神秘化和工具化崇拜。", ["ln_yj_001", "ln_yj_003"], "idx_yj_modern"],
  ["YJ-E01", "笔记网络应该保留张力", "好的笔记网络不只收集支持关系，也应保留张力和反对意见。", "如果所有笔记都互相支持，图谱会变成装饰。张力能逼迫写作者说明边界，也能让读者看见判断的代价。", "适合测试 contradicts、contrasts 与 supports 同屏展示。", [], "idx_yj_writing"],
  ["YJ-E02", "好的关联要写出为什么", "笔记之间的关联必须说明为什么相关，而不能只画一条线。", "关系说明是图谱的思想含量。没有理由的线只能制造视觉热闹，无法帮助写作、复盘或发现缺口。", "可作为关系质量验收的标准节点。", [], "idx_yj_writing"],
  ["YJ-E03", "从一卦到一文需要中间判断", "从卦象到文章，中间必须经过原创判断的转换。", "直接把材料堆成文章会让文本失去作者。文献笔记、原创笔记、索引卡和写作方案的链路，就是为了让判断逐级显形。", "适合验收从文献笔记到写作方案的追溯链。", ["ln_yj_001", "ln_yj_003"], "idx_yj_writing"],
  ["YJ-E04", "主题索引服务中心问题", "主题索引不应只是分类，而要服务一个中心问题。", "同一批易经笔记可以服务很多文章。中心问题决定哪些笔记进入篮子、哪些作为反对意见、哪些只是背景。", "可连接写作项目和材料篮。", [], "idx_yj_writing"],
  ["YJ-E05", "写作方案要显示来源追溯", "写作方案必须让每个段落追溯到笔记和来源。", "可追溯不是学术装饰，而是防止文章漂浮。读者和作者都能回到哪条笔记、哪份文献、哪个判断支撑了段落。", "适合验收 draft scaffold 的 noteTraceIds 与 literatureTraceIds。", ["ln_yj_001", "ln_yj_002", "ln_yj_003"], "idx_yj_writing"],
  ["YJ-E06", "丰富笔记不是堆材料", "笔记丰富不等于材料堆积，而是论点、理由、边界和用途都可复用。", "一条真正可复用的原创笔记应能独立表达判断，也能说明来源、相邻概念、可写段落和潜在反对意见。", "可作为整套原创笔记的验收标准。", [], "idx_yj_writing"],
  ["YJ-E07", "多条路径比单一路径更像理解", "理解《易经》更像多条路径交汇，而不是单一线性结论。", "图谱的价值在于呈现一条观点如何通向多个问题，也呈现多个材料如何汇入同一判断。", "适合验收图谱组件的路径和组件连通性。", ["ln_yj_002"], "idx_yj_writing"],
  ["YJ-E08", "慢读让孤立观点重新换位", "慢读的价值在于让旧笔记在新处境中重新换位。", "第一次读到的观点可能只是一个标题；隔一段时间再读，它会和新问题、新关系、新写作目标重新连接。", "可连接卦序、复盘和随笔转化。", ["ln_yj_002"], "idx_yj_writing"],
  ["YJ-E09", "反对意见是网络的一部分", "反对意见不是写作障碍，而是知识网络必须保存的结构。", "一个观点只有在面对反对意见时才显示边界。图谱中保留冲突关系，能帮助文章避免单薄的自我确认。", "适合验收冲突关系、写作反驳段和关系过滤。", [], "idx_yj_writing"],
  ["YJ-E10", "易经现代化要避免工具化崇拜", "把《易经》现代化时，不能把它重新变成万能工具。", "若现代化只是把卦象包装成管理捷径或心理测试，它仍然是答案机器。更好的现代化是把它变成判断训练和反思框架。", "可作为整套样例的边界节点。", ["ln_yj_003"], "idx_yj_writing"],
  ["YJ-E11", "同主题不是关系完成", "同属主题只说明两条笔记值得放在一起看，不能替代明确的关系判断。", "same_topic 是低成熟度关系：它承认材料相邻，但也提醒用户下一步要说清楚是支持、限定、反驳还是只是待比较。", "用于验收同主题关系不会被误读成已经论证完成。", [], "idx_yj_writing"],
  ["YJ-E12", "意外相关要留下追问", "看似很远的笔记只有能提出新问题，才值得标为意外相关。", "unexpected_connection 的价值不在制造新奇感，而在保留一个暂时无法归类、却可能打开新路径的问题。没有追问的意外相关只是噪音。", "用于验收意外相关关系必须带有洞察问题。", ["ln_yj_002"], "idx_yj_writing"],
  ["YJ-E13", "反例让边界可见", "反例不是破坏观点，而是让观点的适用边界变清楚。", "counterexample_to 比泛泛的反驳更精细：它不一定推翻整条判断，而是指出这条判断在哪些条件下失效、变形或需要补充。", "用于验收反例关系和反驳关系的区别。", [], "idx_yj_writing"],
  ["YJ-E14", "进入写作不等于完成论证", "一条笔记进入写作方案，只表示它被放进论证现场，还不等于已经承担了段落功能。", "appears_in_draft 记录的是材料被写作项目征用的事实；真正的论证还需要说明它在段落里是证据、转折、反例还是过渡。", "用于验收写作引用关系不会遮蔽来源追溯。", [], "idx_yj_writing"],
  ["YJ-E15", "后续问题要声明承接关系", "后续问题不是随意延伸，而要说明它从哪条判断自然推出。", "follows 关系帮助写作者把图谱中的下一步写清楚：后续不是另起炉灶，而是从已确认判断中推出的新问题、新场景或新行动。", "用于验收前提和后续关系能形成可读路径。", [], "idx_yj_writing"]
];

const indexProfiles = {
  idx_yj_core: {
    category: "卦象与变化模型",
    perspective: "从经典文本里抽出可复用的判断模型，重点不是解释每一卦，而是说明卦、爻、象、吉凶怎样共同把处境变得可讨论。",
    boundary: "不要把模型误读成答案机器；每条笔记都必须保留时位、处境和行动者责任。",
    reuse: "适合放在图谱中心、导入主题索引，并进入解释型文章的基础论证段。",
    nextQuestion: "这条判断在什么条件下会失效，或者需要被另一条笔记限定？"
  },
  idx_yj_action: {
    category: "时位中的行动者",
    perspective: "把《易经》里的进退、等待、戒惧、谦、复归改写成行动判断，而不是道德标签。",
    boundary: "不要把中正、君子、小人固定成身份评价；它们在 demo 中应表现为可观察的行动模式。",
    reuse: "适合进入关系面板、风险讨论和现代决策写作项目。",
    nextQuestion: "这条笔记怎样帮助用户判断当前应该进、守、等、退还是复盘？"
  },
  idx_yj_interpretation: {
    category: "去神秘化与解释边界",
    perspective: "把占问、仪式、含混性和义理解释转成可追问的解释纪律。",
    boundary: "去神秘化不能把经典讲成空泛常识，也不能把不确定性包装成不可质疑。",
    reuse: "适合验收冲突关系、限定关系、反对意见和解释边界的展示。",
    nextQuestion: "这条解释保留了哪些不确定性，又排除了哪些任意联想？"
  },
  idx_yj_modern: {
    category: "现代决策训练",
    perspective: "把时位、关系、反馈和复盘转成产品、组织与个人选择都能理解的判断流程。",
    boundary: "现代化不能把《易经》变成管理捷径、心理测试或万能工具。",
    reuse: "适合给用户演示从经典笔记到现实场景迁移的全过程。",
    nextQuestion: "这条笔记对应的现代场景是什么，它改变了用户哪一步判断？"
  },
  idx_yj_writing: {
    category: "从笔记网络到写作",
    perspective: "展示永久笔记如何通过关系理由、主题索引、写作篮和段落追溯进入文章。",
    boundary: "写作不是堆材料；没有边界、反例和承接关系的笔记不能直接承担论证。",
    reuse: "适合验收写作项目、draft scaffold、关系质量和来源追溯。",
    nextQuestion: "这条笔记在文章里承担证据、转折、反例、定义还是过渡？"
  }
};

const literatureNotesById = new Map(literatureNotes.map((note) => [note.id, note]));

function sourceTraceLines(literatureNoteIds) {
  if (!literatureNoteIds.length) return ["- 主题综合或写作反思：这条笔记不是直接摘录，而是从多条已有判断中抽出的写作型永久笔记。"];
  return literatureNoteIds.map((noteId) => {
    const source = literatureNotesById.get(noteId);
    if (!source) return `- ${noteId}`;
    return `- ${noteId}：${source.title}；来源为${source.source}，位置为${source.location}。`;
  });
}

function buildOriginalNote([id, title, thesis, why, testUse, literatureNoteIds, indexCardId]) {
  const tags = ["易经", "原创笔记"];
  if (id.startsWith("YJ-A")) tags.push("卦象模型");
  if (id.startsWith("YJ-B")) tags.push("行动判断");
  if (id.startsWith("YJ-C")) tags.push("解释边界");
  if (id.startsWith("YJ-D")) tags.push("现代决策");
  if (id.startsWith("YJ-E")) tags.push("写作方案");
  const threeLineSummary = [
    thesis,
    why,
    testUse
  ];
  const profile = indexProfiles[indexCardId] || indexProfiles.idx_yj_core;
  return {
    id,
    note_type: "permanent",
    title,
    thesis,
    threeLineSummary,
    status: "draft",
    template_version: "permanent-note-v2",
    category: profile.category,
    demo_use: testUse,
    boundary_or_counterpoint: profile.boundary,
    next_question: profile.nextQuestion,
    originality_status: "pass",
    authorship: { user_confirmed: true, ai_assisted: false },
    tags,
    from_literature_note_ids: literatureNoteIds,
    related_index_ids: [indexCardId],
    body: [
      `# ${title}`,
      "",
      "## 一句话论点",
      thesis,
      "",
      "## 三句话压缩",
      `1. ${threeLineSummary[0]}`,
      `2. ${threeLineSummary[1]}`,
      `3. ${threeLineSummary[2]}`,
      "",
      "## 问题来源",
      profile.perspective,
      "",
      ...sourceTraceLines(literatureNoteIds),
      "",
      "## 展开",
      why,
      "",
      "这条笔记不是资料摘要，而是可以进入后续写作的判断单元。它至少包含一个可独立复用的论点、一个解释理由、一个使用场景，以及一个可能被其他笔记支持或限定的边界。读者应能单独读懂它，也能在图谱中看见它为什么连接到其他判断。",
      "",
      "## 边界与反例",
      profile.boundary,
      "",
      `在验收时，如果这条笔记只能产生“同主题”关系，而说不清支持、限定、反驳、桥接或反例，它就还不够成熟。可以先追问：${profile.nextQuestion}`,
      "",
      "## 关联理由写法",
      `- 与同索引卡 ${indexCardId} 中的笔记相连时，必须写清它是在提供证据、限定边界、提出反例，还是作为后续问题。`,
      "- 关系理由不应只写“相关”，而要说明两条永久笔记在论证链中的动作。",
      "- 洞察问题要能推动下一次阅读、复盘或写作，而不是重复标题。",
      "",
      "## 可进入的使用场景",
      profile.reuse,
      "",
      "## 可测试点",
      `- 作为原创笔记，它应能在列表、详情、图谱和写作篮中独立显示：${thesis}`,
      `- 作为关系节点，它应能通过 ${indexCardId} 进入对应索引卡，并通过显式关系进入图谱。`,
      `- 作为写作素材，它的用途是：${testUse}`,
      "",
      "## 来源追溯",
      literatureNoteIds.length ? literatureNoteIds.map((noteId) => `- ${noteId}`).join("\n") : "- 无直接文献笔记，来自主题综合或写作反思。",
      "",
      `#易经 #原创笔记 #${tags[2]}`
    ].join("\n")
  };
}

const originalNotes = originalNoteSeed.map(buildOriginalNote);

const relationTypeLabels = {
  supports: "支持",
  extends: "推进",
  complements: "补充",
  contradicts: "反驳",
  contrasts: "对照",
  restates: "重述",
  qualifies: "限定",
  reframes: "改写",
  bridges: "桥接",
  example_of: "例子",
  precedes: "前置",
  follows: "后续",
  same_topic: "同主题",
  unexpected_connection: "意外相关",
  counterexample_to: "反例",
  appears_in_draft: "进入写作"
};

function rel(from, to, relationType, rationale, insightQuestion, confidence = 0.9) {
  const relationTypeLabel = relationTypeLabels[relationType] || relationType;
  return {
    id: `lnk_${from}_${to}_${relationType}`.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 96),
    from,
    to,
    relationType,
    relationTypeLabel,
    rationale: `${relationTypeLabel}：${rationale} 这条边不是弱相关，而是标明两条永久笔记在论证中的具体动作、证据位置和边界。`,
    relationReason: rationale,
    insightQuestion,
    reviewHint: "验收时应能在关系面板看到关系类型、理由和洞察问题；若理由只剩“相关”，说明数据退化。",
    confidence,
    status: "confirmed",
    createdBy: "user"
  };
}

const relations = [
  rel("YJ-A03", "YJ-A01", "supports", "阴阳互为条件，支持变化不是外部扰动而是结构背景。", "如果阴阳是关系结构，稳定性应如何重新定义？"),
  rel("YJ-A01", "YJ-A02", "extends", "变化常态推进到卦的功能：卦把变化处境压缩成模型。", "卦压缩了哪些信息，又保留了哪些判断线索？"),
  rel("YJ-A02", "YJ-A04", "complements", "卦给整体结构，爻位补充阶段位置，两者共同完成判断。", "整体结构与局部阶段如何互相校验？"),
  rel("YJ-A04", "YJ-A05", "supports", "爻位说明行动要看阶段，因此支持吉凶是时位反馈。", "哪些行动在换位之后会从吉转凶？"),
  rel("YJ-A06", "YJ-A03", "complements", "象让阴阳关系可观察，补充了抽象关系结构。", "没有象，关系判断会失去什么？"),
  rel("YJ-A06", "YJ-A03", "example_of", "乾坤等象是阴阳互为条件的具体例子。", "互补关系为什么容易被误读为强弱对立？"),
  rel("YJ-A07", "YJ-A02", "restates", "卦辞作为情境标题，是卦作为模型的另一种表达。", "情境标题和完整结论之间的边界在哪里？"),
  rel("YJ-A08", "YJ-A04", "extends", "爻辞把爻位阶段进一步转化为具体行动提示。", "何时一个结构判断才能变成行动建议？"),
  rel("YJ-A09", "YJ-A05", "qualifies", "变卦限定吉凶反馈：趋势提示不能变成命运判决。", "趋势提示与主体承担之间如何划线？"),
  rel("YJ-A10", "YJ-A01", "bridges", "卦序把变化常态组织成可学习路径，桥接背景和次序。", "变化是否必须被组织成顺序才能学习？"),
  rel("YJ-A10", "YJ-A04", "precedes", "卦序提供宏观路径，爻位判断可以在路径内部展开。", "从卦序进入爻位还缺少哪些中间判断？"),
  rel("YJ-B02", "YJ-A04", "supports", "时机改变行动意义，直接支持爻位让判断带上阶段。", "阶段意识怎样改变行动评价？"),
  rel("YJ-B01", "YJ-A05", "qualifies", "中正限定吉凶阅读：不能只看结果，还要看是否相称。", "中正是结果标准，还是位置标准？"),
  rel("YJ-B03", "YJ-A05", "extends", "若吉凶是反馈，君子就是能接收反馈并修正的行动者。", "行动者如何把反馈转化为下一步？"),
  rel("YJ-B04", "YJ-B03", "contrasts", "小人作为不承担后果的模式，与君子行动者形成对照。", "身份标签化会如何遮蔽行动模式？"),
  rel("YJ-B05", "YJ-B06", "complements", "进退都是行动，补充说明等待也可能是主动判断。", "什么时候等待比推进更有判断含量？"),
  rel("YJ-B06", "YJ-B05", "example_of", "等待是退或守也可以成为行动的具体例子。", "等待如何区别于拖延？"),
  rel("YJ-B07", "YJ-A09", "qualifies", "戒惧让趋势提示不被误用为冒进命令。", "力量越大时，为什么越需要边界？"),
  rel("YJ-B08", "YJ-B01", "example_of", "谦让能力回到合适位置，是中正观的例子。", "谦如何避免变成自我贬低？"),
  rel("YJ-B09", "YJ-B07", "bridges", "履险用礼保持距离，桥接戒惧和风险处置。", "礼在风险场景中如何成为距离管理？"),
  rel("YJ-B10", "YJ-A09", "extends", "复归把趋势提示推进为偏离后的修正能力。", "发现趋势之后，怎样重新取得位置？"),
  rel("YJ-B10", "YJ-D07", "supports", "复归支持复盘要检查位置是否变化。", "复盘如何避免只评价动作本身？"),
  rel("YJ-B03", "YJ-B01", "supports", "君子行动者以中正为调整方向，而非追求绝对正确。", "行动者如何在不确定中保持中正？"),
  rel("YJ-B02", "YJ-B05", "qualifies", "时机限定进退意义：进退是否合适取决于阶段。", "同样的退让为什么在不同阶段意义不同？"),
  rel("YJ-C01", "YJ-A02", "reframes", "占问把卦从答案重构为问题框架和情境模型。", "问题框架是否比答案本身更重要？"),
  rel("YJ-C01", "YJ-D08", "supports", "占问暴露问题框架，支持模型是提问器的理解。", "模型怎样帮助人问得更清楚？"),
  rel("YJ-C02", "YJ-A02", "contradicts", "神秘化把卦当答案，反驳卦是模型的判断路径。", "神秘化为什么会削弱模型功能？"),
  rel("YJ-C03", "YJ-C02", "qualifies", "去神秘化限定神秘化批评：不是去意义，而是拒绝外包判断。", "如何保留敬畏又不取消责任？"),
  rel("YJ-C04", "YJ-C01", "supports", "占筮仪式让人停顿并提问，支持占问暴露问题框架。", "仪式如何把冲动改造成判断？"),
  rel("YJ-C05", "YJ-E07", "supports", "经典含混提供多处境复用空间，支持多路径理解。", "开放性需要哪些解释纪律？"),
  rel("YJ-C06", "YJ-A07", "qualifies", "断语回到处境，限定卦辞不能被当作脱离时位的口号。", "短句怎样避免格言化误读？"),
  rel("YJ-C07", "YJ-A06", "complements", "义理让象回到意义，象让义理避免空泛，两者互补。", "象数和义理怎样互相校验？"),
  rel("YJ-C08", "YJ-A06", "extends", "把象转成判断，是象作为观察入口之后的下一步。", "形象联想如何转成行动边界？"),
  rel("YJ-C09", "YJ-D09", "qualifies", "解释保留不确定性，限定决策信心不能等同于绝对确定。", "看清关系和消除不确定性有什么区别？"),
  rel("YJ-C10", "YJ-A03", "contrasts", "把关系词实体化，与阴阳作为关系结构形成对比。", "哪些词最容易被实体化？"),
  rel("YJ-C10", "YJ-C07", "contradicts", "实体化误读会破坏义理和象数的互相校验。", "关系词被实体化后，解释会失去什么？"),
  rel("YJ-D01", "YJ-A05", "extends", "复杂决策前的停顿，把吉凶反馈转化为现代行动流程。", "停顿如何帮助重新阅读时位？"),
  rel("YJ-D02", "YJ-A04", "example_of", "组织策略的阶段意识，是爻位判断在组织场景中的例子。", "组织何时该进，何时该守？"),
  rel("YJ-D03", "YJ-A04", "example_of", "产品阶段判断是爻位意识在产品实践中的例子。", "产品愿望如何被阶段条件限制？"),
  rel("YJ-D04", "YJ-A10", "complements", "个人成长的换位意识补充卦序作为理解路径。", "成长为什么不是简单累加？"),
  rel("YJ-D05", "YJ-A05", "restates", "风险管理把吉凶反馈改写为现代语言。", "风险阅读怎样发现吉转凶的条件？"),
  rel("YJ-D06", "YJ-A03", "example_of", "冲突处理中辨互补条件，是阴阳关系结构的现代例子。", "冲突双方何时不是零和关系？"),
  rel("YJ-D07", "YJ-B10", "supports", "复盘检查位置变化，支持复归作为修正能力。", "位置变化如何改变复盘结论？"),
  rel("YJ-D08", "YJ-A02", "restates", "模型是提问器，重述了卦不是答案而是情境模型。", "什么时候模型会被误用成答案？"),
  rel("YJ-D09", "YJ-D01", "qualifies", "决策信心来自看清关系，限定停顿不是为了追求完全确定。", "停顿到什么程度就足够行动？"),
  rel("YJ-D10", "YJ-A09", "contradicts", "把趋势当命令，反驳变卦只提示趋势不替人行动。", "趋势判断何时会取消主体承担？"),
  rel("YJ-D10", "YJ-D09", "qualifies", "趋势不能替代判断，限定决策信心必须保留责任边界。", "看清趋势是否一定增加信心？"),
  rel("YJ-E01", "YJ-E07", "supports", "保留张力能形成多条理解路径，而非单一路径。", "哪些张力应被保留在图谱中？"),
  rel("YJ-E02", "YJ-E01", "supports", "好的关联说明为什么相关，支持图谱保留真实张力。", "没有理由的关系线会制造什么误导？"),
  rel("YJ-E03", "YJ-E05", "supports", "从卦到文需要中间判断，支持写作方案必须追溯来源。", "段落追溯如何防止文章漂浮？"),
  rel("YJ-E04", "YJ-E05", "qualifies", "中心问题限定写作方案如何选择和组织来源追溯。", "一个主题索引如何转成写作项目？"),
  rel("YJ-E05", "YJ-E04", "extends", "来源追溯把主题索引进一步推进为段落骨架。", "哪些段落最需要清楚追溯？"),
  rel("YJ-E06", "YJ-E04", "supports", "丰富笔记具备可复用判断，支持主题索引服务中心问题。", "材料丰富和判断丰富如何区分？"),
  rel("YJ-E07", "YJ-A10", "complements", "多路径理解补充卦序路径，避免把顺序理解成唯一道路。", "线性路径和网络路径如何共存？"),
  rel("YJ-E08", "YJ-A10", "supports", "慢读让卦序和旧笔记在新处境中重新排列。", "重读为什么会改变旧笔记的位置？"),
  rel("YJ-E09", "YJ-E01", "supports", "反对意见作为网络结构，支持笔记网络保留张力。", "反对意见应如何进入写作骨架？"),
  rel("YJ-E10", "YJ-D08", "qualifies", "反工具化限定模型提问器：模型不能被崇拜成万能工具。", "现代化如何避免换一种方式制造答案机器？"),
  rel("YJ-E10", "YJ-C02", "contradicts", "现代化若避免工具崇拜，就反驳神秘化式外包判断。", "工具化崇拜和神秘化有什么共同点？"),
  rel("YJ-E11", "YJ-E02", "same_topic", "两条笔记都讨论关系质量，但同主题只说明应继续比较，还没有说明具体支持、限定或反驳。", "什么时候同主题关系应该升级为更明确的关系类型？"),
  rel("YJ-E12", "YJ-C05", "unexpected_connection", "经典含混与笔记网络的意外连接都依赖开放性，但意外相关必须提出可追问的问题。", "开放性什么时候产生洞见，什么时候变成任意联想？"),
  rel("YJ-E13", "YJ-E06", "counterexample_to", "只堆支持材料的笔记是丰富笔记的反例，因为它缺少边界和反对意见。", "一条笔记需要多少反例才足以显示边界？"),
  rel("YJ-E14", "YJ-E05", "appears_in_draft", "进入写作方案后，笔记仍需通过来源追溯说明它在段落中的论证位置。", "写作篮里哪些材料只是待用，哪些已经承担论证？"),
  rel("YJ-E15", "YJ-E14", "follows", "确认笔记进入写作之后，后续问题是说明它如何承接前文并推出下一段。", "后续关系如何防止文章段落跳跃？"),
  rel("YJ-A01", "YJ-D01", "supports", "变化作为背景，支持现代决策前先停顿重看处境。", "变化常态如何改变决策节奏？"),
  rel("YJ-A02", "YJ-D08", "supports", "卦作为模型，支持模型应被当作提问器。", "提问器和答案机器的界线如何展示给用户？"),
  rel("YJ-A03", "YJ-D06", "supports", "阴阳互为条件，支持冲突处理中先辨互补条件。", "对立双方如何互相规定？"),
  rel("YJ-A04", "YJ-D02", "supports", "爻位阶段意识，支持组织策略的时位意识。", "组织策略怎样避免阶段错配？"),
  rel("YJ-A05", "YJ-D05", "supports", "吉凶作为反馈，支持风险管理是一种关系阅读。", "优势何时会变成风险？"),
  rel("YJ-A06", "YJ-C08", "supports", "象作为观察入口，支持读易难点在把象转成判断。", "观察形态如何产生判断责任？"),
  rel("YJ-A07", "YJ-C06", "supports", "卦辞像标题，支持断语必须回到处境。", "压缩语言如何避免过度解释？"),
  rel("YJ-A08", "YJ-E03", "supports", "爻辞把结构落到动作，支持从一卦到一文需要中间判断。", "行动提示怎样进入文章段落？"),
  rel("YJ-A09", "YJ-D10", "qualifies", "变卦只提示趋势，限定趋势不能被当作命令。", "趋势提示何时变成行动绑架？"),
  rel("YJ-A10", "YJ-E08", "supports", "卦序作为路径，支持慢读时旧观点可以重新换位。", "路径理解如何在重读中变化？"),
  rel("YJ-B01", "YJ-D02", "supports", "中正优先于绝对正确，支持组织策略看阶段和相称。", "组织中的中正如何被操作化？"),
  rel("YJ-B03", "YJ-D01", "supports", "君子作为承担者，支持复杂决策停顿后仍要行动。", "停顿之后谁来承担选择？"),
  rel("YJ-B07", "YJ-D05", "supports", "戒惧让力量保持边界，支持风险管理持续阅读时位。", "边界感如何降低优势误用？"),
  rel("YJ-C01", "YJ-E03", "supports", "占问暴露问题框架，支持从材料到文章必须经过中间判断。", "问题框架怎样变成文章主线？"),
  rel("YJ-C05", "YJ-C09", "supports", "经典含混提供复用空间，也支持解释时必须保留不确定性。", "复用空间如何避免任意解释？"),
  rel("YJ-C09", "YJ-E09", "supports", "解释保留不确定性，支持反对意见成为网络的一部分。", "不确定性如何在文章中被诚实呈现？"),
  rel("YJ-D03", "YJ-E04", "supports", "产品阶段判断提供中心问题样例，支持主题索引服务写作问题。", "产品场景如何筛选易经笔记？"),
  rel("YJ-D07", "YJ-E08", "supports", "复盘检查位置变化，支持慢读让观点重新换位。", "复盘和慢读有什么共同结构？"),
  rel("YJ-D08", "YJ-E02", "supports", "模型作为提问器，支持关联说明必须写出为什么。", "一条关系线应回答什么问题？"),
  rel("YJ-E06", "YJ-E02", "supports", "丰富笔记要求论点、理由和用途可复用，支持关联必须写出为什么。", "笔记自身的丰富度如何影响关系质量？"),
  rel("YJ-B09", "YJ-D05", "supports", "履险中的距离感支持风险管理要持续阅读边界。", "风险管理如何把礼转化为操作性边界？"),
  rel("YJ-C04", "YJ-D01", "supports", "占筮仪式的停顿机制支持复杂决策前先暂停和框定问题。", "仪式性停顿能否被现代工作流吸收？"),
  rel("YJ-B04", "YJ-D06", "supports", "把“小人”理解为不承担关系后果的行动模式，能直接支持冲突处理中先辨互补条件；否则冲突会退化成贴标签。", "一旦把冲突双方先标签化，会错过哪些本来可以互补的条件？"),
  rel("YJ-B08", "YJ-B09", "supports", "谦不是自我贬低，支持履险需要礼的距离感：真正的谦会帮助行动者在危险处境里守住分寸。", "如果把谦误解成退缩，为什么反而更难在危险处境里保持礼的距离？"),
  rel("YJ-C03", "YJ-C09", "supports", "去神秘化不等于去意义，支持解释必须保留不确定性：拒绝外包判断，不等于把意义压平为唯一答案。", "去神秘化如何同时拒绝答案崇拜和意义清空？"),
  rel("YJ-D04", "YJ-D07", "complements", "个人成长不是线性加法，补充复盘要问位置是否变了；前者说明成长模型，后者给出修正动作。", "如果只保留成长模型或复盘动作其中一条，整套判断会缺掉哪一面？"),
  rel("YJ-E11", "YJ-E01", "supports", "同主题不是关系完成，支持笔记网络应该保留张力：只有继续区分支持、限定和反驳，主题网络才不会塌成同义词堆。", "同主题关系什么时候会遮蔽真实张力？"),
  rel("YJ-E12", "YJ-E07", "supports", "意外相关之所以值得保留，是因为它经常把理解从单一路径推进到多条路径。", "什么样的意外相关会扩展理解路径，什么样的只会制造噪音？"),
  rel("YJ-E13", "YJ-E09", "supports", "反例让边界可见，支持反对意见成为网络的一部分：没有反例，反对意见只会停留在口头姿态。", "为什么一张没有反例的知识网络，很难真正容纳反对意见？"),
  rel("YJ-E15", "YJ-E05", "supports", "后续问题必须声明承接关系，支持写作方案显示来源追溯：段落推进需要看得见上一条判断从哪里来。", "如果承接关系不明，写作方案里的来源追溯会在哪些地方断掉？")
];

const writingProjects = [
  {
    id: "wp_yj_answer_machine",
    title: "为什么《易经》不是答案机器",
    goal: "写一篇面向普通知识读者的解释型长文，说明《易经》的现代价值在情境判断训练。",
    audience: "对《易经》好奇、但担心它只是玄学预测的读者",
    intent: "去神秘化但不去意义，把读者从求答案带到练判断。",
    desiredReaderTakeaway: "读者读完后应接受：卦象、爻位、吉凶和占问共同构成的是判断训练，而不是自动答案。",
    basketNoteIds: ["YJ-A01", "YJ-A02", "YJ-A04", "YJ-A05", "YJ-A09", "YJ-B03", "YJ-C01", "YJ-C02", "YJ-C03", "YJ-D08", "YJ-E10"],
    indexCardIds: ["idx_yj_core", "idx_yj_interpretation"],
    outline: [
      {
        sectionId: "s1",
        heading: "从求答案开始，但不要停在答案",
        summary: "用占问暴露问题框架开场，说明用户真正需要的是更清楚的处境。",
        noteTraceIds: ["YJ-C01", "YJ-D08"],
        literatureTraceIds: ["ln_yj_003"]
      },
      {
        sectionId: "s2",
        heading: "卦是情境模型，不是结论机器",
        summary: "解释卦、卦辞和爻位如何把混乱处境压缩成结构。",
        noteTraceIds: ["YJ-A01", "YJ-A02", "YJ-A04"],
        literatureTraceIds: ["ln_yj_001", "ln_yj_002"]
      },
      {
        sectionId: "s3",
        heading: "吉凶是反馈，变卦不是命令",
        summary: "把吉凶读成行动与时位是否相称的反馈，并说明趋势不替人负责。",
        noteTraceIds: ["YJ-A05", "YJ-A09", "YJ-B03"],
        literatureTraceIds: ["ln_yj_001"]
      },
      {
        sectionId: "s4",
        heading: "去神秘化不是把意义清空",
        summary: "回应神秘化误读，说明去神秘化是把意义带回可承担的判断。",
        noteTraceIds: ["YJ-C02", "YJ-C03", "YJ-E10"],
        literatureTraceIds: ["ln_yj_003"]
      }
    ]
  },
  {
    id: "wp_yj_modern_decision",
    title: "从时位到复盘：把《易经》变成现代判断训练",
    goal: "写一篇面向产品、组织和知识工作者的实践型文章。",
    audience: "需要在复杂项目、组织变化和个人选择中做判断的读者",
    intent: "把时位、关系反馈、复归和慢读转化为现代决策流程。",
    desiredReaderTakeaway: "读者应获得一套可实践的判断流程：停顿、框定问题、辨认位置、行动、复盘换位。",
    basketNoteIds: ["YJ-B01", "YJ-B02", "YJ-B05", "YJ-B06", "YJ-B10", "YJ-D01", "YJ-D02", "YJ-D03", "YJ-D05", "YJ-D07", "YJ-E05", "YJ-E08"],
    indexCardIds: ["idx_yj_action", "idx_yj_modern", "idx_yj_writing"],
    outline: [
      {
        sectionId: "s1",
        heading: "复杂决策先停顿",
        summary: "说明停顿不是拖延，而是重新看见时位和关系。",
        noteTraceIds: ["YJ-D01", "YJ-B06"],
        literatureTraceIds: ["ln_yj_003"]
      },
      {
        sectionId: "s2",
        heading: "判断行动前先判断位置",
        summary: "用组织和产品例子说明阶段错配比意愿不足更常见。",
        noteTraceIds: ["YJ-B02", "YJ-D02", "YJ-D03"],
        literatureTraceIds: ["ln_yj_001"]
      },
      {
        sectionId: "s3",
        heading: "风险阅读：优势也会错位",
        summary: "把吉凶反馈转成风险管理语言，强调戒惧和边界。",
        noteTraceIds: ["YJ-B01", "YJ-B05", "YJ-D05"],
        literatureTraceIds: ["ln_yj_001", "ln_yj_002"]
      },
      {
        sectionId: "s4",
        heading: "复盘与慢读让判断重新换位",
        summary: "把复归、复盘和慢读连接成持续修正机制。",
        noteTraceIds: ["YJ-B10", "YJ-D07", "YJ-E08", "YJ-E05"],
        literatureTraceIds: ["ln_yj_002"]
      }
    ]
  }
];

function noteLabel(noteId) {
  const note = originalNotes.find((item) => item.id === noteId);
  return note ? `${note.id} ${note.title}` : noteId;
}

function mermaidId(noteId) {
  return noteId.replace(/[^a-z0-9]+/gi, "_");
}

function buildMermaid() {
  const lines = ["flowchart LR"];
  for (const card of indexCards) {
    lines.push(`  subgraph ${card.id}[${card.title}]`);
    for (const noteId of card.noteIds) {
      lines.push(`    ${mermaidId(noteId)}["${noteLabel(noteId)}"]`);
    }
    lines.push("  end");
  }
  for (const relation of relations) {
    lines.push(`  ${mermaidId(relation.from)} -->|${relation.relationType}| ${mermaidId(relation.to)}`);
  }
  return lines.join("\n");
}

const graph = {
  mermaid: buildMermaid(),
  expected: {
    fleetingNoteCount: fleetingNotes.length,
    literatureNoteCount: literatureNotes.length,
    originalNoteCount: originalNotes.length,
    relationCount: relations.length,
    indexCardCount: indexCards.length,
    writingProjectCount: writingProjects.length,
    centralNodes: ["YJ-A02", "YJ-A05", "YJ-D08", "YJ-E05"],
    acceptanceAssertions: [
      "所有 relation.from 与 relation.to 都指向原创笔记。",
      `图谱至少有 ${originalNotes.length} 个原创节点和 ${relations.length} 条显式语义边。`,
      "两份写作方案的每个段落都有 noteTraceIds 和 literatureTraceIds。",
      "同一主题下同时存在 supports、qualifies、counterexample_to、same_topic、unexpected_connection、appears_in_draft 等关系类型。"
    ]
  }
};

const fixture = {
  id: "yijing-rich-acceptance-v1",
  title: "《易经》情境判断训练验收样例",
  generated_at: generatedAt,
  purpose: "用于验收随笔、文献笔记、原创笔记、显式关联、图谱和写作方案的完整链路。",
  counts: {
    fleeting_notes: fleetingNotes.length,
    literature_notes: literatureNotes.length,
    original_notes: originalNotes.length,
    relations: relations.length,
    index_cards: indexCards.length,
    writing_projects: writingProjects.length
  },
  fleeting_notes: fleetingNotes,
  literature_notes: literatureNotes,
  original_notes: originalNotes,
  relations,
  index_cards: indexCards,
  graph,
  writing_projects: writingProjects
};

function markdownTable(rows, headers) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${headers.map((header) => String(row[header] ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>")).join(" | ")} |`)
  ].join("\n");
}

function buildDoc() {
  const originalRows = originalNotes.map((note) => ({
    ID: note.id,
    标题: note.title,
    一句话论点: note.thesis,
    来源: note.from_literature_note_ids.join(", ") || "主题综合",
    索引: note.related_index_ids.join(", ")
  }));
  const relationRows = relations.map((item, index) => ({
    "#": index + 1,
    From: noteLabel(item.from),
    关系: item.relationType,
    To: noteLabel(item.to),
    理由: item.rationale,
    洞察问题: item.insightQuestion
  }));
  const literatureRows = literatureNotes.map((note) => ({
    ID: note.id,
    标题: note.title,
    来源: note.source,
    转述: note.paraphrase,
    问题: note.questions.join("；")
  }));
  const fleetingRows = fleetingNotes.map((note) => ({
    ID: note.id,
    标题: note.title,
    内容: note.body
  }));

  const writingSections = writingProjects
    .map((project) => {
      const sectionRows = project.outline.map((section) => ({
        段落: section.heading,
        摘要: section.summary,
        笔记追溯: section.noteTraceIds.join(", "),
        文献追溯: section.literatureTraceIds.join(", ")
      }));
      return [
        `### ${project.title}`,
        "",
        `- 写作目标：${project.goal}`,
        `- 目标读者：${project.audience}`,
        `- 写作意图：${project.intent}`,
        `- 读者带走的判断：${project.desiredReaderTakeaway}`,
        `- 材料篮：${project.basketNoteIds.join(", ")}`,
        "",
        markdownTable(sectionRows, ["段落", "摘要", "笔记追溯", "文献追溯"])
      ].join("\n");
    })
    .join("\n\n");

  return [
    "# 《易经》情境判断训练验收样例",
    "",
    `生成时间：${generatedAt}`,
    "",
    "这份样例用于验收研思录从随笔、文献笔记、原创笔记，到关系图谱与写作方案的完整链路。机器可读版本见 `tests/fixtures/acceptance/yijing-rich-acceptance.json`。",
    "",
    "## 加载到测试 Vault",
    "",
    "```powershell",
    "node .\\scripts\\seed-yijing-rich-acceptance.mjs --vault <你的 vault 路径>",
    "```",
    "",
    `脚本会初始化目标 vault，并写入 ${fleetingNotes.length + literatureNotes.length + originalNotes.length} 条笔记、${relations.length} 条显式关系、${indexCards.length} 个索引卡、${writingProjects.length} 个写作项目和 ${writingProjects.length} 个写作脚手架。重复运行是幂等的：已有样例会被刷新，不会新增重复关系。`,
    "",
    "## 数量摘要",
    "",
    markdownTable(
      [
        {
          随笔: fleetingNotes.length,
          文献笔记: literatureNotes.length,
          原创笔记: originalNotes.length,
          显式关系: relations.length,
          索引卡: indexCards.length,
          写作方案: writingProjects.length
        }
      ],
      ["随笔", "文献笔记", "原创笔记", "显式关系", "索引卡", "写作方案"]
    ),
    "",
    "## 随笔 2 条",
    "",
    markdownTable(fleetingRows, ["ID", "标题", "内容"]),
    "",
    "## 文献笔记 3 条",
    "",
    markdownTable(literatureRows, ["ID", "标题", "来源", "转述", "问题"]),
    "",
    `## 原创笔记 ${originalNotes.length} 条`,
    "",
    "完整正文保存在 JSON fixture 的 `original_notes[].body` 字段中。下表用于人工验收列表、详情和写作篮展示。",
    "",
    markdownTable(originalRows, ["ID", "标题", "一句话论点", "来源", "索引"]),
    "",
    "## 所有关联关系",
    "",
    markdownTable(relationRows, ["#", "From", "关系", "To", "理由", "洞察问题"]),
    "",
    "## 图谱",
    "",
    "```mermaid",
    graph.mermaid,
    "```",
    "",
    "## 写作方案示例",
    "",
    writingSections,
    "",
    "## 验收建议",
    "",
    `- 导入或加载 fixture 后，应能看到 ${originalNotes.length} 个原创节点和 ${relations.length} 条显式关系。`,
    "- 关系筛选应能区分 `supports`、`qualifies`、`contradicts`、`counterexample_to`、`same_topic`、`unexpected_connection`、`appears_in_draft` 等类型。",
    "- 从 `YJ-A02`、`YJ-A05`、`YJ-D08`、`YJ-E05` 任一中心节点进入，侧边关系和图谱都应显示多跳路径。",
    "- 写作方案中的每个段落都必须能追溯到原创笔记和文献笔记。"
  ].join("\n");
}

await fs.mkdir(FIXTURE_DIR, { recursive: true });
await fs.mkdir(DOCS_DIR, { recursive: true });
await fs.writeFile(JSON_PATH, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
await fs.writeFile(DOC_PATH, `${buildDoc()}\n`, "utf8");

console.log(`Wrote ${path.relative(REPO_ROOT, JSON_PATH)}`);
console.log(`Wrote ${path.relative(REPO_ROOT, DOC_PATH)}`);
