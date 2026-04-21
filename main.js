/* =========================================================
   main.js — v3 (papal, loader animation, post modal)
   ========================================================= */
(function () {
  'use strict';
  const CONFIG = window.CONFIG;

  // ---------- Loader: constellation → logo reveal ----------
  function runLoader(done) {
    const canvas = document.getElementById('loader-canvas');
    const logoImg = document.getElementById('loader-logo');
    if (!canvas || !logoImg) { setTimeout(done, 800); return; }

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: r.width, h: r.height };
    };
    let { w, h } = size();
    window.addEventListener('resize', () => { const s = size(); w = s.w; h = s.h; });

    const CAMP = window.CAMPANILE;
    const pts = CAMP.points.map((p) => ({ nx: p.x, ny: p.y }));
    const lines = CAMP.lines;

    // Map campanile coords (viewBox 100x115) into canvas (preserve aspect + padding)
    function project() {
      const pad = Math.min(w, h) * 0.08;
      const aw = w - pad * 2, ah = h - pad * 2;
      const scale = Math.min(aw / CAMP.viewBox.w, ah / CAMP.viewBox.h);
      const ox = (w - CAMP.viewBox.w * scale) / 2;
      const oy = (h - CAMP.viewBox.h * scale) / 2;
      pts.forEach((p) => { p.x = ox + p.nx * scale; p.y = oy + p.ny * scale; });
    }
    project();
    window.addEventListener('resize', project);

    // Animation phases:
    // 0: scatter stars (random positions)
    // 1: stars travel to their constellation points (800ms)
    // 2: lines draw progressively (1100ms)
    // 3: logo fades in, constellation fades out (700ms)
    // 4: overall fade out (handled by css .done)
    const scatter = pts.map(() => ({ x: Math.random() * w, y: Math.random() * h }));
    const start = performance.now();
    const TRAVEL = 900;
    const LINES_DELAY = 900;
    const LINES = 1200;
    const LOGO_DELAY = 1900;
    const LOGO = 900;
    const TOTAL = 3200;

    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const easeIO = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    function drawStar(x, y, r, alpha, warm) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
      const tint = warm ? '255, 217, 90' : '244, 239, 228';
      g.addColorStop(0, `rgba(${tint}, ${alpha})`);
      g.addColorStop(0.35, `rgba(${tint}, ${alpha * 0.35})`);
      g.addColorStop(1, `rgba(${tint}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${tint}, ${Math.min(1, alpha + 0.3)})`;
      ctx.fill();
    }

    function frame(now) {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);

      // Phase 1: travel
      const pTravel = Math.min(1, t / TRAVEL);
      pts.forEach((p, i) => {
        const s = scatter[i];
        const e = easeIO(pTravel);
        const x = s.x + (p.x - s.x) * e;
        const y = s.y + (p.y - s.y) * e;
        const r = 1.2 + (pTravel * 0.8);
        drawStar(x, y, r, 0.7 + 0.3 * pTravel, true);
      });

      // Phase 2: lines
      if (t > LINES_DELAY) {
        const pLines = Math.min(1, (t - LINES_DELAY) / LINES);
        const totalLines = lines.length;
        lines.forEach((l, i) => {
          const segStart = (i / totalLines) * 0.5;
          const segEnd = Math.min(1, segStart + 0.5);
          const segT = Math.min(1, Math.max(0, (pLines - segStart) / (segEnd - segStart)));
          if (segT <= 0) return;
          const a = pts[l[0]], b = pts[l[1]];
          if (!a || !b) return;
          const x2 = a.x + (b.x - a.x) * segT;
          const y2 = a.y + (b.y - a.y) * segT;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(255, 217, 90, ${0.55 * (1 - (t > LOGO_DELAY ? (t - LOGO_DELAY) / LOGO : 0))})`;
          ctx.lineWidth = 1;
          ctx.shadowColor = 'rgba(255, 217, 90, 0.7)';
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        });
      }

      // Phase 3: logo reveal
      if (t > LOGO_DELAY) {
        const pLogo = Math.min(1, (t - LOGO_DELAY) / LOGO);
        logoImg.style.opacity = String(ease(pLogo));
        // fade out canvas stars into logo
        ctx.fillStyle = `rgba(6, 6, 11, ${pLogo * 0.5})`;
        ctx.fillRect(0, 0, w, h);
      }

      if (t < TOTAL) {
        requestAnimationFrame(frame);
      } else {
        setTimeout(done, 400);
      }
    }
    requestAnimationFrame(frame);
  }

  // ---------- Scene navigator ----------
  const scroller = document.getElementById('scroller');
  const scenes = [...document.querySelectorAll('.scene')];
  const TOTAL = scenes.length;
  let current = 0;
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  function setScene(i, immediate, fromUser) {
    current = Math.max(0, Math.min(TOTAL - 1, i));
    if (isMobile()) {
      // Native vertical scroll on mobile. Only scroll the user when THEY
      // explicitly requested it (clicked a nav arrow / dot / data-goto link).
      // Never on resize, never on boot, never on language change — those are
      // what were yanking the page to the top when the URL bar toggled.
      if (fromUser && !immediate) {
        const y = scenes[current].getBoundingClientRect().top + window.scrollY - 4;
        window.scrollTo({ top: y, behavior: 'auto' });
      }
    } else {
      scroller.style.transform = `translateX(-${current * 100}vw)`;
    }
    scenes.forEach((s, k) => s.classList.toggle('active', k === current));
    updateHUD();
    localStorage.setItem('abrera.scene', String(current));
  }

  function updateHUD() {
    const idxEl = document.getElementById('hud-idx');
    const totalEl = document.getElementById('hud-total');
    const nameEl = document.getElementById('hud-scene-name');
    const prev = document.getElementById('hud-prev');
    const next = document.getElementById('hud-next');
    const bar = document.querySelector('.bar-fill');
    if (idxEl) idxEl.textContent = String(current + 1).padStart(2, '0');
    if (totalEl) totalEl.textContent = String(TOTAL).padStart(2, '0');
    if (nameEl) {
      const lang = window.I18N_STATE.lang;
      const s = scenes[current];
      nameEl.textContent = s.getAttribute(`data-name-${lang}`) || s.getAttribute('data-name-ca') || '';
    }
    if (prev) prev.disabled = current === 0;
    if (next) next.disabled = current === TOTAL - 1;
    if (bar) bar.style.setProperty('--scene-progress', (current + 1) / TOTAL);
    document.querySelectorAll('.hud-dot').forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function buildDots() {
    const host = document.getElementById('hud-dots');
    if (!host) return;
    host.innerHTML = '';
    scenes.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'hud-dot';
      b.type = 'button';
      b.setAttribute('aria-label', `Scene ${i + 1}`);
      const lab = document.createElement('span');
      lab.className = 'label';
      const lang = window.I18N_STATE.lang;
      lab.textContent = s.getAttribute(`data-name-${lang}`) || s.getAttribute('data-name-ca') || '';
      b.appendChild(lab);
      b.addEventListener('click', () => setScene(i, false, true));
      host.appendChild(b);
    });
  }

  function setupNav() {
    document.getElementById('hud-prev')?.addEventListener('click', () => setScene(current - 1, false, true));
    document.getElementById('hud-next')?.addEventListener('click', () => setScene(current + 1, false, true));

    document.querySelectorAll('[data-goto]').forEach((b) => {
      b.addEventListener('click', () => setScene(parseInt(b.getAttribute('data-goto'), 10) - 1, false, true));
    });

    document.addEventListener('keydown', (e) => {
      if (isMobile()) return;
      if (document.querySelector('.modal-overlay.show')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'ArrowDown') { e.preventDefault(); setScene(current + 1, false, true); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'ArrowUp') { e.preventDefault(); setScene(current - 1, false, true); }
      else if (e.key === 'Home') { setScene(0, false, true); }
      else if (e.key === 'End') { setScene(TOTAL - 1, false, true); }
    });

    // Natural vertical scroll → horizontal scene transitions
    let wheelLock = false;
    window.addEventListener('wheel', (e) => {
      if (isMobile() || wheelLock) return;
      if (document.querySelector('.modal-overlay.show')) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 8) return;
      wheelLock = true;
      setScene(current + (d > 0 ? 1 : -1), false, true);
      setTimeout(() => (wheelLock = false), 950);
    }, { passive: true });

    let tx = 0, ty = 0, trk = false;
    window.addEventListener('touchstart', (e) => {
      if (isMobile()) return;
      tx = e.touches[0].clientX; ty = e.touches[0].clientY; trk = true;
    }, { passive: true });
    window.addEventListener('touchend', (e) => {
      if (!trk || isMobile()) { trk = false; return; }
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      const abs = Math.max(Math.abs(dx), Math.abs(dy));
      if (abs > 60) setScene(current + ((dx < 0 || dy < 0) ? 1 : -1), false, true);
      trk = false;
    }, { passive: true });

    window.addEventListener('resize', () => {
      // On mobile, never re-scroll — that's what causes the page to jump to
      // the top when the address bar shows/hides. Just update the transform
      // on desktop so the horizontal layout stays in sync.
      if (isMobile()) return;
      setScene(current, true);
    }, { passive: true });

    // Mobile: keep `current` in sync with native scroll so the HUD + sceneX
    // classes stay accurate (fixes stale state after URL bar resize).
    if (isMobile()) {
      const syncFromScroll = () => {
        const vh = window.innerHeight;
        const y = window.scrollY + vh / 2;
        let best = 0, bestD = Infinity;
        scenes.forEach((s, k) => {
          const r = s.getBoundingClientRect();
          const centerY = r.top + window.scrollY + r.height / 2;
          const d = Math.abs(centerY - y);
          if (d < bestD) { bestD = d; best = k; }
        });
        if (best !== current) {
          current = best;
          scenes.forEach((s, k) => s.classList.toggle('active', k === current));
          updateHUD();
          localStorage.setItem('abrera.scene', String(current));
        }
      };
      let tick = 0;
      window.addEventListener('scroll', () => {
        if (tick) return;
        tick = requestAnimationFrame(() => { tick = 0; syncFromScroll(); });
      }, { passive: true });
    }
  }

  // ---------- Countdown ----------
  function startCountdown() {
    const target = new Date(CONFIG.vigiliaDate).getTime();
    const elD = document.getElementById('cd-days');
    const elH = document.getElementById('cd-hours');
    const elM = document.getElementById('cd-mins');
    if (!elD) return;
    function tick() {
      let diff = target - Date.now();
      if (diff < 0) diff = 0;
      const d = Math.floor(diff / 86400000); diff -= d * 86400000;
      const h = Math.floor(diff / 3600000); diff -= h * 3600000;
      const m = Math.floor(diff / 60000);
      elD.textContent = String(d).padStart(2, '0');
      elH.textContent = String(h).padStart(2, '0');
      elM.textContent = String(m).padStart(2, '0');
    }
    tick(); setInterval(tick, 60000);
    const daysMetric = document.getElementById('metric-dies');
    if (daysMetric) {
      const d = Math.max(0, Math.floor((target - Date.now()) / 86400000));
      daysMetric.setAttribute('data-target', String(d));
    }
  }

  // ---------- Count-up ----------
  function countUp(el, target) {
    const start = performance.now();
    const dur = 1800;
    (function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * e));
      if (t < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  function runCountersFor(scene) {
    scene.querySelectorAll('[data-counter]').forEach((n) => {
      if (n.__counted) return;
      n.__counted = true;
      countUp(n, parseInt(n.getAttribute('data-target') || '0', 10));
    });
  }

  // ---------- Data ----------
  async function fetchJson(url) {
    try { const r = await fetch(url); if (!r.ok) throw 0; return await r.json(); } catch { return null; }
  }
  async function loadData() {
    const hasApi = CONFIG.sheetsApiUrl && CONFIG.sheetsApiUrl !== 'PLACEHOLDER_URL';
    if (!hasApi) {
      return { metrics: CONFIG.fallback.metrics, intentions: CONFIG.fallback.intencions, posts: CONFIG.fallback.posts, gallery: CONFIG.fallback.galeria };
    }
    const [m, i, p, g] = await Promise.allSettled([
      fetchJson(CONFIG.sheetsApiUrl + '?tab=metriques'),
      fetchJson(CONFIG.sheetsApiUrl + '?tab=intencions'),
      fetchJson(CONFIG.sheetsApiUrl + '?tab=posts'),
      fetchJson(CONFIG.sheetsApiUrl + '?tab=galeria'),
    ]);
    const asArray = (r, fb) => (r.status === 'fulfilled' && Array.isArray(r.value)) ? r.value : fb;
    const asObject = (r, fb) => (r.status === 'fulfilled' && r.value && typeof r.value === 'object' && !Array.isArray(r.value) && !r.value.error) ? r.value : fb;
    return {
      metrics: asObject(m, CONFIG.fallback.metrics),
      intentions: asArray(i, CONFIG.fallback.intencions),
      posts: asArray(p, CONFIG.fallback.posts),
      gallery: asArray(g, CONFIG.fallback.galeria),
    };
  }

  function renderMetrics(m) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.setAttribute('data-target', String(v)); };
    set('metric-inscrits', m.inscrits ?? 0);
    set('metric-intencions', m.intencions ?? 0);
    set('metric-parroquies', m.parroquies ?? 0);
    const cstCount = document.getElementById('cst-count');
    if (cstCount && m.intencions != null) countUp(cstCount, m.intencions);
  }

  // ---------- Posts (expandable modal) ----------
  function renderPosts(posts) {
    const grid = document.getElementById('posts-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const lang = window.I18N_STATE.lang;
    posts.forEach((p, idx) => {
      const titol = p['titol_' + lang] || p.titol_ca || p.titol || '';
      const cos = p['cos_' + lang] || p.cos_ca || p.cos || '';
      const preview = cos.length > 180 ? cos.slice(0, 180).trim() + '…' : cos;
      const card = document.createElement('article');
      card.className = 'post-card';
      card.innerHTML = `
        <div class="post-meta">
          <span class="post-date">${formatDate(p.data, lang)}</span>
          <span class="post-dot">·</span>
          <span>${escapeHTML(p.autor || 'Mn. Francisco')}</span>
        </div>
        <h3 class="post-title">${escapeHTML(titol)}</h3>
        <p class="post-body">${escapeHTML(preview)}</p>
        <div class="post-read">
          <span data-i18n="post.readMore">${window.t('post.readMore')}</span>
          <span class="arrow">→</span>
        </div>`;
      card.addEventListener('click', () => openPostModal(p, titol, cos));
      grid.appendChild(card);
    });
  }

  function openPostModal(p, titol, cos) {
    const lang = window.I18N_STATE.lang;
    const m = document.getElementById('post-modal');
    if (!m) return;
    m.querySelector('.post-modal-meta').innerHTML =
      `<span class="post-date">${formatDate(p.data, lang)}</span> <span class="post-dot">·</span> <span>${escapeHTML(p.autor || 'Mn. Francisco')}</span>`;
    m.querySelector('.post-modal-title').textContent = titol;
    const body = m.querySelector('.post-modal-body');
    body.innerHTML = cos.split(/\n\s*\n/).map((para) => `<p>${escapeHTML(para)}</p>`).join('');
    m.querySelector('.post-modal-sign').innerHTML = `<span class="post-cross">✢</span> ${escapeHTML(p.autor || 'Mn. Francisco')}, <span>${window.t('prep.signature')}</span>`;
    m.classList.add('show');
  }

  function setupPostModal() {
    const m = document.getElementById('post-modal');
    if (!m) return;
    m.querySelector('.modal-close').addEventListener('click', () => m.classList.remove('show'));
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('show'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') m.classList.remove('show'); });
  }

  // ---------- Gallery ----------
  function renderGallery(items) {
    const wrap = document.getElementById('gallery-wrap');
    if (!wrap) return;
    if (!items || !items.length) {
      wrap.innerHTML = `
        <div class="gallery-empty">
          <canvas class="gallery-empty-canvas" id="empty-canvas"></canvas>
          <h3 class="gallery-empty-title">${window.t('gallery.empty.title')}</h3>
          <p class="gallery-empty-body">${window.t('gallery.empty.body')}</p>
          <span class="ribbon gallery-empty-badge">${window.t('gallery.empty.badge')}</span>
        </div>`;
      animateEmptyGallery();
      return;
    }
    const cols = document.createElement('div');
    cols.className = 'gallery-columns';
    items.forEach((it) => {
      const a = document.createElement('a');
      a.className = 'gallery-item';
      a.href = it.url_foto || it.url;
      const peu = it.peu_foto || '';
      a.innerHTML = `<img loading="lazy" src="${escapeHTML(it.url_foto || it.url)}" alt="${escapeHTML(peu)}">`;
      a.addEventListener('click', (e) => { e.preventDefault(); openLightbox(it.url_foto || it.url, peu); });
      cols.appendChild(a);
    });
    wrap.innerHTML = '';
    wrap.appendChild(cols);
  }

  function animateEmptyGallery() {
    const c = document.getElementById('empty-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    function size() {
      const r = c.getBoundingClientRect();
      c.width = r.width * 2; c.height = r.height * 2;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
    }
    size();
    const pts = [];
    for (let i = 0; i < 50; i++) {
      pts.push({ x: Math.random() * c.width / 2, y: Math.random() * c.height / 2, r: 0.5 + Math.random() * 1.6, phase: Math.random() * 6.28, speed: 0.5 + Math.random() });
    }
    const t0 = performance.now();
    (function loop() {
      const t = (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, c.width, c.height);
      pts.forEach((p) => {
        const a = 0.3 + 0.5 * Math.sin(p.phase + t * p.speed);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.28);
        ctx.fillStyle = `rgba(255, 217, 90, ${a * 0.55})`;
        ctx.shadowColor = 'rgba(255, 217, 90, 0.6)';
        ctx.shadowBlur = 8;
        ctx.fill();
      });
      if (document.body.contains(c)) requestAnimationFrame(loop);
    })();
  }

  // ---------- Intention modal ----------
  function setupIntentionModal() {
    const modal = document.getElementById('intention-modal');
    if (!modal) return;
    const closeBtn = modal.querySelector('.modal-close');

    const open = () => modal.classList.add('show');
    const close = () => modal.classList.remove('show');
    document.querySelectorAll('[data-open-intention]').forEach((b) => b.addEventListener('click', open));
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    const form = document.getElementById('intention-form');
    const ta = form.querySelector('[name="text"]');
    const counter = form.querySelector('.field-count');
    const MAX = 280;
    const upd = () => {
      const n = (ta.value || '').length;
      counter.textContent = `${n} / ${MAX}`;
      counter.style.color = n > MAX * 0.9 ? 'var(--vatican-yellow)' : 'var(--text-hint)';
    };
    ta.addEventListener('input', upd); upd();

    const status = form.querySelector('.form-status');
    const submit = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        text: (ta.value || '').trim(),
        nom: form.querySelector('[name="nom"]').value.trim(),
        parroquia: form.querySelector('[name="parroquia"]').value.trim(),
        rezare: form.querySelector('[name="rezare"]').checked,
      };
      if (!data.text) return;
      submit.disabled = true;
      submit.textContent = window.t('intentions.form.sending');
      status.classList.remove('show', 'error');
      const hasApi = CONFIG.sheetsApiUrl && CONFIG.sheetsApiUrl !== 'PLACEHOLDER_URL';
      let ok = true;
      if (hasApi) {
        try { await fetch(CONFIG.sheetsApiUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ tab: 'intencions', ...data }) }); }
        catch { ok = false; }
      } else { await new Promise((r) => setTimeout(r, 600)); }
      if (ok) {
        window.ConstellationAPI?.add({ text: data.text });
        status.textContent = window.t('intentions.form.success');
        status.classList.add('show');
        form.reset(); upd();
        setTimeout(close, 1600);
      } else {
        status.textContent = window.t('intentions.form.error');
        status.classList.add('show', 'error');
      }
      submit.disabled = false;
      submit.innerHTML = window.t('intentions.form.submit') + ' <span class="arrow">→</span>';
    });
  }

  // ---------- Lightbox ----------
  function openLightbox(url, caption) {
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    lb.querySelector('img').src = url;
    lb.querySelector('img').alt = caption || '';
    lb.classList.add('show');
  }
  function setupLightbox() {
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lightbox-close')) lb.classList.remove('show'); });
  }

  // ---------- Lang ----------
  function setupLang() {
    document.querySelectorAll('[data-lang]').forEach((b) => {
      b.addEventListener('click', () => {
        const l = b.getAttribute('data-lang');
        window.setLang(l);
        document.querySelectorAll('[data-lang]').forEach((x) => x.classList.toggle('active', x === b));
        if (window.__lastPosts) renderPosts(window.__lastPosts);
        buildDots();
        updateHUD();
      });
      if (b.getAttribute('data-lang') === window.I18N_STATE.lang) b.classList.add('active');
    });
  }

  // ---------- Helpers ----------
  function escapeHTML(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function formatDate(d, lang) {
    if (!d) return '';
    try {
      const date = new Date(d); if (isNaN(date)) return String(d);
      const m = lang === 'es' ? ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
                              : ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des'];
      return `${String(date.getDate()).padStart(2,'0')} ${m[date.getMonth()]} ${date.getFullYear()}`;
    } catch { return String(d); }
  }

  // ---------- Boot ----------
  async function boot() {
    document.documentElement.setAttribute('lang', window.I18N_STATE.lang);
    window.applyI18n();

    setupLang();
    buildDots();
    setupNav();
    setupIntentionModal();
    setupPostModal();
    setupLightbox();

    runLoader(() => {
      document.getElementById('loader')?.classList.add('done');
      setTimeout(() => runCountersFor(scenes[current]), 300);
    });

    startCountdown();

    // Stress-test mode: if CONFIG.demoIntentions > 0, spawn N fake stars to
    // preview how the chart scales with many intentions (pan/zoom gestures).
    if (CONFIG.demoIntentions && CONFIG.demoIntentions > 0) {
      window.ConstellationAPI?.stressTest(CONFIG.demoIntentions);
    } else {
      window.ConstellationAPI?.seed(CONFIG.fallback.intencions);
    }

    const data = await loadData();
    if (data.metrics) renderMetrics(data.metrics);
    // Always reseed with the API response (even empty arrays), otherwise the
    // fallback stars stay on screen when the Sheet has no rows.
    if (data.intentions && !CONFIG.demoIntentions) window.ConstellationAPI?.seed(data.intentions);
    if (data.posts) { window.__lastPosts = data.posts; renderPosts(data.posts); }
    renderGallery(data.gallery);

    const saved = parseInt(localStorage.getItem('abrera.scene') || '0', 10);
    if (!isNaN(saved) && saved > 0 && saved < TOTAL) setScene(saved, true);
    else updateHUD();

    const io = new MutationObserver(() => {
      scenes.forEach((s) => { if (s.classList.contains('active')) runCountersFor(s); });
    });
    scenes.forEach((s) => io.observe(s, { attributes: true, attributeFilter: ['class'] }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
