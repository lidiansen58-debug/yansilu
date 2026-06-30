function cleanText(value) {
  return String(value || "").trim();
}

function stringItems(value) {
  return (Array.isArray(value) ? value : []).map((item) => cleanText(item)).filter(Boolean);
}

function check(code, field, message, severity = "hint") {
  return {
    code,
    field,
    message,
    severity,
    blocking: false
  };
}

function normalizedLine(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, " ");
}

function duplicateSummaryLines(lines = []) {
  const seen = new Set();
  for (const line of lines.map(normalizedLine).filter(Boolean)) {
    if (seen.has(line)) return true;
    seen.add(line);
  }
  return false;
}

export function analyzePermanentNoteDistillation(note = {}) {
  const title = cleanText(note.title);
  const thesis = cleanText(note.thesis);
  const threeLineSummary = stringItems(note.threeLineSummary || note.three_line_summary);
  const checks = [];

  if (!thesis) {
    checks.push(check("missing_thesis", "thesis", "Write one sentence that states the note's judgment.", "next"));
  } else {
    if (thesis.length < 8) {
      checks.push(check("thesis_too_short", "thesis", "Make the thesis specific enough to carry a reusable judgment."));
    }
    if (thesis.length > 160) {
      checks.push(check("thesis_too_long", "thesis", "Compress the thesis so it can work as a one-sentence claim."));
    }
    if (title && normalizedLine(title) === normalizedLine(thesis)) {
      checks.push(check("thesis_matches_title", "thesis", "Turn the title into an actual claim, not just a label."));
    }
  }

  if (threeLineSummary.length !== 3) {
    checks.push(check("three_line_summary_count", "three_line_summary", "Keep the compression to exactly three non-empty lines.", "next"));
  } else if (duplicateSummaryLines(threeLineSummary)) {
    checks.push(check("three_line_summary_repeated", "three_line_summary", "Use the three lines for distinct claim, reason, and use."));
  }

  return checks;
}

export function analyzeIndexCardDistillation(indexCard = {}) {
  const centralQuestion = cleanText(indexCard.centralQuestion || indexCard.central_question);
  const thesis = cleanText(indexCard.thesis);
  const threeLineSummary = stringItems(indexCard.threeLineSummary || indexCard.three_line_summary);
  const checks = [];

  if (!centralQuestion) {
    checks.push(check("missing_central_question", "central_question", "Write the question this topic is trying to answer.", "next"));
  } else if (centralQuestion.length < 10) {
    checks.push(check("central_question_too_short", "central_question", "Make the central question concrete enough to guide grouping."));
  }

  if (!thesis) {
    checks.push(check("missing_theme_thesis", "thesis", "Compress the topic into one reusable judgment.", "next"));
  }

  if (threeLineSummary.length !== 3) {
    checks.push(check("theme_three_line_summary_count", "three_line_summary", "Keep the topic summary to exactly three non-empty lines."));
  } else if (duplicateSummaryLines(threeLineSummary)) {
    checks.push(check("theme_three_line_summary_repeated", "three_line_summary", "Use each topic summary line for a different move."));
  }

  return checks;
}

export function analyzeWritingProjectReadiness(project = {}, options = {}) {
  const basketIds = stringItems(project.basketNoteIds || project.basket_note_ids);
  const intent = cleanText(project.intent);
  const desiredReaderTakeaway = cleanText(project.desiredReaderTakeaway || project.desired_reader_takeaway);
  const notes = Array.isArray(options.notes) ? options.notes : [];
  const indexCards = Array.isArray(options.indexCards) ? options.indexCards : [];
  const checks = [];

  if (!basketIds.length && !notes.length) {
    checks.push(check("missing_basket_notes", "basket_note_ids", "Add at least one permanent note before building a scaffold.", "next"));
  }
  if (!intent) {
    checks.push(check("missing_intent", "intent", "先说清这篇文章到底想表达什么。", "next"));
  }
  if (!desiredReaderTakeaway) {
    checks.push(
      check(
        "missing_desired_reader_takeaway",
        "desired_reader_takeaway",
        "写下读者最后应该带走的判断。"
      )
    );
  }

  const notesWithoutThesis = notes.filter((note) => !cleanText(note.thesis));
  if (notesWithoutThesis.length) {
    checks.push(
      check(
        "basket_notes_missing_thesis",
        "basket_note_ids",
        `${notesWithoutThesis.length} 条相关笔记还需要补一句话判断。`
      )
    );
  }

  const notesWithoutSummary = notes.filter((note) => stringItems(note.threeLineSummary || note.three_line_summary).length !== 3);
  if (notesWithoutSummary.length) {
    checks.push(
      check(
        "basket_notes_missing_three_line_summary",
        "basket_note_ids",
        `${notesWithoutSummary.length} 条相关笔记还需要补齐三句话提纯。`
      )
    );
  }

  if (indexCards.length && !indexCards.some((item) => cleanText(item.centralQuestion || item.central_question))) {
    checks.push(check("missing_central_question", "related_index_ids", "补一张带中心问题的主题卡，或改用已经写出中心问题的主题。"));
  }

  return {
    status: checks.some((item) => item.severity === "next") ? "needs_clarification" : checks.length ? "has_gaps" : "ready",
    checks
  };
}
