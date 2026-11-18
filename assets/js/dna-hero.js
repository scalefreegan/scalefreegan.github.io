// Digital DNA double-strand "rain" hero — built with React, drawn on canvas.
// Two interleaved strands of falling nucleotide glyphs twist gently and are
// occasionally joined by a sweeping base-pair "rung", like a matrix-rain
// double helix. Respects prefers-reduced-motion.

import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";

const h = React.createElement;
const GLYPHS = "ATCGATCGUATCG01".split("");

function withOpacity(rgb, opa) {
  return rgb.replace("OPA", opa.toFixed(2));
}

const COLOR_A = "rgba(94, 234, 212, OPA)"; // teal strand
const COLOR_B = "rgba(143, 181, 255, OPA)"; // blue strand
const COLOR_RUNG = "rgba(245, 194, 107, OPA)"; // amber base-pair rung
const HEAD_A = "#bdfff0";
const HEAD_B = "#dbe7ff";

function DnaRain() {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return undefined;

    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let fontSize = 16;
    let drops = [];
    let mouseX = -9999;
    let mouseY = -9999;
    let frame = 0;
    let rungY = -60;
    let raf = null;

    function setup() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fontSize = width < 640 ? 13 : 16;
      const cols = Math.max(8, Math.floor(width / fontSize));
      drops = new Array(cols).fill(0).map((_, i) => ({
        y: Math.random() * -height,
        speed: 0.6 + Math.random() * 0.7,
        side: i % 2 === 0 ? "a" : "b",
        phase: Math.random() * Math.PI * 2,
        char: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        changeAt: Math.random() * 20,
      }));
      ctx.fillStyle = "#0a0d0b";
      ctx.fillRect(0, 0, width, height);
    }

    function xFor(i, d) {
      const twist = Math.sin(frame * 0.012 + d.phase) * (fontSize * 0.9);
      return i * fontSize + twist * (d.side === "a" ? 1 : -1) + fontSize / 2;
    }

    function draw() {
      frame++;
      ctx.fillStyle = "rgba(10,13,11,0.14)";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textBaseline = "top";

      rungY += 1.6;
      if (rungY > height + 60) rungY = -60;

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        const x = xFor(i, d);

        d.changeAt -= 1;
        if (d.changeAt <= 0) {
          d.char = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          d.changeAt = 8 + Math.random() * 24;
        }

        const distToMouse = Math.hypot(x - mouseX, d.y - mouseY);
        const boost = distToMouse < 90 ? (90 - distToMouse) / 90 : 0;
        const base = d.side === "a" ? 0.8 : 0.58;
        ctx.fillStyle = withOpacity(
          d.side === "a" ? COLOR_A : COLOR_B,
          Math.min(1, base + boost * 0.3)
        );
        ctx.fillText(d.char, x, d.y);

        if (boost > 0.5) {
          ctx.fillStyle = d.side === "a" ? HEAD_A : HEAD_B;
          ctx.fillText(d.char, x, d.y);
        }

        // sweeping base-pair rung between adjacent a/b columns
        if (d.side === "a" && i + 1 < drops.length) {
          const partner = drops[i + 1];
          if (Math.abs(d.y - rungY) < 9) {
            const x2 = xFor(i + 1, partner);
            ctx.strokeStyle = withOpacity(COLOR_RUNG, 0.4);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + fontSize * 0.3, d.y + fontSize * 0.5);
            ctx.lineTo(x2 + fontSize * 0.3, d.y + fontSize * 0.5);
            ctx.stroke();
          }
        }

        d.y += d.speed * fontSize * 0.09;
        if (d.y > height + fontSize) {
          d.y = -fontSize - Math.random() * 220;
        }
      }

      raf = requestAnimationFrame(draw);
    }

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    }
    function onLeave() {
      mouseX = -9999;
      mouseY = -9999;
    }
    function onResize() {
      setup();
    }

    setup();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", onResize);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return h("canvas", { ref: canvasRef, id: "dna-canvas", "aria-hidden": "true" });
}

const mount = document.getElementById("dna-root");
if (mount) {
  createRoot(mount).render(h(DnaRain));
}
