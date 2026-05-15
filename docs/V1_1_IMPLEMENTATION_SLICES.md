# 研思录 V1.1 实施切片计划

## 1. 文档目标

本文档把 V1.1 的可执行需求进一步拆成实施切片。

它不是当前开发承诺，也不是冲刺计划。
它用于帮助未来进入实现前，对齐：

1. 先做什么
2. 后做什么
3. 每个切片交付什么
4. 每个切片如何验收
5. 哪些范围必须先挡住

---

## 2. 实施总原则

V1.1 的实施应遵循：

1. 先手写提纯，再 AI 候选
2. 先单条永久笔记，再主题索引
3. 先数据与 API，后复杂 UI
4. 先候选态边界，再 Agent 能力
5. 先验证用户愿不愿意提纯，再扩大自动化
6. 先把永久笔记设为默认主路，再优化随笔和文献入口

这能避免产品过早滑向 AI 代写或复杂知识库。

---

## 3. Milestone 0：现状收口与基线确认

### 目标

确保当前 MVP 是稳定的 V1.1 起点。

### 范围

1. 确认当前 API 文档与实现一致
2. 确认测试全绿
3. 确认桌面文件能力是否仍存在阻塞
4. 标记当前 V1.1 未实现 API
5. 确认当前已实现链路如何支持“素材 -> 永久笔记 -> 关联 -> 主题 -> 写作”

### 涉及文档

1. [API.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/API.md)
2. [IMPLEMENTATION_STATUS.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/IMPLEMENTATION_STATUS.md)
3. [V1_1_DATA_AND_API_CONTRACT_DRAFT.md](/E:/Projects/Thinking%20in%20Notes/yansilu/docs/V1_1_DATA_AND_API_CONTRACT_DRAFT.md)

### 完成标准

1. 当前测试套件通过
2. 已明确哪些 API 是当前实现，哪些只是 V1.1 规划
3. 没有把规划 contract 误当成 active API

### 不做

1. 不新增产品功能
2. 不接 AI
3. 不重构编辑器

---

## 3.1 Milestone 0.5：永久笔记优先界面改版

### 目标

在不改底层数据模型的前提下，把产品默认体验从“三类笔记并列”调整为“永久笔记主路，随笔和文献作为素材入口”。

### 范围

1. 全局主按钮默认指向 `新建永久笔记`
2. 左侧导航将随笔和文献收纳为 `素材入口`
3. 文献笔记默认界面简化为摘录、转述、支持判断、记录永久笔记
4. 完整来源字段放入折叠区
5. 首页和工作台指标优先展示永久笔记、关系、主题和写作准备
6. 空态和 helper 文案默认引导用户形成原创判断

### 可能涉及模块

1. `apps/web/src/prototype.html`
2. `apps/web/src/prototype-app.js`
3. `apps/web/src/components-explorer-pane.js`
4. `apps/web/src/components-editor-pane.js`
5. `tests/e2e/prototype-browser.test.mjs`

### 完成标准

1. 用户首次进入时看到的主行动是新建永久笔记
2. 随笔和文献不再像与永久笔记并列的主知识库
3. 用户从随笔或文献能一键进入记录永久笔记流程
4. 文献复杂来源字段默认折叠
5. 写作中心仍只接受永久笔记

### 不做

1. 不删除随笔和文献目录
2. 不取消文献来源追溯能力
3. 不把 AI 生成永久笔记作为主入口

---

## 4. Milestone 1：提纯数据底座

### 目标

让永久笔记可以稳定保存提纯字段。

### 范围

1. `PermanentNote.thesis`
2. `PermanentNote.three_line_summary`
3. `PermanentNote.distillation_status`
4. 保存与读取路径
5. 三句话校验

### 可能涉及模块

1. `packages/domain`
2. `schemas/permanent_note.schema.json`
3. `apps/api`
4. `tests/unit`
5. `tests/integration`

### API 候选

1. `PATCH /api/v1/permanent-notes/:id/distillation`
2. `POST /api/v1/permanent-notes/:id/distillation/confirm`

### 完成标准

1. 永久笔记可保存 `thesis`
2. 永久笔记可保存恰好 3 项的 `three_line_summary`
3. 非 3 项的三句话压缩被拒绝
4. `confirmed` 只能通过确认动作进入
5. 保存后重启仍可读回

### 不做

1. 不做 AI 候选
2. 不做独立提纯工作区
3. 不强制旧笔记全部补全

---

## 5. Milestone 2：永久笔记提纯面板

### 目标

让用户在编辑永久笔记时自然完成提纯。

### 范围

1. 永久笔记右侧增加 `提纯` 面板
2. 显示并编辑 `thesis`
3. 显示并编辑 `three_line_summary`
4. 显示 `distillation_status`
5. 提供确认动作

### 可能涉及模块

1. `apps/web/src/components-editor-pane.js`
2. `apps/web/src/prototype-api.js`
3. `apps/web/src/prototype-store.js`
4. `tests/unit`
5. `tests/e2e`

### 完成标准

1. 用户打开永久笔记后可进入提纯面板
2. 用户可保存一句话论点
3. 用户可保存三句话压缩
4. 用户可确认提纯字段
5. 面板不出现 AI 代写入口

### 不做

1. 不做完整提纯工作区
2. 不做 AI 生成按钮作为主操作
3. 不改变 Markdown 正文编辑主路径

---

## 6. Milestone 3：提纯队列与首页价值反馈

### 目标

让用户看见哪些笔记还待想清楚，并让首页的价值反馈从资料量转向判断形成进度。

### 范围

1. 提纯队列 API 或派生查询
2. 工作台展示待提纯永久笔记
3. 首页主指标重排
4. 队列项跳转到永久笔记提纯面板

### API 候选

1. `GET /api/v1/distillation/queue`

### 完成标准

1. 未填写 `thesis` 的永久笔记进入待一句话队列
2. 未填写 `three_line_summary` 的永久笔记进入待三句话队列
3. 首页主指标展示原创判断相关数据
4. 导入量不再是主视觉 KPI
5. 点击队列项能定位到对应笔记

### 不做

1. 不做复杂筛选器
2. 不做批量生成
3. 不做排行榜式指标

---

## 7. Milestone 4：写作意图字段与脚手架前提示

### 目标

让写作项目从“选笔记后生成脚手架”升级为“先澄清表达意图，再生成脚手架”。

### 范围

1. `WritingProject.intent`
2. `WritingProject.desired_reader_takeaway`
3. 写作项目详情页可编辑
4. 生成脚手架前显示意图摘要或缺失提示

### API 候选

1. `PATCH /api/v1/writing-projects/:id/intent`

### 完成标准

1. 用户可填写写作意图
2. 用户可填写希望读者接受的判断
3. 生成脚手架前展示这些字段
4. 缺失时提示补全
5. 脚手架仍然可追溯到永久笔记

### 不做

1. 不生成完整终稿
2. 不让 AI 自动确认写作意图
3. 不要求所有旧项目强制补全

---

## 8. Milestone 5：AI 候选态底座

### 目标

在真正接入 AI 能力前，先建立候选态、草稿态、确认态的保存与流转规则。

### 范围

1. `AiSuggestion` 数据结构
2. `SuggestionStatus`
3. 候选状态流转
4. 候选事件记录
5. 禁止 `suggested -> confirmed`

### API 候选

1. `POST /api/v1/ai-suggestions`
2. `PATCH /api/v1/ai-suggestions/:id`

### 完成标准

1. 可以创建候选对象
2. 候选对象默认是 `suggested`
3. 用户可标记为 `adopted_as_draft`
4. 用户可拒绝候选
5. 系统拒绝 `suggested -> confirmed`
6. 候选保留作用范围和依据

### 不做

1. 不接完整 Agent SDK
2. 不做全库 AI 分析
3. 不让 AI 候选直接改写永久笔记正文

---

## 9. Milestone 6：AI 提纯候选

### 目标

引入第一个真正符合产品哲学的 AI 能力：思想提纯候选。

### 范围

1. 针对当前永久笔记生成候选 `thesis`
2. 生成候选 `three_line_summary`
3. 返回 rationale
4. 展示候选卡片
5. 用户可采纳为草稿、改写或拒绝

### 涉及 Agent

`Distillation Coach`

### 完成标准

1. AI 输出不直接进入正式字段
2. 候选卡片显示依据
3. 用户可采纳为草稿
4. 用户确认后才进入 confirmed
5. AI 不改写 `markdown_body`

### 不做

1. 不做 AI 批量提纯
2. 不做 AI 关系建议
3. 不做 AI 自动生成永久笔记

---

## 10. Milestone 7：IndexCard 中心问题基础版

### 目标

让主题索引开始具备主题级思考能力。

### 范围

1. IndexCard `central_question`
2. 主题一句话
3. 主题三句话
4. 主题页展示相关永久笔记
5. 从主题进入写作项目

### 完成标准

1. 用户可创建或编辑主题中心问题
2. 主题下可管理永久笔记
3. 主题可作为写作项目入口
4. 写作项目可继承主题中心问题

### 不做

1. 不做完整 ThemeInsight
2. 不做复杂张力图
3. 不做 AI 自动组织主题

---

## 11. Milestone 8：轻量质量检查

### 目标

让系统开始帮助用户发现提纯字段是否空泛、过长、重复或缺少功能。

### 范围

1. `thesis` 基础检查
2. `three_line_summary` 基础检查
3. `central_question` 基础检查
4. `intent` 基础检查

### 完成标准

1. 提示不阻断普通保存
2. 提示文案服务于澄清
3. 用户可根据提示改写
4. 不出现评分化、排行榜化体验

### 不做

1. 不做复杂质量分
2. 不做自动判定用户思考好坏
3. 不做强制修正

---

## 12. Milestone 9：独立提纯工作区

### 目标

把提纯从单笔记面板升级为集中工作区。

### 范围

1. 左栏提纯队列
2. 中栏当前对象内容
3. 右栏提纯字段和候选
4. 完成当前项后进入下一项

### 完成标准

1. 用户可以连续处理待提纯永久笔记
2. 提纯工作区支持手写优先
3. AI 候选不是主入口
4. 完成项后队列更新

### 不做

1. 不做复杂任务系统
2. 不做全库自动整理
3. 不把提纯工作区包装成 AI 工作台

---

## 13. 建议发布分组

如果要降低风险，可以拆成两次发布。

## 13.1 V1.1 Alpha

目标：

验证手写提纯是否成立。

包含：

1. Milestone 1
2. Milestone 2
3. Milestone 3
4. Milestone 4

## 13.2 V1.1 Beta

目标：

验证 AI 候选是否能帮助提纯，而不抢主体性。

包含：

1. Milestone 5
2. Milestone 6
3. Milestone 7
4. Milestone 8
5. Milestone 9

---

## 14. 测试策略建议

## 14.1 Unit

覆盖：

1. 三句话长度校验
2. distillation 状态流转
3. suggestion 状态流转
4. quality check 规则

## 14.2 Integration

覆盖：

1. 保存永久笔记提纯字段
2. 确认提纯字段
3. 查询提纯队列
4. 保存写作意图
5. AI 候选创建与拒绝

## 14.3 E2E

覆盖：

1. 用户打开永久笔记，填写 thesis，保存并确认
2. 用户从首页队列进入待提纯笔记
3. 用户填写写作意图后生成脚手架
4. 用户查看 AI 候选，采纳为草稿，再确认

---

## 15. 风险控制

## 15.1 先验证手写

如果用户不愿意手写 `thesis`，AI 候选也可能只是让产品更流畅地偏离核心。

所以必须先看手写提纯路径是否成立。

## 15.2 不做全库 AI

V1.1 阶段不需要全库 AI 分析。

所有 AI 调用应默认限制在当前笔记或当前主题。

## 15.3 不让首页变成仪表盘

首页指标要体现思考进度，但不做排行榜、速度竞赛或数量崇拜。

---

## 16. 一句话实施顺序

`先让用户能手写并确认判断，再让系统提醒哪些判断还没提纯，最后才让 AI 作为候选层进入。`
