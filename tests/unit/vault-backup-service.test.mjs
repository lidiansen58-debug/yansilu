import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import zlib from "node:zlib";
import {
  createDirectory,
  createEncryptedVaultBackup,
  createNoteInDirectory,
  createNoteRelation,
  getNoteById,
  initVault,
  listDirectories,
  listNoteRelations,
  readEncryptedVaultBackupManifest,
  restoreEncryptedVaultBackup,
} from "../../packages/domain/src/index.mjs";

const gzip = promisify(zlib.gzip);

async function sqliteAvailable() {
  try {
    await import("node:sqlite");
    return true;
  } catch {
    return false;
  }
}

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeEncryptedBackupFixture({ backupPath, password, payloadText }) {
  const scryptParams = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, scryptParams, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
  const manifest = {
    format: "yansilu.encrypted-vault-backup",
    formatVersion: 1,
    appVersion: "0.1.1-test",
    createdAt: new Date().toISOString(),
    vaultName: "malformed",
    encryption: {
      algorithm: "AES-256-GCM",
      kdf: "scrypt",
      kdfParams: {
        N: scryptParams.N,
        r: scryptParams.r,
        p: scryptParams.p,
        keyLength: 32,
        salt: salt.toString("base64")
      },
      iv: iv.toString("base64"),
      authTag: ""
    },
    payload: {
      compression: "gzip",
      encoding: "yansilu-stream-archive-v1"
    }
  };
  const aad = JSON.stringify({
    ...manifest,
    encryption: {
      ...manifest.encryption,
      authTag: undefined
    }
  });
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const encryptedPayload = Buffer.concat([
    cipher.update(await gzip(Buffer.from(payloadText, "utf8"))),
    cipher.final()
  ]);
  manifest.encryption.authTag = cipher.getAuthTag().toString("base64");
  const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(manifestBuffer.length, 0);
  await fs.writeFile(backupPath, Buffer.concat([
    Buffer.from("YANSILUBK1\n", "utf8"),
    length,
    manifestBuffer,
    encryptedPayload
  ]));
}

async function withTimeout(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function seedVault(vaultPath) {
  await initVault(vaultPath);
  const customDir = await createDirectory(vaultPath, {
    id: "dir_backup_custom",
    title: "Backup custom",
    directoryType: "custom",
    parentDirectoryId: "dir_original_default",
    fsPath: path.join(vaultPath, "notes", "original", "backup-custom")
  });
  const first = await createNoteInDirectory(vaultPath, {
    id: "backup_note_alpha",
    directoryId: customDir.id,
    noteType: "permanent",
    title: "Backup alpha",
    body: "# Backup alpha\n\nUnique plaintext secret: AlphaVaultBackupNeedle"
  });
  const second = await createNoteInDirectory(vaultPath, {
    id: "backup_note_beta",
    directoryId: "dir_original_default",
    noteType: "permanent",
    title: "Backup beta",
    body: "# Backup beta\n\nTarget note body"
  });
  const relation = await createNoteRelation(vaultPath, "backup_note_alpha", {
    toNoteId: "backup_note_beta",
    relationType: "supports",
    rationale: "Backup restore keeps note relations readable.",
    status: "confirmed"
  });
  return { customDir, first, second, relation };
}

test("encrypted vault backup manifest and restore close the migration loop", async (t) => {
  if (!(await sqliteAvailable())) t.skip("node:sqlite is not available in current runtime");
  const sourceVault = await makeTempDir("yansilu-backup-source-");
  const outputDir = await makeTempDir("yansilu-backup-output-");
  const restoreParent = await makeTempDir("yansilu-backup-restore-parent-");
  t.after(() => fs.rm(sourceVault, { recursive: true, force: true }));
  t.after(() => fs.rm(outputDir, { recursive: true, force: true }));
  t.after(() => fs.rm(restoreParent, { recursive: true, force: true }));

  await seedVault(sourceVault);
  const backup = await createEncryptedVaultBackup({
    vaultPath: sourceVault,
    targetDirectory: outputDir,
    password: "correct horse battery staple",
    appVersion: "0.1.1-test"
  });

  assert.match(path.basename(backup.backupPath), /^yansilu-backup-\d{8}-\d{6}\.yansilu-backup$/);
  assert.equal(backup.manifest.format, "yansilu.encrypted-vault-backup");
  assert.equal(backup.manifest.formatVersion, 1);
  assert.equal(backup.manifest.appVersion, "0.1.1-test");
  assert.equal(backup.manifest.vaultName, path.basename(sourceVault));
  assert.equal(backup.manifest.encryption.algorithm, "AES-256-GCM");
  assert.equal(backup.manifest.encryption.kdf, "scrypt");
  assert.ok(backup.manifest.encryption.kdfParams.salt);
  assert.ok(!JSON.stringify(backup.manifest).includes("correct horse"));

  const backupBytes = await fs.readFile(backup.backupPath);
  assert.equal(backupBytes.includes(Buffer.from("AlphaVaultBackupNeedle", "utf8")), false);
  assert.equal(backupBytes.includes(Buffer.from("Backup restore keeps note relations readable", "utf8")), false);

  const wrongTarget = path.join(restoreParent, "wrong-password-vault");
  await assert.rejects(
    () => restoreEncryptedVaultBackup({
      backupPath: backup.backupPath,
      targetVaultPath: wrongTarget,
      password: "wrong password"
    }),
    { code: "VAULT_BACKUP_PASSWORD_OR_FILE_INVALID" }
  );
  await assert.rejects(() => fs.access(wrongTarget));

  const restoredVault = path.join(restoreParent, "restored-vault");
  const restore = await restoreEncryptedVaultBackup({
    backupPath: backup.backupPath,
    targetVaultPath: restoredVault,
    password: "correct horse battery staple"
  });
  assert.equal(path.resolve(restore.vaultPath), path.resolve(restoredVault));

  const directories = await listDirectories(restoredVault, { includeHidden: true });
  const customDir = directories.find((item) => item.id === "dir_backup_custom");
  assert.equal(path.resolve(customDir.fsPath), path.join(path.resolve(restoredVault), "notes", "original", "backup-custom"));

  const note = await getNoteById(restoredVault, "backup_note_alpha");
  assert.equal(note.title, "Backup alpha");
  assert.match(note.body, /AlphaVaultBackupNeedle/);
  const relations = await listNoteRelations(restoredVault, "backup_note_alpha");
  assert.equal(relations.outgoingLinks.length, 1);
  assert.equal(relations.outgoingLinks[0].toNoteId, "backup_note_beta");
  assert.equal(relations.outgoingLinks[0].target.title, "Backup beta");
});

test("encrypted vault backup reports damaged manifest as a readable backup error", async (t) => {
  const tempDir = await makeTempDir("yansilu-backup-damaged-");
  t.after(() => fs.rm(tempDir, { recursive: true, force: true }));

  const backupPath = path.join(tempDir, "broken.yansilu-backup");
  const magic = Buffer.from("YANSILUBK1\n", "utf8");
  const manifest = Buffer.from("{not-json", "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(manifest.length, 0);
  await fs.writeFile(backupPath, Buffer.concat([magic, length, manifest, Buffer.from("payload", "utf8")]));

  await assert.rejects(() => readEncryptedVaultBackupManifest(backupPath), {
    code: "VAULT_BACKUP_FILE_DAMAGED"
  });
});

test("encrypted vault backup requires an explicit save location", async (t) => {
  if (!(await sqliteAvailable())) t.skip("node:sqlite is not available in current runtime");
  const sourceVault = await makeTempDir("yansilu-backup-no-target-");
  t.after(() => fs.rm(sourceVault, { recursive: true, force: true }));

  await initVault(sourceVault);
  await assert.rejects(
    () => createEncryptedVaultBackup({
      vaultPath: sourceVault,
      password: "correct horse battery staple"
    }),
    { code: "VAULT_BACKUP_TARGET_REQUIRED" }
  );
  const entries = await fs.readdir(path.join(sourceVault, "exports")).catch(() => []);
  assert.equal(entries.some((name) => String(name).endsWith(".yansilu-backup")), false);
});

test("encrypted vault backup rejects save locations inside the current vault", async (t) => {
  if (!(await sqliteAvailable())) t.skip("node:sqlite is not available in current runtime");
  const sourceVault = await makeTempDir("yansilu-backup-inside-target-");
  t.after(() => fs.rm(sourceVault, { recursive: true, force: true }));

  await initVault(sourceVault);
  await assert.rejects(
    () => createEncryptedVaultBackup({
      vaultPath: sourceVault,
      targetDirectory: sourceVault,
      password: "correct horse battery staple"
    }),
    { code: "VAULT_BACKUP_TARGET_INSIDE_VAULT" }
  );
  await assert.rejects(
    () => createEncryptedVaultBackup({
      vaultPath: sourceVault,
      targetPath: path.join(sourceVault, "nested", "backup.yansilu-backup"),
      password: "correct horse battery staple"
    }),
    { code: "VAULT_BACKUP_TARGET_INSIDE_VAULT" }
  );
});

test("encrypted vault backup cleans temporary output when final write fails", async (t) => {
  if (!(await sqliteAvailable())) t.skip("node:sqlite is not available in current runtime");
  const sourceVault = await makeTempDir("yansilu-backup-atomic-source-");
  const outputDir = await makeTempDir("yansilu-backup-atomic-output-");
  t.after(() => fs.rm(sourceVault, { recursive: true, force: true }));
  t.after(() => fs.rm(outputDir, { recursive: true, force: true }));

  await initVault(sourceVault);
  const targetPath = path.join(outputDir, "blocked.yansilu-backup");
  await fs.mkdir(targetPath);

  await assert.rejects(
    () => createEncryptedVaultBackup({
      vaultPath: sourceVault,
      targetPath,
      password: "correct horse battery staple"
    })
  );

  const entries = await fs.readdir(outputDir);
  assert.deepEqual(entries, ["blocked.yansilu-backup"]);
  assert.equal(entries.some((name) => String(name).endsWith(".tmp")), false);
});

test("encrypted vault restore reports missing backup paths as readable errors", async (t) => {
  const restoreParent = await makeTempDir("yansilu-backup-missing-file-");
  t.after(() => fs.rm(restoreParent, { recursive: true, force: true }));

  await assert.rejects(
    () => restoreEncryptedVaultBackup({
      backupPath: "",
      targetVaultPath: path.join(restoreParent, "blank-path-target"),
      password: "correct horse battery staple"
    }),
    { code: "VAULT_BACKUP_FILE_REQUIRED" }
  );
  await assert.rejects(() => fs.access(path.join(restoreParent, "blank-path-target")));

  await assert.rejects(
    () => restoreEncryptedVaultBackup({
      backupPath: path.join(restoreParent, "missing.yansilu-backup"),
      targetVaultPath: path.join(restoreParent, "missing-file-target"),
      password: "correct horse battery staple"
    }),
    { code: "VAULT_BACKUP_FILE_NOT_FOUND" }
  );
  await assert.rejects(() => fs.access(path.join(restoreParent, "missing-file-target")));
});

test("encrypted vault restore tears down streams when archive parsing fails", async (t) => {
  const tempDir = await makeTempDir("yansilu-backup-malformed-stream-");
  t.after(() => fs.rm(tempDir, { recursive: true, force: true }));

  const backupPath = path.join(tempDir, "malformed.yansilu-backup");
  const targetVaultPath = path.join(tempDir, "restored-malformed");
  await writeEncryptedBackupFixture({
    backupPath,
    password: "correct horse battery staple",
    payloadText: "not-json\n"
  });

  await assert.rejects(
    () => withTimeout(
      restoreEncryptedVaultBackup({
        backupPath,
        targetVaultPath,
        password: "correct horse battery staple"
      }),
      2000,
      "restore timed out after archive parser failure"
    ),
    { code: "VAULT_BACKUP_FILE_DAMAGED" }
  );
  await assert.rejects(() => fs.access(targetVaultPath));
});

test("encrypted vault restore rejects trailing archive data after end marker", async (t) => {
  const tempDir = await makeTempDir("yansilu-backup-trailing-stream-");
  t.after(() => fs.rm(tempDir, { recursive: true, force: true }));

  const backupPath = path.join(tempDir, "trailing.yansilu-backup");
  const targetVaultPath = path.join(tempDir, "restored-trailing");
  await writeEncryptedBackupFixture({
    backupPath,
    password: "correct horse battery staple",
    payloadText: [
      JSON.stringify({
        type: "snapshot",
        format: "yansilu-vault-snapshot",
        formatVersion: 1,
        createdAt: new Date().toISOString()
      }),
      JSON.stringify({ type: "end" }),
      "extra-data"
    ].join("\n")
  });

  await assert.rejects(
    () => restoreEncryptedVaultBackup({
      backupPath,
      targetVaultPath,
      password: "correct horse battery staple"
    }),
    { code: "VAULT_BACKUP_FILE_DAMAGED" }
  );
  await assert.rejects(() => fs.access(targetVaultPath));
});

test("encrypted vault backup honors an explicit snapshot size guard", async (t) => {
  if (!(await sqliteAvailable())) t.skip("node:sqlite is not available in current runtime");
  const sourceVault = await makeTempDir("yansilu-backup-large-source-");
  const outputDir = await makeTempDir("yansilu-backup-large-output-");
  t.after(() => fs.rm(sourceVault, { recursive: true, force: true }));
  t.after(() => fs.rm(outputDir, { recursive: true, force: true }));

  await initVault(sourceVault);
  await fs.mkdir(path.join(sourceVault, "attachments"), { recursive: true });
  await fs.writeFile(path.join(sourceVault, "attachments", "large.bin"), Buffer.alloc(32));

  await assert.rejects(
    () => createEncryptedVaultBackup({
      vaultPath: sourceVault,
      targetDirectory: outputDir,
      password: "correct horse battery staple",
      maxSnapshotBytes: 16
    }),
    { code: "VAULT_BACKUP_TOO_LARGE" }
  );

  const written = await fs.readdir(outputDir);
  assert.deepEqual(written, []);
});
