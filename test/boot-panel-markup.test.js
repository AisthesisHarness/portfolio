const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const html = readFileSync(join(__dirname, "..", "index.html"), "utf8");
const css = readFileSync(join(__dirname, "..", "styles.css"), "utf8");

test("boot overlay markup exposes the complete three-depth scene and telemetry hooks", () => {
  assert.match(html, /<div class="boot" aria-hidden="true">/, "overlay container is present");
  assert.match(html, /data-boot-percent/, "percentage readout hook is present");
  assert.match(html, /data-boot-track/, "progress track hook is present");
  assert.match(html, /data-boot-scene/, "perspective scene hook is present");
  assert.match(html, /data-boot-corridor/, "mid-depth track corridor is present");
  assert.match(html, /data-boot-car/, "far-depth car is present");
  assert.match(html, /<svg[^>]*data-boot-wheel/, "wheel svg is present");

  assert.doesNotMatch(html, /boot-corridor__dash/, "the track has no highway centre line");
  assert.doesNotMatch(css, /\.boot-corridor__dash/, "the removed centre line has no stale style");

  assert.match(
    html,
    /class="boot-car"[\s\S]*?viewBox="0 0 520 300"/,
    "the car uses the approved rear-view drawing's canvas",
  );
  [
    "M92 26 H112 V176 H92 Z M408 26 H428 V176 H408 Z",
    "M112 38 H408 V64 H112 Z",
    "M200 258 C206 205 228 165 246 140 H274 C292 165 314 205 320 258 Z",
    "M124 256 H396 L404 282 H116 Z",
  ].forEach((referencePath) => {
    assert.ok(html.includes(referencePath), `approved car geometry is present: ${referencePath}`);
  });
  assert.match(html, /<rect[^>]*x="18" y="118" width="100" height="164" rx="26"/, "left rear tyre is present");
  assert.match(html, /<rect[^>]*x="402" y="118" width="100" height="164" rx="26"/, "right rear tyre is present");

  const wordSlotMatches = [...html.matchAll(/data-boot-word="([a-z]+)"/g)].map(
    (match) => match[1],
  );

  assert.equal(wordSlotMatches.length, 3, "there are exactly three word-slot elements");
  assert.deepEqual(wordSlotMatches, ["think", "make", "scale"]);
});
