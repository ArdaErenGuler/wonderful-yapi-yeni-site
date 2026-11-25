export const PROJECTS = [
  { id: 1, ad: 'Mamak Harman 52127/2', yer: 'Harman / Mamak / Ankara', il: 'Ankara', birim: '280 Gecekondu' },
  { id: 2, ad: 'Yenimahalle Işınlar 9744/3', yer: 'Işınlar / Yenimahalle / Ankara', il: 'Ankara', birim: '2 Blok 34 Daire' },
  { id: 3, ad: 'Yenimahalle Işınlar 9744/4', yer: 'Işınlar / Yenimahalle / Ankara', il: 'Ankara', birim: '2 Blok 34 Daire' },
  { id: 4, ad: 'Altındağ Aktaş 24282/1', yer: 'Aktaş / Altındağ / Ankara', il: 'Ankara', birim: '700 Gecekondu' },
  { id: 5, ad: 'Altındağ Aktaş 23608/1', yer: 'Aktaş / Altındağ / Ankara', il: 'Ankara', birim: '412 Gecekondu' },
  { id: 6, ad: 'Keçiören Yükseltepe 30205/6', yer: 'Yükseltepe / Keçiören / Ankara', il: 'Ankara', birim: '1 Blok 8 Daire' },
  { id: 7, ad: 'Ataşehir Barbaros', yer: 'Barbaros / Ataşehir / İstanbul', il: 'İstanbul', birim: '94 Daire' },
  { id: 8, ad: 'Hassa Yeni', yer: 'Yeni / Hassa / Hatay', il: 'Hatay', birim: '1500 Gecekondu' },
  { id: 9, ad: 'Kepez', yer: 'Kepez / Antalya', il: 'Antalya', birim: '44 Gecekondu' },
];

import photos from './photos.json';
const base = import.meta.env.BASE_URL;

export function initViewer() {
  const list = document.getElementById('projList');
  const slider = document.getElementById('baSlider');
  const line = document.getElementById('baLine');
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
  setSplit();

  function select(i) {
    const p = PROJECTS[i];
    [...list.children].forEach((b, k) => b.setAttribute('aria-pressed', k === i));
    before.src = base + photos['b' + p.id].src;
    after.src = base + photos['a' + p.id].src;
    before.alt = `${p.ad} mevcut durum`; after.alt = `${p.ad} dönüşüm sonrası`;
    title.textContent = p.ad;
    meta.innerHTML = `<span>${p.yer}</span><b>${p.birim}</b>`;
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
