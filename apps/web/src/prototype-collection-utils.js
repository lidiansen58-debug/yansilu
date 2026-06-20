export function uniqueStrings(items = []) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}
