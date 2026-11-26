import gsap from 'gsap';

const clamp = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Giriş: kaydırdıkça eski bina toz bulutunun içinden yeni binaya dönüşür.
export function initHero(rm) {
  const hero = document.getElementById('hero');
  const art = document.getElementById('heroArt');
  if (!hero || !art) return;
  const oldImg = art.querySelector('.h-old');
  const newImg = art.querySelector('.h-new');
  const scan = art.querySelector('.h-scan');
  const steps = [...hero.querySelectorAll('.h-index li:not(.h-bar)')];
  const bar = hero.querySelector('.h-bar b');
  const dust = createDust(document.getElementById('dust'), rm);

  const apply = (p) => {
    const t = clamp((p - 0.1) / 0.72);
    const e = ease(t);
    newImg.style.clipPath = `inset(${(1 - e) * 100}% 0 0 0)`;
    scan.style.top = `${(1 - e) * 100}%`;
    scan.style.opacity = e > 0.01 && e < 0.99 ? 1 : 0;
    oldImg.style.filter = `brightness(${1.3 - e * 0.8}) contrast(1.08) saturate(${1 - e * 0.4})`;
    steps.forEach((li, i) => li.classList.toggle('on', i === (e > 0.5 ? 1 : 0)));
    if (bar) bar.style.transform = `scaleY(${p})`;
    dust.set(e, Math.sin(Math.PI * t));
  };

  if (rm) { apply(1); return; }
  apply(0);

  // Açılış animasyonu
  gsap.from('.hero-copy > *', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07 });
  gsap.from(art, { scale: 1.08, opacity: 0, duration: 1.4, ease: 'power2.out' });

  // Kaydırma: yumuşatılmış (scrub) ilerleme
  const st = { p: 0 };
  gsap.to(st, {
    p: 1, ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.8 },
    onUpdate: () => apply(st.p),
  });

  // Fareyle hafif derinlik (parallax)
  // Fareyle 3D derinlik: bina perspektifle döner, toz katmanı ters yönde kayar
  if (window.matchMedia('(pointer: fine)').matches) {
    const dustEl = document.getElementById('dust');
    gsap.set(art, { transformPerspective: 1400, transformOrigin: '70% 55%' });
    const o = { duration: 1.6, ease: 'power3' };
    const ax = gsap.quickTo(art, 'x', o), ay = gsap.quickTo(art, 'y', o);
    const ry = gsap.quickTo(art, 'rotationY', o), rx = gsap.quickTo(art, 'rotationX', o);
    const dx = gsap.quickTo(dustEl, 'x', o), dy = gsap.quickTo(dustEl, 'y', o);
    hero.addEventListener('pointermove', (ev) => {
      const nx = ev.clientX / window.innerWidth - 0.5;
      const ny = ev.clientY / window.innerHeight - 0.5;
      ax(nx * -22); ay(ny * -14);
      ry(nx * 5); rx(ny * -3.5);
      dx(nx * 40); dy(ny * 24);
    });
    hero.addEventListener('pointerleave', () => { ax(0); ay(0); ry(0); rx(0); dx(0); dy(0); });
  }
}

// Yükselen toz / kor parçacıkları. warm: 0 = soğuk gri toz, 1 = altın kor. burst: yoğunluk.
function createDust(canvas, rm) {
  const noop = { set() {} };
  if (!canvas || rm) return noop;
  const ctx = canvas.getContext('2d');
  if (!ctx) return noop;
  const N = window.innerWidth < 768 ? 45 : 110;
  const P = [];
  let w = 1, h = 1, warm = 0, burst = 0, raf = 0, last = performance.now(), visible = true;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth || 1; h = canvas.clientHeight || 1;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const spawn = (p, init) => {
    p.x = w * (0.42 + Math.random() * 0.58);
    p.y = init ? h * (0.2 + Math.random() * 0.8) : h + 8;
    p.r = 0.6 + Math.random() * 2.2;
    p.vy = -(10 + Math.random() * 30);
    p.vx = (Math.random() - 0.5) * 12;
    p.a = 0.15 + Math.random() * 0.6;
    p.ph = Math.random() * 6.283;
  };
  resize();
  for (let i = 0; i < N; i++) { const p = {}; spawn(p, true); P.push(p); }
  window.addEventListener('resize', resize);

  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, w, h);
    const speed = 1 + burst * 2.4;
    const r = Math.round(150 + 105 * warm), g = Math.round(170 + 8 * warm), b = Math.round(200 - 110 * warm);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of P) {
      p.ph += dt;
      p.y += p.vy * dt * speed;
      p.x += (p.vx + Math.sin(p.ph * 1.3) * 7) * dt * speed;
      if (p.y < h * 0.12 || p.x < -10 || p.x > w + 10) spawn(p, false);
      const fade = clamp((h - p.y) / (h * 0.2)) * clamp((p.y - h * 0.12) / (h * 0.25));
      const alpha = p.a * fade * (0.5 + burst * 0.7);
      if (alpha < 0.01) continue;
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 + burst * 0.6), 0, 6.283);
      ctx.fill();
    }
    if (visible) raf = requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }).observe(canvas);

  return { set(wm, bu) { warm = wm; burst = bu; } };
}
