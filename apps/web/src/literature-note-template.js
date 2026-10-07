export function defaultLiteratureTemplateSource(title = "{{title}}") {
  return [
    `# ${String(title || "{{title}}").trim() || "{{title}}"}`, "",
    "## 出处", "",
    "- 标题：", "- 页码 / 定位：", "- 链接 / 文件：", "",
    "## 原文", "", "",
    "## 我的理解", "", ""
  ].join("\n");
}

// Only an exact saved default is upgraded; customized templates stay untouched.
export function legacyLiteratureTemplateSource(title = "{{title}}") {
  return [
    `# ${String(title || "{{title}}").trim() || "{{title}}"}`,
    "",
    "## 引用信息",
    "",
    "- 标题：",
    "- 作者：",
    "- 年份：",
    "- 容器：",
    "- 出版社 / 来源：",
    "- 页码 / 定位：",
    "- 版本：",
    "- 译者 / 编者：",
    "- DOI / ISBN / arXiv / URL / PDF：",
    "",
    "## 原文",
    "",
    "> 在这里放可核对的原文摘录、页码或关键句。",
    "## 转述",
    "",
    "> 用你自己的话重写，不要贴原句。",
    "## 判断种子",
    "",
    "- 这条材料最值得保留的判断是：",
    "",
    "## 追问",
    "",
    "- 它还没有解释清楚什么？",
    "- 下一步应该去验证什么？",
    "",
    "## 边界 / 反例",
    "",
    "- 这条材料在什么条件下不成立，或不足以支撑判断？",
    "",
    "## 保留原因",
    "",
    "- 它为什么值得进入你的系统？",
    ""
  ].join("\n");
}
