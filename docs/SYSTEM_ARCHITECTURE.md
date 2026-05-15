# 研思录系统架构说明 v1.0

## 1. 文档目标

本文档定义研思录 v1.0 的模块边界、持久化策略、API 草案与开发顺序，用于指导工程实现与验收。

## 2. 顶层架构

- `apps/`：`web`、`desktop`、`api`、`worker`
- `packages/`：`domain`、`markdown-engine`、`graph-engine`、`search-engine`、`ai-orchestrator`、`connectors`、`export-engine`、`originality-guard`、`ui-kit`
- `schemas/`：结构化对象 JSON Schema
- `docs/`：产品与技术文档
- `vault-example/`：示例本地仓库
- `tests/`：`unit`、`integration`、`e2e`

### 2.1 跨平台目标（P0）

- `apps/desktop` 必须覆盖 Windows、macOS、Linux
- 三平台共享同一领域层与核心业务流程
- 平台差异由适配层吸收，不下沉到业务用例层
- 技术路线建议：`Tauri + React/TypeScript + SQLite + CodeMirror 6`
- 选择理由：更适合本地目录、文件系统权限、右键菜单、拖拽、跨平台打包与性能控制

### 2.2 移动端扩展策略（未来）

- iOS / Android 不属于 v1.0 交付范围
- 领域层、Schema、API 设计需保持平台中立
- 连接器与文件系统能力允许“桌面完整、移动降级”

## 3. 持久化策略

### 3.1 Markdown 文件

用于保存：

- 目录树描述
- 随笔记录
- 书摘笔记
- 永久笔记
- 索引笔记（特殊永久笔记）
- 写作项目描述

### 3.2 SQLite / Postgres

用于保存：

- 目录索引
- 结构化查询
- 关系边
- 标签关系
- 反向链接索引
- 导入映射
- 作业队列
- 搜索加速信息

约束：
- Markdown 是主内容事实来源。
- SQLite 是关系、索引和加速层，必须可重建。
- `[[标题]]` 在 Markdown 中保持可读展示，SQLite 内部绑定 `note_id`。

### 3.3 向量索引

用于：

- 语义搜索
- 相似观点召回
- 主题聚类
- 冲突近邻召回

### 3.4 图谱缓存

用于：

- 子图快照
- 布局缓存
- 节点热度
- 写作图状态

### 3.5 Vault 目录结构（规范）

```text
yansilu-vault/
  notes/
    fleeting/
    literature/
    original/
    index/
    projects/
  assets/
    pdf/
    images/
    audio/
  imports/
    zotero/
    readwise/
    notebooklm/
    obsidian/
  exports/
  .yansilu/
    catalog.db
    graph-cache.db
    vectors.db
    settings.json
    import-map.json
```

约定：

- `notes/` 存放主内容（系统事实来源）
- `assets/` 存放附件
- `imports/` 存放导入中间文件与日志
- `.yansilu/` 存放缓存、索引、配置，不作为主内容来源

### 3.6 平台适配层（必须）

桌面三平台差异必须通过 `platform adapter` 抽象，至少覆盖：

- 文件路径规范化（分隔符、大小写敏感差异）
- 文件系统权限与沙箱策略
- 文件监听机制（watcher 实现差异）
- 本地数据库路径与锁机制
- 后台任务调度能力差异

## 4. 前端模块说明

### 4.1 目录中心（Workspace Home）

职责：

- 路由管理
- 导航框架
- 全局搜索入口
- 命令面板
- 最近项目 / 最近笔记 / 最近索引入口

### 4.2 随笔记工坊（Fleeting Notes）

职责：

- 快速创建、编辑、删除随笔记
- 按标签/时间检索随笔记
- 将随笔记转换为书摘笔记或永久笔记
- 记录转换链路，避免信息断裂

关键约束：

- 随笔记默认不直接进入写作篮
- 转换操作必须可追溯到原随笔记 ID
- 转换完成后原随笔自动归档

### 4.3 书摘笔记工坊

职责：

- 新建书摘笔记
- 录入来源与定位
- 左侧摘录、右侧转述
- 候选主题与问题输入
- 导入来源转为书摘笔记

关键交互：

- `quote` 与 `paraphrase` 分区输入
- 没有 `locator` 或 `paraphrase` 时不允许完成保存
- 可从导入候选区一键开始加工
- 书摘笔记可长期单独存在
- 书摘新增永久笔记后，书摘保持原状态，并通过 Link 关系连接永久笔记

### 4.4 永久笔记编辑器

职责：

- 创建永久笔记
- 编辑观点、解释、边界
- 添加来源引用
- 管理索引归属
- 管理连接关系
- 展示原创性守卫反馈

关键约束：

- 不提供 “AI 一键生成永久笔记正文”
- 粘贴大段文本时提示
- 保存时触发 originality guard
- 相似度 `>= 80%` 时禁止保存文件
- 标题取 Markdown 第一行
- 关联以 `[[标题]]` 展示，SQLite 绑定 `note_id`
- 标签以正文 `#标签` 展示，SQLite 保存标签关系

### 4.5 索引中心

职责：

- 管理四类索引
- 对索引项排序
- 为索引项补充说明
- 新建主题索引 / 邻近索引 / 逻辑链 / 自由连接

### 4.6 图谱工作台

职责：

- 显示本地图
- 显示主题图
- 显示写作图
- 提供路径查找
- 提供冲突视图
- 提供过滤与聚焦

默认策略：

- MVP 只显示当前目录下笔记的链接关系
- 节点超阈值时自动折叠
- 默认从局部进入
- 不在首页自动打开全局图
- 默认显示“当前笔记局部图”（参考 Obsidian 的 local graph 思路）
- 支持按深度（1-3 hops）渐进展开
- 支持按关系类型/标签/时间过滤
- 支持固定中心节点与邻居按需扩展
- 支持两点路径高亮，减少 10k 规模下的视觉噪音

### 4.7 写作工作台

职责：

- 创建写作项目
- 选择标签或永久笔记
- 生成写作提示词
- 生成提纲
- 导出 Markdown / DOCX

MVP 不生成完整初稿正文；初稿脚手架与证据映射放在后续增强阶段。

### 4.8 设置与导入导出

职责：

- 选择 vault 路径
- 配置模型
- 配置连接器
- 启动导入向导
- 启动导出向导

## 5. 后端模块说明

### 5.1 API / BFF

职责：

- 向前端暴露统一 API
- 聚合服务层结果
- 返回规范化 JSON
- 处理鉴权、审计、错误码

### 5.2 笔记服务

职责：

- 管理 `fleeting / literature / permanent / project note` 全量 CRUD
- 解析 frontmatter
- 同步文件系统与数据库
- 管理 note 生命周期
- 管理笔记转换（fleeting -> literature/permanent/project）

### 5.3 索引服务

职责：

- 创建和维护四类索引
- 建立 index card 与 note 的映射
- 管理排序、简述、索引项注释

### 5.4 图谱服务

职责：

- 构建节点与关系边
- 生成子图
- 生成写作图
- 支持路径查找与图谱过滤
- 缓存布局结果

10k 永久笔记交互优化：

- 局部图优先加载（center note + depth）
- 邻居节点分批加载（分页/窗口化）
- 热点节点缓存与布局复用
- 查询层默认限制最大返回节点数
- 提供“关系过滤 + 路径聚焦 + 分组着色”组合操作

### 5.5 写作服务

职责：

- 管理写作项目
- 管理写作篮
- 管理脚手架生成结果
- 管理段落—证据映射
- 导出稿件

### 5.6 搜索服务

职责：

- 标题搜索
- 全文检索
- 标签检索
- 来源检索
- 索引检索
- 混合检索（关键词 + 向量）

### 5.7 导入导出服务

职责：

- Markdown 导入导出
- Obsidian 导入导出
- Zotero 导入（v1.1+）
- Readwise 导入（v1.1+）
- NotebookLM 回流导入（v1.1+）

### 5.8 任务调度器

职责：

- embedding 重建
- 图谱缓存重建
- 导入任务
- AI 建议任务
- 导出任务

### 5.9 原创性守卫

职责：

- 检测永久笔记与原文摘录相似度
- 检测永久笔记与 AI suggestion 相似度
- 生成阻断 / 警示报告
- 返回前端提示原因

规则：
- `similarity >= 0.8` 时禁止保存文件。
- 低于阈值可保存，但应保留检测结果供 UI 展示。

## 6. 连接器层说明

### 6.1 Markdown / Obsidian Connector

能力：

- 导入 Markdown 文件与目录
- 识别 frontmatter
- 识别 wikilinks
- 识别 tags / aliases
- 导出兼容 Obsidian 的 Markdown

### 6.2 Zotero Connector

能力：

- 导入来源元数据
- 导入 note / annotation 内容
- 保留 citation locator
- 生成文献笔记候选

### 6.3 Readwise Connector

能力：

- 导入 highlights
- 导入 notes / tags
- 导入 source metadata
- 标记为“待转述材料”

### 6.4 NotebookLM Connector

能力：

- 导入 notebook 导出的 notes / reports / docs 文本
- 回流为文献笔记候选
- 保留 notebook 名称、来源与上下文
- 不直接生成永久笔记

## 7. AI 层说明

### 7.1 AI Orchestrator

职责：

- 管理 AI 任务执行
- 模型路由
- 工具调用
- 响应标准化

典型任务：

- `analyze_source`
- `suggest_indexes`
- `suggest_links`
- `find_conflicts`
- `build_draft_scaffold`

### 7.2 Schema Registry

职责：

- 维护所有 Structured Outputs schema
- 管理 schema 版本
- 与 domain types 同步

### 7.3 Prompt Registry

职责：

- 管理系统 prompt
- 管理任务模板
- 管理 agent 边界说明

### 7.4 Embedding Pipeline

职责：

- 为笔记生成向量
- 为索引卡生成向量
- 为文献摘要生成向量
- 变更时增量重建

### 7.5 Agent Workers

职责：

- 异步执行建议类任务
- 长时任务
- 批处理任务

## 8. 关键 API 草案

- 创建随笔记：`POST /api/v1/notes/fleeting`
- 创建书摘笔记：`POST /api/v1/notes/literature`
- 创建永久笔记：`POST /api/v1/notes/permanent`
- 更新笔记：`PATCH /api/v1/notes/:id`
- 删除笔记：`DELETE /api/v1/notes/:id`
- 获取笔记详情：`GET /api/v1/notes/:id`
- 转换随笔记：`POST /api/v1/notes/fleeting/:id/convert`
- 创建索引：`POST /api/v1/indexes`
- 获取索引详情：`GET /api/v1/indexes/:id`
- 获取子图：`GET /api/v1/graph?scope=local&center=pn_001&depth=2`
- 创建写作项目：`POST /api/v1/writing/projects`
- 生成脚手架：`POST /api/v1/writing/projects/:id/scaffold`
- Markdown 导入：`POST /api/v1/imports/markdown`
- Obsidian 导入：`POST /api/v1/imports/obsidian`
- Zotero 导入：`POST /api/v1/imports/zotero`
- Readwise 导入：`POST /api/v1/imports/readwise`
- NotebookLM 导入：`POST /api/v1/imports/notebooklm`

## 9. 开发顺序

### 第一阶段：最小闭环

- domain + schema
- vault + markdown engine
- notes service
- 书摘笔记工坊
- 永久笔记编辑器
- originality guard
- 索引中心
- 基础搜索
- 当前目录链接图 MVP
- 写作篮 + 脚手架 MVP
- 写作提示词 + 提纲 MVP
- Markdown / Obsidian 基础导入导出

### 第二阶段：连接器

- Zotero 导入
- Readwise 导入
- NotebookLM 回流

### 第三阶段：AI 增强

- 索引建议
- 连接建议
- 冲突检测
- 路径查找
- 时间演化图
- 主题聚类

## 10. Definition of Done

### 前端

- 核心页面可访问
- 关键流程能完成
- 有错误提示
- 有基本 E2E 测试
- Windows、macOS、Linux 三平台均可完成 P0 主流程

### 后端

- API 可用
- 文件与数据库同步通过测试
- 作业可重试
- 错误码稳定

### 连接器

- 有导入预览
- 有确认步骤
- 有 ImportRecord
- 不覆盖用户二次编辑内容

### AI 层

- 结构化输出通过 schema 校验
- 不越权生成永久笔记正文
- 可记录 trace
- 可失败重试

### 数据层

- vault 可迁移
- Markdown 可读
- 缓存可重建
- 搜索可重建
- 平台差异不影响主内容一致性（notes 为唯一事实源）
