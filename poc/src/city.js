// Blockout city: a small closed grid of streets, terraces, shopfronts and
// industrial edges under amber sodium lamps. Static, with lamp light baked
// into vertex colours (no streetlight degradation in this POC).
import * as THREE from 'three';
import { worldMaterial, glowMaterial } from './psx.js';
import { makeAtlas, makeSignAtlas, tileUV, signUV, TILE, SIGNS } from './textures.js';

export const PITCH = 72;          // distance between road centre lines
export const ROADS = 6;           // roads per axis
export const SPAN = PITCH * (ROADS - 1);
export const HALF_ROAD = 4;       // carriageway half width
export const BUILD_LINE = 8;      // road centre to building line
const STOREY = 3;
const LAMP_H = 7.4;
const AMBER = [1.0, 0.52, 0.13];

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function distToRoadLine(v) {
  const i = Math.max(0, Math.min(ROADS - 1, Math.round(v / PITCH)));
  return Math.abs(v - i * PITCH);
}

class Builder {
  constructor() { this.p = []; this.n = []; this.uv = []; this.t = []; this.e = []; this.idx = []; }
  quad(a, b, c, d, n, r, tint = [1, 1, 1], emis = null) {
    const i = this.p.length / 3;
    this.p.push(...a, ...b, ...c, ...d);
    for (let k = 0; k < 4; k++) { this.n.push(...n); this.t.push(...tint); this.e.push(emis); }
    this.uv.push(r.u0, r.vBot, r.u1, r.vBot, r.u1, r.vTop, r.u0, r.vTop);
    this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  // Vertical wall from (x0,z0) to (x1,z1), left to right as seen from outside.
  wall(x0, z0, x1, z1, y0, y1, r, tint, emis) {
    const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz);
    const n = [-dz / l, 0, dx / l];
    this.quad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], n, r, tint, emis);
  }
  ground(x0, z0, x1, z1, y, r, tint, emis) {
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], r, tint, emis);
  }
  box(cx, y0, cz, sx, sy, sz, tile, tint, emis, topTile) {
    const r = tileUV(tile), x0 = cx - sx / 2, x1 = cx + sx / 2, z0 = cz - sz / 2, z1 = cz + sz / 2, y1 = y0 + sy;
    this.wall(x0, z1, x1, z1, y0, y1, r, tint, emis);
    this.wall(x1, z1, x1, z0, y0, y1, r, tint, emis);
    this.wall(x1, z0, x0, z0, y0, y1, r, tint, emis);
    this.wall(x0, z0, x0, z1, y0, y1, r, tint, emis);
    this.ground(x0, z0, x1, z1, y1, tileUV(topTile ?? tile), tint, emis);
    if (emis) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], r, tint, emis);
  }
  build(lightFn) {
    const count = this.p.length / 3;
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const e = this.e[i];
      const L = e || lightFn(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2], this.n[i * 3], this.n[i * 3 + 1], this.n[i * 3 + 2]);
      col[i * 3] = L[0]; col[i * 3 + 1] = L[1]; col[i * 3 + 2] = L[2];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('tint', new THREE.Float32BufferAttribute(this.t, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(this.idx), 1));
    return g;
  }
}

export function buildCity() {
  const rand = rng(1993);
  const main = new Builder(), road = new Builder(), signs = new Builder();
  const lamps = [];        // {x, y, z, color, range, k}
  const group = new THREE.Group();

  // ---------- lamps ----------
  const lampHeads = [];
  for (let axis = 0; axis < 2; axis++) {
    for (let j = 0; j < ROADS; j++) {
      for (let k = 0; k < 10; k++) {
        const along = 18 + k * 36;
        let side = (k + j) % 2 ? 1 : -1;
        if (axis === 1 && j === 2 && k === 2) side = 1;   // the pickup lamp
        if (j === 0) side = 1;
        if (j === ROADS - 1) side = -1;
        const c = j * PITCH;
        const pole = axis === 0 ? [c + side * 4.7, along] : [along, c + side * 4.7];
        const head = axis === 0 ? [c + side * 2.4, along] : [along, c + side * 2.4];
        lampHeads.push({ pole, head, axis, side, j, k });
        lamps.push({ x: head[0], y: LAMP_H, z: head[1], color: AMBER, range: 30, k: 3.1, r0: 8 });
      }
    }
  }

  // ---------- ground ----------
  const rA = tileUV(TILE.ASPHALT), rA2 = tileUV(TILE.ASPHALT2), rP = tileUV(TILE.PAVE), rK = tileUV(TILE.KERB);
  const kind = (cx, cz) => {
    const d = Math.min(distToRoadLine(cx), distToRoadLine(cz));
    return d < HALF_ROAD ? 1 : d < BUILD_LINE ? 2 : 0;
  };
  for (let x = -8; x < SPAN + 8; x += 2) {
    for (let z = -8; z < SPAN + 8; z += 2) {
      const k = kind(x + 1, z + 1);
      if (k === 1) road.ground(x, z, x + 2, z + 2, 0, rand() < 0.1 ? rA2 : rA);
      else if (k === 2) {
        main.ground(x, z, x + 2, z + 2, 0.12, rP);
        if (kind(x + 3, z + 1) === 1) main.wall(x + 2, z + 2, x + 2, z, 0, 0.12, rK);
        if (kind(x - 1, z + 1) === 1) main.wall(x, z, x, z + 2, 0, 0.12, rK);
        if (kind(x + 1, z + 3) === 1) main.wall(x, z + 2, x + 2, z + 2, 0, 0.12, rK);
        if (kind(x + 1, z - 1) === 1) main.wall(x + 2, z, x, z, 0, 0.12, rK);
      }
    }
  }
  // markings: broken centre line and double yellows, clear of junctions
  const rW = tileUV(TILE.WHITE), rY = tileUV(TILE.YELLOW);
  for (let j = 0; j < ROADS; j++) {
    const c = j * PITCH;
    for (let a = -8; a < SPAN + 8; a += 4) {
      if (distToRoadLine(a + 2) < 9) continue;
      if (((a + 8) / 4) % 2 === 0) {
        main.ground(c - 0.07, a, c + 0.07, a + 2.4, 0.012, rW);
        main.ground(a, c - 0.07, a + 2.4, c + 0.07, 0.012, rW);
      }
      for (const s of [-1, 1]) for (const o of [3.45, 3.75]) {
        main.ground(c + s * o - 0.05, a, c + s * o + 0.05, a + 4, 0.012, rY);
        main.ground(a, c + s * o - 0.05, a + 4, c + s * o + 0.05, 0.012, rY);
      }
    }
  }

  // ---------- lamp posts ----------
  const dark = [0.09, 0.1, 0.1];
  for (const l of lampHeads) {
    const [px, pz] = l.pole, [hx, hz] = l.head;
    main.box(px, 0.12, pz, 0.16, LAMP_H, 0.16, TILE.PLAIN, dark);
    const ax = l.axis === 0;
    main.box((px + hx) / 2, LAMP_H + 0.05, (pz + hz) / 2, ax ? Math.abs(px - hx) : 0.1, 0.1, ax ? 0.1 : Math.abs(pz - hz), TILE.PLAIN, dark);
    main.box(hx, LAMP_H - 0.1, hz, ax ? 0.8 : 0.3, 0.16, ax ? 0.3 : 0.8, TILE.PLAIN, [1, 1, 1], [1.7, 0.95, 0.3]);
  }

  // ---------- buildings ----------
  const shopLights = [];
  let signCursor = 0;
  function frontage(px, pz, rx, rz, length, opts) {
    const nx = -rz, nz = rx;
    const bays = Math.round(length / 3.1);
    const bw = length / bays;
    let b = 0;
    while (b < bays) {
      let nb = Math.min(bays - b, 2 + Math.floor(rand() * 3));
      if (bays - b - nb === 1) nb++;
      const end = b === 0 || b + nb >= bays;
      const roll = rand();
      const type = roll < opts.industrial ? 'ind' : roll < opts.industrial + opts.shop ? 'shop' : 'house';
      const storeys = end ? 3 : type === 'ind' ? 2 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 3);
      const style = Math.floor(rand() * 4);
      const base = TILE.BRICK + style * 6;
      const shopLit = type === 'shop' && rand() < 0.14;
      const doorBay = Math.floor(rand() * nb);
      const shade = 0.82 + rand() * 0.3;
      const tint = [shade, shade, shade];
      for (let i = 0; i < nb; i++) {
        const x0 = px + rx * (b + i) * bw, z0 = pz + rz * (b + i) * bw;
        const x1 = px + rx * (b + i + 1) * bw, z1 = pz + rz * (b + i + 1) * bw;
        for (let s = 0; s < storeys; s++) {
          let tile;
          if (type === 'ind') {
            tile = s === 0 ? (i === doorBay ? TILE.ROLLER : rand() < 0.5 ? TILE.CONCRETE : TILE.CORRUGATED)
              : rand() < 0.25 ? TILE.IND_WIN : TILE.CORRUGATED;
          } else if (s === 0 && type === 'shop') {
            tile = i === doorBay ? TILE.SHOP_DOOR : shopLit ? TILE.SHOP_LIT : rand() < 0.6 ? TILE.SHOP_SHUTTER : TILE.SHOP_DARK;
            if (tile === TILE.SHOP_LIT) {
              shopLights.push({ x: (x0 + x1) / 2 + nx * 1.5, y: 1.6, z: (z0 + z1) / 2 + nz * 1.5, color: [0.62, 0.78, 0.66], range: 11, k: 1.1, r0: 3 });
            }
          } else if (s === 0) {
            tile = i === doorBay ? base + 3 : base + 4;
          } else {
            const w = rand();
            tile = w < 0.045 ? base + 1 : w < 0.13 ? base + 5 : w < 0.9 ? base : base + 2;
          }
          main.wall(x0, z0, x1, z1, 0.12 + s * STOREY, 0.12 + (s + 1) * STOREY, tileUV(tile), tint);
        }
      }
      // party walls rising above the neighbours (skipped at the block corners)
      const top = 0.12 + storeys * STOREY;
      const sx0 = px + rx * b * bw, sz0 = pz + rz * b * bw;
      const sx1 = px + rx * (b + nb) * bw, sz1 = pz + rz * (b + nb) * bw;
      const blank = tileUV(type === 'ind' ? TILE.CORRUGATED : base + 2);
      if (b > 0) main.wall(sx0 - nx * 8, sz0 - nz * 8, sx0, sz0, 0.12 + STOREY, top, blank, tint);
      if (b + nb < bays) main.wall(sx1, sz1, sx1 - nx * 8, sz1 - nz * 8, 0.12 + STOREY, top, blank, tint);
      if (type === 'shop') {
        const si = signCursor++ % SIGNS.length;
        const o = 0.06;
        signs.quad(
          [sx0 + nx * o + rx * 0.2, 2.5, sz0 + nz * o + rz * 0.2], [sx1 + nx * o - rx * 0.2, 2.5, sz1 + nz * o - rz * 0.2],
          [sx1 + nx * o - rx * 0.2, 3.2, sz1 + nz * o - rz * 0.2], [sx0 + nx * o + rx * 0.2, 3.2, sz0 + nz * o + rz * 0.2],
          [nx, 0, nz], signUV(si), [1, 1, 1], shopLit ? [0.9, 0.9, 0.85] : null);
      }
      // a little street furniture on the pavement in front
      if (rand() < 0.16 && !end) {
        const m = (b + nb / 2) * bw;
        const fx = px + rx * m + nx * 1.2, fz = pz + rz * m + nz * 1.2;
        const pick = rand();
        if (pick < 0.35) main.box(fx, 0.12, fz, 0.9, 2.4, 0.9, TILE.PHONE, [1, 1, 1]);
        else if (pick < 0.6) main.box(fx, 0.12, fz, 0.45, 1.5, 0.45, TILE.PILLAR, [1, 1, 1]);
        else main.box(fx, 0.12, fz, 0.5, 0.95, 0.5, TILE.BIN, [1, 1, 1]);
      }
      b += nb;
    }
  }
  const mix = (ia, ib) => {
    const edge = ia === 0 || ia === ROADS - 1;
    const high = ia === 2;
    return { industrial: edge ? 0.6 : 0.04, shop: high ? 0.7 : edge ? 0.05 : 0.14 };
  };
  for (let i = 0; i < ROADS - 1; i++) {
    for (let j = 0; j < ROADS - 1; j++) {
      const x0 = i * PITCH + BUILD_LINE, x1 = (i + 1) * PITCH - BUILD_LINE;
      const z0 = j * PITCH + BUILD_LINE, z1 = (j + 1) * PITCH - BUILD_LINE;
      const len = x1 - x0;
      frontage(x0, z1, 1, 0, len, mix(j + 1));     // faces +Z, onto road j+1
      frontage(x1, z0, -1, 0, len, mix(j));        // faces -Z, onto road j
      frontage(x1, z1, 0, -1, len, mix(i + 1));    // faces +X, onto road i+1
      frontage(x0, z0, 0, 1, len, mix(i));         // faces -X, onto road i
    }
  }
  // outer ring: warehouses and depots closing the map
  const o0 = -BUILD_LINE, o1 = SPAN + BUILD_LINE, ol = o1 - o0, ind = { industrial: 0.85, shop: 0 };
  frontage(o0, o0, 1, 0, ol, ind);
  frontage(o1, o1, -1, 0, ol, ind);
  frontage(o0, o1, 0, -1, ol, ind);
  frontage(o1, o0, 0, 1, ol, ind);

  // ---------- baked lighting ----------
  const allLights = lamps.concat(shopLights);
  const CELL = 28, buckets = new Map();
  for (const l of allLights) {
    const key = Math.floor(l.x / CELL) + ',' + Math.floor(l.z / CELL);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(l);
  }
  function lightAt(x, y, z, nx = 0, ny = 1, nz = 0) {
    const amb = 0.5 + 0.5 * ny;
    const out = [0.15 + 0.07 * amb, 0.115 + 0.055 * amb, 0.125 + 0.07 * amb];
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) {
      const b = buckets.get(i + ',' + j);
      if (!b) continue;
      for (const l of b) {
        const dx = l.x - x, dy = l.y - y, dz = l.z - z;
        const d = Math.hypot(dx, dy, dz);
        if (d > l.range) continue;
        const ndl = Math.max(0, (nx * dx + ny * dy + nz * dz) / (d + 1e-4));
        const t = Math.min(1, Math.max(0, (d - l.range * 0.6) / (l.range * 0.4)));
        const att = (1 / (1 + (d / l.r0) * (d / l.r0))) * (1 - t * t * (3 - 2 * t));
        const s = (0.22 + 0.78 * ndl) * att * l.k;
        out[0] += l.color[0] * s; out[1] += l.color[1] * s; out[2] += l.color[2] * s;
      }
    }
    return out;
  }

  const atlas = makeAtlas();
  const roadMesh = new THREE.Mesh(road.build(lightAt), worldMaterial(atlas, { depthWrite: false }));
  roadMesh.renderOrder = -2;
  const mainMesh = new THREE.Mesh(main.build(lightAt), worldMaterial(atlas));
  const signMesh = new THREE.Mesh(signs.build(lightAt), worldMaterial(makeSignAtlas()));
  for (const m of [roadMesh, mainMesh, signMesh]) { m.frustumCulled = false; group.add(m); }

  // ---------- lamp halos + wet-road reflections ----------
  const gc = [], gk = [], gg = [], gi = [], gp = [];
  const addGlow = (x, y, z, hw, hh, col, kindId) => {
    const i = gc.length / 3;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      gc.push(x, y, z); gp.push(x, y, z); gk.push(sx * hw, sy * hh); gg.push(...col, kindId);
    }
    gi.push(i, i + 1, i + 2, i, i + 2, i + 3);
  };
  for (const l of lamps) {
    addGlow(l.x, l.y - 0.15, l.z, 1.5, 1.5, [0.85, 0.42, 0.1], 0);
    addGlow(l.x, -l.y - 1.2, l.z, 0.75, 7.5, [0.5, 0.25, 0.06], 1);
  }
  const gg2 = new THREE.BufferGeometry();
  gg2.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  gg2.setAttribute('center', new THREE.Float32BufferAttribute(gc, 3));
  gg2.setAttribute('corner', new THREE.Float32BufferAttribute(gk, 2));
  gg2.setAttribute('glow', new THREE.Float32BufferAttribute(gg, 4));
  gg2.setIndex(gi);
  const glow = new THREE.Mesh(gg2, glowMaterial());
  glow.frustumCulled = false;
  glow.renderOrder = 5;
  group.add(glow);

  // The pickup: under a lamp on the left-hand kerb of the high street.
  const pl = lampHeads.find((l) => l.axis === 1 && l.j === 2 && l.k === 2);
  const pickup = {
    stand: new THREE.Vector3(pl.pole[0] - 1.5, 0.12, 2 * PITCH + 5.4),
    stop: new THREE.Vector3(pl.pole[0] - 1.0, 0, 2 * PITCH + 2.4),
  };
  const start = { x: 2 * PITCH - 2.2, z: 4 * PITCH + 34, heading: 0 };

  return { group, atlas, lamps, lightAt, pickup, start };
}

// Is the cab centre on a carriageway? (Used for simple kerb collision.)
export function onRoad(x, z) {
  const m = 3.0;
  if (x < -m || z < -m || x > SPAN + m || z > SPAN + m) return false;
  return distToRoadLine(x) <= m || distToRoadLine(z) <= m;
}

// Placeholder figure for the world pass (standing / walking on the kerb).
// The loan shark's appearance is [Open], so this is a featureless mannequin.
export function makeWorldFigure(atlas) {
  const b = new Builder();
  const coat = [0.07, 0.07, 0.08], skin = [0.3, 0.28, 0.26];
  b.box(-0.1, 0, 0, 0.16, 0.85, 0.2, TILE.PLAIN, coat);
  b.box(0.1, 0, 0, 0.16, 0.85, 0.2, TILE.PLAIN, coat);
  b.box(0, 0.6, 0, 0.52, 0.95, 0.3, TILE.PLAIN, coat);
  b.box(-0.31, 0.75, 0, 0.13, 0.75, 0.18, TILE.PLAIN, coat);
  b.box(0.31, 0.75, 0, 0.13, 0.75, 0.18, TILE.PLAIN, coat);
  b.box(0, 1.56, 0, 0.21, 0.26, 0.23, TILE.PLAIN, skin);
  const g = b.build(() => [1, 1, 1]);
  const mesh = new THREE.Mesh(g, worldMaterial(atlas));
  mesh.frustumCulled = false;
  return mesh;
}
