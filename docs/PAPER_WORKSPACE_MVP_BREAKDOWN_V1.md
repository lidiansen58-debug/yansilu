# 论文工作台 MVP 功能拆分 V1

## 1. 文档用途

这份文档把 `论文工作台` 从产品与交互方案拆成可排期的功能块。

它回答 4 个问题：

1. MVP 必须做什么。
2. 哪些可以延后。
3. 哪些现在明确不做。
4. 每个功能块对应哪些前端页面、后端对象/API 和测试口径。

前置文档：

1. [NOTEBOOKLM_ASSISTED_PAPER_WORKFLOW_V1.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/NOTEBOOKLM_ASSISTED_PAPER_WORKFLOW_V1.md)
2. [PAPER_WORKSPACE_UI_INTERACTION_V1.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/PAPER_WORKSPACE_UI_INTERACTION_V1.md)
3. [PAPER_WORKSPACE_LOFI_AND_COPY_V1.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/PAPER_WORKSPACE_LOFI_AND_COPY_V1.md)

## 2. MVP 一句话范围

MVP 只验证一件事：

用户能否从 `NotebookLM summary / Q&A / notes` 出发，完成：

`论文 Source -> 文献笔记候选 -> 我的转述 -> 原创笔记候选 -> 保存为原创笔记`

MVP 不追求完整 NotebookLM 对接，也不追求跨论文洞见自动化。

## 3. 功能分层

## 3.1 Must Have：MVP 必做

| 功能块 | 用户价值 | 前端范围 | 后端/领域对象 | 测试口径 |
| --- | --- | --- | --- | --- |
| 论文 Source 创建 | 给论文与后续笔记一个稳定来源 | 论文来源建立页 | `Source` 或现有 source note 扩展 | 能保存标题、作者、年份、URL/PDF 信息 |
| NotebookLM 文本粘贴 | 用最低成本接入用户已有工作流 | NotebookLM 内容导入页 | import payload 或 paper workspace draft | 粘贴 summary/Q&A/notes 后可进入解析 |
| 候选拆分 | 把长摘要变成可加工颗粒 | 候选拆分与筛选页 | `LiteratureNoteCandidate` | 长文本不会直接保存为单条原创笔记 |
| 候选筛选 | 让用户排除无价值内容 | 候选卡片操作 | candidate status: selected/skipped | 已跳过候选不进入转述队列 |
| 我的转述 | 强制发生用户理解 | 转述加工页 | literature note draft | 没有用户转述时不能生成原创候选 |
| 文献笔记保存 | 把理解沉淀为来源型笔记 | 保存为文献笔记按钮 | `LiteratureNote` | 保存后可追溯到论文 Source |
| 原创候选生成 | 帮用户把转述压缩成判断骨架 | 原创笔记候选页 | permanent note candidate | 候选必须包含核心判断、证据、边界字段 |
| 原创性与来源检查 | 防止摘要越级成原创 | 风险提示/阻断态 | originality guard | 纯 NotebookLM 文本不能直接保存为原创笔记 |
| 保存为原创笔记 | 完成最小价值闭环 | 保存成功页 | `PermanentNote` | 保存后可在原创笔记列表中打开 |

## 3.2 Should Have：第一版后半段可做

| 功能块 | 用户价值 | 前端范围 | 后端/领域对象 | 测试口径 |
| --- | --- | --- | --- | --- |
| 候选类型标注 | 帮用户区分论点/方法/结果/局限 | 候选卡片标签 | candidate kind | 每条候选有稳定类型 |
| 立场选择 | 推动用户形成判断 | 转述区立场按钮 | stance field | 同意/保留/不同意可保存 |
| 与研究问题关系 | 避免只收藏信息 | 转述字段 | research_question_relation | 没有关系字段时提示补充 |
| 原创候选缺口提示 | 提醒补证据和边界 | 原创候选风险区 | validation summary | 缺少证据/边界时显示风险 |
| 保存后下一步动作 | 继续进入结构化工作 | 保存成功页 | route/action metadata | 可进入关联、索引、写作入口 |

## 3.3 Could Have：后续增强

| 功能块 | 用户价值 | 延后原因 |
| --- | --- | --- |
| Public Notebook 链接导入 | 减少复制粘贴 | 页面结构和权限不稳定 |
| 自动拉取论文元数据 | 减少手填 | 需要 DOI/arXiv 解析与外部请求策略 |
| PDF 内定位引用 | 增强追溯 | 需要 PDF 解析与定位能力 |
| 跨论文比较 | 帮用户发现共识和分歧 | 需要多 Source 聚合视图 |
| 研究问题地图 | 从多篇论文生成问题结构 | 需要图谱和索引能力更成熟 |
| 自动关联建议 | 提升洞见形成效率 | 需要稳定的候选匹配和解释机制 |

## 3.4 Won't Have：当前不做

| 功能块 | 不做原因 |
| --- | --- |
| NotebookLM 官方 API 直连 | 当前不作为稳定基础能力 |
| 浏览器自动化读取 NotebookLM 页面 | 维护成本高，容易受页面变化影响 |
| 双向同步 | 超出 MVP 范围 |
| 一键生成原创笔记正文 | 违背产品原创性边界 |
| 自动生成完整论文综述终稿 | 会把工作流拉向代写 |
| 无来源文本直接入库 | 破坏追溯链路 |

## 4. 建议对象模型

MVP 可以尽量复用现有对象，不急着发明一整套新模型。

### 4.1 Paper Source

可先复用 `Source`，增加论文相关字段：

1. `title`
2. `authors`
3. `year`
4. `doi`
5. `arxiv_id`
6. `url`
7. `pdf_asset_path`
8. `source_type = paper`

### 4.2 NotebookLM Import Draft

用于记录粘贴进来的外部整理结果：

1. `draft_id`
2. `source_id`
3. `input_type`: summary / qa / study_guide / note
4. `raw_text`
5. `created_at`

### 4.3 Paper Candidate

用于承接拆分后的候选：

1. `candidate_id`
2. `source_id`
3. `draft_id`
4. `kind`: claim / method / result / limitation / question / quote
5. `raw_text`
6. `status`: new / selected / skipped / converted

### 4.4 Literature Translation Draft

用于承接“我的转述”：

1. `candidate_id`
2. `paraphrase_text`
3. `stance`: agree / reserve / disagree / unsure
4. `relation_to_question`
5. `boundary_or_condition`

### 4.5 Permanent Note Candidate

用于承接原创笔记候选骨架：

1. `core_claim`
2. `why_it_matters`
3. `evidence_candidate_ids`
4. `boundary_or_counterpoint`
5. `suggested_links`
6. `originality_status`

## 5. API 草案

MVP API 可以先保持少量路由，不急着扩展成完整研究项目系统。

| API | 作用 |
| --- | --- |
| `POST /api/v1/papers` | 创建论文 Source |
| `GET /api/v1/papers/:id` | 读取论文工作台数据 |
| `POST /api/v1/papers/:id/notebooklm-drafts` | 保存 NotebookLM 粘贴文本 |
| `POST /api/v1/papers/:id/candidates/preview` | 从粘贴文本生成候选 |
| `POST /api/v1/papers/:id/literature-notes` | 保存用户转述为文献笔记 |
| `POST /api/v1/papers/:id/permanent-candidates` | 基于转述生成原创候选 |
| `POST /api/v1/papers/:id/permanent-notes` | 确认保存原创笔记 |

实现时也可以复用现有 `/api/v1/imports/preview` 与 `/api/v1/imports/:id/confirm`，但产品心智上仍应叫 `论文工作台`。

## 6. 前端页面拆分

建议前端按以下组件或页面拆：

| 页面/组件 | 责任 |
| --- | --- |
| `PaperWorkspacePage` | 论文工作台容器 |
| `PaperSourcePanel` | 左栏来源信息 |
| `NotebookLmInputPanel` | 粘贴 NotebookLM 文本 |
| `PaperCandidateList` | 候选拆分与筛选 |
| `TranslationEditor` | 我的转述 |
| `PermanentCandidatePanel` | 原创候选骨架 |
| `PaperNextActionsPanel` | 保存后的下一步动作 |

## 7. MVP 验收场景

### 场景 1：从 summary 到文献笔记

1. 新建论文 Source。
2. 粘贴 NotebookLM summary。
3. 系统拆出候选。
4. 选择一条候选进入转述区。
5. 填写我的转述。
6. 保存为文献笔记。

通过标准：

1. 文献笔记绑定到论文 Source。
2. 原始 NotebookLM 文本和用户转述能区分。
3. 没有转述时不能保存为完成态文献笔记。

### 场景 2：从文献笔记到原创笔记

1. 选择一条已完成转述的文献笔记。
2. 生成原创候选。
3. 修改核心判断和边界。
4. 保存为原创笔记。

通过标准：

1. 原创笔记能追溯到文献笔记和论文 Source。
2. 纯 NotebookLM 文本不能直接保存为原创笔记。
3. 原创性守卫会提示高相似风险。

### 场景 3：保存后继续进入结构

1. 保存原创笔记成功。
2. 页面展示下一步动作。
3. 用户选择加入主题索引或继续加工下一条候选。

通过标准：

1. 流程不会停在“保存成功”。
2. 用户能继续进入研思录已有的关联、索引、写作路径。

## 8. 排期建议

### Slice 1：最小链路

1. Paper Source。
2. NotebookLM 文本粘贴。
3. 手动或简单规则拆候选。
4. 转述输入。
5. 保存为文献笔记。

### Slice 2：原创候选

1. 基于转述生成原创候选骨架。
2. 原创性风险提示。
3. 保存为原创笔记。

### Slice 3：后续动作

1. 保存成功后的关联建议入口。
2. 加入主题索引入口。
3. 放入写作项目入口。

## 9. 关键风险

1. 如果候选拆分太粗，用户会觉得仍然是在搬摘要。
2. 如果转述约束太硬，用户会觉得流程费劲。
3. 如果原创候选太像自动代写，会破坏产品边界。
4. 如果不保留来源痕迹，用户会混淆“外部整理”和“我的判断”。

## 10. 一句话结论

论文工作台 MVP 的第一目标，不是支持多少种 NotebookLM 输入，而是验证用户能否顺利完成 `外部整理结果 -> 我的转述 -> 我的原创判断`。

如需查看当前代码实现能复用哪些部分，以及缺口在哪里，请参考 [PAPER_WORKSPACE_IMPLEMENTATION_ALIGNMENT_V1.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/PAPER_WORKSPACE_IMPLEMENTATION_ALIGNMENT_V1.md)。
