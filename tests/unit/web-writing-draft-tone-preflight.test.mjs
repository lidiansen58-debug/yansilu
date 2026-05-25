import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing draft status card becomes warning-toned when project preflight blocks draft saving", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const draftTone =[\s\S]*hasProject && hasScaffold && projectPreflightSummary\.level !== "ready"[\s\S]*"warn"/);
  assert.match(source, /renderWritingStatusCard\("草稿", draftStatus, draftNote, draftTone\)/);
});
