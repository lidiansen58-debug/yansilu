const cases = {
  evidence_gap: {
    heading: "检查效果",
    faulty: "采用逐项核对流程后，所有团队的交付缺陷都会减少 80%。",
    clean: "当前不宣称缺陷减少比例。先按同一口径采集基线及试行期间的缺陷数据，待两组数据具备后再计算变化。",
    source: "记录中没有流程实施前后的缺陷统计。",
    allowedKinds: ["evidence_gap"]
  },
  transition: {
    heading: "下一次交付的安排",
    faulty: "本次检查没有发现缺陷，因此以后所有项目都不再需要质量检查。",
    clean: "本次检查没有发现缺陷；下一次交付仍按各自的验收标准核对，并单独记录结果。",
    source: "本次交付检查未发现缺陷。记录中没有其他项目的检查结果。",
    allowedKinds: ["transition", "evidence_gap"]
  },
  unclear: {
    heading: "落实责任",
    faulty: "让他们在那时处理它，把相关部分调整到合适程度。",
    clean: "由交付负责人在下次发布前修复检查记录中的未通过项，修复后由检查人再次逐项核对。",
    source: "检查记录中的未通过项需要负责人安排修复和复查。",
    allowedKinds: ["unclear"]
  }
};

export function buildStructuralFixture(kind, clean = false) {
  const selected = cases[kind];
  if (!selected) throw new Error(`Unknown structural fixture: ${kind}`);
  return {
    input: {
      privacyMode: "local_only",
      writingGoal: "写一篇团队交付质量检查的实用说明。请检查现有提纲中的明确问题。",
      notes: [{ noteId: "test_quality_record", title: "交付检查记录",
        body: `团队先列出本次交付的验收标准，再逐项核对结果并记录未通过项。${selected.source}` }],
      currentOutline: { title: "交付质量检查", openQuestions: [], sections: [
        { heading: "确定验收标准", purpose: "交付前列出本次的验收要求，把每项要求写成能逐项核对的结果。", sourceNoteIds: ["test_quality_record"] },
        { heading: "记录检查结果", purpose: "检查人按验收标准核对本次交付，分别记录通过项和未通过项。", sourceNoteIds: ["test_quality_record"] },
        { heading: selected.heading, purpose: clean ? selected.clean : selected.faulty, sourceNoteIds: ["test_quality_record"] }
      ] }
    },
    expected: { clean, sectionNumber: 3, allowedKinds: selected.allowedKinds }
  };
}

export function structuralFixtureChecksPassed(checks, expected) {
  if (!Array.isArray(checks)) return false;
  if (expected.clean) return checks.length === 0;
  return checks.length === 1 && expected.allowedKinds.includes(checks[0].kind) &&
    JSON.stringify(checks[0].sectionNumbers) === JSON.stringify([expected.sectionNumber]);
}
