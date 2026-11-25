import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createStage, addLights } from './stage.js';
import { createSite, projectLayout } from './buildings.js';

export const PROJECTS = [
  { id: 1, ad: 'Mamak Harman 52127/2', yer: 'Harman / Mamak / Ankara', il: 'Ankara', birim: '280 Gecekondu', oldN: 280, towers: 5, floors: 8 },
  { id: 2, ad: 'Yenimahalle Işınlar 9744/3', yer: 'Işınlar / Yenimahalle / Ankara', il: 'Ankara', birim: '2 Blok 34 Daire', oldN: 6, towers: 2, floors: 6 },
  { id: 3, ad: 'Yenimahalle Işınlar 9744/4', yer: 'Işınlar / Yenimahalle / Ankara', il: 'Ankara', birim: '2 Blok 34 Daire', oldN: 6, towers: 2, floors: 6 },
  { id: 4, ad: 'Altındağ Aktaş 24282/1', yer: 'Aktaş / Altındağ / Ankara', il: 'Ankara', birim: '700 Gecekondu', oldN: 700, towers: 6, floors: 9 },
  { id: 5, ad: 'Altındağ Aktaş 23608/1', yer: 'Aktaş / Altındağ / Ankara', il: 'Ankara', birim: '412 Gecekondu', oldN: 412, towers: 4, floors: 8 },
  { id: 6, ad: 'Keçiören Yükseltepe 30205/6', yer: 'Yükseltepe / Keçiören / Ankara', il: 'Ankara', birim: '1 Blok 8 Daire', oldN: 3, towers: 1, floors: 5 },
  { id: 7, ad: 'Ataşehir Barbaros', yer: 'Barbaros / Ataşehir / İstanbul', il: 'İstanbul', birim: '94 Daire', oldN: 10, towers: 3, floors: 8 },
  { id: 8, ad: 'Hassa Yeni', yer: 'Yeni / Hassa / Hatay', il: 'Hatay', birim: '1500 Gecekondu', oldN: 1500, towers: 8, floors: 6 },
  { id: 9, ad: 'Kepez', yer: 'Kepez / Antalya', il: 'Antalya', birim: '44 Gecekondu', oldN: 44, towers: 2, floors: 6 },
];

export function initViewer() {
  const canvas = document.getElementById('viewCanvas');
  const list = document.getElementById('projList');
  const slider = document.getElementById('baSlider');
  const line = document.getElementById('baLine');
  const title = document.getElementById('projTitle');
  const meta = document.getElementById('projMeta');

  const stage = createStage(canvas, { cam: [8, 6, 9], target: [0, 1.2, 0], fov: 36 });
  const { renderer, camera } = stage;
  const sceneB = new THREE.Scene(); // önce
  addLights(sceneB);
  const sceneA = stage.scene;       // sonra

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.38;
  controls.target.copy(stage.tgt);
  controls.autoRotate = true; controls.autoRotateSpeed = 0.7;
  canvas.addEventListener('pointerdown', () => (controls.autoRotate = false));

  let before, after, split = 0.5;

  function select(i) {
    const p = PROJECTS[i];
    [...list.children].forEach((b, k) => b.setAttribute('aria-pressed', k === i));
    if (before) sceneB.remove(before.group);
    if (after) sceneA.remove(after.group);
    const lay = projectLayout(p);
    before = createSite({ ...lay, seed: 5 + i });
    after = createSite({ ...lay, seed: 5 + i });
    before.set({ collapse: 0, build: 0 });
    after.set({ collapse: 1, build: 1 });
    sceneB.add(before.group); sceneA.add(after.group);
    const R = lay.extent * 2.1 + 6;
    camera.position.set(R * 0.8, R * 0.62, R);
    controls.maxDistance = R * 1.6; controls.minDistance = R * 0.5;
    controls.update();
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

  const setSplit = () => {
    split = slider.value / 100;
    line.style.left = `${split * 100}%`;
  };
  slider.addEventListener('input', setSplit);
  setSplit();

  renderer.autoClear = false;
  renderer.setScissorTest(true);
  stage.render = () => {
    controls.update();
    const w = stage.w, h = stage.h, sx = Math.round(w * split);
    renderer.clear();
    renderer.setViewport(0, 0, w, h);
    renderer.setScissor(0, 0, sx, h);
    renderer.render(sceneB, camera);
    renderer.setScissor(sx, 0, w - sx, h);
    renderer.render(sceneA, camera);
  };

  select(0);
}
