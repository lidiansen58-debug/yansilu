import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdownWithFrontmatter, serializeMarkdownWithFrontmatter } from "../../packages/domain/src/frontmatter.mjs";

test("quoted metadata preserves paths and JSON text across repeated Markdown saves", () => {
  const metadata = {
    source_trace: 'C:\\Notes\\阅读记录.md: "Chapter 1"',
    original_frontmatter: JSON.stringify({ title: 'A "quoted" title', path: "C:\\Notes\\source.md" }),
    custom: 'A colon: a quote " and a backslash \\ remain unchanged.'
  };
  const body = "# Note\n\nAuthored prose with [[a real source]].\n";
  let markdown = serializeMarkdownWithFrontmatter(metadata, body);
  const length = markdown.length;
  for (let round = 0; round < 12; round++) {
    const parsed = parseMarkdownWithFrontmatter(markdown);
    assert.deepEqual(parsed.frontmatter, metadata);
    assert.equal(parsed.body, body);
    markdown = serializeMarkdownWithFrontmatter(parsed.frontmatter, parsed.body);
    assert.equal(markdown.length, length, "Repeated save must not grow escaped metadata exponentially");
  }
});

test("quoted YAML list strings and boolean-looking text preserve their literal type", () => {
  const markdown = '---\ncustom: "true"\naliases:\n  - "A \\"quoted\\" alias"\n  - "C:\\\\Notes\\\\source.md"\n---\n\n# Note';
  const parsed = parseMarkdownWithFrontmatter(markdown);
  assert.equal(parsed.frontmatter.custom, "true");
  assert.deepEqual(parsed.frontmatter.aliases, ['A "quoted" alias', "C:\\Notes\\source.md"]);
  const next = parseMarkdownWithFrontmatter(serializeMarkdownWithFrontmatter(parsed.frontmatter, parsed.body));
  assert.deepEqual(next.frontmatter, parsed.frontmatter);
});

test("legacy non-JSON single quotes and unsupported double-quoted text retain the existing fallback", () => {
  const parsed = parseMarkdownWithFrontmatter("---\nlegacy: 'An earlier value'\ninvalid: \"C:\\Legacy\\file\"\n---\n\nBody");
  assert.equal(parsed.frontmatter.legacy, "An earlier value");
  assert.equal(parsed.frontmatter.invalid, "C:\\Legacy\\file");
});
