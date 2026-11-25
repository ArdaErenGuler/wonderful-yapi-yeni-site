// Wikimedia Commons'ta lisanslı aday fotoğraf arar, küçük önizlemeleri indirir, kredileri JSON'a yazar.
import fs from 'fs';
import sharp from 'sharp';
const UA = { 'User-Agent': 'DemoPhotoFinder/1.0 (design demo)' };
const queries = [
  'tower crane construction site sunset', 'apartment building construction site', 'residential building construction crane dusk',
  'modern apartment building facade', 'urban renewal Turkey apartment', 'Ankara skyline', 'Ankara apartment blocks',
  'construction workers site helmet', 'architect blueprint plans desk', 'reinforced concrete construction building frame',
  'modern residential complex Turkey', 'glass skyscraper night lights', 'new apartment buildings dusk', 'construction site aerial',
];
const ok = (lic) => /^(CC0|Public domain|PD|CC BY(-SA)? )/i.test(lic || '') && !/NC|ND/i.test(lic);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(u, json) {
  for (let a = 0; a < 6; a++) {
    const r = await fetch(u, { headers: UA });
    const t = Buffer.from(await r.arrayBuffer());
    if (r.ok && !(json && t.toString('utf8', 0, 12).startsWith('You are'))) return json ? JSON.parse(t.toString()) : t;
    await sleep(4000 * (a + 1));
  }
  throw new Error('rate limit: ' + u.slice(0, 80));
}
const out = []; const seen = new Set();
for (const q of queries) {
  const u = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '30', gsrsearch: q + ' filetype:bitmap',
    prop: 'imageinfo', iiprop: 'url|size|extmetadata|mime', iiurlwidth: '900',
  });
  const j = await get(u, true); await sleep(2500);
  for (const p of Object.values(j.query?.pages || {})) {
    const i = p.imageinfo?.[0]; if (!i || seen.has(p.title)) continue;
    const lic = i.extmetadata?.LicenseShortName?.value;
    if (i.width < 2400 || i.height < 1400 || !ok(lic) || !/jpeg/.test(i.mime)) continue;
    seen.add(p.title);
    out.push({ q, title: p.title, w: i.width, h: i.height, lic, artist: (i.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim(), page: i.descriptionurl, full: i.url, thumb: i.thumburl });
  }
}
console.log('aday:', out.length);
const cols = 6, tw = 300, th = 200;
const tiles = [];
for (let k = 0; k < out.length && k < 72; k++) {
  try {
    const b = await get(out[k].thumb, false); await sleep(700);
    const t = await sharp(b).resize(tw, th, { fit: 'cover' }).toBuffer();
    const lab = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${th}"><rect x="0" y="0" width="44" height="26" fill="#000"/><text x="22" y="19" font-size="16" fill="#fff" text-anchor="middle" font-family="Arial">${k}</text></svg>`);
    tiles.push({ input: await sharp(t).composite([{ input: lab }]).toBuffer(), left: (k % cols) * tw, top: Math.floor(k / cols) * th });
  } catch (e) { out[k].bad = true; }
}
await sharp({ create: { width: cols * tw, height: Math.ceil(tiles.length / cols) * th, channels: 3, background: '#111' } }).composite(tiles).jpeg({ quality: 82 }).toFile('photos/cand/sheet.jpg');
fs.writeFileSync('photos/cand/candidates.json', JSON.stringify(out, null, 1));
out.slice(0, 72).forEach((o, k) => console.log(k, o.lic, o.w + 'x' + o.h, o.title.slice(5, 70)));
