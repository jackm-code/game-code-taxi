// The cab interior. Unlike the world outside, this is rendered at full
// resolution with smooth shading. Local space: forward is -Z, right is +X,
// the driver sits on the right (UK). The cabin is open: no partition.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const EYE = new THREE.Vector3(0.36, 1.23, 0.06);
const MIRROR_POS = new THREE.Vector3(0.0, 1.455, -0.70);
const MIRROR_TARGET = new THREE.Vector3(-0.16, 1.2, 1.75);
export const SEAT_X = -0.2;
export const WIPE_PERIOD = 2.9;
const WIPE_A0 = THREE.MathUtils.degToRad(172), WIPE_A1 = THREE.MathUtils.degToRad(64);

function canvasTex(w, h, paint, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}

function grain(base, amount, size = 256) {
  return (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * amount;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  };
}

// Rain on glass. Samples the low-res world image behind it so each drop
// refracts the street; on the windscreen the wipers clear an arc.
const glassVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const glassFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D tWorld;
  uniform vec2 uScreen;
  uniform vec2 uSize;
  uniform float uTime, uWipeT, uWiper, uSeed, uSlide, uDensity;
  varying vec2 vUv;
  const float P = ${WIPE_PERIOD.toFixed(2)};
  const float A0 = ${WIPE_A0.toFixed(4)};
  const float A1 = ${WIPE_A1.toFixed(4)};
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float sinceOne(vec2 p, vec2 piv) {
    vec2 q = p - piv;
    float r = length(q);
    float u = (A0 - atan(q.y, q.x)) / (A0 - A1);
    if (r < 0.09 || r > 0.47 || u < 0.0 || u > 1.0) return 100.0;
    return min(mod(uWipeT - 0.55 * u, P), mod(uWipeT - (1.1 - 0.55 * u), P));
  }
  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    float since = 100.0;
    if (uWiper > 0.5) since = min(sinceOne(p, vec2(-0.22, -0.30)), sinceOne(p, vec2(0.42, -0.30)));
    vec2 scr = gl_FragCoord.xy / uScreen;
    vec3 col = vec3(0.0);
    float a = 0.0;
    for (int L = 0; L < 2; L++) {
      float sc = (L == 0 ? 24.0 : 52.0) * uDensity;
      vec2 g = p * sc + uSeed * 17.3 + float(L) * 31.7;
      float colId = floor(g.x);
      g.y += uTime * uSlide * (0.15 + 0.9 * hash(vec2(colId, float(L)))) * (L == 0 ? 1.0 : 0.25);
      vec2 id = floor(g);
      vec2 f = fract(g) - 0.5;
      float present = step(L == 0 ? 0.72 : 0.6, hash(id + 3.3));
      float birth = 0.7 + hash(id + 11.7) * 3.4;
      float rad = 0.16 + 0.26 * hash(id + 7.1);
      vec2 c = (vec2(hash(id + 1.9), hash(id + 5.3)) - 0.5) * 0.4;
      vec2 d = (f - c) / rad;
      d.y *= 0.82;
      float dist = length(d);
      if (present > 0.5 && since > birth && dist < 1.0) {
        vec2 uvr = clamp(scr - d * vec2(0.012, 0.02) * (2.0 - float(L)) / uDensity, 0.002, 0.998);
        vec3 w = texture2D(tWorld, uvr).rgb;
        float rim = smoothstep(0.55, 1.0, dist);
        col = w * (1.1 - 0.28 * rim) + vec3(0.03, 0.02, 0.012) * (1.0 - dist);
        a = 1.0 - smoothstep(0.86, 1.0, dist);
      }
    }
    // faint water film that rebuilds after each wipe
    float film = 0.04 * smoothstep(0.0, 2.0, min(since, 2.0));
    gl_FragColor = vec4(mix(vec3(0.05, 0.04, 0.035), col, step(0.001, a)), max(a, film));
  }
`;

export function buildCab(worldTexture) {
  const rig = new THREE.Group();
  const glassUniforms = { tWorld: { value: worldTexture }, uScreen: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uWipeT: { value: 0 } };
  const glassMat = (w, h, wiper, seed, slide, density = 1) => new THREE.ShaderMaterial({
    uniforms: {
      ...glassUniforms,
      uSize: { value: new THREE.Vector2(w, h) }, uWiper: { value: wiper ? 1 : 0 }, uSeed: { value: seed }, uSlide: { value: slide }, uDensity: { value: density },
    },
    vertexShader: glassVert, fragmentShader: glassFrag, transparent: true, depthWrite: false,
  });

  // ---------- materials ----------
  const vinylTex = canvasTex(256, 256, grain('#1a1a1c', 26), 3);
  const clothTex = canvasTex(256, 256, (ctx, w, h) => {
    grain('#23252c', 30)(ctx, w, h);
    ctx.globalAlpha = 0.16; ctx.strokeStyle = '#000';
    for (let i = 0; i < w; i += 4) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
    ctx.strokeStyle = '#555';
    for (let i = 0; i < h; i += 6) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
  }, 4);
  const linerTex = canvasTex(256, 256, grain('#34312c', 16), 4);
  const M = {
    trim: new THREE.MeshStandardMaterial({ map: vinylTex, bumpMap: vinylTex, bumpScale: 0.6, roughness: 0.62, metalness: 0.05 }),
    dash: new THREE.MeshStandardMaterial({ color: 0x6a665e, map: vinylTex, bumpMap: vinylTex, bumpScale: 0.8, roughness: 0.5 }),
    seat: new THREE.MeshStandardMaterial({ map: clothTex, bumpMap: clothTex, bumpScale: 1.2, roughness: 0.9 }),
    liner: new THREE.MeshStandardMaterial({ map: linerTex, roughness: 0.95 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.85 }),
    paint: new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.22, metalness: 0.55 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0x9a9a98, roughness: 0.25, metalness: 0.9 }),
    wheel: new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.45 }),
    // placeholder passenger: appearance is [Open]
    coat: new THREE.MeshStandardMaterial({ color: 0x0e0e11, roughness: 0.8, flatShading: true }),
    head: new THREE.MeshStandardMaterial({ color: 0x4a4541, roughness: 0.9, flatShading: true }),
    shirt: new THREE.MeshStandardMaterial({ color: 0x5c5a56, roughness: 0.9, flatShading: true }),
  };

  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = rig) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
  };
  const box = (w, h, d, mat, x, y, z, rx, ry, rz, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz, parent);
  const rbox = (w, h, d, r, mat, x, y, z, rx, ry, rz, parent) => add(new RoundedBoxGeometry(w, h, d, 4, r), mat, x, y, z, rx, ry, rz, parent);
  const cyl = (r0, r1, h, seg, mat, x, y, z, rx, ry, rz, parent) => add(new THREE.CylinderGeometry(r0, r1, h, seg), mat, x, y, z, rx, ry, rz, parent);

  // ---------- shell ----------
  box(1.6, 0.04, 3.2, M.rubber, 0, 0.0, 0.55);                 // floor
  box(1.6, 0.62, 0.05, M.trim, 0, 0.31, -1.0);                 // firewall
  box(1.6, 0.05, 2.95, M.liner, 0, 1.635, 0.72);               // roof
  box(1.5, 0.13, 0.14, M.liner, 0, 1.575, -0.73);              // windscreen header
  box(1.54, 0.04, 0.14, M.rubber, 0, 0.972, -1.0);             // scuttle
  const RAKE = 0.355;
  for (const s of [-1, 1]) {
    const x = s * 0.77;
    box(0.085, 0.62, 0.085, M.trim, s * 0.725, 1.25, -0.85, RAKE);      // A pillar
    box(0.06, 1.0, 1.3, M.trim, x, 0.5, -0.3);                         // front door
    rbox(0.07, 0.07, 0.5, 0.03, M.dash, s * 0.725, 0.8, -0.18);        // armrest
    box(0.02, 0.03, 0.11, M.chrome, s * 0.735, 0.93, -0.5);            // door handle
    cyl(0.028, 0.028, 0.03, 12, M.chrome, s * 0.735, 0.7, -0.52, 0, 0, Math.PI / 2);   // window winder
    box(0.075, 1.64, 0.1, M.trim, x, 0.82, 0.4);                        // B pillar
    box(0.075, 0.1, 1.3, M.liner, x, 1.575, -0.3);                     // front cant rail
    box(0.06, 1.0, 0.95, M.trim, x, 0.5, 0.925);                       // rear door
    box(0.075, 0.1, 0.95, M.liner, x, 1.575, 0.925);                   // rear cant rail
    box(0.075, 1.64, 0.72, M.trim, x, 0.82, 1.76);                     // rear quarter
    box(0.3, 0.44, 0.06, M.trim, s * 0.65, 1.25, 2.1);                 // rear window side
    // side glass (main view only)
    const g1 = add(new THREE.PlaneGeometry(1.3, 0.54), glassMat(1.3, 0.54, false, 3 + s, 0.5, 2.4), s * 0.762, 1.265, -0.3, 0, -s * Math.PI / 2);
    const g2 = add(new THREE.PlaneGeometry(0.95, 0.54), glassMat(0.95, 0.54, false, 9 + s, 0.5, 2.0), s * 0.762, 1.265, 0.925, 0, -s * Math.PI / 2);
    g1.layers.set(1); g2.layers.set(1);
  }
  box(1.6, 1.05, 0.06, M.trim, 0, 0.525, 2.1);                 // rear wall
  box(1.6, 0.18, 0.06, M.liner, 0, 1.545, 2.1);                // rear header
  box(1.5, 0.03, 0.22, M.trim, 0, 1.04, 1.99);                 // parcel shelf

  // ---------- dashboard ----------
  rbox(1.5, 0.24, 0.44, 0.05, M.dash, 0, 0.865, -0.76);
  box(1.5, 0.2, 0.06, M.trim, 0, 0.66, -0.6);
  rbox(0.4, 0.16, 0.2, 0.05, M.trim, 0.36, 1.03, -0.68);       // binnacle
  for (const vx of [-0.55, -0.2]) rbox(0.2, 0.07, 0.02, 0.008, M.rubber, vx, 0.9, -0.538);   // vents
  for (let i = 0; i < 5; i++) rbox(0.03, 0.03, 0.02, 0.006, M.rubber, 0.0 + i * 0.045, 0.82, -0.538);  // switches
  box(0.36, 0.1, 0.012, M.rubber, -0.38, 0.78, -0.538);        // glovebox seam plate

  const dialTex = canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 256, 256);
    ctx.translate(128, 128);
    ctx.strokeStyle = '#d9c9a0'; ctx.fillStyle = '#d9c9a0';
    ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let mph = 0; mph <= 100; mph += 5) {
      const a = THREE.MathUtils.degToRad(-120 + 2.4 * mph), big = mph % 20 === 0;
      ctx.lineWidth = big ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(Math.sin(a) * 112, -Math.cos(a) * 112);
      ctx.lineTo(Math.sin(a) * (big ? 94 : 102), -Math.cos(a) * (big ? 94 : 102));
      ctx.stroke();
      if (big) ctx.fillText(String(mph), Math.sin(a) * 74, -Math.cos(a) * 74);
    }
    ctx.font = '15px Arial'; ctx.fillText('MPH', 0, 58);
  });
  const gaugeTex = canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#d9c9a0'; ctx.fillStyle = '#d9c9a0'; ctx.lineWidth = 4;
    ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
    for (const [cy, l, r] of [[92, 'E', 'F'], [200, 'C', 'H']]) {
      ctx.beginPath(); ctx.arc(128, cy, 70, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
      ctx.fillText(l, 66, cy - 6); ctx.fillText(r, 190, cy - 6);
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(128, cy); ctx.lineTo(112, cy - 58); ctx.stroke(); ctx.lineWidth = 4;
    }
  });
  const dialMat = (t) => new THREE.MeshBasicMaterial({ map: t, color: 0x8f8266 });
  const dialTilt = -0.12;
  add(new THREE.CircleGeometry(0.068, 40), dialMat(dialTex), 0.3, 1.035, -0.577, dialTilt);
  add(new THREE.CircleGeometry(0.052, 40), dialMat(gaugeTex), 0.455, 1.035, -0.577, dialTilt);
  const needlePivot = new THREE.Group();
  needlePivot.position.set(0.3, 1.035, -0.574); needlePivot.rotation.x = dialTilt;
  rig.add(needlePivot);
  const needle = new THREE.Group(); needlePivot.add(needle);
  box(0.005, 0.055, 0.002, new THREE.MeshBasicMaterial({ color: 0xc8501c }), 0, 0.022, 0, 0, 0, 0, needle);

  // taxi meter: set dressing only (no fare, scoring or money is tracked)
  rbox(0.2, 0.1, 0.1, 0.012, M.rubber, -0.06, 1.035, -0.74, 0, 0.25, 0);
  const meterTex = (text, col) => canvasTex(256, 96, (ctx) => {
    ctx.fillStyle = '#060404'; ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = col; ctx.font = 'bold 44px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 50);
  });
  const meterOn = meterTex('FOR HIRE', '#d8891e'), meterOff = meterTex('- - - -', '#3a1a0c');
  const meter = add(new THREE.PlaneGeometry(0.17, 0.064), new THREE.MeshBasicMaterial({ map: meterOn, color: 0xb0b0b0 }), -0.047, 1.035, -0.6885, 0, 0.25, 0);

  // ---------- steering ----------
  const column = new THREE.Group();
  column.position.set(0.36, 0.9, -0.41); column.rotation.x = -0.42;
  rig.add(column);
  cyl(0.03, 0.035, 0.34, 12, M.trim, 0, 0, -0.17, Math.PI / 2, 0, 0, column);
  const wheel = new THREE.Group(); column.add(wheel);
  add(new THREE.TorusGeometry(0.18, 0.015, 14, 56), M.wheel, 0, 0, 0, 0, 0, 0, wheel);
  cyl(0.045, 0.05, 0.04, 20, M.wheel, 0, 0, -0.01, Math.PI / 2, 0, 0, wheel);
  for (const a of [Math.PI / 2 + 1.25, Math.PI / 2 - 1.25, -Math.PI / 2]) {
    const sp = rbox(0.18, 0.026, 0.012, 0.005, M.wheel, Math.cos(a) * 0.1, Math.sin(a) * 0.1, -0.006, 0, 0, a, wheel);
    sp.scale.set(1, 1, 1);
  }
  cyl(0.012, 0.012, 0.3, 8, M.rubber, 0.09, 0.42, -0.2, 0.3, 0, 0);          // gear lever
  add(new THREE.SphereGeometry(0.028, 16, 12), M.wheel, 0.09, 0.57, -0.155);
  rbox(0.05, 0.05, 0.3, 0.02, M.wheel, 0.1, 0.33, 0.12, 0.35);               // handbrake

  // ---------- seats ----------
  rbox(0.5, 0.14, 0.5, 0.05, M.seat, 0.36, 0.48, 0.12);
  rbox(0.5, 0.7, 0.12, 0.05, M.seat, 0.36, 0.83, 0.43, 0.1);
  rbox(1.44, 0.2, 0.54, 0.07, M.seat, 0, 0.42, 1.68);
  rbox(1.44, 0.64, 0.17, 0.07, M.seat, 0, 0.8, 1.99, 0.12);
  // luggage platform beside the driver (a black cab has no front passenger seat)
  box(0.72, 0.12, 1.05, M.rubber, -0.38, 0.08, -0.25);
  const atlasTex = canvasTex(128, 180, (ctx) => {          // [Proposed] paper atlas, prop only
    ctx.fillStyle = '#8a2a1c'; ctx.fillRect(0, 0, 128, 180);
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(10, 22, 108, 50);
    ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold 19px Arial'; ctx.textAlign = 'center';
    ctx.fillText('STREET', 64, 44); ctx.fillText('ATLAS', 64, 64);
  });
  const book = box(0.2, 0.025, 0.28, [M.liner, M.liner, new THREE.MeshStandardMaterial({ map: atlasTex, roughness: 0.8 }), M.liner, M.liner, M.liner], -0.36, 0.155, -0.3, 0, 0.35, 0);
  void book;

  // ---------- bonnet (seen through the windscreen) ----------
  rbox(0.86, 0.14, 1.4, 0.06, M.paint, 0, 0.9, -1.72, -0.05);
  for (const s of [-1, 1]) {
    rbox(0.34, 0.14, 1.36, 0.07, M.paint, s * 0.6, 0.82, -1.72, -0.05);
    add(new THREE.SphereGeometry(0.07, 16, 10), M.chrome, s * 0.6, 0.86, -2.36).scale.set(1, 0.5, 1);
  }

  // ---------- windscreen + wipers ----------
  const screen = add(new THREE.PlaneGeometry(1.37, 0.58), glassMat(1.37, 0.58, true, 1, 0.0), 0, 1.25, -0.85, RAKE);
  screen.layers.set(1);
  const wiperPlane = new THREE.Group();
  wiperPlane.position.set(0, 1.25, -0.85); wiperPlane.rotation.x = RAKE;
  rig.add(wiperPlane);
  const wipers = [];
  for (const px of [-0.22, 0.42]) {
    const piv = new THREE.Group(); piv.position.set(px, -0.30, -0.016); wiperPlane.add(piv);
    box(0.46, 0.012, 0.008, M.rubber, 0.23, 0, 0, 0, 0, 0, piv);
    box(0.37, 0.022, 0.012, M.rubber, 0.285, 0, 0.006, 0, 0, 0, piv);
    wipers.push(piv);
  }

  // ---------- rear-view mirror ----------
  const mirrorTarget = new THREE.WebGLRenderTarget(768, 228, { depthBuffer: true });
  mirrorTarget.texture.anisotropy = 4;
  const mirror = new THREE.Group();
  mirror.position.copy(MIRROR_POS);
  rig.add(mirror);
  const out = MIRROR_TARGET.clone().sub(MIRROR_POS).normalize();
  const toEye = EYE.clone().sub(MIRROR_POS).normalize();
  mirror.lookAt(MIRROR_POS.clone().add(toEye.add(out)));
  rbox(0.345, 0.12, 0.03, 0.012, M.rubber, 0, 0, -0.018, 0, 0, 0, mirror);
  const mg = new THREE.PlaneGeometry(0.32, 0.095);
  const muv = mg.attributes.uv;
  for (let i = 0; i < muv.count; i++) muv.setX(i, 1 - muv.getX(i));      // mirrors flip left/right
  const mirrorGlass = add(mg, new THREE.MeshBasicMaterial({ map: mirrorTarget.texture, color: 0xd8d8d8 }), 0, 0, 0, 0, 0, 0, mirror);
  mirrorGlass.layers.set(1);
  box(0.02, 0.09, 0.02, M.rubber, 0, 1.53, -0.72);
  const mirrorCam = new THREE.PerspectiveCamera(15.5, 0.32 / 0.095, 0.6, 160);
  mirrorCam.position.copy(MIRROR_POS);
  rig.add(mirrorCam);
  mirrorCam.lookAt(MIRROR_TARGET);   // rig is at the origin while this is built

  // ---------- the passenger (placeholder mannequin) ----------
  const passenger = new THREE.Group();
  passenger.position.set(SEAT_X, 0, 1.72);
  passenger.visible = false;
  rig.add(passenger);
  box(0.38, 0.15, 0.44, M.coat, 0, 0.59, -0.2, 0, 0, 0, passenger);
  const torso = cyl(0.15, 0.2, 0.58, 8, M.coat, 0, 0.87, 0.08, 0.08, 0, 0, passenger);
  torso.scale.set(1.4, 1, 0.82);
  rbox(0.6, 0.13, 0.25, 0.05, M.coat, 0, 1.11, 0.1, 0, 0, 0, passenger);
  for (const s of [-1, 1]) cyl(0.06, 0.052, 0.5, 6, M.coat, s * 0.29, 0.87, 0.0, -0.4, 0, s * 0.08, passenger);
  box(0.1, 0.16, 0.02, M.shirt, 0, 1.06, -0.04, 0.1, 0, 0, passenger);
  const headPivot = new THREE.Group(); headPivot.position.set(0, 1.17, 0.07); passenger.add(headPivot);
  cyl(0.05, 0.055, 0.1, 8, M.head, 0, 0.03, 0, 0, 0, 0, headPivot);
  const head = add(new THREE.IcosahedronGeometry(0.108, 1), M.head, 0, 0.15, -0.01, 0, 0, 0, headPivot);
  head.scale.set(0.88, 1.1, 1);

  // ---------- cabin lights ----------
  rig.add(new THREE.AmbientLight(0x9a9cb4, 1.0));
  const dashLight = new THREE.PointLight(0xd8a060, 0.12, 1.8, 2);
  dashLight.position.set(0.34, 1.0, -0.42);
  rig.add(dashLight);

  return {
    rig, wheel, needle, wipers, passenger, headPivot, meter, meterOn, meterOff,
    mirrorCam, mirrorTarget, glassUniforms,
    setWipe(t) {
      // t: seconds within the wipe cycle. 0-0.55 up, 0.55-1.1 down, then parked.
      const u = t < 0.55 ? t / 0.55 : t < 1.1 ? 1 - (t - 0.55) / 0.55 : 0;
      const a = WIPE_A0 + (WIPE_A1 - WIPE_A0) * u;
      for (const w of wipers) w.rotation.z = a;
      glassUniforms.uWipeT.value = t;
    },
  };
}
