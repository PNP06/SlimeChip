(() => {
  'use strict';

  const canvas = document.getElementById('slimeCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  const els = {
    title: document.getElementById('title'),
    hintTitle: document.getElementById('hintTitle'),
    hintText: document.getElementById('hintText'),
    soundButton: document.getElementById('soundButton'),
    settingsButton: document.getElementById('settingsButton'),
    closeSettingsButton: document.getElementById('closeSettingsButton'),
    settingsPanel: document.getElementById('settingsPanel'),
    settingsScrim: document.getElementById('settingsScrim'),
    zenMode: document.getElementById('zenMode'),
    wildMode: document.getElementById('wildMode'),
    resetButton: document.getElementById('resetButton'),
    elasticity: document.getElementById('elasticity'),
    bubbles: document.getElementById('bubbles'),
    shine: document.getElementById('shine'),
    chips: document.getElementById('chips'),
    tools: Array.from(document.querySelectorAll('.tool')),
    swatches: Array.from(document.querySelectorAll('.swatch')),
  };

  const palettes = {
    aurora: ['#a78bfa', '#22d3ee', '#f0abfc', '#eff6ff'],
    lagoon: ['#22d3ee', '#14b8a6', '#a7f3d0', '#ecfeff'],
    candy: ['#fb7185', '#f9a8d4', '#facc15', '#fff1f2'],
    lava: ['#fb923c', '#ef4444', '#facc15', '#fff7ed'],
    nebula: ['#6d28d9', '#2563eb', '#db2777', '#f5d0fe'],
  };

  const hints = {
    zen: {
      squish: ['Respiration lente', 'Maintiens le doigt : le slime se detend, gonfle puis revient.'],
      stretch: ['Etirement doux', 'Glisse lentement : il suit ton mouvement comme une pate souple.'],
      pop: ['Bulles calmes', 'Tape les bulles lumineuses pour les faire eclater doucement.'],
      swirl: ['Tourbillon lent', 'Fais des cercles : les couleurs se melangent sans exploser.'],
      sparkle: ['Poussiere brillante', 'Saupoudre des paillettes puis malaxe pour les incorporer.'],
    },
    wild: {
      squish: ['Slime instable', 'Appuie vite : il rebondit, eclabousse et se deforme fortement.'],
      stretch: ['Elastique fou', 'Deux doigts ou un grand geste : ca tire, ca claque, ca revient.'],
      pop: ['Explosion de bulles', 'Tape rapidement pour declencher des rafales de pop.'],
      swirl: ['Cyclone neon', 'Tourne vite : la matiere part en spirale et projette des particules.'],
      sparkle: ['Confettis gelee', 'Dessine dans le slime pour le charger en paillettes reactives.'],
    },
  };

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    mode: 'zen',
    tool: 'squish',
    paletteName: 'aurora',
    palette: palettes.aurora,
    sound: true,
    time: 0,
    lastTime: performance.now(),
    center: { x: 0, y: 0 },
    baseRadius: 130,
    rotation: 0,
    moodPulse: 0,
    pointers: new Map(),
    points: [],
    bubbles: [],
    chips: [],
    particles: [],
    streaks: [],
    audio: null,
  };

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.floor(window.innerWidth);
    state.height = Math.floor(window.innerHeight);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    state.center.x = state.width / 2;
    state.center.y = state.height * (state.width < 720 ? 0.49 : 0.52);
    state.baseRadius = Math.min(state.width, state.height) * (state.width < 460 ? 0.41 : 0.37);
    createBlob();
    seedBubbles();
    seedChips();
  }

  function createBlob() {
    const count = 96;
    state.points = Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2,
      offset: Math.sin(i * 1.77) * 4,
      velocity: 0,
      tangent: 0,
    }));
  }

  function randomInside(scale = 0.72) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * state.baseRadius * scale;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }

  function seedBubbles() {
    state.bubbles = Array.from({ length: 30 }, () => {
      const p = randomInside(0.76);
      return {
        ...p,
        radius: 5 + Math.random() * 18,
        alpha: 0.18 + Math.random() * 0.34,
        phase: Math.random() * 100,
        wobble: 0.7 + Math.random() * 1.4,
      };
    });
  }

  function seedChips() {
    state.chips = Array.from({ length: 24 }, () => {
      const p = randomInside(0.68);
      return {
        ...p,
        size: 8 + Math.random() * 18,
        turn: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.8,
        phase: Math.random() * 100,
        color: Math.random() > 0.5 ? '#facc15' : '#fb923c',
      };
    });
  }

  function updateHint() {
    const [title, text] = hints[state.mode][state.tool];
    els.title.textContent = state.mode === 'zen' ? 'Mode tranquille' : 'Mode fou';
    els.hintTitle.textContent = title;
    els.hintText.textContent = text;
  }

  function cssVars() {
    document.documentElement.style.setProperty('--accent', state.palette[0]);
    document.documentElement.style.setProperty('--accent2', state.palette[1]);
    document.documentElement.style.setProperty('--bg1', mixHex(state.palette[0], '#020617', state.mode === 'zen' ? 0.78 : 0.65));
    document.documentElement.style.setProperty('--bg2', mixHex(state.palette[1], '#111827', state.mode === 'zen' ? 0.66 : 0.52));
  }

  function setSettings(open) {
    els.settingsPanel.hidden = !open;
    els.settingsScrim.hidden = !open;
    els.settingsButton.setAttribute('aria-expanded', String(open));
    haptic(open ? 8 : 4);
  }

  function setTool(tool) {
    state.tool = tool;
    els.tools.forEach((btn) => btn.classList.toggle('active', btn.dataset.tool === tool));
    updateHint();
    haptic(8);
  }

  function setMode(mode) {
    state.mode = mode;
    els.zenMode.classList.toggle('active', mode === 'zen');
    els.wildMode.classList.toggle('active', mode === 'wild');
    els.elasticity.value = mode === 'zen' ? Math.min(Number(els.elasticity.value), 68) : Math.max(Number(els.elasticity.value), 78);
    updateHint();
    cssVars();
    burst(state.center.x, state.center.y, mode === 'zen' ? 18 : 54, mode === 'zen' ? 0.9 : 2.1);
    playTone(mode === 'zen' ? 220 : 110, mode === 'zen' ? 0.05 : 0.08, 'triangle');
  }

  function setPalette(name) {
    state.paletteName = name;
    state.palette = palettes[name];
    els.swatches.forEach((btn) => btn.classList.toggle('active', btn.dataset.palette === name));
    cssVars();
    burst(state.center.x, state.center.y, 24, 1.1);
    playTone(260 + Math.random() * 180, 0.04, 'sine');
  }

  function resetSlime() {
    createBlob();
    seedBubbles();
    seedChips();
    state.particles = [];
    state.streaks = [];
    state.moodPulse = 1;
    burst(state.center.x, state.center.y, state.mode === 'zen' ? 24 : 58, state.mode === 'zen' ? 1 : 2.4);
    playTone(180, 0.07, 'sine');
    haptic(16);
  }

  function pointerPos(ev) {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  function onPointerDown(ev) {
    ev.preventDefault();
    canvas.setPointerCapture?.(ev.pointerId);
    const p = pointerPos(ev);
    state.pointers.set(ev.pointerId, { ...p, px: p.x, py: p.y, vx: 0, vy: 0, downTime: state.time });
    interact(p.x, p.y, 1, true);
    nudgeChips(p.x, p.y, 1.1);
    if (state.tool === 'pop') popAt(p.x, p.y);
    if (state.tool === 'sparkle') sparkleAt(p.x, p.y, state.mode === 'zen' ? 9 : 22);
  }

  function onPointerMove(ev) {
    const p0 = state.pointers.get(ev.pointerId);
    if (!p0) return;
    ev.preventDefault();
    const p = pointerPos(ev);
    const vx = p.x - p0.x;
    const vy = p.y - p0.y;
    p0.px = p0.x;
    p0.py = p0.y;
    p0.x = p.x;
    p0.y = p.y;
    p0.vx = vx;
    p0.vy = vy;
    const speed = Math.hypot(vx, vy);

    interact(p.x, p.y, Math.min(2.5, 0.55 + speed / 18), false, vx, vy);
    nudgeChips(p.x, p.y, Math.min(2, 0.6 + speed / 26));

    if (state.tool === 'swirl') {
      state.rotation += (vx * 0.0008 + vy * 0.0004) * (state.mode === 'wild' ? 2.7 : 1);
      addStreak(p0.px, p0.py, p.x, p.y, speed);
      if (speed > 7) sparkleAt(p.x, p.y, state.mode === 'wild' ? 5 : 2);
    }
    if (state.tool === 'sparkle') sparkleAt(p.x, p.y, state.mode === 'zen' ? 2 : 7);
    if (state.tool === 'pop' && speed > 9) popAt(p.x, p.y, true);
  }

  function onPointerUp(ev) {
    const p = state.pointers.get(ev.pointerId);
    if (p && state.tool === 'squish' && state.time - p.downTime > 0.4) {
      burst(p.x, p.y, state.mode === 'zen' ? 10 : 28, state.mode === 'zen' ? 0.65 : 1.7);
      playTone(150 + Math.random() * 110, 0.05, 'triangle');
    }
    state.pointers.delete(ev.pointerId);
  }

  function interact(x, y, force = 1, initial = false, vx = 0, vy = 0) {
    const dx = x - state.center.x;
    const dy = y - state.center.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) - state.rotation;
    const wild = state.mode === 'wild' ? 1.85 : 1;
    const elastic = Number(els.elasticity.value) / 100;
    const toolBoost = { squish: 1, stretch: 1.45, pop: 0.55, swirl: 0.95, sparkle: 0.45 }[state.tool];

    state.points.forEach((pt) => {
      const diff = angularDistance(pt.angle, angle);
      const local = Math.max(0, 1 - Math.abs(diff) / 0.72);
      if (local <= 0) return;

      let impulse;
      if (state.tool === 'stretch') {
        impulse = (dist - state.baseRadius * 0.68) * 0.028 * local * force * wild;
        pt.tangent += (vx * -Math.sin(pt.angle) + vy * Math.cos(pt.angle)) * 0.01 * local;
      } else if (state.tool === 'swirl') {
        impulse = Math.sin(diff * 3) * 7 * local * force * wild;
        pt.tangent += force * 0.42 * local * Math.sign(vx + vy || 1);
      } else {
        impulse = (state.baseRadius - dist) * -0.05 * local * force * toolBoost * wild;
      }
      pt.velocity += impulse * (0.4 + elastic);
    });

    if (initial) {
      state.moodPulse = Math.min(2.2, state.moodPulse + 0.25 * wild);
      playTone(180 + Math.random() * 180, state.mode === 'zen' ? 0.035 : 0.045, state.tool === 'pop' ? 'square' : 'sine');
      haptic(state.mode === 'zen' ? 5 : 10);
    }
  }

  function nudgeChips(x, y, force) {
    for (const c of state.chips) {
      const cx = state.center.x + c.x;
      const cy = state.center.y + c.y;
      const d = Math.hypot(x - cx, y - cy);
      if (d > 92) continue;
      const a = Math.atan2(cy - y, cx - x);
      const push = (1 - d / 92) * force * (state.mode === 'wild' ? 2.2 : 1);
      c.x += Math.cos(a) * push * 8;
      c.y += Math.sin(a) * push * 8;
      c.spin += push * 0.12;
      if (push > 0.75 && Math.random() > 0.75) sparkleAt(cx, cy, 2);
    }
  }

  function popAt(x, y, continuous = false) {
    if (continuous && Math.random() > 0.25) return;
    let popped = false;
    for (const b of state.bubbles) {
      const bx = state.center.x + b.x;
      const by = state.center.y + b.y;
      if (Math.hypot(x - bx, y - by) < b.radius + 28) {
        burst(bx, by, state.mode === 'zen' ? 16 : 38, state.mode === 'zen' ? 0.85 : 2.2);
        Object.assign(b, randomBubble());
        popped = true;
        break;
      }
    }
    if (!popped) burst(x, y, state.mode === 'zen' ? 7 : 19, state.mode === 'zen' ? 0.55 : 1.5);
    playTone(320 + Math.random() * 360, state.mode === 'zen' ? 0.025 : 0.035, 'sine');
    haptic(state.mode === 'zen' ? 6 : 14);
  }

  function randomBubble() {
    const p = randomInside(0.76);
    return {
      ...p,
      radius: 5 + Math.random() * 18,
      alpha: 0.18 + Math.random() * 0.34,
      phase: Math.random() * 100,
      wobble: 0.7 + Math.random() * 1.4,
    };
  }

  function sparkleAt(x, y, amount) {
    const mul = state.mode === 'wild' ? 1.45 : 1;
    for (let i = 0; i < amount; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.35 + Math.random() * 1.4) * mul;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * s + (Math.random() - 0.5),
        vy: Math.sin(a) * s + (Math.random() - 0.5),
        life: 0.55 + Math.random() * 1.1,
        maxLife: 1.6,
        size: 1.5 + Math.random() * 3.8,
        type: 'sparkle',
        color: state.palette[Math.floor(Math.random() * state.palette.length)],
      });
    }
  }

  function burst(x, y, amount, power) {
    for (let i = 0; i < amount; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.7 + Math.random() * 4.5) * power;
      state.particles.push({
        x: x + (Math.random() - 0.5) * 22,
        y: y + (Math.random() - 0.5) * 22,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.45 + Math.random() * 0.85,
        maxLife: 1.3,
        size: 2.2 + Math.random() * 7.5,
        type: Math.random() > 0.34 ? 'droplet' : 'sparkle',
        color: state.palette[Math.floor(Math.random() * state.palette.length)],
      });
    }
  }

  function addStreak(x1, y1, x2, y2, speed) {
    state.streaks.push({ x1, y1, x2, y2, life: 0.34 + Math.min(0.35, speed / 90), color: state.palette[Math.floor(Math.random() * 3)] });
    if (state.streaks.length > 30) state.streaks.shift();
  }

  function update(dt) {
    state.time += dt;
    const wild = state.mode === 'wild';
    const elastic = Number(els.elasticity.value) / 100;
    const spring = wild ? 8.4 + elastic * 8 : 5.5 + elastic * 5;
    const damping = wild ? 0.865 : 0.82;
    const activity = state.pointers.size > 0 ? 1 : 0;

    state.moodPulse += ((activity ? 0.65 : 0) - state.moodPulse) * Math.min(1, dt * 2.2);
    state.rotation *= 1 - Math.min(0.08, dt * 0.36);

    state.points.forEach((pt, i) => {
      const wave1 = Math.sin(state.time * (wild ? 4.8 : 1.8) + i * 0.24) * (wild ? 2.4 : 1.1);
      const wave2 = Math.sin(state.time * (wild ? 9.5 : 3.0) + i * 0.61) * (wild ? 1.2 : 0.45);
      const target = wave1 + wave2 + Math.sin(i * 2.2) * 1.5 * (1 - elastic);
      pt.velocity += (target - pt.offset) * spring * dt;
      pt.velocity *= Math.pow(damping, dt * 60);
      pt.offset += pt.velocity * dt * 60;
      pt.tangent *= Math.pow(0.88, dt * 60);
      pt.angle += pt.tangent * dt * 0.018;
      pt.offset = clamp(pt.offset, -state.baseRadius * 0.44, state.baseRadius * 0.64);
    });

    if (state.pointers.size >= 2 && state.tool === 'stretch') {
      const pts = Array.from(state.pointers.values());
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const pull = clamp((d - state.baseRadius * 0.9) / state.baseRadius, 0, 1.1);
      interact(pts[0].x, pts[0].y, 0.5 + pull, false);
      interact(pts[1].x, pts[1].y, 0.5 + pull, false);
    }

    state.bubbles.forEach((b) => {
      b.phase += dt * b.wobble;
      b.x += Math.sin(b.phase * 0.7) * dt * 1.6;
      b.y += Math.cos(b.phase * 0.5) * dt * 1.2;
      keepInside(b, 0.78);
    });

    state.chips.forEach((c) => {
      c.phase += dt;
      c.turn += c.spin * dt;
      c.spin *= Math.pow(0.94, dt * 60);
      c.x += Math.sin(c.phase * 1.1) * dt * 1.2;
      c.y += Math.cos(c.phase * 0.9) * dt;
      keepInside(c, 0.7);
    });

    state.particles = state.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= Math.pow(0.965, dt * 60);
      p.vy *= Math.pow(0.965, dt * 60);
      p.vy += (p.type === 'droplet' ? 0.045 : 0.005) * dt * 60;
      return p.life > 0;
    });

    state.streaks = state.streaks.filter((s) => {
      s.life -= dt;
      return s.life > 0;
    });
  }

  function keepInside(item, scale) {
    const max = state.baseRadius * scale;
    const d = Math.hypot(item.x, item.y);
    if (d > max) {
      item.x *= max / d;
      item.y *= max / d;
    }
  }

  function draw() {
    drawBackground();
    drawStreaks();
    drawSlime();
    drawParticles();
    drawFingerRipples();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, state.width, state.height);
    g.addColorStop(0, mixHex(state.palette[0], '#020617', state.mode === 'zen' ? 0.76 : 0.62));
    g.addColorStop(1, mixHex(state.palette[1], '#0f172a', state.mode === 'zen' ? 0.72 : 0.56));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.save();
    ctx.globalAlpha = state.mode === 'zen' ? 0.18 : 0.32;
    for (let i = 0; i < 7; i += 1) {
      const x = (Math.sin(state.time * 0.18 + i * 2.4) * 0.5 + 0.5) * state.width;
      const y = (Math.cos(state.time * 0.14 + i * 1.9) * 0.5 + 0.5) * state.height;
      const r = Math.max(state.width, state.height) * (0.18 + i * 0.012);
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, hexToRgba(state.palette[i % 3], 0.38));
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function getBlobPoints() {
    return state.points.map((pt, i) => {
      const wobble = 1 + state.moodPulse * 0.025 * Math.sin(state.time * 6 + i);
      const r = (state.baseRadius + pt.offset) * wobble;
      const a = pt.angle + state.rotation;
      return {
        x: state.center.x + Math.cos(a) * r,
        y: state.center.y + Math.sin(a) * r,
      };
    });
  }

  function blobPath(pts) {
    ctx.beginPath();
    const n = pts.length;
    for (let i = 0; i < n; i += 1) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      if (i === 0) ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.closePath();
  }

  function drawSlime() {
    const pts = getBlobPoints();

    ctx.save();
    ctx.shadowColor = hexToRgba(state.palette[0], state.mode === 'zen' ? 0.36 : 0.62);
    ctx.shadowBlur = state.mode === 'zen' ? 44 : 70;
    ctx.shadowOffsetY = 22;
    blobPath(pts);
    const fill = ctx.createRadialGradient(
      state.center.x - state.baseRadius * 0.35,
      state.center.y - state.baseRadius * 0.45,
      10,
      state.center.x,
      state.center.y,
      state.baseRadius * 1.35
    );
    fill.addColorStop(0, hexToRgba(state.palette[3], 0.98));
    fill.addColorStop(0.26, hexToRgba(state.palette[0], 0.94));
    fill.addColorStop(0.68, hexToRgba(state.palette[1], 0.9));
    fill.addColorStop(1, hexToRgba(mixHex(state.palette[2], '#000000', 0.22), 0.96));
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();

    ctx.save();
    blobPath(pts);
    ctx.clip();
    drawInsideTexture();
    drawChips();
    drawBubbles();
    drawShine();
    ctx.restore();

    ctx.save();
    blobPath(pts);
    ctx.lineWidth = state.mode === 'zen' ? 3 : 4.5;
    ctx.strokeStyle = hexToRgba('#ffffff', state.mode === 'zen' ? 0.34 : 0.46);
    ctx.stroke();
    ctx.lineWidth = 10;
    ctx.strokeStyle = hexToRgba(state.palette[2], 0.16);
    ctx.stroke();
    ctx.restore();
  }

  function drawInsideTexture() {
    const shine = Number(els.shine.value) / 100;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.13 + shine * 0.18;
    for (let i = 0; i < 18; i += 1) {
      const a = i * 0.78 + state.time * (state.mode === 'zen' ? 0.18 : 0.8);
      const x = state.center.x + Math.cos(a) * state.baseRadius * (0.18 + (i % 5) * 0.12);
      const y = state.center.y + Math.sin(a * 1.27) * state.baseRadius * (0.18 + (i % 4) * 0.1);
      const r = state.baseRadius * (0.15 + ((i * 7) % 11) / 60);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, hexToRgba(state.palette[(i + 1) % 4], 0.55));
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawChips() {
    const level = Number(els.chips.value) / 100;
    const visible = Math.floor(state.chips.length * level);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < visible; i += 1) {
      const c = state.chips[i];
      const x = state.center.x + c.x;
      const y = state.center.y + c.y;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(c.turn);
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = c.color;
      ctx.strokeStyle = 'rgba(255,255,255,0.32)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-c.size * 0.45, -c.size * 0.28, c.size * 0.9, c.size * 0.56, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawBubbles() {
    const level = Number(els.bubbles.value) / 100;
    const visible = Math.floor(state.bubbles.length * level);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < visible; i += 1) {
      const b = state.bubbles[i];
      const x = state.center.x + b.x + Math.sin(state.time * b.wobble + b.phase) * 2.2;
      const y = state.center.y + b.y + Math.cos(state.time * b.wobble + b.phase) * 1.7;
      const pulse = 1 + Math.sin(state.time * 2.2 + b.phase) * 0.06;
      ctx.globalAlpha = b.alpha;
      const rg = ctx.createRadialGradient(x - b.radius * 0.3, y - b.radius * 0.35, 1, x, y, b.radius * pulse);
      rg.addColorStop(0, 'rgba(255,255,255,0.95)');
      rg.addColorStop(0.42, hexToRgba(state.palette[3], 0.22));
      rg.addColorStop(1, 'rgba(255,255,255,0.04)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, b.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.44)';
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawShine() {
    const shine = Number(els.shine.value) / 100;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.2 + shine * 0.52;
    const g = ctx.createLinearGradient(
      state.center.x - state.baseRadius * 0.7,
      state.center.y - state.baseRadius * 0.9,
      state.center.x + state.baseRadius * 0.3,
      state.center.y + state.baseRadius * 0.4
    );
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.28)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(state.center.x - state.baseRadius * 0.26, state.center.y - state.baseRadius * 0.34, state.baseRadius * 0.38, state.baseRadius * 0.13, -0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.18 + shine * 0.28;
    ctx.beginPath();
    ctx.ellipse(state.center.x + state.baseRadius * 0.28, state.center.y + state.baseRadius * 0.12, state.baseRadius * 0.22, state.baseRadius * 0.07, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStreaks() {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const s of state.streaks) {
      ctx.globalAlpha = Math.max(0, s.life * 1.6);
      ctx.lineWidth = 4 + s.life * 18;
      ctx.lineCap = 'round';
      const grad = ctx.createLinearGradient(s.x1, s.y1, s.x2, s.y2);
      grad.addColorStop(0, hexToRgba(s.color, 0));
      grad.addColorStop(0.5, hexToRgba(s.color, 0.7));
      grad.addColorStop(1, hexToRgba('#ffffff', 0));
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const p of state.particles) {
      const t = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = t;
      if (p.type === 'sparkle') {
        ctx.strokeStyle = hexToRgba(p.color, 0.95);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x - p.size, p.y);
        ctx.lineTo(p.x + p.size, p.y);
        ctx.moveTo(p.x, p.y - p.size);
        ctx.lineTo(p.x, p.y + p.size);
        ctx.stroke();
      } else {
        const rg = ctx.createRadialGradient(p.x - p.size * 0.3, p.y - p.size * 0.3, 0, p.x, p.y, p.size);
        rg.addColorStop(0, 'rgba(255,255,255,0.9)');
        rg.addColorStop(0.25, hexToRgba(p.color, 0.9));
        rg.addColorStop(1, hexToRgba(p.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawFingerRipples() {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const p of state.pointers.values()) {
      const age = state.time - p.downTime;
      const r = 24 + Math.sin(age * 7) * 5 + state.moodPulse * 14;
      ctx.globalAlpha = state.mode === 'zen' ? 0.16 : 0.28;
      ctx.strokeStyle = 'rgba(255,255,255,0.76)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = state.palette[3];
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - state.lastTime) / 1000 || 0.016);
    state.lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function ensureAudio() {
    if (!state.sound) return null;
    if (!state.audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      state.audio = new AudioContext();
    }
    if (state.audio.state === 'suspended') state.audio.resume();
    return state.audio;
  }

  function playTone(freq, duration, type = 'sine') {
    const audio = ensureAudio();
    if (!audio) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = state.mode === 'zen' ? 650 : 1400;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * (state.mode === 'zen' ? 0.74 : 1.35)), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(state.mode === 'zen' ? 0.045 : 0.065, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function haptic(pattern) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }

  function angularDistance(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }

  function hexToRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`;
  }

  function mixHex(a, b, amount) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    return rgbToHex(
      ca.r * (1 - amount) + cb.r * amount,
      ca.g * (1 - amount) + cb.g * amount,
      ca.b * (1 - amount) + cb.b * amount
    );
  }

  function bind() {
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(resize, 160), { passive: true });
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') setSettings(false);
    });

    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', onPointerUp, { passive: false });
    canvas.addEventListener('pointercancel', onPointerUp, { passive: false });

    els.tools.forEach((btn) => btn.addEventListener('click', () => setTool(btn.dataset.tool)));
    els.swatches.forEach((btn) => btn.addEventListener('click', () => setPalette(btn.dataset.palette)));
    els.zenMode.addEventListener('click', () => setMode('zen'));
    els.wildMode.addEventListener('click', () => setMode('wild'));
    els.resetButton.addEventListener('click', resetSlime);
    els.settingsButton.addEventListener('click', () => setSettings(els.settingsPanel.hidden));
    els.closeSettingsButton.addEventListener('click', () => setSettings(false));
    els.settingsScrim.addEventListener('click', () => setSettings(false));
    els.soundButton.addEventListener('click', () => {
      state.sound = !state.sound;
      els.soundButton.setAttribute('aria-pressed', String(state.sound));
      els.soundButton.innerHTML = state.sound ? '&#9835;' : '&times;';
      if (state.sound) playTone(240, 0.04, 'sine');
    });

    [els.elasticity, els.bubbles, els.shine, els.chips].forEach((input) => {
      input.addEventListener('input', () => {
        state.moodPulse = 0.7;
      });
    });
  }

  bind();
  resize();
  updateHint();
  cssVars();
  requestAnimationFrame(loop);
})();
