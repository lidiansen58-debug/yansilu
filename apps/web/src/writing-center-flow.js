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
  hasDraft = false,
  blockingCount = 0,
  warningCount = 0
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
    if (blockingCount > 0) {
      return {
        title: "先处理阻塞项",
        note: `当前有 ${blockingCount} 个阻塞项，建议先处理后再保存草稿。`
      };
    }
    if (warningCount > 0) {
      return {
        title: "保存草稿",
        note: `可以继续保存草稿，但最好先补 ${warningCount} 个提醒项。`
      };
    }
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

export function describeWritingProjectPreflight(preflight = null) {
  const checks = Array.isArray(preflight?.checks) ? preflight.checks : [];
  const clarificationChecks = checks.filter((check) => String(check?.severity || "").trim().toLowerCase() === "next");
  const gapChecks = checks.filter((check) => String(check?.severity || "").trim().toLowerCase() !== "next");

  if (!preflight) {
    return {
      level: "unknown",
      status: "待检查",
      hint: "先创建项目，系统才能判断这个写作项目还缺什么。"
    };
  }

  const status = String(preflight?.status || "").trim().toLowerCase();
  if (status === "ready") {
    return {
      level: "ready",
      status: "项目条件已齐",
      hint: "项目目标、材料和主题入口已经基本齐备，可以继续生成骨架。"
    };
  }
  if (status === "needs_clarification") {
    const first = clarificationChecks[0] || checks[0] || null;
    return {
      level: "needs_clarification",
      status: "先澄清关键缺口",
      hint: first?.message || "先补齐项目的关键问题，再继续生成骨架。"
    };
  }
  const firstGap = gapChecks[0] || checks[0] || null;
  return {
    level: "has_gaps",
    status: "仍有项目缺口",
    hint: firstGap?.message || `当前项目还有 ${checks.length} 项建议先补齐。`
  };
}

export function isWritingStrongModelReady({ readinessLevel = "", projectPreflightLevel = "" } = {}) {
  return String(readinessLevel || "").trim() === "strong_model_ready" && String(projectPreflightLevel || "").trim() === "ready";
}
