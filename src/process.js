import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createStage } from './stage.js';
import { createSite, heroLayout } from './buildings.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function initProcess(rm) {
  const canvas = document.getElementById('processCanvas');
  const stage = createStage(canvas, { cam: [6, 4, 7.5], target: [0, 1.7, 0], fov: 36 });
  const layout = heroLayout();
  const site = createSite({ ...layout, seed: 23 });
  stage.scene.add(site.group);

  const steps = [...document.querySelectorAll('#surec .step')];
  const N = steps.length;
  let tgt = rm ? 1 : 0, cur = tgt, active = -1;

  if (!rm) {
    ScrollTrigger.create({ trigger: '#surec', start: 'top top', end: 'bottom bottom', onUpdate: (s) => (tgt = s.progress) });
  }
  steps.forEach((el, i) => el.addEventListener('click', () => {
    const st = document.getElementById('surec');
    const top = st.getBoundingClientRect().top + window.scrollY;
    const range = st.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + range * ((i + 0.5) / N), behavior: 'smooth' });
  }));

  stage.onFrame = (t) => {
    cur += (tgt - cur) * 0.09;
    const p = cur;
    site.set({
      risk: clamp(p / 0.1) * (1 - clamp((p - 0.28) / 0.08)),
      scan: clamp(p / 0.3),
      collapse: clamp((p - 0.3) / 0.2),
      ghost: clamp((p - 0.3) / 0.12) * (1 - clamp((p - 0.7) / 0.2)),
      build: clamp((p - 0.5) / 0.48),
      time: t,
    });
    const a = 0.5 + p * 1.3, R = stage.camera.aspect < 1 ? 15 : 11.8;
    stage.camera.position.set(Math.sin(a) * R, 4.6 + p, Math.cos(a) * R);
    stage.camera.lookAt(stage.tgt);

    const i = Math.min(N - 1, Math.floor(p * N));
    if (i !== active) {
      active = i;
      steps.forEach((s, k) => {
        s.classList.toggle('on', k === i);
        s.classList.toggle('done', k < i);
      });
    }
  };
}
