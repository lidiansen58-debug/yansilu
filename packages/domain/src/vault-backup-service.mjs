import crypto from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import zlib from "node:zlib";
import { initVault } from "./vault.mjs";

export const VAULT_BACKUP_EXTENSION = ".yansilu-backup";
export const VAULT_BACKUP_FORMAT = "yansilu.encrypted-vault-backup";
export const VAULT_BACKUP_FORMAT_VERSION = 1;

const MAGIC = Buffer.from("YANSILUBK1\n", "utf8");
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 32;
const configuredMaxSnapshotBytes = Number(process.env.YANSILU_MAX_BACKUP_SNAPSHOT_BYTES || "");
export const DEFAULT_MAX_BACKUP_SNAPSHOT_BYTES = Number.isFinite(configuredMaxSnapshotBytes) && configuredMaxSnapshotBytes > 0
  ? configuredMaxSnapshotBytes
  : Number.POSITIVE_INFINITY;

function backupError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function timestampForFileName(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

export function defaultVaultBackupFileName(date = new Date()) {
  return `yansilu-backup-${timestampForFileName(date)}${VAULT_BACKUP_EXTENSION}`;
}

function assertPassword(password) {
  const clean = String(password || "");
  if (!clean) throw backupError("VAULT_BACKUP_PASSWORD_REQUIRED", "Backup password is required.");
  return clean;
}

function portablePath(value = "") {
  return String(value || "").replaceAll("\\", "/");
}

function assertRelativePackagePath(relativePath = "") {
  const normalized = path.posix.normalize(portablePath(relativePath));
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized === ".." || path.isAbsolute(normalized)) {
    throw backupError("VAULT_BACKUP_PACKAGE_PATH_INVALID", "Backup package contains an invalid path.");
  }
  return normalized;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function normalizeMaxSnapshotBytes(value = DEFAULT_MAX_BACKUP_SNAPSHOT_BYTES) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : DEFAULT_MAX_BACKUP_SNAPSHOT_BYTES;
}

function isInsidePath(parentPath, childPath) {
  const parent = path.resolve(parentPath);
  const child = path.resolve(childPath);
  const relative = path.relative(parent, child);
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertBackupOutputPath({ targetDirectory = "", targetPath = "" } = {}) {
  const cleanTargetPath = String(targetPath || "").trim();
  const cleanTargetDirectory = String(targetDirectory || "").trim();
  if (!cleanTargetPath && !cleanTargetDirectory) {
    throw backupError("VAULT_BACKUP_TARGET_REQUIRED", "Choose where to save the encrypted backup.");
  }
  return cleanTargetPath
    ? path.resolve(cleanTargetPath)
    : path.join(path.resolve(cleanTargetDirectory), defaultVaultBackupFileName());
}

function assertBackupOutputOutsideVault(outputPath, vaultPath) {
  if (isInsidePath(vaultPath, outputPath)) {
    throw backupError("VAULT_BACKUP_TARGET_INSIDE_VAULT", "Save the encrypted backup outside the current vault.");
  }
}

function assertBackupInputPath(backupPath = "") {
  const cleanBackupPath = String(backupPath || "").trim();
  if (!cleanBackupPath) {
    throw backupError("VAULT_BACKUP_FILE_REQUIRED", "Choose a backup file to restore.");
  }
  return path.resolve(cleanBackupPath);
}

async function collectVaultSnapshotEntries(snapshotPath, { maxBytes = DEFAULT_MAX_BACKUP_SNAPSHOT_BYTES } = {}) {
  const root = path.resolve(snapshotPath);
  const directories = [];
  const files = [];
  const stack = [root];
  const byteLimit = normalizeMaxSnapshotBytes(maxBytes);
  let totalBytes = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const relativePath = portablePath(path.relative(root, fullPath));
      if (!relativePath) continue;
      if (entry.isDirectory()) {
        directories.push(relativePath);
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = await fs.stat(fullPath);
      totalBytes += stat.size;
      if (totalBytes > byteLimit) {
        throw backupError("VAULT_BACKUP_TOO_LARGE", "The current vault is too large for this backup version.", {
          maxBytes: byteLimit,
          totalBytes
        });
      }
      files.push({
        path: relativePath,
        fullPath,
        size: stat.size,
        mtimeMs: Math.trunc(stat.mtimeMs)
      });
    }
  }

  directories.sort((a, b) => a.localeCompare(b));
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { directories, files, totalBytes };
}

async function* createSnapshotArchiveStream(entries, createdAt) {
  yield Buffer.from(JSON.stringify({
    type: "snapshot",
    format: "yansilu-vault-snapshot",
    formatVersion: 1,
    createdAt
  }) + "\n", "utf8");

  for (const directoryPath of entries.directories) {
    yield Buffer.from(JSON.stringify({ type: "directory", path: directoryPath }) + "\n", "utf8");
  }

  for (const file of entries.files) {
    yield Buffer.from(JSON.stringify({
      type: "file",
      path: file.path,
      size: file.size,
      mtimeMs: file.mtimeMs
    }) + "\n", "utf8");
    yield* createReadStream(file.fullPath);
    yield Buffer.from("\n", "utf8");
  }
  yield Buffer.from(JSON.stringify({ type: "end" }) + "\n", "utf8");
}

async function writeEncryptedPackage(outputPath, manifest, encryptedPayloadPath) {
  const outputDirectory = path.dirname(outputPath);
  const tempOutputPath = path.join(outputDirectory, `.${path.basename(outputPath)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(manifestBuffer.length, 0);
  try {
    await fs.mkdir(outputDirectory, { recursive: true });
    await fs.writeFile(tempOutputPath, Buffer.concat([MAGIC, lengthBuffer, manifestBuffer]));
    await pipeline(createReadStream(encryptedPayloadPath), createWriteStream(tempOutputPath, { flags: "a" }));
    await fs.rename(tempOutputPath, outputPath);
  } catch (error) {
    await fs.rm(tempOutputPath, { force: true });
    throw error;
  }
}

async function restoreSnapshotArchiveStream(readable, targetVaultPath) {
  const root = path.resolve(targetVaultPath);
  const iterator = readable[Symbol.asyncIterator]();
  let buffer = Buffer.alloc(0);
  let ended = false;
  let fileCount = 0;
  let directoryCount = 0;
  let sawEndRecord = false;

  async function pullChunk() {
    if (ended) return false;
    const next = await iterator.next();
    if (next.done) {
      ended = true;
      return false;
    }
    buffer = buffer.length ? Buffer.concat([buffer, next.value]) : Buffer.from(next.value);
    return true;
  }

  async function readLine() {
    for (;;) {
      const index = buffer.indexOf(0x0a);
      if (index >= 0) {
        const line = buffer.subarray(0, index).toString("utf8");
        buffer = buffer.subarray(index + 1);
        return line;
      }
      if (!(await pullChunk())) {
        if (buffer.length === 0) return null;
        throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
      }
      if (buffer.length > 1024 * 1024) {
        throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
      }
    }
  }

  async function writeBytes(byteCount, writable) {
    let remaining = byteCount;
    while (remaining > 0) {
      if (buffer.length === 0 && !(await pullChunk())) {
        throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
      }
      const size = Math.min(remaining, buffer.length);
      const piece = buffer.subarray(0, size);
      buffer = buffer.subarray(size);
      remaining -= size;
      if (!writable.write(piece)) {
        await waitForWritableEvent(writable, "drain");
      }
    }
  }

  async function consumeFileSeparator() {
    if (buffer.length === 0 && !(await pullChunk())) {
      throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
    }
    if (buffer[0] !== 0x0a) {
      throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
    }
    buffer = buffer.subarray(1);
  }

  function parseHeader(line) {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.", { cause: String(error?.message || error) });
    }
  }

  const snapshotHeader = parseHeader(await readLine());
  if (snapshotHeader?.type !== "snapshot" || snapshotHeader?.format !== "yansilu-vault-snapshot" || snapshotHeader?.formatVersion !== 1) {
    throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
  }

  for (;;) {
    const line = await readLine();
    if (line === null) break;
    if (!line) continue;
    const header = parseHeader(line);
    if (header?.type === "end") {
      sawEndRecord = true;
      break;
    }
    if (header?.type === "directory") {
      await fs.mkdir(path.join(root, ...assertRelativePackagePath(header.path).split("/")), { recursive: true });
      directoryCount += 1;
      continue;
    }
    if (header?.type !== "file") {
      throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
    }
    const relativePath = assertRelativePackagePath(header.path);
    const size = Number(header.size);
    if (!Number.isSafeInteger(size) || size < 0) {
      throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
    }
    const filePath = path.join(root, ...relativePath.split("/"));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const writable = createWriteStream(filePath);
    try {
      await writeBytes(size, writable);
      const finished = waitForWritableEvent(writable, "finish");
      writable.end();
      await finished;
    } finally {
      writable.destroy();
    }
    await consumeFileSeparator();
    if (Number.isFinite(Number(header.mtimeMs))) {
      const mtime = new Date(Number(header.mtimeMs));
      await fs.utimes(filePath, mtime, mtime).catch(() => {});
    }
    fileCount += 1;
  }

  if (!sawEndRecord) {
    throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
  }
  while (buffer.length === 0 && await pullChunk()) {}
  if (buffer.length > 0) {
    throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
  }

  return { fileCount, directoryCount };
}

function waitForWritableEvent(writable, eventName) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      writable.off(eventName, onEvent);
      writable.off("error", onError);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    writable.once(eventName, onEvent);
    writable.once("error", onError);
  });
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    return null;
  }
}

export async function checkpointVaultSqlite(vaultPath) {
  const root = path.resolve(vaultPath);
  const metaDir = path.join(root, ".yansilu");
  const DatabaseSync = await loadDatabaseSync();
  if (!DatabaseSync || !(await pathExists(metaDir))) return { checked: 0, skipped: true };

  const entries = await fs.readdir(metaDir, { withFileTypes: true });
  const dbFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".db"))
    .map((entry) => path.join(metaDir, entry.name));
  let checked = 0;
  for (const dbPath of dbFiles) {
    const db = new DatabaseSync(dbPath);
    try {
      db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
      checked += 1;
    } finally {
      db.close();
    }
  }
  return { checked, skipped: false };
}

function manifestAad(manifest) {
  return JSON.stringify({
    ...manifest,
    encryption: {
      ...manifest.encryption,
      authTag: undefined
    }
  });
}

async function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMS, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

async function createPayloadEncryptStream(manifest, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = await deriveKey(password, salt);
  manifest.encryption.kdfParams.salt = salt.toString("base64");
  manifest.encryption.iv = iv.toString("base64");

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(manifestAad(manifest), "utf8"));
  return cipher;
}

async function createPayloadDecryptStream(manifest, password) {
  const salt = Buffer.from(String(manifest?.encryption?.kdfParams?.salt || ""), "base64");
  const iv = Buffer.from(String(manifest?.encryption?.iv || ""), "base64");
  const authTag = Buffer.from(String(manifest?.encryption?.authTag || ""), "base64");
  if (!salt.length || !iv.length || !authTag.length) {
    throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
  }
  const key = await deriveKey(password, salt);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(manifestAad(manifest), "utf8"));
  decipher.setAuthTag(authTag);
  return decipher;
}

async function readPackageHeader(backupPath) {
  const cleanBackupPath = assertBackupInputPath(backupPath);
  let handle;
  try {
    handle = await fs.open(cleanBackupPath, "r");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw backupError("VAULT_BACKUP_FILE_NOT_FOUND", "Backup file was not found.", { backupPath: cleanBackupPath });
    }
    if (error?.code === "EISDIR") {
      throw backupError("VAULT_BACKUP_FILE_DAMAGED", "This is not a valid Yansilu backup file.", { backupPath: cleanBackupPath });
    }
    throw error;
  }
  try {
    const prefix = Buffer.alloc(MAGIC.length + 4);
    const prefixRead = await handle.read(prefix, 0, prefix.length, 0);
    if (prefixRead.bytesRead < prefix.length || !prefix.subarray(0, MAGIC.length).equals(MAGIC)) {
      throw backupError("VAULT_BACKUP_FILE_DAMAGED", "This is not a valid Yansilu backup file.");
    }
    const manifestLength = prefix.readUInt32BE(MAGIC.length);
    if (manifestLength <= 0 || manifestLength > 1024 * 1024) {
      throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
    }
    const manifestStart = MAGIC.length + 4;
    const manifestEnd = manifestStart + manifestLength;
    const stat = await handle.stat();
    if (manifestEnd > stat.size) {
      throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
    }
    const manifestBuffer = Buffer.alloc(manifestLength);
    const manifestRead = await handle.read(manifestBuffer, 0, manifestLength, manifestStart);
    if (manifestRead.bytesRead !== manifestLength) {
      throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.");
    }
    let manifest;
    try {
      manifest = JSON.parse(manifestBuffer.toString("utf8"));
    } catch (error) {
      throw backupError("VAULT_BACKUP_FILE_DAMAGED", "Backup file is damaged or incomplete.", { cause: String(error?.message || error) });
    }
    if (manifest?.format !== VAULT_BACKUP_FORMAT || manifest?.formatVersion !== VAULT_BACKUP_FORMAT_VERSION) {
      throw backupError("VAULT_BACKUP_FORMAT_UNSUPPORTED", "This backup format is not supported by this version of Yansilu.");
    }
    return { manifest, payloadOffset: manifestEnd, backupPath: cleanBackupPath };
  } finally {
    await handle.close();
  }
}

async function restoreEncryptedPayloadToDirectory({
  backupPath,
  payloadOffset,
  manifest,
  password,
  targetDirectory
} = {}) {
  const decipher = await createPayloadDecryptStream(manifest, password);
  const gunzip = zlib.createGunzip();
  const source = createReadStream(backupPath, { start: payloadOffset });
  const pipePromise = pipeline(
    source,
    decipher,
    gunzip
  );
  const parsePromise = restoreSnapshotArchiveStream(gunzip, targetDirectory);
  try {
    const [, restoredCounts] = await Promise.all([pipePromise, parsePromise]);
    return restoredCounts;
  } catch (error) {
    source.destroy(error);
    decipher.destroy(error);
    gunzip.destroy(error);
    await Promise.allSettled([pipePromise, parsePromise]);
    throw error;
  }
}

function createManifest({ appVersion = "", vaultPath, createdAt = new Date().toISOString() } = {}) {
  const root = path.resolve(vaultPath);
  return {
    format: VAULT_BACKUP_FORMAT,
    formatVersion: VAULT_BACKUP_FORMAT_VERSION,
    appVersion: String(appVersion || ""),
    createdAt,
    vaultName: path.basename(root),
    encryption: {
      algorithm: "AES-256-GCM",
      kdf: "scrypt",
      kdfParams: {
        N: SCRYPT_PARAMS.N,
        r: SCRYPT_PARAMS.r,
        p: SCRYPT_PARAMS.p,
        keyLength: KEY_LENGTH,
        salt: ""
      },
      iv: "",
      authTag: ""
    },
    payload: {
      compression: "gzip",
      encoding: "yansilu-stream-archive-v1"
    }
  };
}

export async function createEncryptedVaultBackup({
  vaultPath,
  password,
  targetDirectory = "",
  targetPath = "",
  appVersion = "",
  maxSnapshotBytes = DEFAULT_MAX_BACKUP_SNAPSHOT_BYTES
} = {}) {
  const cleanPassword = assertPassword(password);
  const root = path.resolve(vaultPath || "");
  const outputPath = assertBackupOutputPath({ targetDirectory, targetPath });
  if (!outputPath.toLowerCase().endsWith(VAULT_BACKUP_EXTENSION)) {
    throw backupError("VAULT_BACKUP_TARGET_INVALID", `Backup file must use ${VAULT_BACKUP_EXTENSION}.`);
  }
  assertBackupOutputOutsideVault(outputPath, root);

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-backup-"));
  const snapshotPath = path.join(tempRoot, "snapshot");
  const encryptedPayloadPath = path.join(tempRoot, "payload.enc");
  try {
    await initVault(root);
    const sqlite = await checkpointVaultSqlite(root);
    await fs.cp(root, snapshotPath, { recursive: true, force: false, errorOnExist: true });
    const fileTree = await collectVaultSnapshotEntries(snapshotPath, { maxBytes: maxSnapshotBytes });
    const createdAt = new Date().toISOString();
    const manifest = createManifest({ appVersion, vaultPath: root, createdAt });
    manifest.payload.encoding = "yansilu-stream-archive-v1";
    const cipher = await createPayloadEncryptStream(manifest, cleanPassword);
    await pipeline(
      Readable.from(createSnapshotArchiveStream(fileTree, createdAt)),
      zlib.createGzip(),
      cipher,
      createWriteStream(encryptedPayloadPath)
    );
    manifest.encryption.authTag = cipher.getAuthTag().toString("base64");
    await writeEncryptedPackage(outputPath, manifest, encryptedPayloadPath);
    return {
      backupPath: outputPath,
      fileName: path.basename(outputPath),
      manifest,
      fileCount: fileTree.files.length,
      directoryCount: fileTree.directories.length,
      totalBytes: fileTree.totalBytes,
      sqlite
    };
  } catch (error) {
    if (error?.code === "ENOSPC") {
      throw backupError("VAULT_BACKUP_SPACE_NOT_ENOUGH", "Not enough disk space to create the encrypted backup.");
    }
    throw error;
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

export async function restoreEncryptedVaultBackup({
  backupPath,
  password,
  targetVaultPath
} = {}) {
  const cleanPassword = assertPassword(password);
  const cleanBackupPath = assertBackupInputPath(backupPath);
  const targetRoot = path.resolve(String(targetVaultPath || ""));
  if (!String(targetVaultPath || "").trim()) {
    throw backupError("VAULT_RESTORE_TARGET_REQUIRED", "Restore target folder is required.");
  }
  if (await pathExists(targetRoot)) {
    throw backupError("VAULT_RESTORE_TARGET_EXISTS", "Target folder already exists. Choose a new empty folder name.");
  }

  await fs.mkdir(path.dirname(targetRoot), { recursive: true });
  const tempRoot = await fs.mkdtemp(path.join(path.dirname(targetRoot), `.yansilu-restore-${path.basename(targetRoot)}-`));
  const stagingPath = path.join(tempRoot, "vault");
  try {
    const { manifest, payloadOffset } = await readPackageHeader(cleanBackupPath);
    if (manifest?.payload?.encoding !== "yansilu-stream-archive-v1") {
      throw backupError("VAULT_BACKUP_FORMAT_UNSUPPORTED", "This backup format is not supported by this version of Yansilu.");
    }
    await fs.mkdir(stagingPath, { recursive: true });
    let restoredCounts;
    try {
      restoredCounts = await restoreEncryptedPayloadToDirectory({
        backupPath: cleanBackupPath,
        payloadOffset,
        manifest,
        password: cleanPassword,
        targetDirectory: stagingPath
      });
    } catch (error) {
      if (String(error?.code || "").startsWith("VAULT_") || error?.code === "ENOSPC") throw error;
      throw backupError("VAULT_BACKUP_PASSWORD_OR_FILE_INVALID", "Password is incorrect or the backup file is damaged.", { cause: String(error?.message || error) });
    }
    await initVault(stagingPath);
    await fs.rename(stagingPath, targetRoot);
    const layout = await initVault(targetRoot);
    return {
      vaultPath: layout.vaultPath,
      manifest,
      fileCount: restoredCounts.fileCount,
      directoryCount: restoredCounts.directoryCount
    };
  } catch (error) {
    if (error?.code === "ENOSPC") {
      throw backupError("VAULT_RESTORE_SPACE_NOT_ENOUGH", "Not enough disk space to restore this backup.");
    }
    throw error;
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

export async function readEncryptedVaultBackupManifest(backupPath) {
  const { manifest } = await readPackageHeader(backupPath);
  return manifest;
}
