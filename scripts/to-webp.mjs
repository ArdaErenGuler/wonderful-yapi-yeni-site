// Blender PNG karelerini (alfa kanallı) WebP'ye çevirir.
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const jobs = [
  { dir: 'blender/renders/hero', out: 'public/frames/hero', match: /^hero_(\d+)\.png$/, name: (m) => `${m[1]}.webp` },
  { dir: 'blender/renders/proj', out: 'public/projects', match: /^(proj_\d+_(?:before|after))\.png$/, name: (m) => `${m[1]}.webp` },
];
for (const j of jobs) {
  if (!fs.existsSync(j.dir)) continue;
  fs.mkdirSync(j.out, { recursive: true });
  let n = 0, bytes = 0;
  for (const f of fs.readdirSync(j.dir)) {
    const m = f.match(j.match); if (!m) continue;
    const o = path.join(j.out, j.name(m));
    await sharp(path.join(j.dir, f)).webp({ quality: 80, alphaQuality: 90, effort: 5 }).toFile(o);
    bytes += fs.statSync(o).size; n++;
  }
  console.log(j.dir, '->', j.out, n, 'dosya', Math.round(bytes / 1024), 'KB');
}
