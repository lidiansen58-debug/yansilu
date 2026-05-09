import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 5000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error("API did not become healthy");
}

async function getJson(baseUrl, pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  const payload = await response.json();
  return { response, payload };
}

async function postJson(baseUrl, pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  return { response, payload };
}

function startApi(port, vaultPath) {
  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  return child;
}

async function stopApi(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
}

test("paper workspace API stores NotebookLM drafts and user translations", async () => {
  const vaultPath = await makeTempDir("yansilu-api-paper-workspace-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const api = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const created = await postJson(baseUrl, "/api/v1/papers", {
      paperId: "paper_api_workflow",
      sourceId: "src_api_paper",
      title: "NotebookLM Paper Workflow"
    });

    assert.equal(created.response.status, 201);
    assert.equal(created.payload.item.paperId, "paper_api_workflow");
    assert.equal(created.payload.item.stage, "candidates");

    const draft = await postJson(baseUrl, "/api/v1/papers/paper_api_workflow/notebooklm-drafts", {
      draftId: "nbd_api",
      notebookName: "Paper Notebook",
      summary: "Claim: retrieval practice improves delayed recall.\n\nLimitation: the sample is small.",
      qa: [
        {
          id: "qa_1",
          question: "What method was used?",
          answer: "Method: compare retrieval and rereading groups."
        }
      ]
    });

    assert.equal(draft.response.status, 201);
    assert.equal(draft.payload.candidates.length, 3);
    assert.equal(draft.payload.item.permanentCandidates.length, 0);
    assert.deepEqual(draft.payload.item.candidates.map((item) => item.notebookInputType), ["summary", "summary", "qa"]);

    const missingParaphrase = await postJson(baseUrl, "/api/v1/papers/paper_api_workflow/translations", {
      candidateId: draft.payload.candidates[0].id,
      paraphraseText: ""
    });

    assert.equal(missingParaphrase.response.status, 400);
    assert.equal(missingParaphrase.payload.error.code, "PAPER_TRANSLATION_PARAPHRASE_REQUIRED");

    const translated = await postJson(baseUrl, "/api/v1/papers/paper_api_workflow/translations", {
      candidateId: draft.payload.candidates[0].id,
      paraphraseText: "My takeaway is that recall effort may improve later access to the idea.",
      relationToQuestion: "Supports the reading-to-original-note workflow.",
      boundaryOrCondition: "The result may depend on the study task."
    });

    assert.equal(translated.response.status, 201);
    assert.equal(translated.payload.translation.status, "ready");
    assert.equal(translated.payload.candidate.status, "translated");
    assert.equal(translated.payload.item.stage, "translations");

    const permanentCandidate = await postJson(baseUrl, "/api/v1/papers/paper_api_workflow/permanent-candidates", {
      candidateId: draft.payload.candidates[0].id
    });

    assert.equal(permanentCandidate.response.status, 201);
    assert.match(permanentCandidate.payload.permanentCandidate.id, /^pn_/);
    assert.equal(permanentCandidate.payload.permanentCandidate.authorship.user_confirmed, false);
    assert.equal(permanentCandidate.payload.permanentCandidate.originality_status, "warning");
    assert.equal(permanentCandidate.payload.evaluation.status, "warning");
    assert.ok(permanentCandidate.payload.evaluation.reasons.includes("citation_locator_missing"));
    assert.equal(permanentCandidate.payload.item.stage, "permanent_candidates");
    assert.equal(permanentCandidate.payload.item.permanentCandidates.length, 1);
    await assert.rejects(
      fs.access(path.join(vaultPath, "notes", "permanent", `${permanentCandidate.payload.permanentCandidate.id}.md`))
    );

    const missingAuthorship = await postJson(baseUrl, "/api/v1/papers/paper_api_workflow/permanent-notes", {
      permanentCandidateId: permanentCandidate.payload.permanentCandidate.id
    });

    assert.equal(missingAuthorship.response.status, 400);
    assert.equal(missingAuthorship.payload.error.code, "PAPER_PERMANENT_NOTE_AUTHORSHIP_REQUIRED");

    const savedPermanent = await postJson(baseUrl, "/api/v1/papers/paper_api_workflow/permanent-notes", {
      permanentCandidateId: permanentCandidate.payload.permanentCandidate.id,
      confirmAuthorship: true,
      status: "active"
    });

    assert.equal(savedPermanent.response.status, 201);
    assert.equal(savedPermanent.payload.permanentNote.id, permanentCandidate.payload.permanentCandidate.id);
    assert.equal(savedPermanent.payload.permanentNote.authorship.user_confirmed, true);
    assert.equal(savedPermanent.payload.permanentNote.status, "draft");
    assert.equal(savedPermanent.payload.item.stage, "saved");
    assert.equal(savedPermanent.payload.item.candidates[0].status, "saved");
    assert.equal(savedPermanent.payload.writeResult.path, `notes/permanent/${permanentCandidate.payload.permanentCandidate.id}.md`);

    const permanentMarkdown = await fs.readFile(
      path.join(vaultPath, "notes", "permanent", `${permanentCandidate.payload.permanentCandidate.id}.md`),
      "utf8"
    );
    assert.match(permanentMarkdown, /authorship: \{"user_confirmed":true,"ai_assisted":false\}/);
    assert.match(permanentMarkdown, /originality_status: warning/);

    const originalNotes = await getJson(baseUrl, "/api/v1/directories/dir_original_default/notes");
    assert.equal(originalNotes.response.status, 200);
    assert.equal(originalNotes.payload.total, 1);
    assert.equal(originalNotes.payload.items[0].id, permanentCandidate.payload.permanentCandidate.id);

    const restored = await getJson(baseUrl, "/api/v1/papers/paper_api_workflow");
    assert.equal(restored.response.status, 200);
    assert.equal(restored.payload.item.translations.length, 1);
    assert.equal(restored.payload.item.candidates[0].status, "saved");
    assert.equal(restored.payload.item.permanentCandidates.length, 1);

    const filePath = path.join(vaultPath, "papers", "paper_api_workflow", "workspace.json");
    const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
    assert.equal(raw.translations[0].paraphraseText, "My takeaway is that recall effort may improve later access to the idea.");
    assert.equal(raw.permanentCandidates[0].id, permanentCandidate.payload.permanentCandidate.id);
    assert.equal(raw.permanentCandidates[0].savedPermanentNoteId, permanentCandidate.payload.permanentCandidate.id);
  } finally {
    await stopApi(api);
  }
});
