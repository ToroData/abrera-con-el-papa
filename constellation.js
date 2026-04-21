/* =========================================================
   Constellation of Intentions — v4
   Pan + zoom interactive star chart.
   Scales gracefully from 20 to 2000+ intentions.
   ========================================================= */

(function () {
  'use strict';

  const canvas = document.getElementById('constellation');
  const wrap = document.querySelector('.constellation-wrap');
  const tooltip = document.querySelector('.constellation-tooltip');
  if (!canvas || !wrap || !tooltip) return;

  const ctx = canvas.getContext('2d');

  const state = {
    stars: [],
    w: 0, h: 0,              // viewport (CSS px)
    world: { w: 1000, h: 1000 }, // virtual world size (grows with N)
    cam: { x: 500, y: 500, zoom: 1 }, // camera centre (world coords) + zoom
    minZoom: 0.3, maxZoom: 4,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    hover: null, active: null,
    running: true, raf: null,
    t0: performance.now(),
    isTouch: matchMedia('(hover: none)').matches,
    mouse: { x: -999, y: -999 },
    drag: null,              // {lastX, lastY, moved}
    pinch: null,             // {startDist, startZoom}
    search: '',
    flashIdx: -1, flashUntil: 0,
  };

  // ----- Sizing -----
  function resize() {
    const rect = wrap.getBoundingClientRect();
    state.w = rect.width; state.h = rect.height;
    canvas.width = state.w * state.dpr;
    canvas.height = state.h * state.dpr;
    canvas.style.width = state.w + 'px';
    canvas.style.height = state.h + 'px';
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    refreshHUD();
  }

  // ----- Layout -----
  function seedLayout(intentions) {
    // World size grows with count so density stays manageable (~1 star / 3500 px²).
    const n = intentions.length;
    const targetArea = Math.max(n * 4500, 360 * 520);
    const aspect = state.w && state.h ? state.w / state.h : 1.3;
    const wh = Math.sqrt(targetArea / aspect);
    state.world.h = Math.max(520, wh);
    state.world.w = state.world.h * aspect;

    state.stars = [];
    const pad = 40;
    const pts = poissonOrRandom(
      state.world.w - pad * 2,
      state.world.h - pad * 2,
      Math.max(14, Math.min(60, Math.sqrt((state.world.w * state.world.h) / Math.max(1, n)) * 0.65)),
      n
    );
    intentions.forEach((it, i) => {
      const p = pts[i] || { x: Math.random() * (state.world.w - pad * 2), y: Math.random() * (state.world.h - pad * 2) };
      state.stars.push({
        x: pad + p.x,
        y: pad + p.y,
        r: 1.8 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.9,
        intention: it,
        born: performance.now() - 2000,
        igniteDur: 0,
        hue: Math.random() < 0.08 ? 'red' : (Math.random() < 0.18 ? 'white' : 'gold'),
      });
    });

    // Centre camera on the middle of the world, zoomed to fit-ish
    state.cam.x = state.world.w / 2;
    state.cam.y = state.world.h / 2;
    fitZoom();
    refreshHUD();
  }

  function fitZoom() {
    // Zoom so viewport shows ~ 1/4 of the world (encourage panning when dense)
    if (!state.w || !state.h) return;
    const fit = Math.min(state.w / state.world.w, state.h / state.world.h);
    const target = Math.max(state.minZoom, Math.min(state.maxZoom, fit * 1.6));
    state.cam.zoom = target;
  }

  function poissonOrRandom(w, h, minDist, count) {
    if (count <= 200) {
      return poissonDisk(w, h, minDist, count);
    }
    // Quick random for large sets (stress test)
    const pts = [];
    for (let i = 0; i < count; i++) pts.push({ x: Math.random() * w, y: Math.random() * h });
    return pts;
  }

  function poissonDisk(w, h, minDist, count) {
    const pts = [];
    const cell = minDist / Math.SQRT2;
    const cols = Math.ceil(w / cell) + 1;
    const rows = Math.ceil(h / cell) + 1;
    const grid = new Array(cols * rows).fill(null);
    let tries = 0;
    while (pts.length < count && tries < count * 40) {
      const p = { x: Math.random() * w, y: Math.random() * h };
      const gx = Math.floor(p.x / cell), gy = Math.floor(p.y / cell);
      let ok = true;
      for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2 && ok; dx++) {
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const q = grid[ny * cols + nx];
        if (q) {
          const ddx = p.x - q.x, ddy = p.y - q.y;
          if (ddx * ddx + ddy * ddy < minDist * minDist) ok = false;
        }
      }
      if (ok) { pts.push(p); grid[gy * cols + gx] = p; }
      tries++;
    }
    // Fill gaps randomly if needed
    while (pts.length < count) pts.push({ x: Math.random() * w, y: Math.random() * h });
    return pts;
  }

  function addIntention(intention) {
    // Pick a world position near the camera so the user sees it ignite
    const pad = 40;
    const vx = state.cam.x + (Math.random() - 0.5) * (state.w / state.cam.zoom * 0.6);
    const vy = state.cam.y + (Math.random() - 0.5) * (state.h / state.cam.zoom * 0.6);
    state.stars.push({
      x: Math.max(pad, Math.min(state.world.w - pad, vx)),
      y: Math.max(pad, Math.min(state.world.h - pad, vy)),
      r: 2.4, phase: Math.random() * Math.PI * 2, speed: 0.7,
      intention, born: performance.now(), igniteDur: 1600,
      hue: 'gold',
    });
    refreshHUD();
  }

  // ----- World ↔ screen -----
  const world2screen = (wx, wy) => ({
    x: (wx - state.cam.x) * state.cam.zoom + state.w / 2,
    y: (wy - state.cam.y) * state.cam.zoom + state.h / 2,
  });
  const screen2world = (sx, sy) => ({
    x: (sx - state.w / 2) / state.cam.zoom + state.cam.x,
    y: (sy - state.h / 2) / state.cam.zoom + state.cam.y,
  });

  function clampCamera() {
    // Allow panning a bit beyond the world edges for breathing room
    const slack = 60 / state.cam.zoom;
    const minX = slack, maxX = state.world.w - slack;
    const minY = slack, maxY = state.world.h - slack;
    state.cam.x = Math.max(minX, Math.min(maxX, state.cam.x));
    state.cam.y = Math.max(minY, Math.min(maxY, state.cam.y));
  }

  // ----- Draw -----
  function draw(now) {
    ctx.clearRect(0, 0, state.w, state.h);

    // Subtle world backdrop — grid ticks only visible faintly to imply space
    drawBackdrop();

    const vp = {
      x0: state.cam.x - state.w / 2 / state.cam.zoom - 40,
      y0: state.cam.y - state.h / 2 / state.cam.zoom - 40,
      x1: state.cam.x + state.w / 2 / state.cam.zoom + 40,
      y1: state.cam.y + state.h / 2 / state.cam.zoom + 40,
    };

    // Pre-filter visible stars
    const visible = [];
    for (let i = 0; i < state.stars.length; i++) {
      const s = state.stars[i];
      if (s.x < vp.x0 || s.x > vp.x1 || s.y < vp.y0 || s.y > vp.y1) continue;
      visible.push(i);
    }

    // Connections — only when zoomed in enough and visible set is manageable
    const maxLineCount = 600;
    if (state.cam.zoom > 0.6 && visible.length < 180) {
      const maxDWorld = 140 / state.cam.zoom;
      const maxD2 = maxDWorld * maxDWorld;
      let drawn = 0;
      for (let ii = 0; ii < visible.length && drawn < maxLineCount; ii++) {
        const i = visible[ii];
        const a = state.stars[i];
        const sa = world2screen(a.x, a.y);
        for (let jj = ii + 1; jj < visible.length; jj++) {
          const j = visible[jj];
          const b = state.stars[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > maxD2) continue;
          const sb = world2screen(b.x, b.y);
          const involved = state.hover === i || state.hover === j || state.active === i || state.active === j;
          const f = 1 - Math.sqrt(d2) / maxDWorld;
          const alpha = involved ? 0.55 * f : 0.09 * f;
          ctx.beginPath();
          ctx.moveTo(sa.x, sa.y);
          ctx.lineTo(sb.x, sb.y);
          ctx.strokeStyle = `rgba(255, 217, 90, ${alpha})`;
          ctx.lineWidth = involved ? 0.9 : 0.5;
          ctx.stroke();
          drawn++;
          if (drawn >= maxLineCount) break;
        }
      }
    }

    // Stars
    const t = (now - state.t0) / 1000;
    const q = (state.search || '').toLowerCase();
    const matchedIdxs = [];
    for (let k = 0; k < visible.length; k++) {
      const i = visible[k];
      const s = state.stars[i];
      const sp = world2screen(s.x, s.y);
      if (sp.x < -20 || sp.x > state.w + 20 || sp.y < -20 || sp.y > state.h + 20) continue;

      const igniteT = s.igniteDur > 0 ? Math.min(1, (now - s.born) / s.igniteDur) : 1;
      if (igniteT >= 1) s.igniteDur = 0;
      const ease = 1 - Math.pow(1 - igniteT, 3);
      const tw = 0.5 + 0.5 * Math.sin(s.phase + t * s.speed);
      const isHover = (state.hover === i) || (state.active === i);
      const isFlash = state.flashIdx === i && now < state.flashUntil;
      const matched = q && (s.intention.text || '').toLowerCase().includes(q);
      if (matched) matchedIdxs.push(i);

      const zoomBoost = Math.min(1.4, Math.max(0.7, state.cam.zoom * 0.9));
      const scale = (isHover ? 1.8 : (isFlash ? 1.6 : 1)) * zoomBoost;
      const radius = s.r * scale * ease;
      const baseA = (0.55 + 0.45 * tw) * ease;

      // Color
      const [rC, gC, bC] = s.hue === 'red' ? [220, 90, 90]
                        : s.hue === 'white' ? [244, 239, 228]
                        : [255, 217, 90];

      // Dim unmatched when searching
      const dimFactor = q ? (matched ? 1 : 0.18) : 1;
      const a = baseA * dimFactor;

      // Halo
      const haloR = radius * (matched ? 8 : 6);
      const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, haloR);
      g.addColorStop(0, `rgba(${rC}, ${gC}, ${bC}, ${a * 0.5})`);
      g.addColorStop(0.4, `rgba(${rC}, ${gC}, ${bC}, ${a * 0.18})`);
      g.addColorStop(1, `rgba(${rC}, ${gC}, ${bC}, 0)`);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, haloR, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isHover ? '#FFE48A' : `rgba(${rC}, ${gC}, ${bC}, ${Math.min(1, a + 0.25)})`;
      ctx.shadowColor = `rgba(${rC}, ${gC}, ${bC}, 0.7)`;
      ctx.shadowBlur = isHover ? 20 : (matched ? 16 : 8);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Ignite ring
      if (s.igniteDur > 0) {
        const ringR = radius * (6 + 20 * (1 - ease));
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 217, 90, ${0.4 * (1 - ease)})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    // Visible count HUD
    state._visibleCount = visible.length;
    state._matchedCount = matchedIdxs.length;
  }

  function drawBackdrop() {
    // Faint drifting "parallax dust" — independent of world coords so it feels like deep space
    ctx.save();
    for (let i = 0; i < 36; i++) {
      const x = (i * 73 + state.cam.x * 0.15) % state.w;
      const y = (i * 131 + state.cam.y * 0.15) % state.h;
      const xx = ((x % state.w) + state.w) % state.w;
      const yy = ((y % state.h) + state.h) % state.h;
      ctx.beginPath();
      ctx.arc(xx, yy, 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 217, 90, 0.1)`;
      ctx.fill();
    }
    ctx.restore();
  }

  // ----- Picking -----
  function pickStar(sx, sy, tolMul) {
    const world = screen2world(sx, sy);
    const tol = (22 * (tolMul || 1)) / state.cam.zoom;
    const tol2 = tol * tol;
    let bestI = -1, bestD = tol2;
    for (let i = 0; i < state.stars.length; i++) {
      const s = state.stars[i];
      const dx = s.x - world.x, dy = s.y - world.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) { bestD = d2; bestI = i; }
    }
    return bestI >= 0 ? bestI : null;
  }

  // ----- Tooltip -----
  function showTooltip(starIdx, mx, my) {
    const s = state.stars[starIdx]; if (!s) return;
    const text = s.intention.text || s.intention;
    tooltip.innerHTML = `<div>${escapeHTML(text)}</div>`;
    tooltip.classList.add('show');
    const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    let x = mx + 14, y = my + 14;
    if (x + tw > state.w - 8) x = mx - tw - 14;
    if (y + th > state.h - 8) y = my - th - 14;
    if (x < 8) x = 8; if (y < 8) y = 8;
    tooltip.style.transform = `translate(${x}px, ${y}px)`;
  }
  function hideTooltip() { tooltip.classList.remove('show'); }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ----- Gestures -----
  function onPointerDown(e) {
    const p = getPoint(e);
    canvas.setPointerCapture && e.pointerId != null && canvas.setPointerCapture(e.pointerId);
    state.drag = { lastX: p.x, lastY: p.y, startX: p.x, startY: p.y };
    canvas.style.cursor = 'grabbing';
    hideTooltip();
  }
  function onPointerMove(e) {
    const p = getPoint(e);
    state.mouse = p;
    if (state.drag) {
      const dx = p.x - state.drag.lastX;
      const dy = p.y - state.drag.lastY;
      state.cam.x -= dx / state.cam.zoom;
      state.cam.y -= dy / state.cam.zoom;
      clampCamera();
      state.drag.lastX = p.x; state.drag.lastY = p.y;
      hideTooltip();
      return;
    }
    if (state.isTouch) return;
    const idx = pickStar(p.x, p.y);
    state.hover = idx;
    if (idx != null) { canvas.style.cursor = 'pointer'; showTooltip(idx, p.x, p.y); }
    else { canvas.style.cursor = 'grab'; hideTooltip(); }
  }
  function onPointerUp(e) {
    const drag = state.drag;
    state.drag = null;
    canvas.style.cursor = state.isTouch ? '' : 'grab';
    // Treat as tap if displacement from start is small (touch-friendly).
    if (drag) {
      const p = getPoint(e);
      const ddx = p.x - drag.startX, ddy = p.y - drag.startY;
      const displacement = Math.sqrt(ddx * ddx + ddy * ddy);
      const tapThreshold = state.isTouch ? 12 : 6;
      if (displacement < tapThreshold) {
        // Pick at the original tap position (what the user aimed at),
        // with a larger tolerance on touch to forgive imprecise fingers.
        const idx = pickStar(drag.startX, drag.startY, state.isTouch ? 1.8 : 1);
        if (idx != null) {
          state.active = idx;
          showTooltip(idx, drag.startX, drag.startY);
        } else {
          state.active = null;
          hideTooltip();
        }
      }
    }
  }
  function onPointerLeave() {
    state.hover = null;
    // On touch, the tap-to-show tooltip must survive the pointerleave that
    // fires as soon as the finger lifts. Only hover-based tooltips (desktop)
    // should hide here.
    if (!state.isTouch) hideTooltip();
    if (!state.drag) canvas.style.cursor = state.isTouch ? '' : 'grab';
  }

  function getPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX != null ? e.clientX : (e.touches && e.touches[0]?.clientX) || 0;
    const cy = e.clientY != null ? e.clientY : (e.touches && e.touches[0]?.clientY) || 0;
    return { x: cx - rect.left, y: cy - rect.top };
  }

  function onWheel(e) {
    e.preventDefault();
    const p = getPoint(e);
    const worldAt = screen2world(p.x, p.y);
    const factor = Math.exp(-e.deltaY * 0.0015);
    zoomBy(factor, worldAt);
  }
  function zoomBy(factor, anchorWorld) {
    const prev = state.cam.zoom;
    const next = Math.max(state.minZoom, Math.min(state.maxZoom, prev * factor));
    const used = next / prev;
    if (anchorWorld) {
      // Keep anchorWorld under the same screen point
      state.cam.x = anchorWorld.x - (anchorWorld.x - state.cam.x) / used;
      state.cam.y = anchorWorld.y - (anchorWorld.y - state.cam.y) / used;
    }
    state.cam.zoom = next;
    clampCamera();
    refreshHUD();
  }

  // Pinch (two-finger)
  function onTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = pinchDist(e);
      state.pinch = { startDist: d, startZoom: state.cam.zoom };
      state.drag = null;
    }
  }
  function onTouchMove(e) {
    if (e.touches.length === 2 && state.pinch) {
      e.preventDefault();
      const d = pinchDist(e);
      const ratio = d / state.pinch.startDist;
      const newZoom = Math.max(state.minZoom, Math.min(state.maxZoom, state.pinch.startZoom * ratio));
      state.cam.zoom = newZoom;
      clampCamera();
      refreshHUD();
    }
  }
  function onTouchEnd(e) {
    if (e.touches.length < 2) state.pinch = null;
  }
  function pinchDist(e) {
    const a = e.touches[0], b = e.touches[1];
    const dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ----- HUD -----
  function refreshHUD() {
    const z = document.getElementById('cst-zoom');
    const v = document.getElementById('cst-visible');
    const t = document.getElementById('cst-total');
    const c = document.getElementById('cst-count');
    if (z) z.textContent = state.cam.zoom.toFixed(1) + '×';
    if (v) v.textContent = String(state._visibleCount || 0);
    if (t) t.textContent = String(state.stars.length);
    if (c) c.textContent = String(state.stars.length);
  }

  // ----- Search -----
  function onSearchInput(e) {
    state.search = e.target.value || '';
    // Auto-pan to first match
    if (state.search.length > 1) {
      const q = state.search.toLowerCase();
      for (let i = 0; i < state.stars.length; i++) {
        if ((state.stars[i].intention.text || '').toLowerCase().includes(q)) {
          flyTo(i);
          return;
        }
      }
    }
  }
  function flyTo(idx) {
    const s = state.stars[idx]; if (!s) return;
    state.cam.x = s.x; state.cam.y = s.y;
    state.cam.zoom = Math.max(state.cam.zoom, 1.4);
    state.flashIdx = idx; state.flashUntil = performance.now() + 2400;
    clampCamera(); refreshHUD();
  }
  function resetView() {
    state.cam.x = state.world.w / 2;
    state.cam.y = state.world.h / 2;
    fitZoom();
    state.active = null;
    hideTooltip();
    refreshHUD();
  }

  // ----- RAF loop -----
  function frame(now) {
    if (!state.running) return;
    draw(now);
    // Update visible/total every ~200ms
    if (!frame._last || now - frame._last > 180) { refreshHUD(); frame._last = now; }
    state.raf = requestAnimationFrame(frame);
  }
  function start() { if (state.raf) return; state.running = true; state.raf = requestAnimationFrame(frame); }
  function stop()  { state.running = false; if (state.raf) cancelAnimationFrame(state.raf); state.raf = null; }

  const io = new IntersectionObserver((ents) => {
    ents.forEach((en) => { en.isIntersecting ? start() : stop(); });
  }, { threshold: 0.01 });
  io.observe(wrap);

  // ----- Events -----
  if (window.PointerEvent) {
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
  } else {
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerLeave);
  }
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.style.cursor = state.isTouch ? '' : 'grab';

  document.getElementById('cst-reset')?.addEventListener('click', resetView);
  document.getElementById('cst-search-input')?.addEventListener('input', onSearchInput);

  window.addEventListener('resize', resize, { passive: true });

  // Public API
  window.ConstellationAPI = {
    seed(intentions) { resize(); seedLayout(intentions || []); },
    add(intention) { addIntention(intention); },
    count() { return state.stars.length; },
    reset: resetView,
    find(query) {
      const q = (query || '').toLowerCase();
      for (let i = 0; i < state.stars.length; i++) {
        if ((state.stars[i].intention.text || '').toLowerCase().includes(q)) return flyTo(i);
      }
    },
    stressTest(n) {
      const items = [];
      const samples = [
        'Per la pau al món','Pel nostre Papa','Per la salut del meu pare','Pels joves que dubten',
        'Per la meva àvia','Pels missioners','Pels qui han perdut la fe','Per una vocació',
        'Pels refugiats','Pels presos','Pels qui es senten sols','Per la meva família',
        'Pels difunts','Per la unitat dels cristians','Per la terra','Pels infants',
        'Per una conversió','Pel meu matrimoni','Pels catequistes','Per la diòcesi',
      ];
      for (let i = 0; i < n; i++) items.push({ text: samples[i % samples.length] + ' #' + (i+1) });
      seedLayout(items);
    }
  };

  resize();
})();