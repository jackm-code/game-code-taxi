// Opening loan shark fare: proof of concept.
// World outside the cab: PSX-style, rendered small and upscaled.
// Cab interior: rendered on top at full resolution.
import * as THREE from 'three';
import { shared, FOG_COLOR, makeRain, blitMaterial } from './psx.js';
import { buildCity, makeWorldFigure, onRoad } from './city.js';
import { buildCab, EYE, SEAT_X, WIPE_PERIOD } from './cab.js';
import { Sound } from './audio.js';
import { OPEN_LINE, CLOSE_LINE, STOP_LINE, MONOLOGUE } from './dialogue.js';

const params = new URLSearchParams(location.search);
const TIME_SCALE = Number(params.get('t')) || 1;
const LOW_H = 240;

// ---------- renderer ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.autoClear = false;

const lowRT = new THREE.WebGLRenderTarget(427, LOW_H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const fogLinear = new THREE.Color(FOG_COLOR.r ** 2.2, FOG_COLOR.g ** 2.2, FOG_COLOR.b ** 2.2);

// ---------- scenes ----------
const world = new THREE.Scene();
const city = buildCity();
world.add(city.group);
world.add(makeRain());
const figure = makeWorldFigure(city.atlas);
world.add(figure);

const interior = new THREE.Scene();
const cab = buildCab(lowRT.texture);
interior.add(cab.rig);
const lampLights = [0, 1, 2].map(() => {
  const l = new THREE.PointLight(0xff8a22, 0, 30, 1.6);
  interior.add(l);
  return l;
});

const head = new THREE.Group();
head.position.copy(EYE);
cab.rig.add(head);
const camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.05, 220);
camera.rotation.order = 'YXZ';
camera.layers.enable(1);
head.add(camera);

const blitScene = new THREE.Scene();
const blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const blitQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMaterial(lowRT.texture));
blitQuad.frustumCulled = false;
blitScene.add(blitQuad);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // keep the horizontal view usable on narrow (portrait) screens
  camera.fov = w / h < 1.2 ? 80 : 64;
  camera.updateProjectionMatrix();
  const lw = Math.max(160, Math.round(LOW_H * w / h));
  lowRT.setSize(lw, LOW_H);
  renderer.getDrawingBufferSize(cab.glassUniforms.uScreen.value);
}
window.addEventListener('resize', resize);
resize();

// ---------- HUD ----------
const $ = (id) => document.getElementById(id);
const hud = {
  fadeEl: $('fade'), sub: $('sub'), hint: $('hint'), arrow: $('arrow'), tag: $('tag'), end: $('end'),
  fade: 1, fadeTo: 1, fadeRate: 0,
  setFade(to, seconds) { this.fadeTo = to; this.fadeRate = Math.abs(to - this.fade) / Math.max(seconds, 0.001); },
  say(text) { this.sub.textContent = text; this.sub.style.opacity = text ? 1 : 0; this.tag.style.opacity = text ? 1 : 0; },
  hush() { this.sub.style.opacity = 0; this.tag.style.opacity = 0; },
  tip(text) { if (text) this.hint.textContent = text; this.hint.style.opacity = text ? 1 : 0; },
  update(dt) {
    if (this.fade !== this.fadeTo) {
      const s = Math.sign(this.fadeTo - this.fade);
      this.fade += s * this.fadeRate * dt;
      if ((this.fadeTo - this.fade) * s <= 0) this.fade = this.fadeTo;
      this.fadeEl.style.opacity = this.fade;
    }
  },
};

// ---------- input ----------
const keys = { fwd: false, back: false, left: false, right: false };
const keymap = { KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
let ended = false;
window.addEventListener('keydown', (e) => {
  if (keymap[e.code]) { keys[keymap[e.code]] = true; e.preventDefault(); }
  if (e.code === 'KeyR' && ended) location.reload();
});
window.addEventListener('keyup', (e) => { if (keymap[e.code]) keys[keymap[e.code]] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const look = { x: 0, y: 0, yaw: 0, pitch: 0 };
window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  look.x = (e.clientX / window.innerWidth) * 2 - 1;
  look.y = (e.clientY / window.innerHeight) * 2 - 1;
});
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  $('touch').style.display = 'block';
  for (const b of document.querySelectorAll('#touch button')) {
    const k = b.dataset.k;
    const set = (v) => (e) => { keys[k] = v; e.preventDefault(); };
    b.addEventListener('pointerdown', set(true));
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, set(false));
  }
}

// ---------- the cab ----------
const car = {
  x: city.start.x, z: city.start.z, heading: city.start.heading,
  v: 0, steer: 0, locked: true, accel: 0,
  pitch: 0, roll: 0, rock: 0, rockV: 0,
  steerTime: 0, braked: false,
};
const fwd = new THREE.Vector3();
const sound = new Sound();

function drive(dt) {
  const v0 = car.v;
  const throttle = !car.locked && keys.fwd ? 1 : 0;
  if (car.locked) {
    car.v -= Math.sign(car.v) * Math.min(Math.abs(car.v), 5 * dt);
  } else {
    if (keys.fwd) car.v += (car.v < 0 ? 6 : 2.5 * (1 - Math.max(car.v, 0) / 13.5)) * dt;
    if (keys.back) {
      car.v -= (car.v > 0.3 ? 6.5 : 1.6) * dt;
      if (v0 > 1) car.braked = true;
    }
    if (!keys.fwd && !keys.back) car.v -= car.v * 0.3 * dt + Math.sign(car.v) * Math.min(Math.abs(car.v), 0.3 * dt);
    car.v = Math.max(car.v, -3.5);
  }
  const input = car.locked ? 0 : (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
  if (input && Math.abs(car.v) > 0.5) car.steerTime += dt;
  const target = input * 0.55 / (1 + Math.abs(car.v) * 0.1);
  car.steer += (target - car.steer) * Math.min(1, dt * 4.5);
  const yawRate = (car.v / 2.9) * Math.tan(car.steer);
  car.heading += yawRate * dt;
  fwd.set(-Math.sin(car.heading), 0, -Math.cos(car.heading));

  // kerbs: stay on the carriageway, sliding along the edge
  const nx = car.x + fwd.x * car.v * dt, nz = car.z + fwd.z * car.v * dt;
  if (onRoad(nx, nz)) { car.x = nx; car.z = nz; }
  else {
    if (Math.abs(car.v) > 3) sound.kerb();
    if (onRoad(nx, car.z)) car.x = nx;
    else if (onRoad(car.x, nz)) car.z = nz;
    car.v *= Math.max(0, 1 - 6 * dt);
  }

  car.accel = (car.v - v0) / Math.max(dt, 1e-4);
  const lat = car.v * yawRate;
  car.pitch += (THREE.MathUtils.clamp(car.accel * 0.0045, -0.03, 0.02) - car.pitch) * Math.min(1, dt * 5);
  car.roll += (THREE.MathUtils.clamp(-lat * 0.006, -0.035, 0.035) - car.roll) * Math.min(1, dt * 4);
  // suspension rock when someone gets in or out
  car.rockV += (-car.rock * 60 - car.rockV * 7) * dt;
  car.rock += car.rockV * dt;
  sound.setEngine(car.v, throttle);
}

function poseCab(time) {
  const r = cab.rig;
  r.position.set(car.x, Math.sin(time * 38) * 0.0007 - Math.abs(car.rock) * 0.3, car.z);
  r.rotation.set(car.pitch, car.heading, car.roll + car.rock, 'YXZ');
  cab.wheel.rotation.z = car.steer * 5.5;
  cab.needle.rotation.z = THREE.MathUtils.degToRad(120 - 2.4 * Math.min(100, Math.abs(car.v) * 2.237));
  look.yaw += (-look.x * 1.2 - look.yaw) * 0.08;
  look.pitch += (-look.y * 0.38 - look.pitch) * 0.08;
  camera.rotation.set(look.pitch, look.yaw, 0);
  r.updateMatrixWorld(true);
}

// Cab-local point -> world.
const toWorld = (x, y, z) => cab.rig.localToWorld(new THREE.Vector3(x, y, z));

// ---------- script runner (generators) ----------
const routines = new Set();
function spawn(gen) { const r = { gen, wait: null, dead: false }; routines.add(r); return r; }
function stepRoutines(dt) {
  for (const r of routines) {
    if (r.dead) { routines.delete(r); continue; }
    if (r.wait) {
      if (!r.wait(dt)) continue;
      r.wait = null;
    }
    const n = r.gen.next();
    if (n.done) routines.delete(r); else r.wait = n.value;
  }
}
const secs = (s) => { let t = 0; return (dt) => (t += dt) >= s; };
const until = (fn) => () => fn();
const moving = (s) => { let t = 0; return (dt) => { if (Math.abs(car.v) > 1) t += dt; return t >= s; }; };

const state = { phase: 'start', arrow: false, speaking: 0, lines: [] };
const distTo = (p) => Math.hypot(car.x - p.x, car.z - p.z);

function say(text, seconds) {
  state.lines.push(text);
  state.speaking = seconds;
  hud.say(text);
  spawn((function* () { yield secs(seconds); if (hud.sub.textContent === text) hud.hush(); })());
}

function* walkFigure(to, speed = 1.15) {
  yield (dt) => {
    const dx = to.x - figure.position.x, dz = to.z - figure.position.z, d = Math.hypot(dx, dz);
    if (d < 0.08) { figure.position.y = to.y; return true; }
    figure.rotation.y = Math.atan2(-dx, -dz);
    const s = Math.min(d, speed * dt);
    figure.position.x += (dx / d) * s; figure.position.z += (dz / d) * s;
    figure.position.y = to.y + Math.abs(Math.sin(time * 7)) * 0.025;
    return false;
  };
}

function* tutorial() {
  yield secs(1.5);
  hud.tip('W or ↑ — accelerate');
  yield until(() => car.v > 2.5);
  hud.tip('A / D or ← → — steer');
  yield until(() => car.steerTime > 0.35);
  hud.tip('S or ↓ — brake. Hold it at a standstill to reverse');
  yield until(() => car.braked);
  hud.tip('Move the mouse to look around. The mirror shows the back seat');
  yield secs(6);
  hud.tip('Follow the arrow to the pickup');
  yield until(() => distTo(city.pickup.stop) < 34);
  hud.tip('Pull up beside him and stop');
}

function* scene() {
  // 1. fade in, seated in the cab, in the rain
  state.phase = 'fade-in';
  sound.fade(0.8, 5);
  yield secs(1.6);
  hud.setFade(0, 6);
  yield secs(4.5);

  // 2. tutorial and the arrow to the pickup
  state.phase = 'tutorial';
  car.locked = false;
  state.arrow = true;
  const tut = spawn(tutorial());
  yield until(() => distTo(city.pickup.stop) < 12 && Math.abs(car.v) < 0.25);

  // 3. the cab stops; he gets in
  state.phase = 'pickup';
  tut.dead = true;
  car.locked = true;
  state.arrow = false;
  hud.tip('');
  yield secs(1.4);
  const doors = [-1, 1].map((s) => ({ s, p: toWorld(s * 1.25, 0, 0.95) }));
  doors.sort((a, b) => a.p.distanceTo(figure.position) - b.p.distanceTo(figure.position));
  const door = doors[0];
  yield* walkFigure(new THREE.Vector3(door.p.x, 0, door.p.z));
  yield secs(0.5);
  sound.doorOpen();
  yield secs(0.7);
  figure.visible = false;
  cab.passenger.visible = true;
  cab.passenger.position.x = door.s * 0.62;
  car.rockV += door.s * -0.22;
  let t = 0;
  yield (dt) => {
    t = Math.min(1, t + dt / 1.3);
    const e = t * t * (3 - 2 * t);
    cab.passenger.position.x = door.s * 0.62 + (SEAT_X - door.s * 0.62) * e;
    return t >= 1;
  };
  sound.doorClose();
  car.rockV += door.s * 0.08;
  cab.meter.material.map = cab.meterOff;
  yield secs(3.2);
  say(OPEN_LINE, 3.5);
  yield secs(1.2);

  // 4. the scripted drive: he talks, Mark cannot answer
  state.phase = 'drive';
  car.locked = false;
  yield moving(5);
  for (const [text, hold, quiet] of MONOLOGUE) {
    say(text, hold);
    yield moving(hold + quiet);
  }
  say(STOP_LINE, 3.5);
  state.phase = 'pull-over';
  yield secs(1.5);
  hud.tip('Pull over and stop');
  yield until(() => Math.abs(car.v) < 0.2);
  hud.tip('');
  car.locked = true;

  // 5. "keep the change"
  state.phase = 'drop-off';
  yield secs(2.6);
  say(CLOSE_LINE, 4);
  yield secs(4.8);
  sound.doorOpen();
  t = 0;
  yield (dt) => {
    t = Math.min(1, t + dt / 1.2);
    cab.passenger.position.x = SEAT_X + (-0.62 - SEAT_X) * t * t;
    return t >= 1;
  };
  cab.passenger.visible = false;
  car.rockV += 0.2;
  const out = toWorld(-1.25, 0, 0.95);
  figure.position.set(out.x, 0, out.z);
  figure.visible = true;
  yield secs(0.9);
  sound.doorClose();
  const kerb = toWorld(-3.4, 0, 1.2), away = toWorld(-3.6, 0, 30);
  spawn((function* () {
    yield* walkFigure(new THREE.Vector3(kerb.x, 0.12, kerb.z));
    yield* walkFigure(new THREE.Vector3(away.x, 0.12, away.z));
    figure.visible = false;
  })());
  yield secs(7);
  state.phase = 'fade-out';
  hud.setFade(1, 5);
  sound.fade(0, 6);
  yield secs(6);
  state.phase = 'end';
  ended = true;
  hud.end.style.opacity = 1;
}

// ---------- frame ----------
figure.position.copy(city.pickup.stand);
figure.rotation.y = Math.PI;      // facing the road
const lightSort = city.lamps.map((l) => ({ l, d: 0 }));
const tmpLight = new THREE.Vector3();
let time = 0, lastWipe = 0;

function update(dt) {
  time += dt;
  drive(dt);
  poseCab(time);
  stepRoutines(dt);
  hud.update(dt);

  // wipers
  const wt = time % WIPE_PERIOD;
  if ((lastWipe > wt) || (lastWipe < 0.55 && wt >= 0.55)) sound.wiper();
  lastWipe = wt;
  cab.setWipe(wt);

  // the nearest street lamps wash through the cabin as they pass
  for (const s of lightSort) s.d = (s.l.x - car.x) ** 2 + (s.l.z - car.z) ** 2;
  lightSort.sort((a, b) => a.d - b.d);
  for (let i = 0; i < 3; i++) {
    const { l, d } = lightSort[i];
    lampLights[i].position.set(l.x, l.y, l.z);
    const f = Math.max(0, 1 - Math.sqrt(d) / 30);
    lampLights[i].intensity = 150 * f * f;
  }

  // passenger: slight nod while speaking
  state.speaking = Math.max(0, state.speaking - dt);
  const talk = state.speaking > 0 ? 1 : 0;
  cab.headPivot.rotation.x = Math.sin(time * 5.1) * 0.018 * talk + Math.sin(time * 0.7) * 0.01;
  cab.headPivot.rotation.z = Math.sin(time * 3.3) * 0.012 * talk - car.roll * 0.8;

  // the figure on the kerb picks up the baked street light around him
  const L = city.lightAt(figure.position.x, 1.2, figure.position.z, 0, 0.5, 0);
  figure.material.uniforms.uObjLight.value.set(L[0], L[1], L[2]);

  // tutorial arrow: bearing to the pickup, relative to the cab
  hud.arrow.style.opacity = state.arrow ? 0.9 : 0;
  if (state.arrow) {
    tmpLight.set(city.pickup.stop.x, 0, city.pickup.stop.z);
    cab.rig.worldToLocal(tmpLight);
    const a = Math.atan2(tmpLight.x, -tmpLight.z);
    hud.arrow.style.transform = `perspective(160px) rotateX(48deg) rotate(${a}rad)`;
  }

  shared.uTime.value = time;
  shared.uCabPos.value.set(car.x, 0, car.z);
  shared.uCabDir.value.copy(fwd);
  cab.glassUniforms.uTime.value = time;
}

function render() {
  // rear-view mirror: the street behind, then the back of the cab
  cab.passenger.updateMatrixWorld(true);
  shared.uLinearOut.value = 1;
  shared.uRes.value.set(256, 76);
  renderer.setRenderTarget(cab.mirrorTarget);
  renderer.setClearColor(fogLinear, 1);
  renderer.clear();
  renderer.render(world, cab.mirrorCam);
  renderer.clearDepth();
  renderer.render(interior, cab.mirrorCam);

  // the world, small
  shared.uLinearOut.value = 0;
  shared.uRes.value.set(lowRT.width, lowRT.height);
  renderer.setRenderTarget(lowRT);
  renderer.setClearColor(FOG_COLOR, 1);
  renderer.clear();
  renderer.render(world, camera);

  // upscale it, then draw the cab interior over the top at full resolution
  renderer.setRenderTarget(null);
  renderer.clear();
  renderer.render(blitScene, blitCam);
  renderer.clearDepth();
  renderer.render(interior, camera);
}

let last = performance.now(), started = false;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000) * TIME_SCALE;
  last = now;
  if (started) {
    while (dt > 0) { const s = Math.min(dt, 1 / 30); update(s); dt -= s; }
  } else {
    poseCab(0);
  }
  render();
}
requestAnimationFrame(frame);

$('start').addEventListener('pointerdown', () => {
  if (started) return;
  started = true;
  $('start').style.display = 'none';
  sound.start();
  spawn(scene());
});

// Debug handle (used for automated run-throughs; harmless in play).
window.__poc = { car, keys, state, city, cab, hud };
