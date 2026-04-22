export function extractTags(text) {
  const tags = new Set();
  for (const match of String(text ?? "").matchAll(/(^|\s)#([a-zA-Z0-9_\-/]+)/g)) {
    tags.add(match[2]);
  }
  return [...tags];
}

export function extractWikilinks(text) {
  const links = new Set();
  for (const match of String(text ?? "").matchAll(/\[\[([^\]]+)\]\]/g)) {
    links.add(match[1].trim());
  }
  return [...links];
}

export function parseWikilink(raw, embed = false) {
  const [targetPart, alias = null] = String(raw || "").split("|");
  const [pathAndHeading, block = null] = targetPart.split("^");
  const [targetRaw, heading = null] = pathAndHeading.split("#");
  const target = targetRaw.trim() || null;
  const normalizedHeading = heading ? heading.trim() : null;
  const normalizedAlias = alias ? alias.trim() : null;
  return {
    raw,
    target,
    heading: normalizedHeading,
    block: block ? block.trim() : null,
    alias: normalizedAlias,
    display: normalizedAlias || normalizedHeading || target,
    embed
  };
}

export function parseWikilinks(text) {
  const seenRaw = new Set();
  const parsed = [];
  for (const match of String(text ?? "").matchAll(/(!)?\[\[([^\]]+)\]\]/g)) {
    const raw = match[2].trim();
    if (seenRaw.has(raw)) continue;
    seenRaw.add(raw);
    parsed.push(parseWikilink(raw, Boolean(match[1])));
  }
  return parsed;
}

export function wikilinkTargets(parsedWikilinks) {
  const targets = new Set();
  for (const link of parsedWikilinks) {
    if (link.target) targets.add(link.target);
  }
  return [...targets];
}
