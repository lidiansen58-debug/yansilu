export function groupWritingPreflightChecks(preflight = null) {
  const checks = Array.isArray(preflight?.checks) ? preflight.checks : [];
  const blocking = checks.filter((check) => {
    const status = String(check?.status || "").trim().toLowerCase();
    return status === "fail" || status === "blocking" || status === "blocked" || status === "error";
  });
  const warnings = checks.filter((check) => String(check?.status || "").trim().toLowerCase() === "warning");
  const passes = checks.filter((check) => String(check?.status || "").trim().toLowerCase() === "pass");
  return { checks, blocking, warnings, passes };
}

export function describeWritingNextActionFromState({
  basketCount = 0,
  hasProject = false,
  hasScaffold = false,
  hasDraft = false
} = {}) {
  if (!basketCount) {
    return {
      title: "先选材料",
      note: "先把 2-5 条能支撑论证的永久笔记放进写作篮。"
    };
  }
  if (!hasProject) {
    return {
      title: "创建写作项目",
      note: "确认题目、目标读者和材料后，先建项目再往下走。"
    };
  }
  if (!hasScaffold) {
    return {
      title: "生成骨架",
      note: "项目已创建，下一步先生成 scaffold，检查章节、缺口和反方。"
    };
  }
  if (!hasDraft) {
    return {
      title: "保存草稿",
      note: "骨架已生成，确认缺口和反方后，把当前版本保存成草稿。"
    };
  }
  return {
    title: "打开当前草稿",
    note: "草稿已绑定，下一步回到编辑器继续写作。"
  };
}
