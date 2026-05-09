# wt-growth-site 交接说明 - 2026-05-09

这份说明用于把当前官网视觉优化工作交接到 `feat/growth-site` 工作树。

## 已交接范围

- 目标工作树：`E:\Projects\Thinking in Notes\yansilu-wt\feat-growth-site`
- 目标分支：`feat/growth-site`
- 核心定位：研思录的官网表达应统一为“把知识变成你的智慧”。
- 当前官网主文件在 `apps/web/src/marketing*`。
- 视觉优化已经在目标 CSS 中具备：
  - 暖纸色背景与墨绿色品牌层次
  - `--font-display` / `--font-body` / `--font-ui` 字体 token
  - 更强的中文标题衬线字体栈
  - 纸面卡片、按钮、tab、定价卡、下载页卡片的统一质感
  - 首页移动端标题不横向溢出
  - 内页移动端标题不横向溢出
  - 价格数字使用 UI 字体并启用 `font-variant-numeric: tabular-nums`

## 本次实际补丁

目标工作树中 `apps/web/src/marketing.css` 曾有少量 `content` 字符串在工作区层面出现编码风险。

本次只做了最小补丁：把这些 CSS 伪元素内容改为 Unicode escape，避免不同终端/线程继续把它们写坏。

- `content: "\2022"` 渲染为圆点 `•`
- `content: "\4E3A\6301\7EED\8F93\51FA\800C\8BBE\8BA1"` 渲染为 `为持续输出而设计`

这不会改变页面视觉，只是让交接更稳。

## 建议验证

在目标工作树中执行：

```powershell
cd "E:\Projects\Thinking in Notes\yansilu-wt\feat-growth-site"
npm.cmd run dev:web
```

然后检查：

```text
http://localhost:5173/
http://localhost:5173/product
http://localhost:5173/pricing
http://localhost:5173/download
```

重点看：

- 桌面端首页主标题为两行，不卡到右侧产品卡片。
- 移动端首页、产品页、定价页、下载页没有横向滚动。
- 定价页 Pro 角标显示“为持续输出而设计”。
- 首页 proof 行圆点正常显示。
- 全站文案继续围绕“把知识变成你的智慧”。

## 下一步建议

1. 在 `feat/growth-site` 线程继续做浏览器实测。
2. 若要提交，优先提交 `apps/web/src/marketing.css` 和本交接文件。
3. 如果不希望保留本交接文件，可以只把它当作线程说明，不纳入最终 commit。

