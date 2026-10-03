import { execFile } from "node:child_process";

const cleanText = value => String(value || "").trim();

export function execFileQuiet(command, args = [], options = {}, execute = execFile) {
  return new Promise(resolve => {
    const finish = (error, stdout = "", stderr = "") => resolve({
      command, args, ok: !error, code: error?.code ?? 0,
      signal: cleanText(error?.signal),
      message: cleanText(error?.message || stderr || stdout),
      stdout: cleanText(stdout), stderr: cleanText(stderr)
    });
    try {
      const child = execute(command, args, {
        windowsHide: true, timeout: Math.max(0, Number(options.timeoutMs || 0) || 0)
      }, finish);
      child.once("error", error => finish(error));
    } catch (error) {
      finish(error);
    }
  });
}
