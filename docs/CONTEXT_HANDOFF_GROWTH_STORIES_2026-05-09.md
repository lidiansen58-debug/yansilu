# 研思录增长故事资产交接 - 2026-05-09

这份文档用于把本轮客户故事工作交接给 `wt-growth-site` 工作区。后续增长站点、官网改版、demo 脚本、短内容和销售材料都可以从这里恢复上下文，不依赖聊天记录。

## 已交接内容

故事资产已经复制到：

```text
docs/growth/customer-stories/
```

当前包含：

- `README.md`：故事库索引、核心叙事、每个故事的用途。
- `story-reuse-guide.md`：如何把长故事改写成官网短案例、demo 开场、短帖和销售话术。
- `01-blank-page-writer.md`：知识型内容创作者，记了很多但写不出来。
- `02-literature-review-researcher.md`：研究生 / 青年研究者，文献很多但综述结构散。
- `03-independent-newsletter-writer.md`：英文 newsletter 作者，阅读笔记无法稳定变成原创文章。
- `04-product-manager-feedback.md`：产品经理，用户反馈和产品判断断裂。
- `05-course-creator-idea-library.md`：课程 / 专栏创作者，内容很多但课程结构难沉淀。
- `06-obsidian-power-user.md`：PKM / Obsidian 重度用户，链接很多但观点没有成型。
- `07-consultant-report-writer.md`：咨询顾问 / 分析师，材料很多但报告缺少主张。
- `08-founder-strategy-notebook.md`：创业者，客户访谈和市场观察需要沉淀为战略判断。
- `09-meeting-heavy-knowledge-worker.md`：会议密集型知识工作者，会议记录很多但决策依据没有沉淀。
- `10-teacher-public-scholar.md`：青年教师 / 公共写作者，教学、研究和公共表达割裂。

## 核心叙事

故事库统一服务一个定位：

> 研思录不是帮用户存更多笔记，而是帮用户把资料变成观点，把观点变成可输出、可复用、可追溯的结构。

增长站点应优先避免把产品讲成普通 note-taking app、second brain 或泛 AI 写作工具。更准确的表达是：

- 从资料到观点。
- 从观点到结构。
- 从结构到写作、研究、报告、课程或产品判断。
- AI 辅助思考，但不替代用户判断。
- 本地优先、可追溯、可迁移是信任底座，不是第一屏主卖点。

## 增长站点优先使用顺序

第一优先：内容创作者故事。

对应文件：

```text
docs/growth/customer-stories/01-blank-page-writer.md
```

推荐用于首页主叙事和中文落地页。它的痛点最直观：收藏、摘录、灵感很多，但写作仍然从空白页开始。

第二优先：研究者故事。

对应文件：

```text
docs/growth/customer-stories/02-literature-review-researcher.md
```

推荐用于学术 / 研究用户落地页和 demo。它能清楚展示文献笔记、永久笔记、主题索引、写作脚手架的完整链路。

第三优先：PKM 重度用户故事。

对应文件：

```text
docs/growth/customer-stories/06-obsidian-power-user.md
```

推荐用于 PKM 社区、Obsidian 用户迁移叙事和竞品差异化。核心角度是：双链和图谱能让笔记相遇，但不一定让观点成型。

第四优先：英文 newsletter 作者故事。

对应文件：

```text
docs/growth/customer-stories/03-independent-newsletter-writer.md
```

推荐用于英文版官网、YouTube demo、Substack 合作、Product Hunt 前后的内容传播。

第五优先：咨询 / 产品 / 创业者故事。

对应文件：

```text
docs/growth/customer-stories/04-product-manager-feedback.md
docs/growth/customer-stories/07-consultant-report-writer.md
docs/growth/customer-stories/08-founder-strategy-notebook.md
```

这些更适合放在后续 use case 页、销售材料、B2B 场景扩展里，不建议一开始全部塞进首页。

## 建议落地到首页的模块

可以从 `MARKETING_SITE_HOMEPAGE_V1.md` 的现有结构里新增或替换一个故事区：

```text
Section title:
From scattered material to a clear point of view.

Story cards:
1. Writer: "I had enough material. I did not have an argument."
2. Researcher: "My literature review was not missing papers. It was missing a question."
3. PKM user: "My graph showed connections. It did not show what I believed."
```

中文版本：

```text
标题：
从一堆资料，到一个说得清楚的观点。

故事卡片：
1. 创作者：素材很多，但每次写长文都像从零开始。
2. 研究者：文献很多，但综述不是文献排列。
3. PKM 用户：链接很多，但观点还没有成型。
```

每张故事卡片不要写成长段案例，建议保持：

- 角色
- 原来的卡点
- 研思录带来的转变
- 一个可点击的 `See the workflow` 或 `查看这个场景`

## 建议 demo 脚本路线

增长站点最适合先展示一个完整、可视化、短路径 demo：

```text
素材 / 文献摘录
-> 用户转述
-> 一句话论点
-> 三句话压缩
-> 主题索引
-> 写作脚手架
```

不要先展示所有功能。先让用户看见“提炼发生了什么”。

最适合首个 demo 的 story 是：

```text
docs/growth/customer-stories/01-blank-page-writer.md
```

原因：

- 中文用户容易共鸣。
- 可以自然带出 AI 边界。
- 可以直观演示从摘录到文章结构。
- 它和首页现有主线“不是存更多，而是帮助理解和输出”最贴合。

## 文案可直接复用的句子

- 你不是缺素材，你缺的是一条从素材到观点的路。
- 写作不再从空白页开始，而从已经被你理解过的材料开始。
- 双链让笔记相遇，但不一定让观点成型。
- 文献不是读得越多越好，而是要长成你的问题。
- 会议记录保存了发生了什么，研思录帮助你保存为什么这么决定。
- 用户反馈不是越多越好，关键是能不能变成产品判断。
- AI 辅助思考，但不替你思考。

## 与现有官网文档的关系

相关现有文档：

```text
docs/MARKETING_SITE_HOMEPAGE_V1.md
docs/MARKETING_SITE_PRODUCT_DOC.md
docs/PRICING_PAGE_COPY_V1.md
```

故事库不是替代这些文档，而是给官网提供更具体的“人”和“场景”。建议后续改站点时这样使用：

1. 用 `MARKETING_SITE_HOMEPAGE_V1.md` 定页面结构。
2. 用 `docs/growth/customer-stories/README.md` 选择核心用户故事。
3. 用 `story-reuse-guide.md` 把长故事压缩成短模块。
4. 在 `apps/web/src/marketing-home.html` 和 `apps/web/src/marketing-product.html` 中落地 2-3 个最强故事，而不是一次性铺满 10 个。

## 注意事项

- 当前工作区是 `E:\Projects\Thinking in Notes\yansilu-wt\feat-growth-site`。
- 这次只交接文档资产，没有改动前端页面。
- 本轮交接只新增了 `docs/growth/customer-stories/*` 和本交接文档，没有主动修改前端页面。
- 交接检查时 `git status` 还显示一批 `apps/web/src/marketing-*` 和 `apps/web/src/marketing.css` 修改；这些不属于本轮故事交接写入范围，后续接手前请先确认来源，不要直接回滚。
- 后续如果编辑中文官网文案，请优先通过浏览器或实际渲染检查乱码。已有交接文档里提到过部分 marketing 文件曾出现中文乱码。
- 不要把故事写成“AI 自动生成文章”的承诺。研思录的核心边界是 AI 帮用户检查、澄清、组织和建议，但最终判断属于用户。

## 恢复上下文提示词

如果新开对话继续做增长站点，可以直接说：

```text
请阅读 docs/CONTEXT_HANDOFF_GROWTH_STORIES_2026-05-09.md 和 docs/growth/customer-stories/README.md，继续把客户故事落到研思录增长站点。优先把内容创作者、研究者、PKM 重度用户三条故事线改成首页故事区和 3 分钟 demo 脚本。
```
