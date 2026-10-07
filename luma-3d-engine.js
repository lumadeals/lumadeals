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

  /* ---------- 1. inject hero ---------- */
  function injectHero() {
    var home = document.getElementById('page-home');
    if (!home || document.querySelector('.luma-hero')) return;
    var hero = document.createElement('div');
    hero.className = 'luma-hero';
    hero.innerHTML =
      '<canvas id="luma-hero-3d"></canvas>' +
      '<div class="luma-hero-inner">' +
        '<span class="luma-eyebrow">Luma Deals &mdash; Premium Shopping</span>' +
        '<h1>Great deals, <span class="accent">beautifully</span> presented</h1>' +
        '<p class="luma-sub">Hand-picked products at honest prices, in a store designed to feel as good as it looks.</p>' +
        '<div class="luma-cta-row">' +
          '<button class="luma-btn" onclick="showPage(\'shop\')">Shop the Deals</button>' +
          '<button class="luma-btn ghost" onclick="showPage(\'about\')">Our Story</button>' +
        '</div>' +
        '<div class="luma-stats">' +
          '<div class="luma-stat"><b>10k+</b><span>Curated deals</span></div>' +
          '<div class="luma-stat"><b>4.9&#9733;</b><span>Shopper rating</span></div>' +
          '<div class="luma-stat"><b>24h</b><span>Fast dispatch</span></div>' +
        '</div>' +
      '</div>';
    home.insertBefore(hero, home.firstChild);
  }

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

  /* ---------- 3. realistic studio hero scene ---------- */
  var mouseX = 0, mouseY = 0;
  addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / innerWidth - .5); mouseY = (e.clientY / innerHeight - .5);
  });
  function initHeroScene() {
    if (!webglOK || !window.THREE || reducedMotion) return;
    var canvas = document.getElementById('luma-hero-3d');
    if (!canvas) return;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
    camera.position.set(0, 1.6, 13);

    // studio lighting: soft key with shadows, cool fill, warm rim
    scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe9f2, .85));
    var key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(6, 10, 7); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -10; key.shadow.camera.right = 10;
    key.shadow.camera.top = 10; key.shadow.camera.bottom = -10;
    key.shadow.radius = 6;
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xbfe3ff, .5); fill.position.set(-7, 3, 6); scene.add(fill);
    var rim = new THREE.DirectionalLight(0xffe8c8, .45); rim.position.set(-2, 4, -8); scene.add(rim);

    // invisible ground catching soft shadows
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: .14 })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -3.4; ground.receiveShadow = true;
    scene.add(ground);

    // realistic materials: glossy ceramic + brushed brand blue
    var ceramic = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .22, metalness: .05, clearcoat: 1, clearcoatRoughness: .25 });
    var brandBlue = new THREE.MeshPhysicalMaterial({ color: 0x2aa5e0, roughness: .28, metalness: .15, clearcoat: 1, clearcoatRoughness: .2 });
    var deepBlue = new THREE.MeshPhysicalMaterial({ color: 0x0e6ea3, roughness: .35, metalness: .2, clearcoat: .8 });
    var softGray = new THREE.MeshPhysicalMaterial({ color: 0xdde6ee, roughness: .5, metalness: .05, clearcoat: .4 });

    var group = new THREE.Group(); scene.add(group);
    var shapes = [];
    function add(mesh, x, y, z, s) {
      mesh.position.set(x, y, z); mesh.scale.set(s, s, s);
      mesh.castShadow = true;
      mesh.userData = { fy: Math.random() * 6.28, fa: Math.random() * .35 + .15,
        rx: (Math.random() - .5) * .006, ry: (Math.random() - .5) * .008 };
      group.add(mesh); shapes.push(mesh); return mesh;
    }
    // centerpiece: glossy torus knot in brand blue
    add(new THREE.Mesh(new THREE.TorusKnotGeometry(1.5, .42, 160, 24), brandBlue), 0, .4, 0, 1);
    // supporting shapes
    add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), ceramic), -5.2, -.6, -1.5, .9);
    add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), softGray), 5.4, -1.1, -2, 1.25);
    add(new THREE.Mesh(new THREE.TorusGeometry(.9, .3, 24, 48), ceramic), 4.6, 1.6, -1, .8);
    add(new THREE.Mesh(new THREE.TorusGeometry(.7, .24, 24, 48), deepBlue), -4.4, 1.9, -2.5, .7);
    add(new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 1.6, 40), ceramic), -2.8, -1.8, 1.5, .7);
    add(new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 1), brandBlue), 2.9, -1.9, 1.2, .75);

    function resize() {
      var w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || 480;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    resize(); addEventListener('resize', resize);

    var t = 0, running = true;
    document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) loop(); });
    (function loop() {
      if (!running) return;
      requestAnimationFrame(loop);
      t += .01;
      for (var i = 0; i < shapes.length; i++) { var m = shapes[i], u = m.userData;
        m.rotation.x += u.rx; m.rotation.y += u.ry;
        m.position.y += Math.sin(t * 1.6 + u.fy) * .0035 * u.fa; }
      group.rotation.y += (mouseX * .22 - group.rotation.y) * .045;
      group.rotation.x += (mouseY * .14 - group.rotation.x) * .045;
      camera.position.x += (mouseX * 1.1 - camera.position.x) * .03;
      camera.position.y += ((1.6 - mouseY * .8) - camera.position.y) * .03;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
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

  /* ---------- 6. Luma World 3D section (additive; no existing markup touched) ---------- */
  function initLumaWorld() {
    var showcase = document.querySelector('.home-feature-section .category-showcase');
    if (!showcase) return;
    var section = showcase.closest('.home-feature-section');
    if (!section || section.classList.contains('luma-world')) return;
    section.classList.add('luma-world');
    var eyebrow = section.querySelector('.home-section-heading > div > span');
    if (eyebrow) eyebrow.textContent = 'LUMA WORLD';
    var heading = section.querySelector('.home-section-heading');
    if (heading && !section.querySelector('.luma-world-sub')) {
      var sub = document.createElement('p');
      sub.className = 'luma-world-sub';
      sub.textContent = 'Step into our universe of handpicked deals — eight curated destinations, one premium shopping world.';
      heading.insertAdjacentElement('afterend', sub);
    }
    if (!section.querySelector('.luma-world-stage')) {
      var stage = document.createElement('div');
      stage.className = 'luma-world-stage';
      stage.setAttribute('aria-hidden', 'true');
      stage.innerHTML =
        '<div class="luma-world-floor"></div>' +
        '<div class="luma-world-orb"><div class="luma-orb-ring"></div><div class="luma-orb-sphere"></div>' +
        '<div class="luma-orb-chip c1">\uD83D\uDC84</div><div class="luma-orb-chip c2">\uD83D\uDCF1</div><div class="luma-orb-chip c3">\uD83D\uDC5C</div></div>' +
        '<div class="luma-world-sparks"><span></span><span></span><span></span><span></span><span></span><span></span></div>';
      showcase.parentNode.insertBefore(stage, showcase);
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    injectHero();
    try { initDust(); } catch (e) {}
    initLumaWorld();
    initTilt();
    initReveal();
    var tries = 0;
    (function wait() {
      if (window.THREE) { try { initHeroScene(); } catch (e) {} }
      else if (++tries < 100) setTimeout(wait, 100);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
