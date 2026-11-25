import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Blender'dan gelen maket parçaları: Floor, Roof, Old_1..3, Tree_1..2
export const A = {};
let promise;

export function loadAssets() {
  promise ||= new Promise((resolve, reject) => {
    new GLTFLoader().load(
      `${import.meta.env.BASE_URL}models/maket.glb`,
      (g) => {
        g.scene.children.forEach((o) => {
          o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
          A[o.name] = o;
        });
        resolve(A);
      },
      undefined,
      reject
    );
  });
  return promise;
}

/** Orijini sıfırlanmış, bağımsız malzemeli kopya. */
export function cloneAsset(name, { ownMaterials = false } = {}) {
  const c = A[name].clone(true);
  c.position.set(0, 0, 0);
  c.rotation.set(0, 0, 0);
  if (ownMaterials) {
    c.traverse((m) => {
      if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
    });
  }
  return c;
}
