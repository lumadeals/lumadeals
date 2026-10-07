/* ============================================================
   LUMA DEALS — 3D ENGINE v2 (additive; touches no original logic)
   Realistic studio 3D: physical materials, soft shadows,
   gentle motion. Graceful fallback when WebGL is unavailable.
   ============================================================ */
(function () {
  'use strict';
  try { document.documentElement.classList.add('luma-3d'); document.body.classList.add('luma-3d'); } catch (e) {}

  var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var webglOK = (function () {
    try { var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  })();

  /* ---------- 2. subtle ambient dust (light theme) ---------- */
  function initDust() {
    var c = document.createElement('canvas');
    c.id = 'luma-stars';
    document.body.appendChild(c);
    var ctx = c.getContext('2d'), ps = [], W, H;
    function resize() { W = c.width = innerWidth; H = c.height = innerHeight; }
    resize(); addEventListener('resize', resize);
    for (var i = 0; i < 70; i++) ps.push({
      x: Math.random(), y: Math.random(), r: Math.random() * 2 + .6,
      s: Math.random() * .0004 + .0001, o: Math.random() * .25 + .08 });
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < ps.length; i++) { var p = ps[i];
        p.y -= p.s; if (p.y < 0) p.y = 1;
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r, 0, 7);
        ctx.fillStyle = 'rgba(2,132,199,' + p.o + ')'; ctx.fill(); }
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- 4. subtle physical tilt ---------- */
  function initTilt() {
    if (!canHover || reducedMotion) return;
    function attach(card) {
      if (card.closest('.luma-world')) return; /* Luma World cards use pure-CSS 3D */
      if (card.dataset.lumaTilt) return; card.dataset.lumaTilt = '1';
      var glare = document.createElement('div'); glare.className = 'luma-glare';
      card.appendChild(glare);
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.transform = 'rotateY(' + ((px - .5) * 7) + 'deg) rotateX(' + ((.5 - py) * 6) + 'deg) translateY(-4px)';
        glare.style.setProperty('--gx', (px * 100) + '%');
        glare.style.setProperty('--gy', (py * 100) + '%');
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    }
    function scan() {
      document.querySelectorAll('.product-card:not([data-luma-tilt]), .category-card:not([data-luma-tilt])').forEach(attach);
    }
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- 5. reveal on scroll ---------- */
  function initReveal() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('luma-in'); io.unobserve(en.target); } });
    }, { threshold: .12 });
    function scan() {
      document.querySelectorAll('.product-card:not(.luma-reveal), .category-card:not(.luma-reveal), .home-section-heading:not(.luma-reveal)')
        .forEach(function (el) { el.classList.add('luma-reveal'); io.observe(el); });
    }
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- 6. Luma World: Virtual Shopping Mall (additive; no existing markup touched) ---------- */
  var MALL_STORES = [
    { key: 'Beauty',      cls: 'st-beauty',      x: '22%', y: '27%', h: '168px' },
    { key: 'Kitchen',     cls: 'st-kitchen',     x: '41%', y: '15%', h: '152px' },
    { key: 'Toys',        cls: 'st-toys',        x: '59%', y: '15%', h: '142px' },
    { key: 'Home',        cls: 'st-home',        x: '78%', y: '27%', h: '160px' },
    { key: 'Fashion',     cls: 'st-fashion',     x: '80%', y: '63%', h: '176px' },
    { key: 'Electronics', cls: 'st-electronics', x: '61%', y: '78%', h: '150px' },
    { key: 'Boutique',    cls: 'st-boutique',    x: '39%', y: '78%', h: '164px' },
    { key: 'Hand Made',   cls: 'st-handmade',    x: '20%', y: '63%', h: '146px' }
  ];
  var MALL_TREES = [[8,20],[92,22],[6,55],[94,58],[30,90],[70,90]];
  var MALL_LAMPS = [[46,60],[54,60],[44,80],[56,80],[30,45],[70,45]];

  function mallStoreHTML(s) {
    return '<div class="mall-slot" style="left:' + s.x + ';top:' + s.y + ';--h:' + s.h + '">' +
      '<button type="button" class="mall-store ' + s.cls + '"' +
      ' onclick="toggleCategorySubcategories(\'' + s.key + '\', event)"' +
      ' aria-label="' + s.key + ' store — show ' + s.key + ' subcategories">' +
      '<span class="b-shadow" aria-hidden="true"></span>' +
      '<span class="b-glow" aria-hidden="true"></span>' +
      '<span class="b-face b-back" aria-hidden="true"></span>' +
      '<span class="b-face b-side b-left" aria-hidden="true"></span>' +
      '<span class="b-face b-side b-right" aria-hidden="true"></span>' +
      '<span class="b-face b-roof" aria-hidden="true"></span>' +
      '<span class="b-face b-front" aria-hidden="true">' +
      '<span class="b-sign">' + s.key + '</span>' +
      '<span class="b-glass"></span><span class="b-door"></span><span class="b-base"></span>' +
      '</span></button></div>';
  }

  function initMallParallax(viewport) {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!window.matchMedia('(pointer: fine)').matches) return;
      var layer = viewport.querySelector('.mall-parallax');
      if (!layer) return;
      var raf = 0, tx = 0, ty = 0;
      function apply() {
        raf = 0;
        layer.style.setProperty('--px', tx.toFixed(1) + 'px');
        layer.style.setProperty('--py', ty.toFixed(1) + 'px');
      }
      viewport.addEventListener('mousemove', function (e) {
        var r = viewport.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 16;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 10;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      viewport.addEventListener('mouseleave', function () {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(apply);
      });
    } catch (e) {}
  }

  function initLumaWorld() {
    var showcase = document.querySelector('.home-feature-section .category-showcase');
    if (!showcase) return;
    var section = showcase.closest('.home-feature-section');
    if (!section || section.classList.contains('luma-world')) return;
    section.classList.add('luma-world');

    /* header: LUMA WORLD + subtitle + description + live indicator */
    var headDiv = section.querySelector('.home-section-heading > div');
    if (headDiv) {
      var eyebrow = headDiv.querySelector('span');
      if (eyebrow) eyebrow.textContent = 'LUMA WORLD';
      var h2 = headDiv.querySelector('h2');
      if (h2) h2.textContent = 'Enter a world of better shopping';
      if (eyebrow && !headDiv.querySelector('.mall-live')) {
        var live = document.createElement('span');
        live.className = 'mall-live';
        live.innerHTML = '<i></i>LIVE SHOPPING WORLD';
        eyebrow.parentNode.insertBefore(live, eyebrow.nextSibling);
      }
    }
    var heading = section.querySelector('.home-section-heading');
    if (heading) {
      var oldSub = section.querySelector('.luma-world-sub');
      if (oldSub) oldSub.remove();
      var sub = document.createElement('p');
      sub.className = 'luma-world-sub';
      sub.textContent = 'Explore our virtual shopping mall and discover products across every category.';
      heading.insertAdjacentElement('afterend', sub);
    }

    /* clear any previous-generation mall markup */
    var oldStage = section.querySelector('.luma-world-stage');
    if (oldStage) oldStage.remove();
    if (section.querySelector('.mall-viewport')) return;

    /* build the diorama */
    var html = '<div class="mall-viewport"><div class="mall-scroll"><div class="mall-parallax"><div class="mall-world">';
    html += '<div class="mall-ground" aria-hidden="true"></div>';
    html += '<div class="mall-plaza-ring" aria-hidden="true"></div>';
    html += '<div class="mall-path p1" aria-hidden="true"></div>';
    html += '<div class="mall-path p2" aria-hidden="true"></div>';
    html += '<div class="mall-path p3" aria-hidden="true"></div>';
    for (var t = 0; t < MALL_TREES.length; t++) {
      html += '<div class="mall-tree" aria-hidden="true" style="left:' + MALL_TREES[t][0] + '%;top:' + MALL_TREES[t][1] + '%"></div>';
    }
    for (var l = 0; l < MALL_LAMPS.length; l++) {
      html += '<div class="mall-lamp" aria-hidden="true" style="left:' + MALL_LAMPS[l][0] + '%;top:' + MALL_LAMPS[l][1] + '%"></div>';
    }
    for (var i = 0; i < MALL_STORES.length; i++) html += mallStoreHTML(MALL_STORES[i]);
    html += '<div class="mall-slot mall-landmark-slot" style="left:50%;top:47%;--h:248px;--w:152px;--d:104px">' +
      '<div class="mall-landmark" role="img" aria-label="Luma Deals landmark tower">' +
      '<span class="b-shadow" aria-hidden="true"></span>' +
      '<span class="b-face b-back" aria-hidden="true"></span>' +
      '<span class="b-face b-side b-left" aria-hidden="true"></span>' +
      '<span class="b-face b-side b-right" aria-hidden="true"></span>' +
      '<span class="b-face b-roof" aria-hidden="true"></span>' +
      '<span class="b-face b-front" aria-hidden="true">' +
      '<span class="b-sign">LUMA DEALS</span><span class="b-glass"></span><span class="b-beacon"></span>' +
      '</span></div></div>';
    html += '</div></div></div>';
    html += '<div class="mall-particles" aria-hidden="true">';
    for (var p = 0; p < 12; p++) html += '<span></span>';
    html += '</div></div>';

    var holder = document.createElement('div');
    holder.innerHTML = html;
    var viewport = holder.firstChild;
    var subcats = document.getElementById('category-subcategories');
    if (subcats) section.insertBefore(viewport, subcats);
    else section.appendChild(viewport);
    /* exclusive building highlight: clear first (capture), toggle re-adds */
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.mall-store') : null;
      if (!btn || !section.contains(btn)) return;
      var actives = section.querySelectorAll('.mall-store.active');
      for (var i = 0; i < actives.length; i++) actives[i].classList.remove('active');
    }, true);
    initMallParallax(viewport);
  }

  /* ---------- boot ---------- */
  function boot() {
    try { initDust(); } catch (e) {}
    initLumaWorld();
    initTilt();
    initReveal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
