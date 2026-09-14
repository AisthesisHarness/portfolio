const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const root = join(__dirname, "..");
const readAsset = (name) => readFileSync(join(root, name), "utf8");

test("authored assets expose only the semantic crimson-orange primary accent", () => {
  const styles = readAsset("styles.css");
  const authoredAssets = ["index.html", "styles.css", "script.js", "favicon.svg"]
    .map(readAsset)
    .join("\n");

  assert.match(styles, /--accent-primary:\s*#FF4935\s*;/);
  assert.doesNotMatch(authoredAssets, /#d(?:9ff38|8ff34)/i);
  assert.doesNotMatch(authoredAssets, /rgba\(\s*217\s*,\s*255\s*,\s*56\s*,/i);
  assert.doesNotMatch(authoredAssets, /(?:--|__|--)lime\b|\blime(?:__|--)|\blime\b/i);
});

test("Explore the builds keeps its accessible destination and gains only a moderate radius", () => {
  const html = readAsset("index.html");
  const styles = readAsset("styles.css");
  const exploreCta = html.match(
    /<a\s+class="button button--accent-primary magnetic"\s+href="#work">\s*<span>Explore the builds<\/span><span aria-hidden="true">↓<\/span>\s*<\/a>/,
  );

  assert.ok(exploreCta, "the linked visible label and decorative arrow remain intact");
  assert.match(
    styles,
    /\.button--accent-primary\s*{[^}]*border-radius:\s*8px\s*;[^}]*}/s,
  );
});

test("embedded chart, favicon, and LessWrong surface use their specified accents", () => {
  const html = readAsset("index.html");
  const styles = readAsset("styles.css");
  const favicon = readAsset("favicon.svg");

  assert.match(
    html,
    /<stop offset="0" stop-color="#FF4935" stop-opacity="0\.3"\s*\/>\s*<stop offset="1" stop-color="#FF4935" stop-opacity="0"\s*\/>/s,
  );
  assert.match(styles, /\.chart-line\s*{[^}]*stroke:\s*var\(--accent-primary\)\s*;/s);
  assert.match(favicon, /<rect width="64" height="64" rx="12" fill="#FF4935"\s*\/>/);
  assert.match(
    favicon,
    /<path d="M12 47 26 14h10l16 33H41l-3-7H24l-3 7H12Zm15-15h8l-4-10-4 10Z" fill="#0a0a0a"\s*\/>/,
  );
  assert.match(styles, /--accent-secondary:\s*#FF5F35\s*;/);
  assert.match(
    styles,
    /\.project-card--reader\s*{[^}]*background:\s*var\(--accent-secondary\)\s*;/s,
  );
});
