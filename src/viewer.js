// Temsili önce/sonra çiftleri (Google Flow ile üretildi; gerçek proje fotoğrafları gelince değiştirilecek).
// "once" boşsa yalnızca dönüşüm sonrası gösterilir.
const PAIRS = {
  apt: { once: 'flow/proje-apt-once.webp', sonra: 'flow/proje-apt-sonra.webp' },
  kose: { once: 'flow/proje-kose-once.webp', sonra: 'flow/proje-kose-sonra.webp' },
  yamac: { once: 'flow/proje-yamac-once.webp', sonra: 'flow/proje-yamac-sonra.webp' },
  site: { once: 'flow/proje-site-once.webp', sonra: 'flow/proje-site-sonra.webp' },
};

export const PROJECTS = [
  { id: 1, ad: 'Mamak Harman 52127/2', yer: 'Harman / Mamak / Ankara', il: 'Ankara', birim: '280 Gecekondu', g: 'yamac' },
  { id: 2, ad: 'Yenimahalle Işınlar 9744/3', yer: 'Işınlar / Yenimahalle / Ankara', il: 'Ankara', birim: '2 Blok 34 Daire', g: 'apt' },
  { id: 3, ad: 'Yenimahalle Işınlar 9744/4', yer: 'Işınlar / Yenimahalle / Ankara', il: 'Ankara', birim: '2 Blok 34 Daire', g: 'apt' },
  { id: 4, ad: 'Altındağ Aktaş 24282/1', yer: 'Aktaş / Altındağ / Ankara', il: 'Ankara', birim: '700 Gecekondu', g: 'site' },
  { id: 5, ad: 'Altındağ Aktaş 23608/1', yer: 'Aktaş / Altındağ / Ankara', il: 'Ankara', birim: '412 Gecekondu', g: 'yamac' },
  { id: 6, ad: 'Keçiören Yükseltepe 30205/6', yer: 'Yükseltepe / Keçiören / Ankara', il: 'Ankara', birim: '1 Blok 8 Daire', g: 'kose' },
  { id: 7, ad: 'Ataşehir Barbaros', yer: 'Barbaros / Ataşehir / İstanbul', il: 'İstanbul', birim: '94 Daire', g: 'kose' },
  { id: 8, ad: 'Hassa Yeni', yer: 'Yeni / Hassa / Hatay', il: 'Hatay', birim: '1500 Gecekondu', g: 'site' },
  { id: 9, ad: 'Kepez', yer: 'Kepez / Antalya', il: 'Antalya', birim: '44 Gecekondu', g: 'yamac' },
];

const base = import.meta.env.BASE_URL;

export function initViewer() {
  const list = document.getElementById('projList');
  const slider = document.getElementById('baSlider');
  const line = document.getElementById('baLine');
  const stage = document.querySelector('.v-stage');
  const before = document.getElementById('imgBefore');
  const after = document.getElementById('imgAfter');
  const title = document.getElementById('projTitle');
  const meta = document.getElementById('projMeta');

  const setSplit = () => {
    const v = Number(slider.value);
    line.style.left = `${v}%`;
    after.style.clipPath = `inset(0 0 0 ${v}%)`;
  };
  slider.addEventListener('input', setSplit);

  // Görsel üzerinde sürükleyerek de karşılaştırma
  let drag = false;
  const fromPointer = (e) => {
    const r = stage.getBoundingClientRect();
    slider.value = Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
    setSplit();
  };
  stage.addEventListener('pointerdown', (e) => { drag = true; stage.setPointerCapture(e.pointerId); fromPointer(e); });
  stage.addEventListener('pointermove', (e) => drag && fromPointer(e));
  stage.addEventListener('pointerup', () => { drag = false; });

  const hasBefore = {};
  const check = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = src; });

  async function select(i) {
    const p = PROJECTS[i];
    const pair = PAIRS[p.g];
    [...list.children].forEach((b, k) => b.setAttribute('aria-pressed', k === i));
    title.textContent = p.ad;
    meta.innerHTML = `<span>${p.yer}</span><b>${p.birim}</b>`;
    after.src = base + pair.sonra;
    after.alt = `${p.ad} dönüşüm sonrası (temsili)`;
    if (!(p.g in hasBefore)) hasBefore[p.g] = await check(base + pair.once);
    const two = hasBefore[p.g];
    stage.classList.toggle('single', !two);
    slider.closest('.ba').hidden = !two;
    if (two) {
      before.src = base + pair.once;
      before.alt = `${p.ad} mevcut durum (temsili)`;
      slider.value = 50;
    } else {
      before.removeAttribute('src');
      slider.value = 0;
    }
    setSplit();
  }

  PROJECTS.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span class="n">${String(p.id).padStart(2, '0')}</span><span class="tx"><b>${p.ad}</b><small>${p.birim} · ${p.il}</small></span>`;
    b.addEventListener('click', () => select(i));
    list.appendChild(b);
  });
  select(0);
}
