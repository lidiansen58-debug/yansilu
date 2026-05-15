# 富《易经》验收样例：人工验收 Checklist

目标：用一套固定数据验证「随笔/文献笔记/原创笔记/显式关系/图谱/写作项目/脚手架」全链路可用，并且结果可复现（幂等）。

## 0. 准备

- 确认 API 与 Web 原型都在跑：
  - Web：`http://127.0.0.1:5173/prototype`
  - API：`http://127.0.0.1:3000/health`

如果本机系统盘（通常是 C 盘）空间不足，测试创建临时 vault 时可能报 `ENOSPC`。
- 解决方式（推荐）：把 `TEMP/TMP` 指到有空间的盘再跑测试/脚本。

## 1. 一键导入（UI 路径）

1. 打开原型页：`http://127.0.0.1:5173/prototype`
2. 进入「关系图谱」模块
3. 点击「导入官网演示」

预期：
- 顶部状态提示包含：`已导入易经官网演示：55 条永久笔记，85 条关系，2 个写作方案`
- 自动切换到样例目录（目录名类似「易经验收样例：原创笔记」）
- 图谱摘要包含：`55 个节点`、`85 条链接`

## 2. 一键导入（API 路径）

调用：
- `POST /api/v1/demo/acceptance/yijing-rich`

预期：
- 返回 `item.kind = "yijing_rich_acceptance_seed"`
- `item.counts.original_notes = 55`
- `item.counts.relations = 85`
- `item.counts.index_cards = 5`
- `item.counts.writing_projects = 2`
- 第二次重复调用时：
  - `createdNotes = 0` 且 `updatedNotes = 60`
  - `createdRelations = 0` 且 `updatedRelations = 85`

## 3. 图谱验收（Graph）

在「关系图谱」模块中：

- 关系类型下拉/过滤器能看到多种关系（至少包含 `supports`/`qualifies`/`contradicts`/`counterexample_to`/`same_topic`/`unexpected_connection`/`appears_in_draft` 等）
- 关系状态显示为「全部状态（85）」或同等含义
- 列表/预览中能看到部分节点标题（例如 `YJ-A01`、`变化不是扰动而是背景` 等）

## 4. 索引卡验收（Index Cards）

在索引相关入口（如列表/筛选）检查：

- 能找到 5 个索引卡（ID 前缀 `idx_yj_`）
- 至少包含一个 `sequence` 类型索引卡
- 打开任意一个索引卡：
  - 能看到条目数量与 fixture 一致
  - 条目顺序稳定（重复导入后不乱序）

## 5. 写作验收（Writing）

进入「写作中心」模块：

- 能看到 2 个写作项目（ID 前缀 `wp_yj_`）
- 打开 `wp_yj_answer_machine`：
  - 标题为「为什么《易经》不是答案机器」
  - `basket_note_ids` 数量与 fixture 一致
  - `scaffold_id` 存在且为 `ds_wp_yj_answer_machine`
- 打开对应脚手架：
  - `sections` 数量与写作方案 outline 一致
  - 每个 section 都有：
    - `evidence_note_ids`（非空）
    - `source_trace_ids`（非空）
  - Markdown 预览里包含提醒语：`这是一份写作方案和脚手架，不是完成稿`

## 6. 失败排查（最常见）

- `ENOSPC` / `no space left on device`：系统盘空间不足，优先调整 `TEMP/TMP` 到有空间的盘。
- UI 点击无反应：检查 API 是否可达（`/health`），再看控制台是否有请求失败。
- 图谱节点/边数量不对：确认当前目录是否切换到 seed 返回的 `directoryId`（样例目录）。

