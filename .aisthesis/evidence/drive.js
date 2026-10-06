"use strict";
const fs = require("node:fs");
const path = require("node:path");

const [url, width, height, reducedMotion, outDir, scenario, extraUrl] = process.argv.slice(2);
const BASE = 1000;
const preload = `
(() => {
  window.__rafQueue = [];
  window.requestAnimationFrame = (cb) => { window.__rafQueue.push(cb); return window.__rafQueue.length; };
  window.cancelAnimationFrame = () => {};
  const nativeNow = performance.now.bind(performance);
  window.__realNow = nativeNow;
  performance.now = () => ${BASE};
  window.__step = (now) => {
    const q = window.__rafQueue;
    window.__rafQueue = [];
    for (const cb of q) { try { cb(now); } catch (err) { window.__err = (window.__err || []).concat(String((err && err.stack) || err)); } }
  };
})();
`;

const probeSrc = `
(() => {
  const q = (s) => document.querySelector(s);
  const qa = (s) => Array.from(document.querySelectorAll(s));
  const r = (s) => { const el = q(s); if (!el) return null; const b = el.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), bm: Math.round(b.bottom), vis: getComputedStyle(el).visibility, op: getComputedStyle(el).opacity }; };
  const scene = q(".boot-scene");
  const world = q(".boot-scene__world");
  const wheel = q(".boot-wheel");
  const corridor = q(".boot-corridor");
  return {
    bootPresent: !!q(".boot"),
    bodyClasses: document.body.className,
    phase: scene ? scene.dataset.phase : null,
    perspGot: scene ? getComputedStyle(scene).perspective : null,
    depthVar: scene ? scene.style.getPropertyValue("--boot-depth") : null,
    carVar: scene ? scene.style.getPropertyValue("--boot-car-z-offset") : null,
    worldTransform: world ? getComputedStyle(world).transform : null,
    wheel: wheel ? r(".boot-wheel") : null,
    wheelPower: wheel ? wheel.classList.contains("is-powered") : null,
    car: (q(".boot-car")) ? r(".boot-car") : null,
    carOp: q(".boot-car") ? getComputedStyle(q(".boot-car")).opacity : null,
    corridor: corridor ? r(".boot-corridor") : null,
    percent: q("[data-boot-percent]") ? q("[data-boot-percent]").textContent : null,
    trackW: q("[data-boot-track] span") ? q("[data-boot-track] span").style.width : null,
    lamps: qa("[data-lamp]").map((l) => l.classList.contains("is-lit")),
    words: qa(".boot__word").map((w) => ({ t: w.textContent.trim(), act: w.classList.contains("is-active"), vis: getComputedStyle(w).visibility })),
    kerbs: qa(".boot-corridor__kerb").map((k) => ({ cls: k.getAttribute("class"), fill: getComputedStyle(k).fill })),
    kerbEdges: qa(".boot-corridor__kerb-edge").map((k) => getComputedStyle(k).stroke),
    navOpen: !!q(".site-nav") && q(".site-nav").classList.contains("is-open"),
    heroVisible: q(".hero") ? getComputedStyle(q(".hero")).opacity : null,
    heroLine1: q(".hero__line--one") ? getComputedStyle(q(".hero__line--one")).transform : null,
    revealVisible: qa("[data-reveal]").filter((el) => el.classList.contains("is-visible")).length,
    openRows: qa(".project-row").filter((d) => d.open).length,
  };
})()
`;

function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

async function connect() {
  /* allow a browser websocket url on argv too */
  const wsUrl = process.env.CDP_WS || null;
  const version = wsUrl ? null : await (await fetch("http://127.0.0.1:9222/json/version")).json();
  const ws = new WebSocket(wsUrl || version.webSocketDebuggerUrl);
  let idc = 0;
  const pending = new Map();
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++idc;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("ws connect failed")); });
  return { ws, send };
}

async function main() {
  const { ws, send } = await connect();
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const rpc = (m, p) => send(m, p, sessionId);

  await rpc("Page.enable");
  await rpc("Runtime.enable");
  // The sandbox proxy has no route for Google Fonts; block the request so it fails fast
  // instead of hanging and delaying deferred scripts (fonts here fall back, as designed).
  await rpc("Network.enable");
  await rpc("Network.setBlockedURLs", { urls: ["*://fonts.googleapis.com/*", "*://fonts.gstatic.com/*"] });
  if (String(width) !== "0") {
    await rpc("Emulation.setDeviceMetricsOverride", {
      width: Number(width), height: Number(height), deviceScaleFactor: 1, mobile: false,
    });
  }
  if (String(reducedMotion) === "1") {
    await rpc("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  }
  await rpc("Page.addScriptToEvaluateOnNewDocument", { source: preload });

  const evals = [];
  const evaluate = async (expr) => {
    const res = await rpc("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result.value;
  };
  const shot = async (name) => {
    const s = await rpc("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(s.data, "base64"));
    return name;
  };

  await rpc("Page.navigate", { url: extraUrl || url });
  await sleep(2000);
  evals.push(["navigated", "ok"]);

  if (scenario === "seq") {
    const samples = [0, 220, 449, 450, 700, 900, 949, 950, 1100, 1200, 1300, 1400, 1449];
    const screens = [[450, "bdc-beat2-push-start"], [700, "bdc-beat2-mid-push"], [949, "bdc-beat2-end-push"], [950, "bdc-beat3-car-reveal"], [1150, "bdc-beat3-car-mid"], [1400, "bdc-beat3-car-end"]];
    for (const ms of samples) {
      await evaluate(`window.__step(${BASE + ms})`);
      await sleep(40);
      evals.push(["sample-" + ms, await evaluate(probeSrc)]);
    }
    for (const [ms, file] of screens) {
      await evaluate(`window.__step(${BASE + ms})`);
      await sleep(60);
      evals.push(["shot-" + ms, await shot(file + ".png")]);
    }
    const carTrace = [];
    for (let ms = 950; ms <= 1449; ms += 50) {
      await evaluate(`window.__step(${BASE + ms})`);
      await sleep(25);
      const p = await evaluate(probeSrc);
      carTrace.push({ ms, carW: p.car && p.car.w, carH: p.car && p.car.h, carZ: p.carVar, carOp: p.carOp });
    }
    evals.push(["carTrace", carTrace]);
    const wheelTrace = [];
    for (let ms = 0; ms <= 949; ms += 50) {
      await evaluate(`window.__step(${BASE + ms})`);
      await sleep(20);
      const p = await evaluate(probeSrc);
      wheelTrace.push({ ms, phase: p.phase, wheelW: p.wheel && p.wheel.w, wheelL: p.wheel && p.wheel.l, wheelR: p.wheel && p.wheel.r, wheelT: p.wheel && p.wheel.t, wheelB: p.wheel && p.wheel.bm });
    }
    evals.push(["wheelTrace", wheelTrace]);
  } else if (scenario === "complete") {
    await evaluate(`window.__step(${BASE + 1450})`);
    await sleep(120);
    evals.push(["at-1450", await evaluate(probeSrc)]);
    evals.push(["shot-wipe", await shot("bdc-beat4-wipe-start")]);
    await sleep(1300);
    evals.push(["after-wipe", await evaluate(probeSrc)]);
    evals.push(["shot-hero", await shot("bdc-hero-after")]);
  } else if (scenario === "simple") {
    const samples = [0, 200, 350, 400, 600, 800, 1000, 1199];
    for (const ms of samples) {
      await evaluate(`window.__step(${BASE + ms})`);
      await sleep(40);
      evals.push(["sample-" + ms, await evaluate(probeSrc)]);
    }
    evals.push(["shot-simple", await shot("bdc-simple-600")]);
  } else if (scenario === "preview") {
    await evaluate("document.readyState");
    await sleep(500);
    evals.push(["preview", await evaluate(probeSrc)]);
    const scroll = await evaluate(`({y: Math.round(window.scrollY), target: (() => { const el = document.getElementById('${extraUrl.split('preview=')[1]}'); return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null; })()})`);
    evals.push(["scroll", scroll]);
    evals.push(["shot-preview", await shot("bdc-preview-bypass")]);
  } else if (scenario === "regress") {
    // After the overlay is fully clear, exercise untouched behaviour.
    await evaluate(`window.__step(${BASE + 1450})`);
    await sleep(1300);
    evals.push(["post-load", await evaluate(probeSrc)]);
    await evaluate(`document.querySelector('.nav-toggle').click()`);
    await sleep(150);
    evals.push(["nav-closed-state", await evaluate(probeSrc)]);
    await evaluate(`document.querySelector('.nav-toggle').click()`);
    await sleep(150);
    evals.push(["nav-open", await evaluate(probeSrc)]);
    evals.push(["shot-nav-open", await shot("bdc-regress-nav-open")]);
    await evaluate(`document.querySelector('.nav-toggle').click()`);
    await sleep(100);
    // Accordion one-at-a-time behaviour.
    await evaluate(`(() => { const rows = document.querySelectorAll('.project-row'); if (rows[0]) rows[0].open = true; })()`);
    await sleep(100);
    await evaluate(`(() => { const rows = document.querySelectorAll('.project-row'); if (rows[1]) rows[1].open = true; })()`);
    await sleep(100);
    evals.push(["accordion", await evaluate(probeSrc)]);
    // Reveal-on-scroll: force scroll down, then up.
    await evaluate(`window.scrollTo(0, document.querySelector('#about').offsetTop)`);
    await sleep(600);
    evals.push(["reveals-after-scroll", await evaluate(probeSrc)]);
    evals.push(["shot-about", await shot("bdc-regress-about")]);
  }

  console.log("EVENTS=" + JSON.stringify(evals));
  try { await rpc("Target.closeTarget", { targetId }); } catch (e) {}
  ws.close();
}

main().catch((err) => { console.error("DRIVE-FAIL", err); process.exit(1); });