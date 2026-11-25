import * as THREE from 'three';

export const COL = { navy: 0x0b2545, accent: 0xff6b1a, paper: 0xf4f1ec };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// deterministik rastgele
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

let _winTex;
function windowTexture() {
  if (_winTex) return _winTex;
  const r = rng(7);
  const c = document.createElement('canvas');
  c.width = 128; c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = '#eef1f5'; x.fillRect(0, 0, 128, 32);
  for (let i = 0; i < 4; i++) {
    x.fillStyle = r() < 0.3 ? '#ffcf8f' : '#16335f';
    x.fillRect(i * 32 + 6, 7, 20, 16);
  }
  _winTex = new THREE.CanvasTexture(c);
  _winTex.colorSpace = THREE.SRGBColorSpace;
  _winTex.anisotropy = 4;
  return _winTex;
}

/** Yeni, güvenli blok: kat kat yükselir. */
export function makeTower({ w = 1.5, d = 1.5, floors = 8, fh = 0.42 }) {
  const g = new THREE.Group();
  const side = new THREE.MeshStandardMaterial({ map: windowTexture(), roughness: 0.55, metalness: 0.05 });
  const cap = new THREE.MeshStandardMaterial({ color: 0xdfe5ee, roughness: 0.85 });
  const mats = [side, side, cap, cap, side, side];
  const geo = new THREE.BoxGeometry(w, fh * 0.94, d);
  const meshes = [];
  for (let i = 0; i < floors; i++) {
    const m = new THREE.Mesh(geo, mats);
    m.visible = false;
    g.add(m); meshes.push(m);
  }
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.05, 0.07, d * 1.05),
    new THREE.MeshStandardMaterial({ color: COL.accent, roughness: 0.5 })
  );
  roof.visible = false; g.add(roof);

  // tel kafes hayalet
  const ghostMat = new THREE.LineBasicMaterial({ color: COL.accent, transparent: true, opacity: 0 });
  const ghost = new THREE.Group();
  const eg = new THREE.EdgesGeometry(geo);
  for (let i = 0; i < floors; i++) {
    const l = new THREE.LineSegments(eg, ghostMat);
    l.position.y = i * fh + fh * 0.47;
    ghost.add(l);
  }
  g.add(ghost);

  g.userData.height = floors * fh;
  g.userData.ghostMat = ghostMat;
  g.userData.set = (p) => {
    for (let i = 0; i < floors; i++) {
      const s = easeOut(clamp(p * (floors + 1) - i));
      const m = meshes[i];
      m.visible = s > 0.002;
      m.scale.y = Math.max(s, 0.001);
      m.position.y = i * fh + fh * 0.47 * s;
    }
    const rs = clamp((p - 0.92) * 12);
    roof.visible = rs > 0;
    roof.scale.setScalar(Math.max(rs, 0.001));
    roof.position.y = floors * fh - fh * 0.47 + 0.05;
  };
  return g;
}

/** Eski, riskli yapı (gecekondu / eski apartman). */
function makeOld(r, s = 1) {
  const g = new THREE.Group();
  const w = (0.7 + r() * 0.4) * s, d = (0.7 + r() * 0.4) * s, h = (0.4 + r() * 0.3) * s;
  const walls = [0xb9ad9b, 0xa89f94, 0xc4b8a4, 0x9d9588];
  const wallMat = new THREE.MeshStandardMaterial({ color: walls[Math.floor(r() * walls.length)], roughness: 1, emissive: 0xff2a1a, emissiveIntensity: 0 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  const roofMat = new THREE.MeshStandardMaterial({ color: r() < 0.5 ? 0x7a5a48 : 0x6b6f76, roughness: 1 });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.7071, 1, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(w * 1.06, 0.26 * s, d * 1.06);
  roof.position.y = h + 0.13 * s;
  g.add(body, roof);
  g.rotation.y = (r() - 0.5) * 0.5;
  g.userData = { wallMat, delay: r() * 0.4, tilt: (r() - 0.5) * 0.8, baseRot: g.rotation.y };
  return g;
}

/**
 * Şantiye: eski yapılar + yeni bloklar + tarama halkası + toz.
 * cfg: { olds:[{x,z,s?}], towers:[{x,z,w,d,floors}], radius }
 */
export function createSite(cfg) {
  const group = new THREE.Group();
  const r = rng(cfg.seed || 11);

  const radius = cfg.radius || 6;
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02;
  const grid = new THREE.GridHelper(radius * 2, Math.round(radius * 4), 0xcdc5b4, 0xd9d2c4);
  grid.material.transparent = true; grid.material.opacity = 0.55;
  grid.position.y = 0;
  group.add(ground, grid);

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
    new THREE.TorusGeometry(radius * 0.55, 0.018, 8, 96),
    new THREE.MeshBasicMaterial({ color: COL.accent, transparent: true, opacity: 0 })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // toz
  const N = 160;
  const base = new Float32Array(N * 3), pos = new Float32Array(N * 3);
  const spread = radius * 0.45;
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
      o.scale.set(1 + 0.12 * s, 1 - 0.93 * s, 1 + 0.12 * s);
      o.rotation.z = k.tilt * s * 0.35;
      k.wallMat.emissiveIntensity = risk * (0.18 + 0.14 * Math.sin(time * 4 + k.delay * 20));
    });
    towers.forEach((t) => {
      t.userData.set(build);
      t.userData.ghostMat.opacity = ghost * 0.55;
    });
    ring.material.opacity = scan > 0 && scan < 1 ? Math.sin(scan * Math.PI) * 0.9 : 0;
    ring.position.y = scan * 3.6;
    const dp = Math.sin(Math.PI * clamp(collapse)) ;
    dust.material.opacity = dp * 0.75;
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
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) olds.push({ x: (i - 1) * 1.25 + (j % 2) * 0.15, z: (j - 1) * 1.2 });
  olds.push({ x: -2.8, z: 1.4 }, { x: 2.9, z: -1.5 }, { x: 2.7, z: 1.7 }, { x: -2.9, z: -1.2 });
  return {
    olds,
    towers: [
      { x: -0.85, z: 0.1, w: 1.5, d: 1.5, floors: 9 },
      { x: 1.05, z: -0.15, w: 1.4, d: 1.4, floors: 7 },
    ],
    radius: 6,
  };
}

/** Proje görüntüleyici yerleşimi (şematik) */
export function projectLayout({ oldN, towers, floors }) {
  const showOld = Math.min(oldN, 36);
  const cols = Math.ceil(Math.sqrt(showOld));
  const sp = showOld > 12 ? 0.9 : 1.25;
  const sc = showOld > 12 ? 0.75 : 1;
  const olds = [];
  for (let i = 0; i < showOld; i++) {
    const cx = i % cols, cz = Math.floor(i / cols);
    olds.push({ x: (cx - (cols - 1) / 2) * sp, z: (cz - (Math.ceil(showOld / cols) - 1) / 2) * sp, s: sc });
  }
  const tc = Math.ceil(Math.sqrt(towers));
  const ts = [];
  for (let i = 0; i < towers; i++) {
    const cx = i % tc, cz = Math.floor(i / tc);
    ts.push({ x: (cx - (tc - 1) / 2) * 2.3, z: (cz - (Math.ceil(towers / tc) - 1) / 2) * 2.3, w: 1.5, d: 1.5, floors: floors + (i % 2) });
  }
  const ext = Math.max(cols * sp, tc * 2.3, 3) / 2;
  return { olds, towers: ts, radius: ext + 2.5, extent: ext };
}
