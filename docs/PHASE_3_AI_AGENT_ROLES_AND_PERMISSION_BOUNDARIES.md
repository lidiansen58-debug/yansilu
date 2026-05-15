# 研思录 Phase 3 AI Agent 角色与权限边界规划

## 1. 文档目标

本文档用于规划 roadmap 中 `Phase 3：AI 认知协同层`。

它回答的问题不是“我们可以接哪些 AI 能力”，而是：

1. AI 在研思录中应该扮演哪些角色？
2. 每个 Agent 可以读取什么上下文？
3. 每个 Agent 可以输出什么类型的候选？
4. 哪些行为必须由用户确认？
5. 哪些行为永远不能交给 AI 自动完成？

本文档是未来接入 AI Agent SDK 前的产品安全框架。

---

## 2. Phase 3 的核心定位

Phase 3 的目标不是让 AI 更像作者。

Phase 3 的目标是让 AI 成为：

`围绕用户已有笔记、关系、主题和写作目标工作的认知协同层。`

AI 的职责是帮助用户更快看见：

1. 结构
2. 冲突
3. 缺口
4. 反方
5. 问题
6. 可能路径

AI 不负责替用户拥有判断。

---

## 3. 不可违反的总原则

## 3.1 原创判断归用户

AI 不得自动生成并保存永久笔记正文。

AI 可以建议：

1. 一句话论点
2. 三句话压缩
3. 中心问题
4. 关系类型
5. 反方与边界
6. 写作脚手架

但这些都必须先以候选态存在。

## 3.2 AI 只在有边界的上下文中工作

AI 不应默认读取整个知识库。

建议默认上下文范围为：

1. 当前笔记
2. 当前主题
3. 当前写作项目
4. 当前选中的笔记集
5. 当前导入批次

## 3.3 AI 输出必须可解释

每个重要建议都必须说明：

1. 基于哪些输入
2. 为什么得出这个建议
3. 影响哪些对象
4. 用户可以如何处理

## 3.4 AI 写操作默认不可直接落库

AI 可以生成候选对象。

但落库前必须经过：

1. 用户确认
2. schema 校验
3. 来源或上下文记录
4. 必要时保存审计日志

---

## 4. Agent 权限分层

建议将 AI Agent 权限分为 5 层。

| 层级 | 名称 | 权限说明 |
|---|---|---|
| L0 | Read-only | 只读上下文，不输出可保存对象 |
| L1 | Suggest | 输出候选建议，不落库 |
| L2 | Draft | 可写入草稿态字段，但必须标记为 AI 候选或用户草稿 |
| L3 | Confirmed Write | 用户确认后写入正式字段 |
| L4 | Forbidden | 永不允许 |

## 4.1 L0 Read-only

允许：

1. 读取当前笔记
2. 读取当前主题下的永久笔记
3. 读取当前写作项目的写作篮
4. 读取相关关系和来源摘要

不允许：

1. 创建对象
2. 修改对象
3. 生成可保存字段

## 4.2 L1 Suggest

允许输出：

1. 候选论点
2. 候选三句话压缩
3. 候选中心问题
4. 候选关系
5. 候选反方
6. 候选脚手架段落

不允许：

1. 直接保存
2. 自动确认
3. 覆盖用户字段

## 4.3 L2 Draft

允许：

1. 在用户点击“采纳为草稿”后，把候选放入草稿字段
2. 标记字段来源为 AI-assisted draft
3. 等待用户改写或确认

不允许：

1. 直接进入 confirmed
2. 替用户声明“这是我的判断”

## 4.4 L3 Confirmed Write

只在用户明确确认后发生。

允许写入：

1. `thesis`
2. `three_line_summary`
3. `central_question`
4. `intent`
5. `desired_reader_takeaway`
6. confirmed relation

要求：

1. 记录用户确认动作
2. 保留 AI 候选来源
3. 保留用户是否改写过

## 4.5 L4 Forbidden

永不允许：

1. 自动生成并保存永久笔记正文
2. 自动把摘录改写成永久笔记并标记完成
3. 自动确认主题结论
4. 自动生成完整终稿并作为默认出口
5. 静默修改用户已有原创判断
6. 隐藏来源或推理依据

---

## 5. 建议 Agent 角色

## 5.1 Reading Analyst Agent

中文名：

`阅读理解分析员`

### 作用

帮助用户理解一批来源、书摘或永久笔记中的主要内容与问题。

### 允许读取

1. Source 摘要
2. LiteratureNote 摘录与转述
3. PermanentNote 标题、正文、thesis
4. 用户选定的范围

### 允许输出

1. 主要主题候选
2. 候选问题
3. 可能支持的判断
4. 材料之间的重复或差异

### 禁止

1. 直接生成永久笔记正文
2. 把材料总结直接标记为用户判断

---

## 5.2 Distillation Coach Agent

中文名：

`思想提纯教练`

### 作用

辅助用户把永久笔记压缩为一句话论点和三句话压缩。

### 允许读取

1. 当前 PermanentNote
2. 来源引用
3. 已有关联笔记

### 允许输出

1. 候选 `thesis`
2. 候选 `three_line_summary`
3. 清晰度检查
4. 空泛/过长/跳跃提示

### 权限

默认 L1。

用户点击 `采纳为草稿` 后进入 L2。

用户点击 `确认这是我的判断` 后进入 L3。

### 禁止

1. 直接改写 `markdown_body`
2. 直接保存 `thesis` 为 confirmed

---

## 5.3 Theme Mapper Agent

中文名：

`主题结构分析员`

### 作用

帮助用户理解一个主题下的判断结构。

### 允许读取

1. 当前 IndexCard
2. IndexCard.items 中的 PermanentNote
3. 这些笔记之间的 Links
4. 已有 central_question

### 允许输出

1. 主题一句话候选
2. 主题三句话候选
3. 中心问题候选
4. 主题边界建议
5. 待补判断提示

### 禁止

1. 自动确认主题立场
2. 自动把笔记加入或移出主题
3. 自动创建完成态主题

---

## 5.4 Relation Analyst Agent

中文名：

`关系分析员`

### 作用

帮助用户发现笔记之间的支持、冲突、前提、延伸、桥接等关系。

### 允许读取

1. 选定笔记集
2. 当前主题下的 Links
3. 相关 citations
4. 图谱子图

### 允许输出

1. 候选 Link
2. 候选 relation_type
3. rationale
4. confidence
5. evidence_refs

### 默认状态

所有输出默认 `suggested`。

### 禁止

1. 自动确认关系
2. 将普通 wikilink 升级为 supports 或 contradicts
3. 没有 rationale 的关系建议

---

## 5.5 Tension Scout Agent

中文名：

`张力侦测员`

### 作用

发现主题内部值得继续思考的冲突、边界、反方、缺口。

### 允许读取

1. 当前主题
2. 主题内的永久笔记
3. 关系图
4. 已有 counterpoints 和 open_questions

### 允许输出

1. ThemeTension 候选
2. BridgeGap 候选
3. counterpoint 候选
4. missing_note_prompt

### 禁止

1. 自动抹平冲突
2. 自动补写桥接永久笔记
3. 把张力改写成确定结论

---

## 5.6 Writing Architect Agent

中文名：

`写作结构顾问`

### 作用

基于已有永久笔记、主题、关系和写作意图，生成可追溯的脚手架。

### 允许读取

1. WritingProject
2. basket_note_ids
3. related_index_ids
4. central_question
5. ThemeTension / BridgeGap

### 允许输出

1. DraftScaffold 候选
2. section heading
3. section purpose
4. evidence_note_ids
5. open_questions
6. gaps
7. counterpoints

### 禁止

1. 默认生成完整终稿
2. 删除冲突和反方
3. 生成无证据映射的脚手架
4. 生成无法追溯的段落

---

## 5.7 Reflection Historian Agent

中文名：

`思考演化记录员`

### 作用

帮助用户回看某个判断、主题或作品如何变化。

### 允许读取

1. note versions
2. confirmed distillation history
3. relation changes
4. writing project versions

### 允许输出

1. 判断变化摘要
2. 主题立场演化
3. 被修正的观点
4. 长期未处理的问题

### 禁止

1. 自动替用户修正旧判断
2. 把历史变化包装成最终评价

---

## 6. Agent 与对象权限矩阵

| Agent | Source | LiteratureNote | PermanentNote | IndexCard | Link | WritingProject | DraftScaffold |
|---|---|---|---|---|---|---|---|
| Reading Analyst | read | read | read | none | none | none | none |
| Distillation Coach | none | read | suggest/draft | none | read | none | none |
| Theme Mapper | none | none | read | suggest/draft | read | none | none |
| Relation Analyst | none | none | read | read | suggest/draft | none | none |
| Tension Scout | none | none | read | suggest/draft | read | none | none |
| Writing Architect | none | none | read | read | read | suggest/draft | suggest/draft |
| Reflection Historian | none | none | read | read | read | read | read |

说明：

1. `read` 表示只读
2. `suggest/draft` 表示只能产生候选或草稿态输出
3. confirmed write 必须由用户动作触发

---

## 7. 上下文范围规则

## 7.1 默认范围

每次 AI 调用必须明确范围。

建议范围枚举：

1. `current_note`
2. `selected_notes`
3. `current_index_card`
4. `current_writing_project`
5. `current_import_batch`
6. `current_directory`

## 7.2 不建议默认支持

不建议默认 `whole_vault`。

如果未来支持全库分析，必须：

1. 明确提示范围
2. 支持预览输入摘要
3. 支持取消
4. 支持隐私设置
5. 控制输出为洞察候选，而不是自动修改

---

## 8. 输出对象类型

AI 输出应尽量结构化。

建议候选类型：

1. `DistillationSuggestion`
2. `CentralQuestionSuggestion`
3. `RelationSuggestion`
4. `ThemeTensionSuggestion`
5. `BridgeGapSuggestion`
6. `WritingIntentSuggestion`
7. `DraftScaffoldSuggestion`
8. `ReflectionSummary`

每种候选必须包含：

1. `id`
2. `type`
3. `scope`
4. `content`
5. `rationale`
6. `evidence_refs`
7. `needs_user_confirmation`

---

## 9. 审计与可追溯

每次核心 AI 调用建议记录：

1. call_id
2. agent_role
3. scope
4. input_object_ids
5. output_type
6. output_object_ids
7. user_action
8. created_at

用户行为应区分：

1. viewed
2. adopted_as_draft
3. edited
4. confirmed
5. rejected
6. regenerated

这会帮助后续判断：

1. 哪些 AI 能力真的有用
2. 用户是否在改写而不是盲目接受
3. 是否存在 AI 抢夺主体性的风险

---

## 10. UI 呈现原则

AI 不应作为全局万能输入框占据主视觉。

推荐呈现方式：

1. 嵌入在具体对象上下文里
2. 使用候选卡片
3. 展示依据
4. 操作按钮明确区分采纳草稿、改写、拒绝

不要使用：

1. `一键完成`
2. `自动写好`
3. `AI 帮你完成原创`
4. `生成最终文章`

建议使用：

1. `生成候选`
2. `检查张力`
3. `提示反方`
4. `采纳为草稿`
5. `确认这是我的判断`

---

## 11. Agent SDK 接入顺序建议

未来接入 Agent SDK 时，不建议一次性开放多 Agent 全能力。

建议顺序：

1. `Distillation Coach`
2. `Relation Analyst`
3. `Theme Mapper`
4. `Tension Scout`
5. `Writing Architect`
6. `Reflection Historian`

原因：

1. 先验证 AI 是否能帮助提纯
2. 再验证 AI 是否能发现关系
3. 再让 AI 参与主题和写作
4. 最后才处理长期演化

---

## 12. 不应进入 Phase 3 的能力

以下能力不建议进入 Phase 3：

1. AI 自动批量生成永久笔记
2. AI 自动整理全库并修改结构
3. AI 自动写完整文章终稿
4. AI 自动删除、合并或重写用户笔记
5. AI 自动决定主题结论
6. AI 默认读取整个 vault

这些能力可能看起来强，但会削弱研思录最核心的哲学。

---

## 13. Phase 3 成功信号

Phase 3 做对后，应出现这些信号：

1. 用户觉得 AI 帮自己看见了没看见的关系
2. 用户愿意改写 AI 候选，而不是直接照收
3. AI 输出提高了主题和写作结构质量
4. AI 没有让永久笔记变得更像机器总结
5. 用户更信任系统，因为所有建议都可解释、可拒绝、可追溯

---

## 14. 核心判断

研思录未来可以非常 AI-native，但不能 AI-substitutive。

也就是说：

`AI 可以深度参与知识创作过程，但不能替用户拥有思想。`

这条边界不是限制产品想象力，而是研思录和普通 AI 写作工具拉开距离的核心壁垒。
