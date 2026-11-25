import * as THREE from 'three';
import { createStage } from './stage.js';
import turkey from './turkey.json';

const S = 1;
const LON0 = 35.2, LAT0 = 39, K = Math.cos((39 * Math.PI) / 180);
const proj = (lon, lat) => [(lon - LON0) * K * S, (lat - LAT0) * S]; // x, "y" (kuzey +)

export const CITIES = [
  { id: 'ankara', ad: 'Ankara', n: 6, lon: 32.86, lat: 39.93, not: 'Mamak, Yenimahalle, Altındağ, Keçiören' },
  { id: 'istanbul', ad: 'İstanbul', n: 1, lon: 29.12, lat: 40.99, not: 'Ataşehir Barbaros' },
  { id: 'hatay', ad: 'Hatay', n: 1, lon: 36.5, lat: 36.8, not: 'Hassa Yeni' },
  { id: 'antalya', ad: 'Antalya', n: 1, lon: 30.71, lat: 36.92, not: 'Kepez' },
];

export function initMap() {
  const canvas = document.getElementById('mapCanvas');
  const holder = canvas.parentElement;
  const stage = createStage(canvas, { cam: [0.3, 14, 13], target: [0.3, 0, 0], fov: 40, shadows: false });
  const { scene, camera } = stage;

  // Türkiye
  const polys = turkey.features[0].geometry;
  const rings = polys.type === 'Polygon' ? [polys.coordinates[0]] : polys.coordinates.map((p) => p[0]);
  const landMat = new THREE.MeshStandardMaterial({ color: 0x1d1d21, roughness: 1 });
  const lineMat = new THREE.LineBasicMaterial({ color: 0xc9a24b, transparent: true, opacity: 0.85 });
  rings.forEach((ring) => {
    const shape = new THREE.Shape(ring.map(([lo, la]) => new THREE.Vector2(...proj(lo, la))));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
    const m = new THREE.Mesh(geo, landMat);
    m.rotation.x = -Math.PI / 2;
    scene.add(m);
    const pts = ring.map(([lo, la]) => { const [x, y] = proj(lo, la); return new THREE.Vector3(x, 0.125, -y); });
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  });

  // noktalı zemin
  const dots = [];
  for (let x = -14; x <= 14; x += 0.7) for (let z = -8; z <= 8; z += 0.7) dots.push(x, -0.02, z);
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
  scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x3a3a40, size: 0.05 })));

  // şehirler
  const world = CITIES.map((c) => {
    const [x, y] = proj(c.lon, c.lat);
    return { ...c, pos: new THREE.Vector3(x, 0.14, -y) };
  });
  const ank = world[0];
  const pins = [];
  world.forEach((c) => {
    const h = 0.25 + c.n * 0.12;
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06 + c.n * 0.012, 0.06 + c.n * 0.012, h, 16),
      new THREE.MeshStandardMaterial({ color: c.id === 'ankara' ? 0xc9a24b : 0xf3efe6, roughness: 0.4 })
    );
    pin.position.copy(c.pos).add(new THREE.Vector3(0, h / 2, 0));
    scene.add(pin);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.13, 40),
      new THREE.MeshBasicMaterial({ color: 0xc9a24b, transparent: true, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(c.pos).add(new THREE.Vector3(0, 0.02, 0));
    scene.add(ring);
    pins.push({ c, pin, ring });
    // etiket
    const el = document.createElement('div');
    el.className = 'map-label';
    el.innerHTML = `<b>${c.ad}</b><span>${c.n} proje</span>`;
    holder.appendChild(el);
    c.el = el;
    c.top = c.pos.clone().add(new THREE.Vector3(0, h + 0.1, 0));
  });

  // yaylar
  const arcs = [];
  world.slice(1).forEach((c) => {
    const mid = ank.pos.clone().lerp(c.pos, 0.5);
    mid.y += ank.pos.distanceTo(c.pos) * 0.35;
    const curve = new THREE.QuadraticBezierCurve3(ank.pos.clone(), mid, c.pos.clone());
    const geo = new THREE.TubeGeometry(curve, 64, 0.016, 4, false);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xc9a24b }));
    scene.add(m);
    arcs.push({ m, total: geo.index.count });
  });

  let t0 = null;
  let hover = null;
  const mouse = { x: 0, y: 0 };
  holder.addEventListener('pointermove', (e) => {
    const r = holder.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width - 0.5);
    mouse.y = ((e.clientY - r.top) / r.height - 0.5);
  });

  const v = new THREE.Vector3();
  stage.onFrame = (t) => {
    if (t0 === null) t0 = t;
    const e = t - t0;
    arcs.forEach((a, i) => {
      const k = Math.min(1, Math.max(0, (e - 0.4 - i * 0.35) / 1.2));
      a.m.geometry.setDrawRange(0, Math.floor((a.total * k) / 3) * 3);
    });
    pins.forEach(({ c, ring }, i) => {
      const ph = ((e * 0.7 + i * 0.25) % 1);
      ring.scale.setScalar(1 + ph * 3.2);
      ring.material.opacity = (1 - ph) * 0.7;
    });
    camera.position.x = 0.3 + mouse.x * 2;
    camera.position.z = 13 + mouse.y * 1.2;
    camera.lookAt(stage.tgt);
    const w = stage.w, h = stage.h;
    world.forEach((c) => {
      v.copy(c.top).project(camera);
      c.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
      c.el.classList.toggle('hot', hover === c.id);
    });
  };

  // yan liste ile etkileşim
  document.querySelectorAll('[data-city]').forEach((li) => {
    li.addEventListener('pointerenter', () => (hover = li.dataset.city));
    li.addEventListener('pointerleave', () => (hover = null));
  });
}
