export class Hud {
  constructor() {
    this.timer = document.getElementById("timer");
    this.rings = document.getElementById("rings");
    this.msg = document.getElementById("msg");
    this.speed = document.getElementById("speed");
    this.loading = document.getElementById("loading");
    this.best = Number(localStorage.getItem("splatwarts_best") || 0) || null;
  }
  setTime(t) { this.timer.textContent = t.toFixed(2); }
  setRings(n, total) { this.rings.textContent = `${n} / ${total}`; }
  setMsg(s) { this.msg.textContent = s; }
  setSpeed(v) { this.speed.textContent = `${Math.round(v * 3.6)} km/h`; }
  setLoading(s) { this.loading.textContent = s; }
  setSpell(name) {
    const el = document.getElementById("spell"); el.textContent = name.toUpperCase();
    el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
    clearTimeout(this._spellT); this._spellT = setTimeout(() => { el.textContent = ""; }, 1800);
  }
  setListen(s) { document.getElementById("listen").textContent = s; }
  finish(t) {
    let line = `Finished in ${t.toFixed(2)}s`;
    if (!this.best || t < this.best) { this.best = t; localStorage.setItem("splatwarts_best", String(t)); line += "  ·  New best!"; }
    else line += `  ·  Best ${this.best.toFixed(2)}s`;
    this.setMsg(line + "\nPress R to fly again");
  }
}

// Tiny chime on ring pass. No assets needed.
let ctx;
export function chime(step = 0) {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 660 * Math.pow(1.06, step);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.4);
  } catch {}
}

// Background music. Starts on the first click (browsers block autoplay), ducks while talking.
export const music = {
  el: null,
  start() {
    if (this.el) return;
    const a = new Audio("/audio/theme.mp3"); a.loop = true; a.volume = 0.35;
    a.play().catch(() => {});
    this.el = a;
  },
  duck(on) { if (this.el) this.el.volume = on ? 0.12 : 0.35; if (this.amb) this.amb.volume = on ? 0.15 : 0.45; },
  // Per-world ambience loop (wind over the lake, candles in the hall). Crossfades on world change.
  amb: null, ambUrl: null,
  ambience(url) {
    if (url === this.ambUrl) return;
    this.ambUrl = url;
    const old = this.amb; this.amb = null;
    if (old) { const fade = setInterval(() => { old.volume = Math.max(0, old.volume - 0.05); if (old.volume <= 0) { old.pause(); clearInterval(fade); } }, 80); }
    if (!url) return;
    const a = new Audio(url); a.loop = true; a.volume = 0;
    a.play().catch(() => {});
    this.amb = a;
    const up = setInterval(() => { if (this.amb !== a) return clearInterval(up); a.volume = Math.min(0.45, a.volume + 0.03); if (a.volume >= 0.45) clearInterval(up); }, 80);
  },
};
