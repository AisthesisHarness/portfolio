const assert = require("node:assert/strict");
const test = require("node:test");

const { createBootTimeline } = require("../boot-timeline.js");

const EXPECTED_WORDS = ["THINK", "MAKE", "SCALE"];
const STATE_KEYS = [
  "phase",
  "wordIndex",
  "word",
  "progress",
  "percent",
  "lampsLit",
  "depth",
  "carProgress",
  "complete",
].sort();

function sweep(timeline, stepMs) {
  const states = [];
  for (let ms = 0; ms <= timeline.totalDuration; ms += stepMs) {
    states.push({ ms, state: timeline.stateAt(ms) });
  }
  states.push({ ms: timeline.totalDuration, state: timeline.stateAt(timeline.totalDuration) });
  return states;
}

// Criterion 1: exact shape, DOM-free, identical under node --test, for all three modes.
test("1: createBootTimeline returns the documented shape for every mode with no DOM dependency", () => {
  ["full", "simple", "skip"].forEach((mode) => {
    const timeline = createBootTimeline({ mode });
    assert.equal(timeline.mode, mode);
    assert.ok(Array.isArray(timeline.words));
    assert.equal(typeof timeline.totalDuration, "number");
    assert.equal(typeof timeline.stateAt, "function");

    const state = timeline.stateAt(0);
    assert.deepEqual(Object.keys(state).sort(), STATE_KEYS);
  });
});

// Criterion 2: word list is exact and in order for full and simple modes.
test("2: words is exactly THINK, MAKE, SCALE in order for full and simple modes", () => {
  ["full", "simple"].forEach((mode) => {
    const timeline = createBootTimeline({ mode });
    assert.deepEqual(timeline.words, EXPECTED_WORDS);
    assert.equal(timeline.words.length, 3);
  });
});

// Criterion 3: stateAt(0) in full mode is the opening frame.
test("3: full mode stateAt(0) is the opening frame", () => {
  const timeline = createBootTimeline({ mode: "full" });
  const state = timeline.stateAt(0);

  assert.equal(state.wordIndex, 0);
  assert.equal(state.word, "THINK");
  assert.equal(state.percent, 0);
  assert.equal(state.depth, 0);
  assert.equal(state.lampsLit, 0);
  assert.equal(state.complete, false);
});

// Criterion 4: sweeping the full duration, each word occupies one contiguous non-empty span,
// and wordIndex changes exactly twice.
test("4: full mode word spans are contiguous, non-empty, and change exactly twice", () => {
  const timeline = createBootTimeline({ mode: "full" });
  const states = sweep(timeline, 5);

  let changes = 0;
  const spanCounts = { 0: 0, 1: 0, 2: 0 };
  let previousWordIndex = states[0].state.wordIndex;
  spanCounts[previousWordIndex] += 1;

  for (let i = 1; i < states.length; i += 1) {
    const { wordIndex } = states[i].state;
    spanCounts[wordIndex] += 1;
    if (wordIndex !== previousWordIndex) {
      assert.equal(
        wordIndex,
        previousWordIndex + 1,
        "wordIndex must advance by exactly one step, never skip or repeat backward",
      );
      changes += 1;
      previousWordIndex = wordIndex;
    }
  }

  assert.equal(changes, 2, "wordIndex should change exactly twice across the sweep");
  assert.ok(spanCounts[0] > 0 && spanCounts[1] > 0 && spanCounts[2] > 0, "every word must appear");
});

// Criterion 5: the push phase begins exactly as wordIndex becomes 1; the car phase begins
// exactly as wordIndex becomes 2.
test("5: phase transitions align exactly with word transitions", () => {
  const timeline = createBootTimeline({ mode: "full" });
  const states = sweep(timeline, 1);

  states.forEach(({ state }) => {
    if (state.wordIndex === 0 && state.phase !== "done") assert.equal(state.phase, "lights");
    if (state.wordIndex === 1) assert.equal(state.phase, "push");
    if (state.wordIndex === 2 && !state.complete) assert.equal(state.phase, "car");
  });

  let firstPush = null;
  let firstWordIndex1 = null;
  let firstCar = null;
  let firstWordIndex2 = null;

  states.forEach(({ ms, state }) => {
    if (state.phase === "push" && firstPush === null) firstPush = ms;
    if (state.wordIndex === 1 && firstWordIndex1 === null) firstWordIndex1 = ms;
    if (state.phase === "car" && firstCar === null) firstCar = ms;
    if (state.wordIndex === 2 && firstWordIndex2 === null) firstWordIndex2 = ms;
  });

  assert.equal(firstPush, firstWordIndex1);
  assert.equal(firstCar, firstWordIndex2);
});

// Criterion 6: percent, depth, and carProgress never decrease across a forward sweep;
// lampsLit never decreases.
test("6: percent, depth, carProgress, and lampsLit never decrease across a forward sweep", () => {
  const timeline = createBootTimeline({ mode: "full" });
  const states = sweep(timeline, 5);

  for (let i = 1; i < states.length; i += 1) {
    const prev = states[i - 1].state;
    const curr = states[i].state;
    assert.ok(curr.percent >= prev.percent, "percent must not decrease");
    assert.ok(curr.depth >= prev.depth, "depth must not decrease");
    assert.ok(curr.carProgress >= prev.carProgress, "carProgress must not decrease");
    assert.ok(curr.lampsLit >= prev.lampsLit, "lampsLit must not decrease");
  }
});

// Criterion 7: full-mode totalDuration is at most 1500ms.
test("7: full mode totalDuration is at most 1500ms", () => {
  const timeline = createBootTimeline({ mode: "full" });
  assert.ok(timeline.totalDuration <= 1500);
});

// Criterion 8: elapsed far past totalDuration returns the completed state.
test("8: stateAt far past totalDuration returns the completed state", () => {
  const timeline = createBootTimeline({ mode: "full" });
  const state = timeline.stateAt(timeline.totalDuration + 100000);

  assert.equal(state.complete, true);
  assert.equal(state.percent, 100);
  assert.equal(state.word, "SCALE");
  assert.equal(state.carProgress, 1);
});

// Criterion 9: negative elapsed returns the same state as stateAt(0), in every mode.
test("9: negative elapsed returns the same state as stateAt(0) in every mode", () => {
  ["full", "simple", "skip"].forEach((mode) => {
    const timeline = createBootTimeline({ mode });
    assert.deepEqual(timeline.stateAt(-1), timeline.stateAt(0));
    assert.deepEqual(timeline.stateAt(-99999), timeline.stateAt(0));
  });
});

// Criterion 10: simple mode never reports push/car, lamps are full from the first frame,
// yields all three words in order, and its duration is no longer than full mode's.
test("10: simple mode is lights/done only, lamps full throughout, words in order, duration capped", () => {
  const fullTimeline = createBootTimeline({ mode: "full" });
  const timeline = createBootTimeline({ mode: "simple" });
  const states = sweep(timeline, 5);

  states.forEach(({ state }) => {
    assert.ok(state.phase === "lights" || state.phase === "done");
    assert.equal(state.lampsLit, 8);
  });

  assert.equal(states[0].state.lampsLit, 8);

  let previousWordIndex = -1;
  let changes = 0;
  states.forEach(({ state }) => {
    if (state.wordIndex !== previousWordIndex) {
      if (previousWordIndex !== -1) {
        assert.equal(state.wordIndex, previousWordIndex + 1);
        changes += 1;
      }
      previousWordIndex = state.wordIndex;
    }
  });
  assert.equal(changes, 2);
  assert.deepEqual(timeline.words, EXPECTED_WORDS);

  assert.ok(timeline.totalDuration <= fullTimeline.totalDuration);
});

// Criterion 11: skip mode is complete immediately, with zero totalDuration.
test("11: skip mode reports complete immediately with zero totalDuration", () => {
  const timeline = createBootTimeline({ mode: "skip" });

  assert.equal(timeline.totalDuration, 0);
  [0, -1, 500].forEach((ms) => {
    const state = timeline.stateAt(ms);
    assert.equal(state.complete, true);
  });
});

// Criteria 12 & 13 are verified by the fact that this suite is discovered and run by
// `node --test` from the repository root with a plain `require("../boot-timeline.js")`
// (no package manifest, no build step, no new runtime dependency).
test("12 & 13: the module loads as a plain script via require, with no build step", () => {
  assert.equal(typeof createBootTimeline, "function");
  const timeline = createBootTimeline({ mode: "full" });
  assert.equal(typeof timeline.stateAt, "function");
});
