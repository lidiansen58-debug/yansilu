import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("graph relation review cards keep reason repair inside the graph panel", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

  assert.match(
    source,
    /key: "strengthen"[\s\S]*actionLabel: "去补理由"/
  );
  assert.match(source, /data-graph-relation-adjustment="strengthen"/);
  assert.doesNotMatch(
    source,
    /data-graph-followup-action="relations-edit"[\s\S]*?>去补关系<\/span>/
  );
  assert.doesNotMatch(source, /data-graph-followup-action="relations-edit"/);
});
