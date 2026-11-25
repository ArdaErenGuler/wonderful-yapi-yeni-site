import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const isLite = () =>
  window.matchMedia('(max-width: 767px)').matches || (navigator.hardwareConcurrency || 8) <= 4;

export function addLights(scene, { shadows = true } = {}) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d3c8, 0.55));
  const sun = new THREE.DirectionalLight(0xfff7ec, 2.6);
  sun.position.set(7, 11, 5);
  if (shadows) {
    sun.castShadow = true;
    const s = isLite() ? 1024 : 2048;
    sun.shadow.mapSize.set(s, s);
    const c = sun.shadow.camera;
    c.left = -11; c.right = 11; c.top = 11; c.bottom = -11; c.near = 1; c.far = 40;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 5;
  }
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.5);
  fill.position.set(-6, 4, -5);
  scene.add(fill);
}

/**
 * Tek bir canvas için renderer + kamera + görünürlük döngüsü.
 * opts.offset: (w,h)=>({x,y}) — sahneyi ekranda kaydırır (metin için yer açar).
 */
export function createStage(canvas, opts = {}) {
  const { fov = 38, cam = [6, 4, 7], target = [0, 1.2, 0], maxDpr = 1.75, offset = () => ({ x: 0, y: 0 }), shadows = true } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isLite(), alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isLite() ? 1.25 : maxDpr));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.45;
  addLights(scene, { shadows });
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  camera.position.set(...cam);
  const tgt = new THREE.Vector3(...target);
  camera.lookAt(tgt);

  const stage = { renderer, scene, camera, tgt, env, w: 1, h: 1, onFrame: null, render: null };

  const resize = () => {
    const r = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    stage.w = w; stage.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const o = offset(w, h);
    if (o.x || o.y) camera.setViewOffset(w, h, -w * o.x, -h * o.y, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();

  let visible = false, raf = 0, last = performance.now();
  const loop = (now) => {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    stage.onFrame?.(now / 1000, dt);
    (stage.render || (() => renderer.render(scene, camera)))();
    raf = requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }, { rootMargin: '120px' }).observe(canvas);

  return stage;
}
