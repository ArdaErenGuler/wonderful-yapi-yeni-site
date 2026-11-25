// Seçilen demo fotoğraflarını indirir (Wikimedia Commons, serbest lisans) ve src/photos.json'u yazar.
// Gerçek fotoğraflar gelince: public/photos/ içine koy, src/photos.json'da ilgili satırı güncelle (credit'i sil).
import fs from 'fs';
import sharp from 'sharp';
const UA = { 'User-Agent': 'DemoPhotoFinder/1.0 (design demo)' };
const C = JSON.parse(fs.readFileSync('photos/cand/candidates.json', 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// slot -> aday indeksi
const slots = {
  hero: 4, banner: 30, about: 43,
  p1: 41, p2: 5, p3: 46, p4: 31, p5: 13, p6: 36,
  b1: 41, a1: 12, b2: 15, a2: 22, b3: 8, a3: 23, b4: 25, a4: 18, b5: 0, a5: 19,
  b6: 17, a6: 24, b7: 6, a7: 37, b8: 11, a8: 10, b9: 9, a9: 36,
};
const alt = {
  hero: 'Gün batımında şantiye vinçleri', banner: 'Modern bina cephesi', about: 'Ankara silueti',
  p1: 'Riskli yerleşim', p2: 'Yapı tespiti ve inceleme', p3: 'Ankara akşam silueti', p4: 'Mimari proje çizimi', p5: 'Vinçli şantiye', p6: 'Tamamlanmış ışıklı yüksek yapı',
};
fs.mkdirSync('public/photos', { recursive: true });
const cache = {}, manifest = {};
async function dl(idx) {
  if (cache[idx]) return cache[idx];
  const c = C[idx]; const url = c.thumb.replace(/\/\d+px-/, '/1920px-');
  for (let a = 0; a < 6; a++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      const name = `img${idx}.jpg`;
      await sharp(buf).resize({ width: 1920, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile('public/photos/' + name);
      await sleep(1200);
      return (cache[idx] = name);
    }
    await sleep(4000 * (a + 1));
  }
  throw new Error('indirilemedi ' + idx);
}
for (const [slot, idx] of Object.entries(slots)) {
  const f = await dl(idx);
  manifest[slot] = { src: `photos/${f}`, alt: alt[slot] || C[idx].title.replace(/^File:|\.\w+$/g, '').slice(0, 80), credit: `${C[idx].artist || 'Bilinmiyor'} · ${C[idx].lic}`, page: C[idx].page, placeholder: true };
}
fs.writeFileSync('src/photos.json', JSON.stringify(manifest, null, 1));
console.log(Object.keys(cache).length, 'foto indirildi');
