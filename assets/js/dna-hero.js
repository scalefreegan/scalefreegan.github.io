// Hero animation: nucleotides rain down matrix-style and self-assemble into a
// right-handed B-DNA double helix that runs across the bottom of the hero.
//
// Every nucleotide keeps its identity from the moment it appears. Each column
// of rain is one base pair: two complementary bases fall down the same column
// and settle onto the two strands. Colors follow the usual sequencing scheme
// (A green, T red, C blue, G yellow). Built with React; drawn on a canvas.

import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { helixRadius, strandOffset } from "./helix-geometry.js";

const h = React.createElement;

const BASES = ["A", "T", "C", "G"];
const COMPLEMENT = { A: "T", T: "A", C: "G", G: "C" };
const BASE_RGB = {
  A: [98, 222, 152], // green
  T: [240, 120, 120], // red
  C: [108, 166, 255], // blue
  G: [240, 202, 92], // yellow
};
const BACKBONE_RGB = [156, 176, 166];
const WHITE = [255, 255, 255];
const BACKGROUND = "10, 13, 11";
const FONT_STACK =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

const ROTATION_SPEED = (2 * Math.PI) / 40; // one slow turn every 40 s
const COLUMN_INTERVAL = 0.14; // seconds between neighbouring base pairs
const HOLD_SECONDS = 40; // how long a finished helix stays before the next one

const WAITING = 0;
const FALLING = 1;
const DOCKED = 2;
const LEAVING = 3;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a.toFixed(3)})`;
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

function createScene(canvas, reducedMotion) {
  const ctx = canvas.getContext("2d");

  let width = 0;
  let height = 0;
  let fontPx = 15;
  let rise = 22; // px between base pairs along the axis
  let radius = 68;
  let axisY = 0;
  let columns = 0;
  let firstX = 0;

  let now = 0; // animation clock, seconds
  let phase = "build"; // "build" | "hold"
  let holdUntil = 0;
  let generations = []; // each is an array of nucleotides: [k0s0, k0s1, k1s0, ...]
  let lastFont = "";
  let raf = 0;
  let lastTs = 0;
  let visible = true;

  function measure() {
    const rect = canvas.getBoundingClientRect();
    const widthChanged = Math.round(rect.width) !== Math.round(width);
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastFont = "";

    const small = width < 640;
    fontPx = small ? 13 : 15;
    rise = small ? 18 : 22;
    radius = helixRadius(rise);
    axisY = height - (small ? 34 : 40) - radius;
    columns = Math.ceil(width / rise) + 1;
    firstX = (width - (columns - 1) * rise) / 2;
    return widthChanged;
  }

  function newGeneration(assembled, delay) {
    const nts = [];
    for (let k = 0; k < columns; k++) {
      const base = BASES[(Math.random() * 4) | 0];
      for (let strand = 0; strand < 2; strand++) {
        nts.push({
          k,
          strand,
          base: strand === 0 ? base : COMPLEMENT[base],
          x: firstX + k * rise,
          y: -fontPx * (1 + Math.random() * 5),
          speed: 170 + Math.random() * 130,
          v: 0,
          startAt: now + delay + k * COLUMN_INTERVAL + Math.random() * 0.6,
          state: assembled ? DOCKED : WAITING,
          dockedAt: assembled ? -100 : 0,
          releaseAt: 0,
          released: false,
        });
      }
    }
    generations.push(nts);
  }

  function reset() {
    const assembled = reducedMotion || phase === "hold";
    generations = [];
    newGeneration(assembled, 0);
    phase = assembled ? "hold" : "build";
    holdUntil = now + HOLD_SECONDS;
  }

  // Let the finished helix fall away and rain in a new one.
  function reassemble() {
    for (const nt of generations[generations.length - 1]) {
      nt.state = LEAVING;
      nt.released = false;
      nt.releaseAt = now + nt.k * 0.022 + Math.random() * 0.15;
    }
    newGeneration(false, 0.35);
    phase = "build";
  }

  const rotation = () => now * ROTATION_SPEED;
  const slotY = (nt, rot) =>
    axisY + radius * strandOffset(nt.k, nt.strand, rot).dy;
  const attached = (nt) =>
    nt.state === DOCKED || (nt.state === LEAVING && !nt.released);

  function step(dt) {
    now += dt;
    const rot = rotation();
    let assembled = true;

    for (const nts of generations) {
      for (const nt of nts) {
        if (nt.state === WAITING) {
          if (now < nt.startAt) {
            assembled = false;
            continue;
          }
          nt.state = FALLING;
        }
        if (nt.state === FALLING) {
          // Fall at full speed, then ease into the slot over the last stretch.
          const target = slotY(nt, rot);
          nt.v = Math.min(nt.speed, 26 + (target - nt.y) * 6);
          nt.y += nt.v * dt;
          if (target - nt.y < 0.75) {
            nt.state = DOCKED;
            nt.dockedAt = now;
          } else {
            assembled = false;
          }
        } else if (nt.state === LEAVING && now >= nt.releaseAt) {
          if (!nt.released) {
            nt.released = true;
            nt.y = slotY(nt, rot);
            nt.v = 0;
          }
          nt.v += 1500 * dt;
          nt.y += nt.v * dt;
        }
      }
    }

    if (phase === "build" && assembled) {
      phase = "hold";
      holdUntil = now + HOLD_SECONDS;
    } else if (phase === "hold" && now >= holdUntil) {
      reassemble();
    }

    const last = generations.length - 1;
    generations = generations.filter(
      (nts, i) =>
        i === last ||
        nts.some((nt) => !nt.released || nt.y < height + fontPx * 2)
    );
  }

  function setFont(size, weight) {
    const px = Math.round(size * 2) / 2;
    const key = `${weight} ${px}`;
    if (key !== lastFont) {
      ctx.font = `${weight} ${px}px ${FONT_STACK}`;
      lastFont = key;
    }
  }

  function drawFalling(nt) {
    const rgb = BASE_RGB[nt.base];
    const fadeIn = clamp01((nt.y + fontPx) / 70);
    const moving = clamp01(nt.v / nt.speed);
    setFont(fontPx, 500);
    // Matrix-style trail: fading echoes of the same base above it.
    for (let i = 5; i >= 1; i--) {
      const a = 0.34 * moving * fadeIn * Math.pow(1 - i / 6, 1.5);
      if (a < 0.01) continue;
      ctx.fillStyle = rgba(rgb, a);
      ctx.fillText(nt.base, nt.x, nt.y - i * fontPx * 1.1);
    }
    ctx.fillStyle = rgba(rgb, 0.85 * fadeIn);
    ctx.fillText(nt.base, nt.x, nt.y);
  }

  function drawReleased(nt) {
    setFont(fontPx, 500);
    ctx.fillStyle = rgba(BASE_RGB[nt.base], 0.55);
    ctx.fillText(nt.base, nt.x, nt.y);
  }

  function drawLetter(nt, p) {
    const depth = (p.z + 1) / 2; // 0 = far side, 1 = near side
    const size = fontPx * (0.84 + 0.3 * depth);
    const flash = clamp01(1 - (now - nt.dockedAt) / 0.4);
    // Mask what is behind, so the near strand visibly passes in front.
    ctx.fillStyle = `rgba(${BACKGROUND}, 0.9)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 0.58, 0, Math.PI * 2);
    ctx.fill();
    setFont(size, depth > 0.5 ? 600 : 500);
    ctx.fillStyle = rgba(
      mix(BASE_RGB[nt.base], WHITE, 0.65 * flash),
      Math.min(1, 0.3 + 0.7 * depth + 0.5 * flash)
    );
    ctx.fillText(nt.base, p.x, p.y + 0.5);
  }

  function drawBackbone(p, q, z, since) {
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy);
    const gap = fontPx * 0.62;
    if (len <= gap * 2 + 1) return;
    const depth = (z + 1) / 2;
    const fade = clamp01((now - since) / 0.45);
    const ux = dx / len;
    const uy = dy / len;
    ctx.strokeStyle = rgba(BACKBONE_RGB, (0.1 + 0.4 * depth) * fade);
    ctx.lineWidth = 1 + 0.8 * depth;
    ctx.beginPath();
    ctx.moveTo(p.x + ux * gap, p.y + uy * gap);
    ctx.lineTo(q.x - ux * gap, q.y - uy * gap);
    ctx.stroke();
  }

  function drawRung(a, pa, b, pb, z) {
    const [top, topP, bottom, bottomP] =
      pa.y < pb.y ? [a, pa, b, pb] : [b, pb, a, pa];
    const gap = fontPx * 0.7;
    const y1 = topP.y + gap;
    const y2 = bottomP.y - gap;
    if (y2 - y1 < 4) return;
    const mid = (y1 + y2) / 2;
    const fade = clamp01((now - Math.max(a.dockedAt, b.dockedAt)) / 0.45);
    const alpha = (0.2 + 0.25 * ((z + 1) / 2)) * fade;
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = rgba(BASE_RGB[top.base], alpha);
    ctx.beginPath();
    ctx.moveTo(topP.x, y1);
    ctx.lineTo(topP.x, mid - 1.5);
    ctx.stroke();
    ctx.strokeStyle = rgba(BASE_RGB[bottom.base], alpha);
    ctx.beginPath();
    ctx.moveTo(topP.x, mid + 1.5);
    ctx.lineTo(topP.x, y2);
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineCap = "round";
    const rot = rotation();

    for (const nts of generations) {
      for (const nt of nts) {
        if (nt.state === FALLING) drawFalling(nt);
        else if (nt.state === LEAVING && nt.released) drawReleased(nt);
      }

      const pos = nts.map((nt) => {
        if (!attached(nt)) return null;
        const o = strandOffset(nt.k, nt.strand, rot);
        return { x: nt.x, y: axisY + radius * o.dy, z: o.z };
      });

      // Collect every piece of the helix, then paint far-to-near.
      const items = [];
      for (let i = 0; i < nts.length; i += 2) {
        const pa = pos[i];
        const pb = pos[i + 1];
        if (pa) items.push({ z: pa.z, draw: () => drawLetter(nts[i], pa) });
        if (pb) items.push({ z: pb.z, draw: () => drawLetter(nts[i + 1], pb) });
        if (pa && pb) {
          const z = (pa.z + pb.z) / 2;
          items.push({ z, draw: () => drawRung(nts[i], pa, nts[i + 1], pb, z) });
        }
        for (let s = 0; s < 2; s++) {
          const p = pos[i + s];
          const q = pos[i + 2 + s];
          if (!p || !q) continue;
          const z = (p.z + q.z) / 2;
          const since = Math.max(nts[i + s].dockedAt, nts[i + 2 + s].dockedAt);
          items.push({ z, draw: () => drawBackbone(p, q, z, since) });
        }
      }
      items.sort((m, n) => m.z - n.z);
      for (const item of items) item.draw();
    }
  }

  function frame(ts) {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
    lastTs = ts;
    step(dt);
    draw();
    schedule();
  }

  function schedule() {
    if (!raf && visible && !reducedMotion) raf = requestAnimationFrame(frame);
  }

  const resizeObserver = new ResizeObserver(() => {
    if (measure()) reset();
    draw();
    schedule();
  });
  resizeObserver.observe(canvas);

  // Repaint once the web font arrives (matters for the static, reduced-motion frame).
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      lastFont = "";
      draw();
    });
  }

  // Stop animating while the hero is scrolled out of view.
  const intersectionObserver = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    schedule();
  });
  intersectionObserver.observe(canvas);

  // Click the helix to rain in a fresh one.
  function onPointerDown() {
    if (!reducedMotion && phase === "hold") reassemble();
  }
  canvas.addEventListener("pointerdown", onPointerDown);

  return function destroy() {
    if (raf) cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    canvas.removeEventListener("pointerdown", onPointerDown);
  };
}

function DnaHelix() {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    return createScene(canvasRef.current, reducedMotion);
  }, []);

  return h("canvas", { ref: canvasRef, id: "dna-canvas", "aria-hidden": "true" });
}

const mount = document.getElementById("dna-root");
if (mount) {
  createRoot(mount).render(h(DnaHelix));
}
