import path from "node:path";

function normalizePosixRelativePath(input) {
  return String(input || "").replaceAll("\\", "/").trim();
}

function unwrapMarkdownTarget(rawTarget) {
  const trimmed = String(rawTarget || "").trim();
  const wrapped = trimmed.startsWith("<") && trimmed.endsWith(">");
  return {
    wrapped,
    target: wrapped ? trimmed.slice(1, -1).trim() : trimmed
  };
}

function resolveVaultAssetPath(rawTarget, noteMarkdownPath) {
  const { target } = unwrapMarkdownTarget(rawTarget);
  if (!target || /^(https?:|data:|mailto:|file:)/i.test(target)) return "";

  const normalizedTarget = normalizePosixRelativePath(target);
  if (!normalizedTarget) return "";
  if (normalizedTarget.startsWith("assets/")) return path.posix.normalize(normalizedTarget);

  const noteDir = path.posix.dirname(normalizePosixRelativePath(noteMarkdownPath));
  const candidate = path.posix.normalize(path.posix.join(noteDir, normalizedTarget));
  return candidate.startsWith("assets/") ? candidate : "";
}

function parseWikilinkTarget(rawTarget) {
  const raw = String(rawTarget || "").trim();
  if (!raw) return "";
  const [targetPart] = raw.split("|");
  const [pathAndHeading] = String(targetPart || "").split("^");
  const [target] = String(pathAndHeading || "").split("#");
  return String(target || "").trim();
}

function resolveVaultAssetWikilinkPath(rawTarget, noteMarkdownPath) {
  const target = parseWikilinkTarget(rawTarget);
  if (!target) return "";
  return resolveVaultAssetPath(target, noteMarkdownPath);
}

export function relativeMarkdownLinkPath(noteMarkdownPath, assetRelativePath) {
  const notePath = normalizePosixRelativePath(noteMarkdownPath);
  const assetPath = normalizePosixRelativePath(assetRelativePath);
  const noteDir = path.posix.dirname(notePath);
  return path.posix.relative(noteDir, assetPath) || path.posix.basename(assetPath);
}

export function rewriteVaultAssetLinks(markdownBody, fromNoteMarkdownPath, toNoteMarkdownPath) {
  const body = String(markdownBody || "");
  const fromPath = normalizePosixRelativePath(fromNoteMarkdownPath);
  const toPath = normalizePosixRelativePath(toNoteMarkdownPath);
  if (!body || !fromPath || !toPath || fromPath === toPath) return body;

  const rewrittenMarkdownLinks = body.replace(/(!?\[[^\]]*?\]\()(<[^>]+>|[^)]+)(\))/g, (fullMatch, prefix, rawTarget, suffix) => {
    const assetPath = resolveVaultAssetPath(rawTarget, fromPath);
    if (!assetPath) return fullMatch;
    let nextTarget = relativeMarkdownLinkPath(toPath, assetPath);
    const { wrapped } = unwrapMarkdownTarget(rawTarget);
    if (wrapped || /\s/.test(nextTarget)) nextTarget = `<${nextTarget}>`;
    return `${prefix}${nextTarget}${suffix}`;
  });

  return rewrittenMarkdownLinks.replace(/(!)\[\[([^\]]+)\]\]/g, (fullMatch, bang, rawTarget) => {
    const assetPath = resolveVaultAssetWikilinkPath(rawTarget, fromPath);
    if (!assetPath) return fullMatch;
    const nextTarget = relativeMarkdownLinkPath(toPath, assetPath);
    const raw = String(rawTarget || "");
    const pipeIndex = raw.indexOf("|");
    if (pipeIndex < 0) return `${bang}[[${nextTarget}]]`;
    const alias = raw.slice(pipeIndex + 1);
    return `${bang}[[${nextTarget}|${alias}]]`;
  });
}

export function findVaultAssetLinks(markdownBody, noteMarkdownPath) {
  const body = String(markdownBody || "");
  const matches = new Set();
  body.replace(/(!?\[[^\]]*?\]\()([^)]+)(\))/g, (_fullMatch, _prefix, rawTarget) => {
    const assetPath = resolveVaultAssetPath(rawTarget, noteMarkdownPath);
    if (assetPath) matches.add(assetPath);
    return "";
  });
  body.replace(/(!)\[\[([^\]]+)\]\]/g, (_fullMatch, _bang, rawTarget) => {
    const assetPath = resolveVaultAssetWikilinkPath(rawTarget, noteMarkdownPath);
    if (assetPath) matches.add(assetPath);
    return "";
  });
  return [...matches].sort((a, b) => a.localeCompare(b));
}
