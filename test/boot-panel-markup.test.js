const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const html = readFileSync(join(__dirname, "..", "index.html"), "utf8");

test("boot overlay markup exposes the container, readout, track, wheel, and word slots", () => {
  assert.match(html, /<div class="boot" aria-hidden="true">/, "overlay container is present");
  assert.match(html, /data-boot-percent/, "percentage readout hook is present");
  assert.match(html, /data-boot-track/, "progress track hook is present");
  assert.match(html, /<svg[^>]*data-boot-wheel/, "wheel svg is present");

  const wordSlotMatches = [...html.matchAll(/data-boot-word="([a-z]+)"/g)].map(
    (match) => match[1],
  );

  assert.equal(wordSlotMatches.length, 3, "there are exactly three word-slot elements");
  assert.deepEqual(wordSlotMatches, ["think", "make", "scale"]);
});
