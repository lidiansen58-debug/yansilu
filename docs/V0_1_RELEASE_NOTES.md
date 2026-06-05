# 研思录 v0.1.0 Release Notes

> Legacy note (2026-06-03): this historical release note originally described a broader import/export model. The current codebase has since been simplified to Obsidian-only preview/confirm import plus Markdown export.

- 发布日期：2026-05-13
- 版本基线：`v0.1.0-67-g15653f8`
- 发布对象：Windows 桌面内测 / 朋友测试

## 历史背景

`v0.1.0` 记录的是项目第一次把本地 Vault、笔记编辑、图谱、导入导出、写作脚手架和桌面打包串成完整主路径的阶段。

这份说明保留的意义主要是：

1. 记录当时的发布基线
2. 保留桌面打包与验证背景
3. 说明哪些能力是内测时重点覆盖的

## 仍然有效的版本信息

以下信息仍有参考价值：

- 本地 Vault + Markdown 文件是内容事实源
- 三类笔记、图谱、写作 scaffold、桌面打包都已进入真实实现
- Windows NSIS 安装包和桌面 preflight 在当时已打通
- 发布说明明确把产品定位为内测候选，而非大规模生产版

## 已经过时的导入导出描述

本文件原先把以下能力写成了当时的发布描述：

1. Markdown / Obsidian 并列导入
2. 导入历史记录
3. 导入回滚
4. 更宽的导入导出闭环表述

这些内容不再代表当前代码库边界。

## 当前应以哪些文档为准

如果你正在开发或验收当前版本，请改看这些文件：

1. `README.md`
2. `docs/API.md`
3. `docs/ACCEPTANCE_TESTS.md`
4. `docs/CONNECTORS_MVP_CONTRACT.md`
5. `docs/IMPLEMENTATION_STATUS.md`
