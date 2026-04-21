/* =========================================================
   Starfield + Incense particles
   - 200 estrelles daurades fixes amb parpelleig sinusoïdal
   - Partícules d'encens pujant lentament
   - Parallax sutil al scroll
   - Pause quan no és visible
   ========================================================= */

(function () {
  'use strict';

  const canvas = document.getElementById('starfield');
  const incense = document.getElementById('incense');
  if (!canvas || !incense) return;

  const ctx = canvas.getContext('2d');
  const ictx = incense.getContext('2d');

  const state = {
    stars: [],
    particles: [],
    w: 0,
    h: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    scrollY: 0,
    running: true,
    densityMult: 1,
    glowMult: 1,
    incenseOn: true,
    parallaxOn: true,
    raf: null,
    t0: performance.now(),
  };

  function resize() {
    state.w = window.innerWidth;
    state.h = window.innerHeight;
    [canvas, incense].forEach((c) => {
      c.width = state.w * state.dpr;
      c.height = state.h * state.dpr;
      c.style.width = state.w + 'px';
      c.style.height = state.h + 'px';
    });
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ictx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    seedStars();
  }

  function seedStars() {
    const baseCount = Math.round(200 * state.densityMult);
    const count = Math.max(60, Math.min(baseCount, 320));
    state.stars = [];
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      state.stars.push({
        x: Math.random() * state.w,
        y: Math.random() * state.h * 1.4, // extra vertical for parallax
        // 3 depth layers for parallax
        depth: r < 0.55 ? 0.2 : r < 0.85 ? 0.55 : 1,
        radius: 0.3 + Math.random() * (r > 0.9 ? 1.8 : 1.0),
        baseAlpha: 0.25 + Math.random() * 0.55,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.4 + Math.random() * 1.4,
        hue: 48 + Math.random() * 8, // white-yellow (vatican)
        color: Math.random() < 0.15 ? 'red' : (Math.random() < 0.3 ? 'white' : 'gold'),
        big: r > 0.95,
      });
    }
  }

  function seedParticle() {
    return {
      x: Math.random() * state.w,
      y: state.h + Math.random() * 40,
      vy: -(0.15 + Math.random() * 0.35),
      drift: (Math.random() - 0.5) * 0.2,
      life: 0,
      maxLife: 8000 + Math.random() * 12000,
      r: 0.5 + Math.random() * 2,
      alpha: 0.04 + Math.random() * 0.08,
    };
  }

  function seedIncense() {
    const n = 28;
    state.particles = [];
    for (let i = 0; i < n; i++) {
      const p = seedParticle();
      p.y = Math.random() * state.h;
      p.life = Math.random() * p.maxLife;
      state.particles.push(p);
    }
  }

  function drawStars(now) {
    const t = (now - state.t0) / 1000;
    ctx.clearRect(0, 0, state.w, state.h);

    const par = state.parallaxOn ? state.scrollY : 0;

    for (const s of state.stars) {
      const py = s.y - par * s.depth * 0.35;
      // wrap vertically so stars don't disappear on long scrolls
      const y = ((py % (state.h * 1.4)) + state.h * 1.4) % (state.h * 1.4) - state.h * 0.2;

      const tw = 0.5 + 0.5 * Math.sin(s.twinklePhase + t * s.twinkleSpeed);
      const alpha = s.baseAlpha * (0.35 + 0.65 * tw);
      const glow = state.glowMult * (s.big ? 14 : 5);

      const isRed = s.color === 'red';
      const isWhite = s.color === 'white';
      const fill = isRed ? `rgba(232, 90, 85, ${alpha})`
                 : isWhite ? `rgba(244, 239, 228, ${alpha})`
                 : `hsla(${s.hue}, 90%, 72%, ${alpha})`;
      const shadow = isRed ? `rgba(232, 90, 85, ${alpha * 0.9})`
                   : isWhite ? `rgba(244, 239, 228, ${alpha * 0.8})`
                   : `hsla(${s.hue}, 90%, 65%, ${alpha * 0.9})`;

      ctx.beginPath();
      ctx.arc(s.x, y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.shadowColor = shadow;
      ctx.shadowBlur = glow;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawIncense(dt) {
    ictx.clearRect(0, 0, state.w, state.h);
    if (!state.incenseOn) return;

    for (const p of state.particles) {
      p.life += dt;
      p.y += p.vy * (dt / 16);
      p.x += p.drift * (dt / 16);
      // slight sway
      p.x += Math.sin(p.life / 800) * 0.12;

      if (p.y < -20 || p.life > p.maxLife) {
        Object.assign(p, seedParticle());
      }

      const lifeT = p.life / p.maxLife;
      const fade = lifeT < 0.15 ? lifeT / 0.15 : lifeT > 0.85 ? (1 - lifeT) / 0.15 : 1;
      const a = p.alpha * fade;

      ictx.beginPath();
      ictx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      const grad = ictx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
      grad.addColorStop(0, `rgba(255, 217, 90, ${a})`);
      grad.addColorStop(1, 'rgba(255, 217, 90, 0)');
      ictx.fillStyle = grad;
      ictx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
      ictx.fill();
    }
  }

  let last = performance.now();
  function frame(now) {
    if (!state.running) return;
    const dt = Math.min(48, now - last);
    last = now;
    drawStars(now);
    drawIncense(dt);
    state.raf = requestAnimationFrame(frame);
  }

  function start() {
    if (state.raf) return;
    last = performance.now();
    state.running = true;
    state.raf = requestAnimationFrame(frame);
  }
  function stop() {
    state.running = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = null;
  }

  // Visibility pause
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  // Parallax
  function onScroll() {
    state.scrollY = window.scrollY || 0;
  }

  window.addEventListener('resize', () => { resize(); seedIncense(); }, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  // Public API for Tweaks
  window.StarsAPI = {
    setDensity(m) { state.densityMult = Math.max(0.2, Math.min(2.5, m)); seedStars(); },
    setGlow(m)    { state.glowMult = Math.max(0, Math.min(3, m)); },
    setIncense(b) { state.incenseOn = !!b; },
    setParallax(b){ state.parallaxOn = !!b; },
    setHue(h)     { state.stars.forEach((s) => { s.hue = h + (Math.random() * 14 - 7); }); },
  };

  // Init
  resize();
  seedIncense();
  start();
})();
