# Thread Opener Short CN

## 0. 创建 Worktree

```text
从主仓库创建一个新 worktree。

主仓库目录：E:\Projects\Thinking in Notes\yansilu
基线分支：main
新分支：<feat/fix/review/spike 分支名>
新 worktree 目录：E:\Projects\Thinking in Notes\yansilu-wt\<目录名>

要求：
1. main 只保留在 E:\Projects\Thinking in Notes\yansilu
2. 不要在其他目录 checkout main
3. 创建 worktree 时必须从主仓库目录执行，不要从 E:\Projects\Thinking in Notes 执行
4. 创建完成后输出新 thread 开场词
5. 不要先跑测试
6. 不要先启动服务
7. 只确认仓库目录、分支、worktree 目录正确
```

## 1. Bugfix

```text
工作目录：<path>
分支：fix/<name>
目标：修复 <bug>

先不要跑测试。
先检查相关文件并确认复现路径。
只处理当前 bug。
只改：<模块/文件范围>
修改后只跑最小相关验证。
达到可 review 状态就停。
```

## 2. Feature

```text
工作目录：<path>
分支：feat/<name>
目标：<一句话功能目标>

先不要跑测试。
只处理当前功能目标。
只改：<模块/文件范围>
代码组织要求：
- 不要把新的业务逻辑继续堆进 prototype 主文件
- 如果引入新职责，优先拆出一个直接相关的小模块
- prototype 主文件只负责装配、接线和模块组合
修改后只跑最小相关验证。
达到可 review 状态就停。
```

## 3. Review

```text
工作目录：<path>
分支：<branch>
目标：判断这一轮是否可合并

不要开始新功能开发。
只检查：bug、越界修改、缺失测试、停止条件是否满足。
给出可合并 / 需修复结论后就停。
```

## 4. 编码附加段

涉及中文文档、中文文案、JSON/Markdown 中文内容、脚本写文件时，追加：

```text
编码要求：
- 所有新建或修改的文本文件按 UTF-8 处理
- 如果脚本会写文件，必须显式指定 UTF-8
- 如果终端显示异常，先用显式 UTF-8 方式读取确认，不直接判断文件损坏
```

## 快速选择

- 开 worktree：用 `创建 Worktree`
- 改 bug：用 `Bugfix`
- 做功能：用 `Feature`
- 做合并判断：用 `Review`
- 只要涉及中文文本或写文件脚本：追加 `编码要求`

## 短 Goal 不降质

短 goal 也默认追加这 4 条：

```text
不要顺手扩展成重构。
如果范围开始变大，先停下来汇报边界问题。
优先修改现有模块，不新增大块抽象。
修改后只跑当前目标最小闭环验证。
```

完整说明见：

- `docs/GOAL_QUALITY_GUARDRAILS.md`
