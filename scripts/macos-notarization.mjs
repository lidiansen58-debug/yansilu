import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function notarizeMacosArtifact({ artifactPath, staplePath = artifactPath, env = process.env, run = spawnSync }) {
  for (const name of ["APPLE_ID", "APPLE_TEAM_ID", "APPLE_APP_PASSWORD"]) {
    if (!String(env[name] || "").trim()) throw new Error(`${name} is required for notarization.`);
  }
  const artifact = path.resolve(artifactPath);
  const target = path.resolve(staplePath);
  const redact = value => [env.APPLE_APP_PASSWORD, env.APPLE_ID].reduce(
    (text, secret) => text.replaceAll(secret, "[REDACTED]"), String(value || "")
  );
  const checked = (command, args) => {
    const result = run(command, args, { env, encoding: "utf8", shell: false });
    if (result.error || result.status !== 0) {
      throw new Error(`${command} ${args.slice(0, 2).join(" ")} failed: ${redact(result.error?.message || result.stderr || result.stdout)}`);
    }
    return result;
  };
  const result = checked("xcrun", ["notarytool", "submit", artifact,
    "--apple-id", env.APPLE_ID, "--team-id", env.APPLE_TEAM_ID,
    "--password", env.APPLE_APP_PASSWORD, "--wait", "--output-format", "json"]);
  let submission;
  try {
    submission = JSON.parse(result.stdout);
  } catch {
    throw new Error("Apple returned an invalid notarization result; release blocked.");
  }
  if (!submission || typeof submission !== "object" || Array.isArray(submission)) {
    throw new Error("Apple returned an invalid notarization result; release blocked.");
  }
  if (submission.status !== "Accepted") {
    throw new Error(`Apple notarization was not Accepted (status: ${redact(submission.status)}, submission: ${redact(submission.id)}); release blocked.`);
  }
  checked("xcrun", ["stapler", "staple", target]);
  checked("xcrun", ["stapler", "validate", target]);
  checked("spctl", target.endsWith(".app")
    ? ["--assess", "--verbose=2", "--type", "execute", target]
    : ["--assess", "--verbose=2", "--type", "open", "--context", "context:primary-signature", target]);
  return { id: submission.id, status: submission.status };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.platform !== "darwin") throw new Error("Apple notarization must run on macOS.");
    const [artifactPath, staplePath, ...extra] = process.argv.slice(2);
    if (!artifactPath || extra.length) throw new Error("Usage: node scripts/macos-notarization.mjs <artifact> [staple-target]");
    const result = notarizeMacosArtifact({ artifactPath, staplePath });
    console.log(`Apple notarization Accepted and validated: ${result.id}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
