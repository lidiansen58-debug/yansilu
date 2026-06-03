# 研思录 v0.1 发布路线图

> Legacy note (2026-06-03): this document reflects an older release plan. The current implementation has been reduced to a simpler Obsidian-only import flow plus Markdown export.

更新日期：2026-05-09

## 文档定位

这是一份历史发布计划快照，保留它是为了说明：

1. 当时的发布节奏
2. 桌面打包和 walkthrough 的收口方式
3. 旧版工作树分工思路

## 仍可参考的部分

以下内容仍然有参考价值：

- `v0.1` 以 Windows 桌面内测为目标
- 发布门槛强调真实 walkthrough、桌面文件操作和打包验证
- worktree 分工的总体思路仍可借鉴

## 已经过时的导入导出范围

这份旧计划里曾把以下内容视作发布范围的一部分：

1. Markdown / Obsidian 并列导入
2. 导入历史查看
3. 导入回滚
4. 更宽的 `wt-import-pipeline` 责任面

这些内容不再代表当前实现边界。

## 当前导入导出边界

当前版本请按下面的范围理解：

1. 仅支持 Obsidian 导入
2. 导入流程只有 `预览 -> 确认`
3. 不保存导入历史
4. 不支持导入回滚
5. Markdown 导出保留

## 当前应参考的文档

如果你需要继续推进当前版本，请以这些文档为准：

1. `README.md`
2. `docs/API.md`
3. `docs/ACCEPTANCE_TESTS.md`
4. `docs/WORKTREE_GUIDE.md`
5. `docs/CONNECTORS_MVP_CONTRACT.md`
