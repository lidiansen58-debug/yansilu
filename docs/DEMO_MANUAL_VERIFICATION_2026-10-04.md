# Demo 与使用说明验证记录

日期：2026-10-04。基线：main `fcb54f40`；本次分支：`fix/demo-user-manual`。

目标：用可导入的数据解释卡片笔记方法与研思录的记录、判断、关联、主题和写作流程，提供可继续编辑的使用说明，验证体验并完善帮助。

## 要求与证据

| 要求 | 当前实现 | 验证证据 |
| --- | --- | --- |
| 方法观点结合产品，容易理解 | 原创转述讲清捕捉、理解、独立判断、关联、问题主题与持续写作；说明区分原书启发与产品字段 | `smart-notes-demo-data.mjs` 的 14 条方法笔记及 4 条文献笔记；`smart-notes-demo-manual.mjs` 的完整正文；fixture 检查引用和主题链 |
| 随笔、文摘、文献与永久笔记 | 3 条随笔包含待处理样例；作者网站的短文摘注明来源，其余注明原创转述；保留转换前后状态和来源 | 浏览器直接操作待处理随笔和文献笔记，生成永久笔记，API 核对双向来源链接；六步练习亲自保存三个判断 |
| 笔记关联与图谱 | 正文链接与带理由的人工关系，支持、反驳、限定等用途；主题含真实关键笔记 | fixture 检查所有链接、关系端点、理由和图谱簇；浏览器保存关系并从真实 Demo 图谱打开笔记 |
| 用写作功能保存软件说明 | 新增“研思录使用说明：从一条记录到一篇文章”；通过现有草稿绑定功能连接到示例写作项目和提纲 | integration 验证项目当前正文、来源目标和版本；浏览器从主题继续正文、修改、保存、重开和导出后核对实际文件 |
| Demo 数据持久保存并鼓励导入 | 唯一数据源生成 JSON；设置帮助及空库已有导入入口；默认打开动手练习 | `npm run demo:refresh`；fixture 与生成器一致；浏览器设置帮助取消后项目不存在，确认后项目与正文存在 |
| 可操作的完整体验 | 三个判断、关联、草稿与文章导出六步；进度按实际保存结果推进，并可续用 | 真实浏览器六步练习通过；unit 验证失败保存不推进、不同库隔离、重开保留进度 |
| 详细明确的说明与帮助 | 正文八节覆盖导入、记录、材料转述、观点修订、链接与关系、主题、文章/书稿、续用；离线帮助和两份 demo 操作说明同步 | 帮助检查当前按钮名称、保存与导出的区别、无外部依赖；演示手册修正旧关系练习标题 |
| 不破坏用户数据 | 重复导入只补缺失；已有正文、关系、主题、项目与版本保留 | integration 修改后重复导入，逐项对比磁盘/API 内容；当前草稿版本不重复新增 |

方法来源：作者的 [Take Smart Notes 介绍](https://www.soenkeahrens.de/en/takesmartnotes)。文摘只取网站中的一句短语，不标注虚构书中页码。

## 命令与结果

```powershell
npm run demo:refresh
node --test tests/unit/demo-smart-notes-fixture.test.mjs tests/unit/smart-notes-demo-fixture.test.mjs tests/unit/smart-notes-demo-guide.test.mjs tests/unit/web-local-help.test.mjs tests/unit/web-short-demo-practice.test.mjs tests/integration/smart-notes-demo-seed.test.mjs
node --test tests/unit/web-smart-notes-demo-startup-note.test.mjs tests/unit/web-smart-notes-demo-progress.test.mjs
$env:RUN_BROWSER_E2E='1'
node --test --test-isolation=none tests/e2e/prototype-demo-user-manual.test.mjs tests/e2e/prototype-demo-material-flow.test.mjs tests/e2e/prototype-beta-short-practice.test.mjs
node --test --test-isolation=none --test-name-pattern='^prototype browser flow creates, edits, and persists a markdown note$' tests/e2e/prototype-browser.test.mjs
git diff --check
```

结果：44 项数据、导入及帮助检查通过，另有 22 项进度和启动检查通过；3 项 Demo 浏览器流程与 1 项新建记录浏览器流程通过，无浏览器跳过。离线帮助修改后单独复验 9 项通过。fixture 刷新正常，diff 格式检查通过。

唯一跳过项是尚未生成的桌面打包配置检查；正式桌面配置的帮助资源检查通过。本记录证明源码和隔离临时库中的浏览器行为，不代表安装包验收或真实新用户独立使用验收。R09 的参与者结果保持原记录，不以工程测试填写。

浏览器首次缺少 Chromium 的跳过已通过安装和重跑解决。编写新增检查时纠正了搜索输入框名称及图谱“打开笔记”的选择器；主题继续按钮需等项目列表读取完成，再验证已保存正文。

## Review 修复复验

首次导入的新项目在创建前记录待完成的正文初始化。绑定失败后保留该记录；重试恢复正文，完成后移除记录。已有项目不自动获得初始化记录，用户已有草稿仍保留；若绑定版本已写入而当前正文更新失败，则恢复同一版本，不新建重复版本。桌面运行时同时包含初始化模块。

说明书第 3 节改为先查看“阅读一开始就要面向未来写作”的真实短文摘和转述，再用“用自己的话重说，才能检查理解”练习原创转述。JSON 已从唯一数据源重新生成。

新增四个回归场景：草稿版本插入失败后重试、项目正文更新失败后重试、失败后用户先保存自己的草稿、没有待初始化记录的既有空项目。连同既有数据、导入、导览与桌面依赖检查，共 35 项通过；设置导入后继续说明书、保存、重开及实际文件导出的浏览器检查复验通过。

第二轮 review 修复：恢复绑定改为 `BEGIN IMMEDIATE` 事务，在事务内重新检查当前正文与版本，再一起写入版本和当前正文。写入失败整体回滚，同时兼容旧实现留下的单个未绑定版本。并发保存用户草稿时，恢复流程保留用户的当前正文。

初始化记录先以 UTF-8 完整写入同目录的临时文件并刷新，再通过重命名发布；失败清理本次临时文件。项目尚未创建时可替换旧的残缺记录。已有项目的残缺记录无法证明初始化归属，移除记录但不改动项目，避免阻塞导入或误改用户数据。

新增复验涵盖部分写入后磁盘满、旧残缺记录、空记录、无效 JSON 对象、正常及旧部分绑定状态下的并发草稿保存、事务失败回滚。命令 `node --test tests/integration/smart-notes-demo-seed.test.mjs tests/unit/demo-smart-notes-fixture.test.mjs tests/unit/web-short-demo-practice.test.mjs`：33 项通过，无跳过。说明书设置导入、继续编辑、保存、重开、导出实际文件的浏览器检查再次通过；`git diff --check` 通过。
