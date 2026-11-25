import { loadAssets } from './assets.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createStage } from './stage.js';
import { createSite, heroLayout } from './buildings.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const STAGES = [
  { k: '01 · Mevcut durum', t: 'Riskli yapı tespit edilir', d: 'Yapı ve parsel analiziyle risk net biçimde ortaya konur.' },
  { k: '02 · Ortak karar', t: 'Hak sahipleriyle birlikte yıkım ve hazırlık', d: 'Malik süreci şeffaf yönetilir, karar adımları planlanır.' },
  { k: '03 · Yeni yaşam', t: 'Güvenli, yeni yapı yükselir', d: 'Proje, uygulama ve teslim tek merkezden takip edilir.' },
];

export async function initHero(rm) {
  await loadAssets();
  const canvas = document.getElementById('heroCanvas');
  const wide = () => window.innerWidth >= 900;
  const stage = createStage(canvas, {
    cam: [5, 3.4, 7], target: [0, 1.7, 0], fov: 36,
    offset: () => (wide() ? { x: 0.2, y: 0 } : { x: 0, y: 0.26 }),
  });
  const site = createSite(heroLayout());
  stage.scene.add(site.group);

  const chip = document.getElementById('heroStage');
  const bar = document.getElementById('heroBar');
  let tgt = rm ? 1 : 0, cur = tgt, shown = -1;

  if (!rm) ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom bottom', onUpdate: (s) => (tgt = s.progress) });

  stage.onFrame = (t) => {
    cur += (tgt - cur) * 0.1;
    const p = cur;
    site.set({
      risk: clamp(p / 0.12) * (1 - clamp((p - 0.3) / 0.1)),
      scan: clamp(p / 0.28),
      collapse: clamp((p - 0.3) / 0.25),
      ghost: clamp((p - 0.3) / 0.15) * (1 - clamp((p - 0.7) / 0.2)),
      build: clamp((p - 0.5) / 0.45),
      time: t,
    });
    const a = 0.7 + p * 0.95 + t * 0.03;
    const r = stage.camera.aspect < 1 ? 17 : 11.8, h = (stage.camera.aspect < 1 ? 6.2 : 4.4) + p * 1.4;
    stage.camera.position.set(Math.sin(a) * r, h, Math.cos(a) * r);
    stage.camera.lookAt(stage.tgt);

    const i = p < 0.3 ? 0 : p < 0.55 ? 1 : 2;
    if (i !== shown && chip) {
      shown = i;
      const s = STAGES[i];
      chip.querySelector('.k').textContent = s.k;
      chip.querySelector('.t').textContent = s.t;
      chip.querySelector('.d').textContent = s.d;
      chip.dataset.i = i;
    }
    if (bar) bar.style.transform = `scaleX(${p})`;
  };
}
