import * as THREE from 'three';

export const isLite = () =>
  window.matchMedia('(max-width: 767px)').matches || (navigator.hardwareConcurrency || 8) <= 4;

export function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfbf, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(5, 9, 4);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbcd2ff, 0.7);
  fill.position.set(-6, 3, -5);
  scene.add(fill);
}

/**
 * Tek bir canvas için renderer + kamera + görünürlük döngüsü.
 * opts.offset: {x,y} oranları — sahneyi ekranda kaydırır (metin için yer açar).
 */
export function createStage(canvas, opts = {}) {
  const { fov = 38, cam = [6, 4, 7], target = [0, 1.2, 0], maxDpr = 1.75, offset = () => ({ x: 0, y: 0 }) } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isLite(), alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isLite() ? 1.25 : maxDpr));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  addLights(scene);
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  camera.position.set(...cam);
  const tgt = new THREE.Vector3(...target);
  camera.lookAt(tgt);

  const stage = { renderer, scene, camera, tgt, w: 1, h: 1, onFrame: null, render: null };

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
