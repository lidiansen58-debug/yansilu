# Import/Export 稳定化收口清单

这份清单用于冻结 import/export 模块的收尾范围，避免继续在 review 中边改边定义需求。

## A. 生命周期契约

- [x] `preview -> confirm -> completed` 的状态流只有一套真实来源。
- [x] `preview -> confirm -> failed` 的状态流只有一套真实来源。
- [x] `completed -> rollback -> rolled_back` 的状态流只有一套真实来源。
- [x] `cancelled`、`failed`、`completed`、`rolled_back` 都必须在磁盘记录和内存状态之间保持一致。
- [x] 任一阶段写盘失败时，不允许出现“当前进程一个状态、重启后另一个状态”的 split-brain。
- [x] `updatedAt` / `finishedAt` 必须在所有非 preview 生命周期里持久化，并作为历史排序依据。

## B. 候选选择契约

- [x] `candidatePreview` 只负责展示摘要，不再承担真实选择来源。
- [x] `candidateSelection` 是默认选择、确认提交、失败恢复、历史重载的统一来源。
- [x] subset confirm 后，失败记录、完成记录、重启恢复都必须保留同一批 `selectedCandidateIds`。
- [x] 所有批量按钮（`all` / `confirmable` / `safe` / `exclude-*` / `permanent`）都必须基于完整 `candidateSelection` 工作。
- [x] 大于 preview 截断上限的候选，不允许在任一 UI 操作中被静默丢弃。

## C. 导入失败与清理契约

- [x] confirm 失败时，不允许留下“接口失败但系统中已导入”的幽灵记录。
- [x] 文件未改动时，失败回滚必须清理文件和 catalog。
- [x] 文件已被外部改动时，不允许误删用户内容。
- [x] 需要保留的失败文件必须迁移到恢复区，且恢复区失败必须被显式持久化。
- [x] cleanup failure 必须在 import lifecycle 中可见，刷新后仍能看到。
- [x] cleanup failure 后，后续重试不能被原路径残留文件永久卡死。

## D. 文件系统与 Catalog 一致性

- [x] note 写入路径、catalog `markdown_path`、目录归属、读取路径必须一致。
- [x] stale catalog 自愈后，必须同步：
  - [x] `markdown_path`
  - [x] `directory membership`
  - [x] `title`
  - [x] `status`
  - [x] tags / wikilinks / links 关系索引
- [x] `getNoteById`、`searchNotes`、`listNotesByTag`、`listTags`、关系查询、图谱查询、update/move/delete 共享同一套 healing 行为。
- [x] 同一个 `noteId` 不允许形成两个“有效文件 + 单一 catalog 指针”的分裂状态。

## E. 前后端交互契约

- [x] 前端确认按钮状态必须和后端真实 lifecycle 一致。
- [x] confirm 失败后，当前页必须同步到最新 lifecycle，而不是继续停留在旧 preview。
- [x] 历史记录、结果区、当前表单三处看到的状态必须一致。
- [x] `directoryId` 选择规则必须在前端预校验，并和后端校验完全一致。
- [x] `targetDirectories` 只表示实际写入目录，不表示候选或默认目录。

## F. 重启恢复契约

- [x] preview 记录重启后可恢复。
- [ ] subset preview 重启后可恢复同一批选择。
  当前未确认的 subset 选择仍属于前端临时交互状态，不纳入本轮 import lifecycle 持久化范围。
- [x] completed 记录重启后保留正确的 `finishedAt`、`selection`、`targetDirectories`、`createdFiles`。
- [x] failed 记录重启后保留正确的 `failureResult`、`selection`、恢复提示和风险状态。
- [x] rolled_back 记录重启后保留正确的 skipped / modified 信息。

## G. 回归测试矩阵

- [x] preview -> confirm -> restart
- [ ] preview(subset) -> confirm -> restart
  subset 在 preview 阶段尚未提交到后端前，不作为跨重启恢复契约的一部分。
- [x] preview(subset) -> failed -> restart
- [x] preview -> cleanup preserve failed -> restart
- [x] completed -> rollback -> restart
- [x] completed -> rollback(modified file) -> restart
- [x] stale catalog -> read/search/tag/list/update/move/delete
- [x] large preview (>12 candidates) -> batch action -> confirm

## H. PR 收尾标准

- [x] import/export 单测、集成测试、smoke 测试全部通过。
- [x] 关键 lifecycle 修复有对应契约测试，而不是只靠 UI 手测。
- [x] PR diff 中不再存在“内存状态有、磁盘状态没有”的生命周期旁路。
- [x] PR 重新 review 时，优先按这份清单验收，而不是继续无边界扩散。
