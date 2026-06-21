import test from "node:test";
import assert from "node:assert/strict";

import { renderPermanentRelationWorkspace } from "../../apps/web/src/permanent-relation-workspace.js";
import {
  defaultPermanentRelationWorkspaceState,
  normalizePermanentRelationAiCandidates,
  normalizePermanentRelationWorkspaceState,
  permanentRelationWorkspaceCanSave,
  permanentRelationWorkspaceExistingLink,
  permanentRelationWorkspaceNextAiCandidate
} from "../../apps/web/src/permanent-relation-workspace-model.js";

const note = {
  id: "pn_source",
  title: "当前永久笔记",
  noteType: "permanent",
  folderId: "dir_a",
  thesis: "关系整理只处理笔记之间为什么要连接。"
};

const target = {
  id: "pn_target",
  title: "目标永久笔记",
  noteType: "permanent",
  folderId: "dir_a",
  thesis: "好的连接要写清关系类型和理由。"
};

const deps = {
  folderLabel: () => "永久笔记",
  typeFromFolder: () => "permanent"
};

test("permanent relation workspace renders a large relation-only flow", () => {
  const html = renderPermanentRelationWorkspace({
    note,
    notes: [note, target],
    aiCandidates: [
      {
        targetNoteId: target.id,
        targetTitle: target.title,
        relationType: "supports",
        rationaleDraft: "目标笔记支持当前笔记，因为它说明了连接理由的保存价值。"
      }
    ],
    state: {
      ...defaultPermanentRelationWorkspaceState(note.id),
      open: true,
      selectedTargetNoteId: target.id,
      relationType: "supports",
      rationale: "目标笔记支持当前笔记，因为它说明了连接理由的保存价值。"
    },
    deps
  });

  assert.match(html, /data-permanent-relation-workspace/);
  assert.match(html, /整理关系/);
  assert.match(html, /当前笔记/);
  assert.match(html, /目标笔记/);
  assert.match(html, /它们是什么关系/);
  assert.match(html, /为什么要关联/);
  assert.match(html, /保存关系/);
  assert.match(html, /AI 推荐/);
  assert.match(html, /手动搜索/);
  assert.doesNotMatch(html, /观点提纯/);
  assert.doesNotMatch(html, /写作准备/);
  assert.doesNotMatch(html, /进入草稿/);
  assert.doesNotMatch(html, /appears_in_draft/);
});

test("permanent relation workspace blocks duplicate relation saves", () => {
  const relations = {
    outgoingLinks: [
      {
        id: "rel_1",
        fromNoteId: note.id,
        toNoteId: target.id,
        relationType: "supports"
      }
    ],
    backlinks: []
  };
  const state = {
    ...defaultPermanentRelationWorkspaceState(note.id),
    open: true,
    selectedTargetNoteId: target.id,
    relationType: "supports",
    rationale: "这条理由已经够明确。"
  };

  assert.equal(permanentRelationWorkspaceExistingLink(relations, note.id, target.id)?.id, "rel_1");
  const validation = permanentRelationWorkspaceCanSave({ state, relations });
  assert.equal(validation.ok, false);
  assert.equal(validation.reason, "existing_relation");
});

test("permanent relation workspace ignores wikilink-only relations when checking duplicates", () => {
  const relations = {
    outgoingLinks: [
      {
        id: "wiki_1",
        fromNoteId: note.id,
        toNoteId: target.id,
        relationType: "associated_with",
        rationale: "markdown_wikilink"
      }
    ],
    backlinks: []
  };
  const state = {
    ...defaultPermanentRelationWorkspaceState(note.id),
    open: true,
    selectedTargetNoteId: target.id,
    relationType: "supports",
    rationale: "formal reason"
  };

  assert.equal(permanentRelationWorkspaceExistingLink(relations, note.id, target.id), null);
  const validation = permanentRelationWorkspaceCanSave({ state, relations });
  assert.equal(validation.ok, true);
});

test("permanent relation workspace counts only explicit saved relations", () => {
  const relations = {
    outgoingLinks: [
      {
        id: "wiki_1",
        fromNoteId: note.id,
        toNoteId: target.id,
        relationType: "associated_with",
        rationale: "markdown_wikilink"
      },
      {
        id: "archived_1",
        fromNoteId: note.id,
        toNoteId: "pn_archived",
        relationType: "supports",
        rationale: "archived relation",
        status: "archived"
      }
    ],
    backlinks: [
      {
        id: "rel_1",
        fromNoteId: "pn_backlink",
        toNoteId: note.id,
        relationType: "supports",
        rationale: "explicit relation"
      }
    ]
  };
  const html = renderPermanentRelationWorkspace({
    note,
    notes: [note, target],
    relations,
    state: {
      ...defaultPermanentRelationWorkspaceState(note.id),
      open: true
    },
    deps
  });

  assert.match(html, /permanent-relation-source-status[\s\S]*?>1 [^<]*<\/span>/);
  assert.doesNotMatch(html, /permanent-relation-source-status[\s\S]*?>3 [^<]*<\/span>/);
});

test("permanent relation workspace keeps non-writing relation types available", () => {
  const html = renderPermanentRelationWorkspace({
    note,
    notes: [note, target],
    state: {
      ...defaultPermanentRelationWorkspaceState(note.id),
      open: true,
      selectedTargetNoteId: target.id,
      relationType: "reframes",
      rationale: "formal reason"
    },
    deps
  });

  assert.match(html, /<option value="reframes" selected>/);
  assert.match(html, /<option value="restates"/);
  assert.doesNotMatch(html, /value="appears_in_draft"/);
});

test("permanent relation workspace keeps save reachable after target selection before rationale is typed", () => {
  const html = renderPermanentRelationWorkspace({
    note,
    notes: [note, target],
    state: {
      ...defaultPermanentRelationWorkspaceState(note.id),
      open: true,
      selectedTargetNoteId: target.id,
      relationType: "associated_with",
      rationale: ""
    },
    deps
  });

  assert.match(html, /<button class="mini-btn primary" type="submit" >保存关系<\/button>/);
});

test("AI relation candidates normalize target, type and rationale for the workspace", () => {
  const candidates = normalizePermanentRelationAiCandidates(
    {
      analysis: {
        relationCandidates: [
          {
            actionSourceNoteId: note.id,
            counterpartNoteId: target.id,
            counterpartTitle: target.title,
            relationType: "qualifies",
            rationaleDraft: "目标笔记限定当前笔记，因为它补充了适用条件。"
          },
          {
            actionSourceNoteId: note.id,
            counterpartNoteId: "pn_reject",
            aiDecision: "reject",
            relationType: "no_relation"
          },
          {
            actionSourceNoteId: note.id,
            counterpartNoteId: "pn_draft",
            relationType: "appears_in_draft"
          }
        ]
      }
    },
    note.id
  );

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].targetNoteId, target.id);
  assert.equal(candidates[0].targetTitle, target.title);
  assert.equal(candidates[0].relationType, "qualifies");
  assert.match(candidates[0].rationaleDraft, /适用条件/);
});

test("permanent relation workspace continues with the next unsaved AI candidate", () => {
  const candidates = [
    {
      targetNoteId: "pn_done",
      targetTitle: "Done",
      relationType: "supports",
      rationaleDraft: "already saved"
    },
    {
      targetNoteId: "pn_next",
      targetTitle: "Next",
      relationType: "qualifies",
      rationaleDraft: "next relation"
    }
  ];
  const relations = {
    outgoingLinks: [
      {
        fromNoteId: note.id,
        toNoteId: "pn_done",
        relationType: "supports",
        rationale: "already saved"
      }
    ],
    backlinks: []
  };

  const next = permanentRelationWorkspaceNextAiCandidate(candidates, relations, note.id);

  assert.equal(next.targetNoteId, "pn_next");
  assert.equal(next.relationType, "qualifies");
  assert.equal(permanentRelationWorkspaceNextAiCandidate(candidates, relations, note.id, ["pn_next"]), null);
});

test("workspace state normalization follows the currently rendered note", () => {
  const normalized = normalizePermanentRelationWorkspaceState({
    open: true,
    noteId: "old-note",
    selectedTargetNoteId: target.id,
    relationType: "supports",
    rationale: "because"
  }, "current-note");

  assert.equal(normalized.noteId, "current-note");
});
