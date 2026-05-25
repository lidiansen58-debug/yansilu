import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing project status card stays visually continuity-aware before reopening an existing project", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const canContinueProjectedProjectStatus = !hasProject && Boolean\(projectEntry\?\.projectId\) && Boolean\(projectEntry\?\.actionLabel\);/);
  assert.match(source, /const projectStatus = hasProject/);
  assert.match(source, /const projectTone =/);
  assert.match(source, /hasProject \|\| canContinueProjectedProjectStatus \|\| readiness\.level === "project_ready" \|\| readiness\.level === "strong_model_ready"/);
  assert.match(source, /renderWritingStatusCard\("项目", projectStatus, projectNote, projectTone\)/);
});
