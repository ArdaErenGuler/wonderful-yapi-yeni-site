import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initProcess(rm) {
  const steps = [...document.querySelectorAll('#surec .step')];
  const imgs = [...document.querySelectorAll('#surec .proc-frame img')];
  const no = document.getElementById('procNo');
  const N = steps.length;
  let active = -1;
  const show = (i) => {
    if (i === active) return;
    active = i;
    steps.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('done', k < i); });
    imgs.forEach((im, k) => im.classList.toggle('on', k === i));
    if (no) no.textContent = String(i + 1).padStart(2, '0');
  };
  show(0);
  if (!rm) ScrollTrigger.create({ trigger: '#surec', start: 'top top', end: 'bottom bottom', onUpdate: (s) => show(Math.min(N - 1, Math.floor(s.progress * N))) });
  steps.forEach((el, i) => el.addEventListener('click', () => {
    if (rm) return show(i);
    const st = document.getElementById('surec');
    const top = st.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (st.offsetHeight - window.innerHeight) * ((i + 0.5) / N), behavior: 'smooth' });
  }));
}
