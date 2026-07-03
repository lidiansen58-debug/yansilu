import test from "node:test";
import assert from "node:assert/strict";

import {
  findReviewOutlineProjectWithRefresh,
  reviewOutlineProjectMatches
} from "../../apps/web/src/review-checklist-outline-entry.js";

test("review outline project lookup refreshes beyond the current writing cache", async () => {
  const calls = [];
  const writingState = {
    project: null,
    projects: [
      { id: "wp_recent", related_index_ids: ["idx_recent"], basket_note_ids: ["pn_recent"] }
    ]
  };
  const staleProject = {
    id: "wp_old_topic",
    related_index_ids: ["idx_topic"],
    basket_note_ids: ["pn_a", "pn_b", "pn_c"],
    scaffold_id: "ds_old_topic"
  };
  const unrelatedProject = {
    id: "wp_unrelated",
    related_index_ids: ["idx_other"],
    basket_note_ids: ["pn_x"]
  };

  const project = await findReviewOutlineProjectWithRefresh({
    indexCard: { id: "idx_topic", title: "Topic" },
    noteIds: ["pn_a", "pn_b", "pn_c"],
    writingState,
    listWritingProjects: async (options) => {
      calls.push(options);
      return options?.q === "Topic" ? [unrelatedProject, staleProject] : [];
    }
  });

  assert.equal(project, staleProject);
  assert.equal(project.scaffold_id, "ds_old_topic");
  assert.deepEqual(calls, [
    { limit: 50 },
    { limit: 50, q: "idx_topic" },
    { limit: 50, q: "Topic" }
  ]);
  assert.equal(writingState.projects.some((item) => item.id === "wp_old_topic"), true);
  assert.equal(writingState.projects.some((item) => item.id === "wp_unrelated"), false);
});

test("review outline project lookup reuses local project before refreshing", async () => {
  let refreshCount = 0;
  const localProject = {
    id: "wp_local",
    relatedIndexIds: ["idx_topic"],
    basketNoteIds: ["pn_a", "pn_b"]
  };

  const project = await findReviewOutlineProjectWithRefresh({
    indexCard: { id: "idx_topic", title: "Topic" },
    noteIds: ["pn_a", "pn_b"],
    writingState: { projects: [localProject] },
    listWritingProjects: async () => {
      refreshCount += 1;
      return [];
    }
  });

  assert.equal(project, localProject);
  assert.equal(refreshCount, 0);
});

test("review outline project matching accepts related theme or exact note basket", () => {
  assert.equal(
    reviewOutlineProjectMatches(
      { id: "wp_theme", related_index_ids: ["idx_topic"], basket_note_ids: ["pn_x"] },
      { themeId: "idx_topic", noteIds: ["pn_a", "pn_b"] }
    ),
    true
  );
  assert.equal(
    reviewOutlineProjectMatches(
      { id: "wp_notes", related_index_ids: [], basket_note_ids: ["pn_b", "pn_a"] },
      { themeId: "", noteIds: ["pn_a", "pn_b"] }
    ),
    true
  );
  assert.equal(
    reviewOutlineProjectMatches(
      { id: "wp_other", related_index_ids: ["idx_other"], basket_note_ids: ["pn_a"] },
      { themeId: "idx_topic", noteIds: ["pn_a", "pn_b"] }
    ),
    false
  );
});

test("review outline project lookup surfaces refresh failures instead of creating duplicates", async () => {
  await assert.rejects(
    findReviewOutlineProjectWithRefresh({
      indexCard: { id: "idx_topic", title: "Topic" },
      noteIds: ["pn_a", "pn_b"],
      writingState: { projects: [] },
      listWritingProjects: async () => {
        throw new Error("network failed");
      }
    }),
    /network failed/
  );
});
