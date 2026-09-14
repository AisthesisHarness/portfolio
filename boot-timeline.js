(function () {
  "use strict";

  var WORDS = ["THINK", "MAKE", "SCALE"];
  var LAMP_COUNT = 8;

  var FULL_TOTAL_DURATION = 1450;
  var FULL_LIGHTS_END = 450;
  var FULL_PUSH_END = 950;

  var SIMPLE_TOTAL_DURATION = 1200;
  var SIMPLE_WORD_SPAN = SIMPLE_TOTAL_DURATION / WORDS.length;

  function clamp01(value) {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  function easeOutCubic(t) {
    var inverse = 1 - t;
    return 1 - inverse * inverse * inverse;
  }

  function completedState() {
    return {
      phase: "done",
      wordIndex: WORDS.length - 1,
      word: WORDS[WORDS.length - 1],
      progress: 1,
      percent: 100,
      lampsLit: LAMP_COUNT,
      depth: 1,
      carProgress: 1,
      complete: true,
    };
  }

  function openingState(lampsLit) {
    return {
      phase: "lights",
      wordIndex: 0,
      word: WORDS[0],
      progress: 0,
      percent: 0,
      lampsLit: lampsLit,
      depth: 0,
      carProgress: 0,
      complete: false,
    };
  }

  function fullStateAt(elapsedMs) {
    if (elapsedMs <= 0) return openingState(0);
    if (elapsedMs >= FULL_TOTAL_DURATION) return completedState();

    var rawProgress = clamp01(elapsedMs / FULL_TOTAL_DURATION);
    var progress = easeOutCubic(rawProgress);
    var percent = Math.round(progress * 100);

    var phase;
    var wordIndex;
    if (elapsedMs < FULL_LIGHTS_END) {
      phase = "lights";
      wordIndex = 0;
    } else if (elapsedMs < FULL_PUSH_END) {
      phase = "push";
      wordIndex = 1;
    } else {
      phase = "car";
      wordIndex = 2;
    }

    var lampsRaw = clamp01(elapsedMs / FULL_LIGHTS_END);
    var lampsLit = Math.round(easeOutCubic(lampsRaw) * LAMP_COUNT);

    var depthRaw = clamp01(
      (elapsedMs - FULL_LIGHTS_END) / (FULL_TOTAL_DURATION - FULL_LIGHTS_END),
    );
    var depth = easeOutCubic(depthRaw);

    var carRaw = clamp01(
      (elapsedMs - FULL_PUSH_END) / (FULL_TOTAL_DURATION - FULL_PUSH_END),
    );
    var carProgress = easeOutCubic(carRaw);

    return {
      phase: phase,
      wordIndex: wordIndex,
      word: WORDS[wordIndex],
      progress: progress,
      percent: percent,
      lampsLit: lampsLit,
      depth: depth,
      carProgress: carProgress,
      complete: false,
    };
  }

  function simpleStateAt(elapsedMs) {
    if (elapsedMs <= 0) return openingState(LAMP_COUNT);

    if (elapsedMs >= SIMPLE_TOTAL_DURATION) {
      var done = completedState();
      done.depth = 0;
      done.carProgress = 0;
      return done;
    }

    var rawProgress = clamp01(elapsedMs / SIMPLE_TOTAL_DURATION);
    var progress = easeOutCubic(rawProgress);
    var percent = Math.round(progress * 100);
    var wordIndex = Math.min(
      Math.floor(elapsedMs / SIMPLE_WORD_SPAN),
      WORDS.length - 1,
    );

    return {
      phase: "lights",
      wordIndex: wordIndex,
      word: WORDS[wordIndex],
      progress: progress,
      percent: percent,
      lampsLit: LAMP_COUNT,
      depth: 0,
      carProgress: 0,
      complete: false,
    };
  }

  function skipStateAt() {
    return completedState();
  }

  function createBootTimeline(options) {
    var mode = (options && options.mode) || "full";

    if (mode === "skip") {
      return {
        mode: mode,
        words: WORDS.slice(),
        totalDuration: 0,
        stateAt: skipStateAt,
      };
    }

    if (mode === "simple") {
      return {
        mode: mode,
        words: WORDS.slice(),
        totalDuration: SIMPLE_TOTAL_DURATION,
        stateAt: simpleStateAt,
      };
    }

    return {
      mode: "full",
      words: WORDS.slice(),
      totalDuration: FULL_TOTAL_DURATION,
      stateAt: fullStateAt,
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createBootTimeline: createBootTimeline };
  }

  if (typeof window !== "undefined") {
    window.createBootTimeline = createBootTimeline;
  }
})();
