import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  initVault, createNoteInDirectory, createNoteRelation, getNoteById,
  listNoteRelations, createEncryptedVaultBackup, restoreEncryptedVaultBackup
} from "../../packages/domain/src/index.mjs";
import {
  createWritingProject, bindDraftNoteToProject, getWritingProject, listProjectDraftVersions
} from "../../packages/writing-engine/src/writing-engine.mjs";
import { buildBookExport, exportBook } from "../../packages/export-engine/src/index.mjs";

const digest = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

test("encrypted recovery preserves a three-chapter book, article, evidence, relations and portable assets", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-r08-book-recovery-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const vaultPath = path.join(root, "source");
  await initVault(vaultPath);
  const evidence = await createNoteInDirectory(vaultPath, {
    directoryId: "dir_original_default", title: "Evidence", body: "# Evidence\n\nA saved judgment with limits."
  });
  const assetPath = "assets/images/evidence.png";
  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=", "base64");
  await fs.mkdir(path.join(vaultPath, "assets", "images"), { recursive: true });
  await fs.writeFile(path.join(vaultPath, assetPath), image);
  const chapters = [];
  for (let index = 1; index <= 3; index++) {
    chapters.push(await createNoteInDirectory(vaultPath, {
      directoryId: "dir_original_default", title: `Chapter ${index}`,
      body: `# Chapter ${index}\n\nR08-SAVED-CHAPTER-${index}\n\n[[Evidence]]\n\n![Evidence](../../assets/images/evidence.png)\n`
    }));
  }
  const relation = await createNoteRelation(vaultPath, chapters[0].id, {
    toNoteId: evidence.id, relationType: "supports", rationale: "The saved evidence supports this claim.", status: "confirmed"
  });
  const article = await createNoteInDirectory(vaultPath, {
    directoryId: "dir_original_default", title: "Separate article", body: "# Separate article\n\nR08-ARTICLE-ONLY"
  });
  let project = await createWritingProject(vaultPath, {
    title: "Recovery book", basketNoteIds: [evidence.id], bookStructure: { schema_version: 1, parts: [{
      id: "part", title: "Part", chapters: [chapters[2], chapters[0], chapters[1]].map(note => ({
        id: `chapter-${note.id}`, title: note.title, draft_note_id: note.id, evidence_note_ids: [evidence.id]
      }))
    }] }
  });
  project = await bindDraftNoteToProject(vaultPath, { writingProjectId: project.id, draftNoteId: article.id, versionNote: "Recovery checkpoint" });
  const input = { vaultPath, projectId: project.id, expectedBookStructure: project.book_structure };
  const beforeExport = await buildBookExport(input);
  const originals = new Map();
  for (const note of [evidence, article, ...chapters]) originals.set(note.id, digest(await fs.readFile(path.join(vaultPath, note.markdownPath))));
  const backup = await createEncryptedVaultBackup({ vaultPath, targetDirectory: path.join(root, "backups"), password: "r08-fixture-password", appVersion: "0.1.1-test" });
  const backupBytes = await fs.readFile(backup.backupPath);
  assert.equal(backupBytes.includes(Buffer.from("R08-SAVED-CHAPTER")), false);

  const wrongTarget = path.join(root, "wrong-password");
  await assert.rejects(restoreEncryptedVaultBackup({ backupPath: backup.backupPath, targetVaultPath: wrongTarget, password: "incorrect" }), { code: "VAULT_BACKUP_PASSWORD_OR_FILE_INVALID" });
  await assert.rejects(fs.access(wrongTarget), { code: "ENOENT" });
  const damaged = Buffer.from(backupBytes);
  damaged[damaged.length - 1] ^= 1;
  const damagedPath = path.join(root, "damaged.yansilu-backup");
  await fs.writeFile(damagedPath, damaged);
  const damagedTarget = path.join(root, "damaged-target");
  await assert.rejects(restoreEncryptedVaultBackup({ backupPath: damagedPath, targetVaultPath: damagedTarget, password: "r08-fixture-password" }), { code: "VAULT_BACKUP_PASSWORD_OR_FILE_INVALID" });
  await assert.rejects(fs.access(damagedTarget), { code: "ENOENT" });

  const restored = path.join(root, "restored");
  await restoreEncryptedVaultBackup({ backupPath: backup.backupPath, targetVaultPath: restored, password: "r08-fixture-password" });
  const restoredProject = await getWritingProject(restored, project.id);
  assert.deepEqual(restoredProject.book_structure, project.book_structure);
  assert.equal(restoredProject.draft_note_id, article.id);
  assert.deepEqual(restoredProject.basket_note_ids, [evidence.id]);
  const versions = await listProjectDraftVersions(restored, project.id);
  assert.equal(versions.length, 1);
  assert.equal(versions[0].draft_note_id, article.id);
  for (const note of [evidence, article, ...chapters]) {
    const read = await getNoteById(restored, note.id);
    assert.equal(read.body, note.body);
    assert.equal(digest(await fs.readFile(path.join(restored, read.markdownPath))), originals.get(note.id));
    assert.equal(digest(await fs.readFile(path.join(vaultPath, note.markdownPath))), originals.get(note.id));
  }
  const links = await listNoteRelations(restored, chapters[0].id);
  const originalLinks = await listNoteRelations(vaultPath, chapters[0].id);
  assert.deepEqual(links.outgoingLinks, originalLinks.outgoingLinks);
  assert.ok(relation.id);
  const restoredRelation = links.outgoingLinks.find(link => link.id === relation.id);
  assert.equal(restoredRelation?.toNoteId, evidence.id);
  assert.equal(restoredRelation?.rationale, "The saved evidence supports this claim.");
  assert.equal(digest(await fs.readFile(path.join(restored, assetPath))), digest(image));
  const restoredInput = { ...input, vaultPath: restored, expectedBookStructure: restoredProject.book_structure };
  assert.deepEqual(await buildBookExport(restoredInput), beforeExport);
  const result = await exportBook({ ...restoredInput, targetPath: path.join(root, "export") });
  const text = await fs.readFile(result.bookPath, "utf8");
  assert.equal(result.chapterCount, 3);
  assert.equal(result.assetCount, 1);
  assert.ok(text.indexOf("R08-SAVED-CHAPTER-3") < text.indexOf("R08-SAVED-CHAPTER-1"));
  assert.ok(text.indexOf("R08-SAVED-CHAPTER-1") < text.indexOf("R08-SAVED-CHAPTER-2"));
  assert.doesNotMatch(text, /R08-ARTICLE-ONLY/);
  assert.equal(digest(await fs.readFile(path.join(result.targetPath, assetPath))), digest(image));
});
