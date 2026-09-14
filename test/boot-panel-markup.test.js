const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const html = readFileSync(join(__dirname, "..", "index.html"), "utf8");

test("boot overlay markup exposes the complete three-depth scene and telemetry hooks", () => {
  assert.match(html, /<div class="boot" aria-hidden="true">/, "overlay container is present");
  assert.match(html, /data-boot-percent/, "percentage readout hook is present");
  assert.match(html, /data-boot-track/, "progress track hook is present");
  assert.match(html, /data-boot-scene/, "perspective scene hook is present");
  assert.match(html, /data-boot-corridor/, "mid-depth track corridor is present");
  assert.match(html, /data-boot-car/, "far-depth car is present");
  assert.match(html, /<svg[^>]*data-boot-wheel/, "wheel svg is present");

  [
    "boot-car__rear-wing",
    "boot-car__engine-cover",
    "boot-car__tyre",
    "boot-car__diffuser",
    "boot-car__spark",
  ].forEach((carPart) => {
    assert.match(html, new RegExp(`class="[^"]*${carPart}`), `${carPart} is drawn inline`);
  });

  const wordSlotMatches = [...html.matchAll(/data-boot-word="([a-z]+)"/g)].map(
    (match) => match[1],
  );

  assert.equal(wordSlotMatches.length, 3, "there are exactly three word-slot elements");
  assert.deepEqual(wordSlotMatches, ["think", "make", "scale"]);
});
