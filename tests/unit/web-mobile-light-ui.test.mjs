import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("mobile page prioritizes quick capture over explanation", () => {
  const html = fs.readFileSync("apps/web/src/mobile.html", "utf8");
  const js = fs.readFileSync("apps/web/src/mobile.js", "utf8");
  const css = fs.readFileSync("apps/web/src/mobile.css", "utf8");

  assert.match(html, /data-view="quick">记录/);
  assert.match(js, /class="panel mobile-capture-card"/);
  assert.match(js, /<button class="primary-button full capture-button" type="button" data-go="quick">快速记录<\/button>/);
  assert.match(js, /<textarea id="quickBody" class="quick-main-textarea"/);
  assert.match(js, /<details class="mobile-details">/);
  assert.match(js, /从相册选择/);
  assert.match(js, /拍照/);
  assert.doesNotMatch(js, /复杂建联、图谱和写作生成回电脑完成/);
  assert.match(css, /\.capture-button\s*\{[\s\S]*min-height:\s*50px/);
  assert.match(css, /\.quick-form \.quick-main-textarea\s*\{[\s\S]*min-height:\s*168px/);
});
