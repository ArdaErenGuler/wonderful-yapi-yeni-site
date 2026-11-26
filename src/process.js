import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Altı adım: 1–5. adımlar boyunca dönüşüm videosu kaydırmayla ileri/geri oynar,
// 6. adımda (Teslim) bitmiş bina görünür.
export function initProcess(rm) {
  const steps = [...document.querySelectorAll('#surec .step')];
  const video = document.getElementById('procVideo');
  const fin = document.getElementById('procFinal');
  const no = document.getElementById('procNo');
  const N = steps.length;
  const VIDEO_PART = (N - 1) / N; // videonun kapsadığı bölüm
  let active = -1;
  let target = 0;
  let raf = 0;

  const seek = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!video || !video.duration) return;
      if (video.seeking) { video.addEventListener('seeked', seek, { once: true }); return; }
      const t = target * (video.duration - 0.05);
      if (Math.abs(video.currentTime - t) > 0.02) video.currentTime = t;
    });
  };
  if (video) {
    video.addEventListener('loadedmetadata', seek);
    // Bazı tarayıcılar ilk kareyi ancak bir oynatma denemesinden sonra çizer
    video.addEventListener('loadeddata', () => { video.play().then(() => { video.pause(); seek(); }).catch(() => {}); }, { once: true });
  }

  const show = (i) => {
    if (i === active) return;
    active = i;
    steps.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('done', k < i); });
    if (no) no.textContent = String(i + 1).padStart(2, '0');
  };

  const setProgress = (p) => {
    show(Math.min(N - 1, Math.floor(p * N)));
    target = Math.min(1, p / VIDEO_PART);
    seek();
    if (fin) fin.style.opacity = Math.min(1, Math.max(0, (p - VIDEO_PART) / (0.5 / N)));
  };

  setProgress(0);
  if (!rm) ScrollTrigger.create({ trigger: '#surec', start: 'top top', end: 'bottom bottom', onUpdate: (s) => setProgress(s.progress) });
  steps.forEach((el, i) => el.addEventListener('click', () => {
    if (rm) return setProgress((i + 0.5) / N);
    const st = document.getElementById('surec');
    const top = st.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (st.offsetHeight - window.innerHeight) * ((i + 0.5) / N), behavior: 'smooth' });
  }));
}
