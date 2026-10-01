import path from "node:path";
import { markdownCharacterIsEscaped, markdownCodeRanges } from "../../markdown-engine/src/markdown-code-context.mjs";

function isLiteralAssetReference(body, ranges, match, index, embed = false) {
  const opening = index + (match.startsWith("!") ? 1 : 0);
  return markdownCharacterIsEscaped(body, opening)
    || (embed && markdownCharacterIsEscaped(body, index))
    || ranges.some(([from, to]) => opening >= from && opening < to);
}

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

  const normalizedTarget = normalizePosixRelativePath(target.split("#", 1)[0]);
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
  const codeRanges = markdownCodeRanges(body);

  const rewrittenMarkdownLinks = body.replace(/(!?\[[^\]]*?\]\()(<[^>]+>|[^)]+)(\))/g, (fullMatch, prefix, rawTarget, suffix, index) => {
    if (isLiteralAssetReference(body, codeRanges, fullMatch, index)) return fullMatch;
    const assetPath = resolveVaultAssetPath(rawTarget, fromPath);
    if (!assetPath) return fullMatch;
    const { target, wrapped } = unwrapMarkdownTarget(rawTarget);
    const fragmentIndex = target.indexOf("#");
    const fragment = fragmentIndex >= 0 ? target.slice(fragmentIndex) : "";
    let nextTarget = relativeMarkdownLinkPath(toPath, assetPath) + fragment;
    if (wrapped || /\s/.test(nextTarget)) nextTarget = `<${nextTarget}>`;
    return `${prefix}${nextTarget}${suffix}`;
  });

  const rewrittenCodeRanges = markdownCodeRanges(rewrittenMarkdownLinks);
  return rewrittenMarkdownLinks.replace(/(!)\[\[([^\]]+)\]\]/g, (fullMatch, bang, rawTarget, index) => {
    if (isLiteralAssetReference(rewrittenMarkdownLinks, rewrittenCodeRanges, fullMatch, index, true)) return fullMatch;
    const assetPath = resolveVaultAssetWikilinkPath(rawTarget, fromPath);
    if (!assetPath) return fullMatch;
    const nextTarget = relativeMarkdownLinkPath(toPath, assetPath);
    const raw = String(rawTarget || "");
    const suffixIndex = raw.search(/[#^|]/);
    const suffix = suffixIndex >= 0 ? raw.slice(suffixIndex) : "";
    return `${bang}[[${nextTarget}${suffix}]]`;
  });
}

export function findVaultAssetLinks(markdownBody, noteMarkdownPath) {
  const body = String(markdownBody || "");
  const matches = new Set();
  const codeRanges = markdownCodeRanges(body);
  body.replace(/(!?\[[^\]]*?\]\()(<[^>]+>|[^)]+)(\))/g, (fullMatch, _prefix, rawTarget, _suffix, index) => {
    if (isLiteralAssetReference(body, codeRanges, fullMatch, index)) return fullMatch;
    const assetPath = resolveVaultAssetPath(rawTarget, noteMarkdownPath);
    if (assetPath) matches.add(assetPath);
    return "";
  });
  body.replace(/(!)\[\[([^\]]+)\]\]/g, (fullMatch, _bang, rawTarget, index) => {
    if (isLiteralAssetReference(body, codeRanges, fullMatch, index, true)) return fullMatch;
    const assetPath = resolveVaultAssetWikilinkPath(rawTarget, noteMarkdownPath);
    if (assetPath) matches.add(assetPath);
    return "";
  });
  return [...matches].sort((a, b) => a.localeCompare(b));
}
