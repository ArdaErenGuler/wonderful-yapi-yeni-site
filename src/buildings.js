import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { cloneAsset } from './assets.js';

export const COL = { ink: 0x0f1b2d, accent: 0xe4572e, board: 0xe3dfd4, road: 0xd1cbbd };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const FH = 0.42; // Blender'daki kat yüksekliği

/** Yeni, güvenli blok: Blender kat modülü kat kat yükselir. */
export function makeTower({ w = 1.5, d = 1.5, floors = 8 }) {
  const g = new THREE.Group();
  const sx = w / 1.5, sz = d / 1.5;
  const flo = [];
  for (let i = 0; i < floors; i++) {
    const f = cloneAsset('Floor');
    f.scale.set(sx, 0.001, sz);
    f.position.y = i * FH;
    f.rotation.y = i % 2 ? Math.PI : 0;
    f.visible = false;
    g.add(f); flo.push(f);
  }
  const roof = cloneAsset('Roof');
  roof.scale.set(sx, 0.001, sz);
  roof.position.y = floors * FH;
  roof.visible = false;
  g.add(roof);

  // tel kafes hayalet
  const ghostMat = new THREE.LineBasicMaterial({ color: COL.accent, transparent: true, opacity: 0 });
  const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, FH * 0.96, d));
  for (let i = 0; i < floors; i++) {
    const l = new THREE.LineSegments(eg, ghostMat);
    l.position.y = i * FH + FH * 0.48;
    g.add(l);
  }

  g.userData.ghostMat = ghostMat;
  g.userData.set = (p) => {
    for (let i = 0; i < floors; i++) {
      const s = easeOut(clamp(p * (floors + 1) - i));
      const f = flo[i];
      f.visible = s > 0.002;
      f.scale.y = Math.max(s, 0.001);
    }
    const rs = easeOut(clamp((p - 0.92) * 12));
    roof.visible = rs > 0.002;
    roof.scale.setScalar(Math.max(rs, 0.001));
    roof.scale.x = sx * Math.max(rs, 0.001);
    roof.scale.z = sz * Math.max(rs, 0.001);
  };
  return g;
}

function makeOld(r, s = 1) {
  const g = cloneAsset(`Old_${1 + Math.floor(r() * 3)}`, { ownMaterials: true });
  g.scale.setScalar(s * (0.9 + r() * 0.2));
  g.rotation.y = Math.floor(r() * 4) * (Math.PI / 2) + (r() - 0.5) * 0.25;
  const walls = [];
  g.traverse((m) => {
    if (!m.isMesh) return;
    (Array.isArray(m.material) ? m.material : [m.material]).forEach((mt) => {
      if (mt.name === 'oldwall') { mt.emissive = new THREE.Color(0xe4572e); mt.emissiveIntensity = 0; walls.push(mt); }
    });
  });
  g.userData = { walls, delay: r() * 0.4, tilt: (r() - 0.5) * 0.8, baseS: g.scale.x };
  return g;
}

/**
 * Şantiye maketi: zemin + yollar + ağaçlar + eski yapılar + yeni bloklar + tarama halkası + toz.
 * cfg: { olds:[{x,z,s?}], towers:[{x,z,w,d,floors}], radius, roadAt }
 */
export function createSite(cfg) {
  const group = new THREE.Group();
  const r = rng(cfg.seed || 11);
  const radius = cfg.radius || 6;
  const roadAt = cfg.roadAt || radius * 0.62;

  // maket tabanı
  const board = new THREE.Mesh(
    new RoundedBoxGeometry(radius * 2, 0.22, radius * 2, 3, 0.06),
    new THREE.MeshStandardMaterial({ color: COL.board, roughness: 0.95 })
  );
  board.position.y = -0.11; board.receiveShadow = true;
  const rim = new THREE.Mesh(
    new RoundedBoxGeometry(radius * 2 + 0.16, 0.1, radius * 2 + 0.16, 3, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xfaf7f1, roughness: 0.8 })
  );
  rim.position.y = -0.27; rim.receiveShadow = true;
  group.add(rim, board);

  // yollar
  const roadMat = new THREE.MeshStandardMaterial({ color: COL.road, roughness: 1 });
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ax, az]) => {
    const along = ax !== 0;
    const m = new THREE.Mesh(new THREE.BoxGeometry(along ? 0.5 : radius * 2 - 0.2, 0.012, along ? radius * 2 - 0.2 : 0.5), roadMat);
    m.position.set(ax * roadAt, 0.006, az * roadAt);
    m.receiveShadow = true;
    group.add(m);
  });

  // ağaçlar
  const nT = Math.round(10 + radius * 6);
  for (let i = 0; i < nT; i++) {
    const x = (r() * 2 - 1) * (radius - 0.35), z = (r() * 2 - 1) * (radius - 0.35);
    if (Math.abs(x) < roadAt + 0.55 && Math.abs(z) < roadAt + 0.55) continue; // merkez alan boş
    if (Math.abs(Math.abs(x) - roadAt) < 0.4 || Math.abs(Math.abs(z) - roadAt) < 0.4) continue; // yol üstü
    const t = cloneAsset(r() < 0.6 ? 'Tree_1' : 'Tree_2');
    t.position.set(x, 0, z);
    t.scale.setScalar(0.8 + r() * 0.7);
    t.rotation.y = r() * 6;
    group.add(t);
  }

  const olds = (cfg.olds || []).map((o) => {
    const m = makeOld(r, o.s || 1);
    m.position.set(o.x, 0, o.z);
    group.add(m); return m;
  });
  const towers = (cfg.towers || []).map((t) => {
    const m = makeTower(t);
    m.position.set(t.x, 0, t.z);
    group.add(m); return m;
  });

  // tarama halkası
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.55, 0.02, 8, 96),
    new THREE.MeshBasicMaterial({ color: COL.accent, transparent: true, opacity: 0 })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // toz
  const N = 160;
  const base = new Float32Array(N * 3), pos = new Float32Array(N * 3);
  const spread = radius * 0.4;
  for (let i = 0; i < N; i++) {
    base[i * 3] = (r() - 0.5) * spread * 2;
    base[i * 3 + 1] = r() * 0.5;
    base[i * 3 + 2] = (r() - 0.5) * spread * 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xcfc6b8, size: 0.09, transparent: true, opacity: 0, depthWrite: false }));
  group.add(dust);

  /** collapse, build, ghost, scan, risk — hepsi 0..1 */
  function set({ collapse = 0, build = 0, ghost = 0, scan = 0, risk = 0, time = 0 } = {}) {
    olds.forEach((o) => {
      const k = o.userData;
      const s = easeInOut(clamp(collapse * 1.4 - k.delay));
      o.visible = s < 0.995;
      o.scale.set(k.baseS * (1 + 0.12 * s), k.baseS * (1 - 0.93 * s), k.baseS * (1 + 0.12 * s));
      o.rotation.z = k.tilt * s * 0.35;
      const e = risk * (0.22 + 0.16 * Math.sin(time * 4 + k.delay * 20));
      k.walls.forEach((w) => (w.emissiveIntensity = e));
    });
    towers.forEach((t) => {
      t.userData.set(build);
      t.userData.ghostMat.opacity = ghost * 0.6;
    });
    ring.material.opacity = scan > 0 && scan < 1 ? Math.sin(scan * Math.PI) * 0.9 : 0;
    ring.position.y = scan * 3.8;
    dust.material.opacity = Math.sin(Math.PI * clamp(collapse)) * 0.75;
    const a = dustGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3] = base[i * 3] * (1 + collapse * 0.5);
      a[i * 3 + 1] = base[i * 3 + 1] + collapse * (0.6 + (i % 7) * 0.12);
      a[i * 3 + 2] = base[i * 3 + 2] * (1 + collapse * 0.5);
    }
    dustGeo.attributes.position.needsUpdate = true;
  }

  return { group, set };
}

/** Hero/süreç sahnesi için ortak yerleşim */
export function heroLayout() {
  const olds = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) olds.push({ x: (i - 1) * 1.45 + (j % 2) * 0.15, z: (j - 1) * 1.35 });
  olds.push({ x: -2.9, z: 1.5 }, { x: 3.0, z: -1.6 }, { x: 2.8, z: 1.8 }, { x: -3.0, z: -1.3 });
  return {
    olds,
    towers: [
      { x: -0.9, z: 0.1, w: 1.5, d: 1.5, floors: 9 },
      { x: 1.1, z: -0.15, w: 1.4, d: 1.4, floors: 7 },
    ],
    radius: 5.7,
    roadAt: 3.9,
  };
}

/** Proje görüntüleyici yerleşimi (şematik) */
export function projectLayout({ oldN, towers, floors }) {
  const showOld = Math.min(oldN, 36);
  const cols = Math.ceil(Math.sqrt(showOld));
  const sp = showOld > 12 ? 1.05 : 1.45;
  const sc = showOld > 12 ? 0.8 : 1;
  const olds = [];
  for (let i = 0; i < showOld; i++) {
    const cx = i % cols, cz = Math.floor(i / cols);
    olds.push({ x: (cx - (cols - 1) / 2) * sp, z: (cz - (Math.ceil(showOld / cols) - 1) / 2) * sp, s: sc });
  }
  const tc = Math.ceil(Math.sqrt(towers));
  const ts = [];
  for (let i = 0; i < towers; i++) {
    const cx = i % tc, cz = Math.floor(i / tc);
    ts.push({ x: (cx - (tc - 1) / 2) * 2.4, z: (cz - (Math.ceil(towers / tc) - 1) / 2) * 2.4, w: 1.5, d: 1.5, floors: floors + (i % 2) });
  }
  const ext = Math.max((cols * sp) / 2 + 0.6, (tc * 2.4) / 2 + 0.4, 2.6);
  return { olds, towers: ts, radius: ext + 3.4, roadAt: ext + 1.2, extent: ext };
}
