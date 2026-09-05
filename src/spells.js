import * as THREE from "three";
import { SplatEdit, SplatEditSdf, SplatEditSdfType, SplatEditRgbaBlendMode } from "@sparkjsdev/spark";

// Spells. Say the words (Chrome speech recognition) or press 1-6.
// Lumos lights the real splats around the wand tip through Spark's SDF edits.
// Reducto blows a hole in them. The rest are particles, bolts, and lifts.
const SPELLS = [
  { key: "Digit1", name: "Lumos", words: ["lumos", "loomos", "lumas", "luminous"] },
  { key: "Digit2", name: "Incendio", words: ["incendio", "incendia", "in sendio"] },
  { key: "Digit3", name: "Expecto Patronum", words: ["patronum", "patronus", "expecto", "expect a patron"] },
  { key: "Digit4", name: "Expelliarmus", words: ["expelliarmus", "expelliarmous", "expel", "armus"] },
  { key: "Digit5", name: "Wingardium Leviosa", words: ["leviosa", "leviosar", "wingardium", "levio"] },
  { key: "Digit6", name: "Reducto", words: ["reducto", "reductor", "reduct"] },
  { key: "Digit0", name: "Nox", words: ["nox", "knox"] },
];

export class Spells {
  constructor(scene, camera, hud) {
    this.scene = scene; this.camera = camera; this.hud = hud;
    this.R = 10; this.targets = () => [];
    this.fx = []; this.lumos = null; this.enabled = false;
    this.sfx = Object.fromEntries(["lumos", "incendio", "patronum", "expelliarmus", "leviosa", "reducto"].map((n) => [n, new Audio(`/audio/sfx/${n}.mp3`)]));
    // Wand in the right hand
    this.wand = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.009, 0.36, 10), new THREE.MeshStandardMaterial({ color: 0x3b2418, roughness: 0.7 }));
    stick.rotation.x = -Math.PI / 2 + 0.3; stick.position.set(0, 0, -0.16); this.wand.add(stick);
    this.tip = new THREE.Object3D(); this.tip.position.set(0, 0.052, -0.33); this.wand.add(this.tip);
    this.tipGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff2c0, transparent: true, opacity: 0, depthTest: false, blending: THREE.AdditiveBlending }));
    this.tipGlow.scale.setScalar(0.12); this.tip.add(this.tipGlow);
    this.light = new THREE.PointLight(0xffe0a0, 0, 20); this.tip.add(this.light);
    camera.add(this.wand);
    this.setScale(10);

    window.addEventListener("keydown", (e) => {
      if (!this.enabled || e.target?.tagName === "INPUT") return;
      const s = SPELLS.find((x) => x.key === e.code); if (s && !e.repeat) this.cast(s.name);
    });
    this.setupVoice();
  }

  // R sizes the effects. `hand` sizes the wand: eye height on foot, hidden on the broom.
  setScale(R, hand = null) {
    this.R = R;
    this.wand.visible = hand != null;
    const s = hand ?? R / 10;
    this.wand.position.set(0.16 * s, -0.12 * s, -0.28 * s);
    this.wand.scale.setScalar(s * 0.9);
    this.light.distance = R * 0.6;
  }

  setupVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    this.rec = new SR(); this.rec.lang = "en-US"; this.rec.continuous = true; this.rec.interimResults = true;
    this.rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.toLowerCase();
        this.hud.setListen(t);
        const s = SPELLS.find((x) => x.words.some((w) => t.includes(w)));
        if (s && (e.results[i].isFinal || t.length > 4) && this.lastHeard !== s.name + i) { this.lastHeard = s.name + i; this.cast(s.name); }
      }
    };
    this.rec.onend = () => { if (this.listening) { try { this.rec.start(); } catch {} } };
  }
  listen(on) {
    if (!this.rec) return;
    this.listening = on;
    try { on ? this.rec.start() : this.rec.stop(); } catch {}
    this.hud.setListen(on ? "listening for spells…" : "");
  }

  tipWorld() { return this.tip.getWorldPosition(new THREE.Vector3()); }
  forward() { return this.camera.getWorldDirection(new THREE.Vector3()); }
  play(name) { const a = this.sfx[name]; if (a) { a.currentTime = 0; a.volume = 0.8; a.play().catch(() => {}); } }

  cast(name) {
    if (!this.enabled) return;
    this.hud.setSpell(name);
    const R = this.R, tip = this.tipWorld(), dir = this.forward();
    switch (name) {
      case "Lumos": return this.castLumos();
      case "Nox": return this.nox();
      case "Incendio": this.play("incendio"); return this.particles({ color: [0xff6a00, 0xffc400, 0xff2a00], count: 260, origin: tip, dir, speed: R * 0.5, spread: 0.18, life: 1.4, size: R * 0.035, rise: R * 0.25, glow: { color: 0xff7a1a, at: tip.clone().addScaledVector(dir, R * 0.3), radius: R * 0.2, life: 1.2 } });
      case "Expecto Patronum": this.play("patronum"); this.particles({ color: [0x9ed8ff, 0xffffff, 0x4fb6ff], count: 700, origin: tip, dir, speed: R * 0.35, spread: 0.35, life: 3.2, size: R * 0.05, rise: R * 0.05, swirl: true, glow: { color: 0x66c2ff, at: tip.clone().addScaledVector(dir, R * 0.35), radius: R * 0.45, life: 3.0, travel: dir.clone().multiplyScalar(R * 0.12) } }); return;
      case "Expelliarmus": this.play("expelliarmus"); return this.bolt({ color: 0xff3b3b, origin: tip, dir, speed: R * 1.2, onHit: (t) => this.knockback(t, dir) });
      case "Wingardium Leviosa": this.play("leviosa"); return this.levitate(this.nearestTarget(dir));
      case "Reducto": this.play("reducto"); return this.reducto(tip.clone().addScaledVector(dir, R * 0.45));
    }
  }

  // ---- Lumos: additive SDF light on the splats plus a real light for meshes
  castLumos() {
    this.play("lumos");
    if (!this.lumos) {
      const edit = new SplatEdit({ rgbaBlendMode: SplatEditRgbaBlendMode.ADD_RGBA, softEdge: this.R * 0.25 });
      const sdf = new SplatEditSdf({ type: SplatEditSdfType.SPHERE, radius: this.R * 0.12, color: new THREE.Color(0.55, 0.42, 0.18), opacity: 0 });
      edit.add(sdf); this.scene.add(edit);
      this.lumos = { edit, sdf, t: 0 };
    }
    this.tipGlow.material.opacity = 1; this.light.intensity = 4;
  }
  nox() { if (this.lumos) { this.scene.remove(this.lumos.edit); this.lumos = null; } this.tipGlow.material.opacity = 0; this.light.intensity = 0; }

  // ---- Reducto: multiply opacity to zero inside a growing sphere, then heal
  reducto(at) {
    const edit = new SplatEdit({ rgbaBlendMode: SplatEditRgbaBlendMode.MULTIPLY, softEdge: this.R * 0.05 });
    const sdf = new SplatEditSdf({ type: SplatEditSdfType.SPHERE, radius: 0.01, color: new THREE.Color(1, 1, 1), opacity: 0 });
    sdf.position.copy(at); edit.add(sdf); this.scene.add(edit);
    this.fx.push({ kind: "reducto", edit, sdf, t: 0, max: this.R * 0.22 });
    this.particles({ color: [0xd9c9a8, 0x8a7a60, 0xffe9a8], count: 220, origin: at, dir: new THREE.Vector3(0, 1, 0), speed: this.R * 0.35, spread: 1.0, life: 1.6, size: this.R * 0.04, rise: -this.R * 0.5 });
    this.shake = 0.5;
  }

  // ---- generic particle burst
  particles({ color, count, origin, dir, speed, spread, life, size, rise = 0, swirl = false, glow = null }) {
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), vel = [];
    const palette = color.map((c) => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      pos.set([origin.x, origin.y, origin.z], i * 3);
      const c = palette[i % palette.length]; col.set([c.r, c.g, c.b], i * 3);
      const v = dir.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(spread)).normalize().multiplyScalar(speed * (0.5 + Math.random()));
      vel.push(v);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size, vertexColors: true, map: glowTexture(), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat); this.scene.add(pts);
    const fx = { kind: "particles", pts, vel, t: 0, life, rise, swirl, origin: origin.clone(), dir: dir.clone() };
    if (glow) {
      const edit = new SplatEdit({ rgbaBlendMode: SplatEditRgbaBlendMode.ADD_RGBA, softEdge: glow.radius });
      const c = new THREE.Color(glow.color);
      const sdf = new SplatEditSdf({ type: SplatEditSdfType.SPHERE, radius: glow.radius * 0.5, color: c.multiplyScalar(0.6), opacity: 0 });
      sdf.position.copy(glow.at); edit.add(sdf); this.scene.add(edit);
      fx.glow = { edit, sdf, life: glow.life, travel: glow.travel, base: sdf.color.clone() };
    }
    this.fx.push(fx);
  }

  // ---- bolt that flies forward and hits the first target in its path
  bolt({ color, origin, dir, speed, onHit }) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(this.R * 0.02, 10, 10), new THREE.MeshBasicMaterial({ color }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(this.R * 0.14); m.add(glow);
    m.position.copy(origin); this.scene.add(m);
    this.fx.push({ kind: "bolt", m, dir: dir.clone(), speed, t: 0, onHit, color });
  }

  nearestTarget(dir) {
    const tip = this.tipWorld();
    let best = null, bestScore = Infinity;
    for (const t of this.targets()) {
      const to = t.root.position.clone().sub(tip); const d = to.length();
      const ang = to.normalize().angleTo(dir);
      if (ang < 0.6 && d < this.R * 0.9 && d < bestScore) { best = t; bestScore = d; }
    }
    return best;
  }
  knockback(t, dir) {
    if (!t) return;
    this.particles({ color: [0xff5a5a, 0xffffff], count: 120, origin: t.root.position.clone().add(new THREE.Vector3(0, t.h * 0.6, 0)), dir: dir.clone(), speed: this.R * 0.3, spread: 0.8, life: 0.8, size: this.R * 0.035 });
    this.fx.push({ kind: "knock", t, dir: dir.clone(), t0: 0, base: t.root.position.clone() });
  }
  levitate(t) {
    if (!t) { this.hud.setSpell("Wingardium Leviosa… nothing to lift"); return; }
    this.fx.push({ kind: "lift", t, t0: 0, base: t.root.position.clone(), h: t.h * 1.2 });
    this.particles({ color: [0xfff3b0, 0xffd36a], count: 90, origin: t.root.position.clone(), dir: new THREE.Vector3(0, 1, 0), speed: this.R * 0.12, spread: 0.6, life: 2.5, size: this.R * 0.03 });
  }

  update(dt, time) {
    if (this.lumos) {
      this.lumos.sdf.position.copy(this.tipWorld());
      const f = 1 + Math.sin(time * 9) * 0.06; this.tipGlow.scale.setScalar(0.12 * f); this.light.intensity = 4 * f;
    }
    if (this.shake > 0) { this.shake -= dt; const k = this.shake * this.R * 0.004; this.camera.position.x += (Math.random() - 0.5) * k; this.camera.position.y += (Math.random() - 0.5) * k; }
    const keep = [];
    for (const f of this.fx) {
      f.t = (f.t ?? 0) + dt; f.t0 = (f.t0 ?? 0) + dt;
      if (f.kind === "particles") {
        const a = f.pts.geometry.attributes.position;
        for (let i = 0; i < f.vel.length; i++) {
          const v = f.vel[i];
          let x = a.array[i * 3] + v.x * dt, y = a.array[i * 3 + 1] + (v.y + f.rise * f.t) * dt, z = a.array[i * 3 + 2] + v.z * dt;
          if (f.swirl) { const s = Math.sin(f.t * 6 + i) * this.R * 0.15 * dt; x += s * f.dir.z; z -= s * f.dir.x; }
          a.array[i * 3] = x; a.array[i * 3 + 1] = y; a.array[i * 3 + 2] = z;
        }
        a.needsUpdate = true; f.pts.material.opacity = Math.max(0, 1 - f.t / f.life);
        if (f.glow) {
          const k = Math.sin(Math.min(1, f.t / f.glow.life) * Math.PI);
          f.glow.sdf.color.copy(f.glow.base).multiplyScalar(k);
          if (f.glow.travel) f.glow.sdf.position.addScaledVector(f.glow.travel, dt);
          if (f.t > f.glow.life) { this.scene.remove(f.glow.edit); f.glow = null; }
        }
        if (f.t > f.life) { this.scene.remove(f.pts); f.pts.geometry.dispose(); if (f.glow) this.scene.remove(f.glow.edit); continue; }
      } else if (f.kind === "bolt") {
        f.m.position.addScaledVector(f.dir, f.speed * dt);
        const hit = this.targets().find((t) => t.root.position.distanceTo(f.m.position) < t.h * 0.6);
        if (hit || f.t > 2.5) { this.scene.remove(f.m); if (hit) f.onHit?.(hit); continue; }
      } else if (f.kind === "knock") {
        const k = f.t0 / 0.6;
        f.t.root.position.copy(f.base).addScaledVector(f.dir, Math.sin(Math.min(1, k) * Math.PI / 2) * this.R * 0.12);
        f.t.root.rotation.x = Math.sin(Math.min(1, k) * Math.PI) * 0.5;
        if (k > 1) { f.t.root.rotation.x = 0; continue; }
      } else if (f.kind === "lift") {
        const T = 5, k = f.t0 / T;
        const up = k < 0.2 ? k / 0.2 : k > 0.85 ? Math.max(0, (1 - k) / 0.15) : 1;
        f.t.root.position.y = f.base.y + up * f.h + Math.sin(f.t0 * 3) * 0.05 * f.h;
        f.t.root.rotation.z = Math.sin(f.t0 * 2) * 0.15 * up; f.t.root.rotation.x = Math.cos(f.t0 * 1.7) * 0.12 * up;
        if (k > 1) { f.t.root.position.y = f.base.y; f.t.root.rotation.set(0, f.t.root.rotation.y, 0); continue; }
      } else if (f.kind === "reducto") {
        const T = 4;
        if (f.t < 0.5) f.sdf.radius = f.max * (f.t / 0.5);
        else if (f.t > 2.5) f.sdf.opacity = Math.min(1, (f.t - 2.5) / 1.5); // heal
        if (f.t > T) { this.scene.remove(f.edit); continue; }
      }
      keep.push(f);
    }
    this.fx = keep;
  }
}

let _glow;
function glowTexture() {
  if (_glow) return _glow;
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"); const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.4, "rgba(255,255,255,0.5)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  _glow = new THREE.CanvasTexture(c); return _glow;
}
