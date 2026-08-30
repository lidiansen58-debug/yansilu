import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export async function prepareNoteMoveFiles(sourcePath, targetPath, rewrite, expectedMarkdown) {
  const token = randomUUID();
  const stagedPath = path.join(path.dirname(targetPath), `.yansilu-${token}.move-tmp`);
  const originalPath = path.join(path.dirname(sourcePath), `.yansilu-${token}.move-original`);
  let preserved = false;
  let published = false;
  let sourceContent;
  const changedError = () => Object.assign(new Error("笔记已被其他编辑器修改，本次移动已取消。请重新打开笔记，确认最新内容后再移动。"), { code: "NOTE_MOVE_SOURCE_CHANGED" });
  const assertUnchanged = async () => {
    if (!(await fs.readFile(preserved ? originalPath : sourcePath)).equals(sourceContent)) throw changedError();
    if (preserved) {
      try { await fs.lstat(sourcePath); }
      catch (error) { if (error.code === "ENOENT") return; throw error; }
      throw changedError();
    }
  };
  try {
    await fs.copyFile(sourcePath, stagedPath, fs.constants.COPYFILE_EXCL);
    sourceContent = await fs.readFile(stagedPath);
    if (expectedMarkdown !== undefined && !sourceContent.equals(Buffer.from(expectedMarkdown, "utf8"))) throw changedError();
    await rewrite(stagedPath);
  } catch (error) {
    await fs.unlink(stagedPath).catch(() => {});
    throw error;
  }
  return {
    get recoveryPath() { return preserved ? originalPath : sourcePath; },
    assertUnchanged,
    async publish() {
      // The original remains untouched until the prepared replacement is complete.
      await fs.rename(sourcePath, originalPath);
      preserved = true;
      await assertUnchanged();
      await fs.rename(stagedPath, targetPath);
      published = true;
    },
    async rollback() {
      if (published) {
        await fs.unlink(targetPath);
        published = false;
      }
      if (preserved) {
        // Restore without replacing a file another editor recreated at the old path.
        await fs.link(originalPath, sourcePath);
        await fs.unlink(originalPath);
        preserved = false;
      }
    },
    async cleanup(committed) {
      await fs.unlink(stagedPath).catch(() => {});
      // Keep the recovery copy if rollback failed; cleanup cannot turn a commit into a failure.
      if (committed) {
        try { await assertUnchanged(); await fs.unlink(originalPath); }
        catch { /* Never discard a recovery copy changed by another writer. */ }
      }
    }
  };
}
