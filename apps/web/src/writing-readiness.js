import { parseLinks, parseTags } from "./prototype-store.js";

export function noteHasBoundarySignal(note = {}) {
  if (String(note?.boundaryOrCounterpoint || note?.boundary_or_counterpoint || "").trim()) return true;
  const body = String(note?.body || note?.markdown || "");
  return /边界|反例|不成立|适用条件|反方|counterpoint|boundary|counterexample/i.test(body);
}

export function deriveNoteWritingReadiness(note = {}, overview = {}) {
  const authorshipConfirmed = Boolean(note?.authorship?.user_confirmed);
  const noteStatus = String(note?.status || "").trim().toLowerCase();
  const confirmed = String(note?.distillationStatus || "").trim().toLowerCase() === "confirmed";
  const relationState = String(overview.relationState || "loaded").trim();
  const explicitRelationCount = Number(overview.explicitRelationCount || 0);
  const wikilinkCount = Number(overview.wikilinkCount || 0);
  const themeSignalCount = Number(overview.themeSignalCount || 0);
  const hasBoundary = noteHasBoundarySignal(note);

  if (!authorshipConfirmed) {
    return {
      level: "blocked_authorship",
      status: "先完成作者确认",
      hint: "写作篮只接收已经完成作者确认的永久笔记。",
      actionLabel: "查看写作要求"
    };
  }
  if (noteStatus !== "active") {
    return {
      level: "blocked_draft",
      status: "先完成原创确认",
      hint: "当前仍是 draft，先完成原创性检查后再进入写作。",
      actionLabel: "查看写作要求"
    };
  }
  if (!confirmed) {
    return {
      level: "needs_distillation",
      status: "先确认观点",
      hint: "至少先确认 thesis 和三句话压缩，再决定是否进入写作。",
      actionLabel: "先完成提纯"
    };
  }
  if (!hasBoundary) {
    return {
      level: "basket_ready",
      status: "可加入写作篮",
      hint: "已经能进入写作篮，但先补边界或反例，后面建项目会更稳。",
      actionLabel: "加入写作篮"
    };
  }
  if (relationState === "loading") {
    return {
      level: "basket_ready",
      status: "可加入写作篮",
      hint: "边界已经具备；等关系读取完成后，再判断是否直接建项目。",
      actionLabel: "加入写作篮"
    };
  }
  if (relationState === "error") {
    return {
      level: "basket_ready",
      status: "可加入写作篮",
      hint: "当前可先进入写作篮，但最好补一条清楚的关系后再建项目。",
      actionLabel: "加入写作篮"
    };
  }
  if (explicitRelationCount === 0) {
    return {
      level: "basket_ready",
      status: "可加入写作篮",
      hint: wikilinkCount > 0 ? "已经有基础链接，但还要补成显式关系，才适合进入写作项目。" : "判断和边界已经具备，但最好补一条关系再建项目。",
      actionLabel: "加入写作篮"
    };
  }
  if (themeSignalCount < 2) {
    return {
      level: "project_ready",
      status: "可创建写作项目",
      hint: "判断、边界和关系已具备，可以先建项目；补更多主题线索后再做强模型分析。",
      actionLabel: "创建项目"
    };
  }
  return {
    level: "strong_model_ready",
    status: "可进行强模型分析",
    hint: "判断、边界、关系和主题线索都较完整，可以继续做项目和强模型分析。",
    actionLabel: "强模型分析"
  };
}

export function deriveBasketWritingReadiness(noteIds = [], noteLookup, relationCounts = {}) {
  const uniqueIds = [...new Set((noteIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const notes = uniqueIds.map((id) => noteLookup(id)).filter(Boolean);

  if (!notes.length) {
    return {
      level: "needs_basket",
      status: "先加入写作篮",
      hint: "至少加入 1 条永久笔记，最好 2-5 条再进入写作项目。",
      actionLabel: "加入写作篮"
    };
  }

  const blockedAuthorship = notes.filter((note) => !note?.authorship?.user_confirmed);
  if (blockedAuthorship.length) {
    return {
      level: "blocked_authorship",
      status: "先完成作者确认",
      hint: `${blockedAuthorship.length} 条笔记还没完成作者确认。`,
      actionLabel: "查看写作要求"
    };
  }

  const draftNotes = notes.filter((note) => String(note?.status || "").trim().toLowerCase() !== "active");
  if (draftNotes.length) {
    return {
      level: "blocked_draft",
      status: "先完成原创确认",
      hint: `${draftNotes.length} 条笔记仍是 draft。`,
      actionLabel: "查看写作要求"
    };
  }

  const unconfirmed = notes.filter((note) => String(note?.distillationStatus || "").trim().toLowerCase() !== "confirmed");
  if (unconfirmed.length) {
    return {
      level: "needs_distillation",
      status: "先确认观点",
      hint: `${unconfirmed.length} 条笔记还没完成 confirmed distillation。`,
      actionLabel: "先完成提纯"
    };
  }

  const boundaryMissing = notes.filter((note) => !noteHasBoundarySignal(note));
  const totalRelationCount = uniqueIds.reduce((sum, id) => sum + Number(relationCounts[id] || 0), 0);
  const totalThemeSignals = uniqueIds.reduce((sum, id) => {
    const note = noteLookup(id);
    const body = String(note?.body || "");
    return sum + parseLinks(body).length + parseTags(body).length;
  }, 0);

  if (boundaryMissing.length || totalRelationCount === 0) {
    return {
      level: "basket_ready",
      status: "可加入写作篮",
      hint: boundaryMissing.length
        ? `${boundaryMissing.length} 条笔记还缺边界或反例。`
        : "当前篮子还缺显式关系，建议补一条关系再建项目。",
      actionLabel: "加入写作篮"
    };
  }

  if (uniqueIds.length < 2 || totalThemeSignals < 2) {
    return {
      level: "project_ready",
      status: "可创建写作项目",
      hint: "当前材料足够先建项目，但主题线索还不算丰富，先别急着做强模型分析。",
      actionLabel: "创建项目"
    };
  }

  return {
    level: "strong_model_ready",
    status: "可进行强模型分析",
    hint: "篮子、关系和主题线索都较完整，可以继续做项目和强模型分析。",
    actionLabel: "强模型分析"
  };
}

export function describeProjectPreflight(preflight = null) {
  const warningCount = Number(preflight?.warningCount || 0);
  if (!preflight) {
    return {
      level: "unknown",
      status: "待检查",
      hint: "先创建项目或生成骨架，才能看到更具体的写作预检结果。"
    };
  }
  if (String(preflight.status || "").trim() === "ready") {
    return {
      level: "ready",
      status: "结构准备较完整",
      hint: "当前项目的写作预检已基本通过，可以继续生成骨架或做更强分析。"
    };
  }
  return {
    level: "needs_attention",
    status: "仍有预检提醒",
    hint: `当前项目还有 ${warningCount} 项需要注意，先补齐再继续推进会更稳。`
  };
}
