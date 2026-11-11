// Procedural low-res texture atlases for the PSX world. Everything here is
// blockout art: placeholder by design.
import * as THREE from 'three';

const T = 64;        // tile size in pixels
const N = 8;         // tiles per row

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function noise(ctx, x, y, w, h, amount, r) {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, x, y);
}

function bricks(ctx, x, y, base, mortar, r) {
  ctx.fillStyle = mortar; ctx.fillRect(x, y, T, T);
  for (let row = 0; row < 16; row++) {
    const off = row % 2 ? 4 : 0;
    for (let col = -1; col < 9; col++) {
      const v = 0.8 + r() * 0.4;
      ctx.fillStyle = `rgb(${base[0] * v | 0},${base[1] * v | 0},${base[2] * v | 0})`;
      ctx.fillRect(x + Math.max(0, col * 8 + off), y + row * 4, Math.min(7, T - (col * 8 + off)), 3);
    }
  }
}

function sash(ctx, e, x, y, lit, r) {
  // stone surround, frame, glass
  ctx.fillStyle = '#6f6a60'; ctx.fillRect(x + 16, y + 12, 32, 42);
  ctx.fillStyle = '#d8d2c2'; ctx.fillRect(x + 18, y + 14, 28, 38);
  const glass = lit === 2 ? '#e0b060' : lit === 1 ? '#5a4a2c' : '#0b0d12';
  ctx.fillStyle = glass; ctx.fillRect(x + 20, y + 16, 24, 34);
  if (lit === 2) {
    e.fillStyle = '#fff'; e.fillRect(x + 20, y + 16, 24, 34);
    ctx.fillStyle = '#b98a48'; ctx.fillRect(x + 20, y + 16, 9, 34);   // curtain
  } else if (lit === 1) {
    e.fillStyle = '#fff'; e.fillRect(x + 20, y + 16, 24, 34);
    ctx.fillStyle = '#4a3c24'; ctx.fillRect(x + 20, y + 16, 24, 12);  // blind
  } else if (r() > 0.5) {
    ctx.fillStyle = '#15181f'; ctx.fillRect(x + 20, y + 16, 24, 10);
  }
  ctx.fillStyle = '#d8d2c2';
  ctx.fillRect(x + 31, y + 16, 2, 34); ctx.fillRect(x + 20, y + 32, 24, 2);
  ctx.fillStyle = '#8a8478'; ctx.fillRect(x + 14, y + 54, 36, 3);    // sill
}

export const TILE = {
  ASPHALT: 0, ASPHALT2: 1, PAVE: 2, KERB: 3, WHITE: 4, YELLOW: 5, METAL: 6, PLAIN: 7,
  // 4 brick styles x 6 tiles from index 8: winDark, winLit, blank, door, groundWin, winDim
  BRICK: 8,
  SHOP_SHUTTER: 32, SHOP_LIT: 33, SHOP_DOOR: 34, SHOP_DARK: 35, FASCIA: 36,
  CORRUGATED: 40, ROLLER: 41, CONCRETE: 42, IND_WIN: 43,
  PHONE: 48, PILLAR: 49, BIN: 50,
};

export function tileUV(i) {
  const tx = i % N, ty = Math.floor(i / N);
  const s = 1 / N, inset = 0.5 / (N * T);
  // DataTexture has no flip: canvas top row is v = 0.
  return { u0: tx * s + inset, u1: (tx + 1) * s - inset, vTop: ty * s + inset, vBot: (ty + 1) * s - inset };
}

export function makeAtlas() {
  const size = T * N;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ec = document.createElement('canvas'); ec.width = ec.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const e = ec.getContext('2d', { willReadFrequently: true });
  e.fillStyle = '#000'; e.fillRect(0, 0, size, size);
  const r = rng(7);
  const at = (i) => [(i % N) * T, Math.floor(i / N) * T];
  const flat = (i, col, n = 14) => { const [x, y] = at(i); ctx.fillStyle = col; ctx.fillRect(x, y, T, T); noise(ctx, x, y, T, T, n, r); return [x, y]; };

  // --- ground ---
  let [x, y] = flat(TILE.ASPHALT, '#3c3c40', 30);
  [x, y] = flat(TILE.ASPHALT2, '#36363a', 34);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 10, y + 20, 30, 18);  // patch repair
  [x, y] = flat(TILE.PAVE, '#4a4a48', 16);
  ctx.fillStyle = '#2c2c2b';
  for (let i = 0; i <= T; i += 32) { ctx.fillRect(x + i, y, 1, T); }
  for (let i = 0; i <= T; i += 21) { ctx.fillRect(x, y + i, T, 1); }
  flat(TILE.KERB, '#5a5955', 12);
  flat(TILE.WHITE, '#c9c7bd', 22);
  flat(TILE.YELLOW, '#b59320', 24);
  flat(TILE.METAL, '#2a2c2e', 8);
  flat(TILE.PLAIN, '#ffffff', 0);

  // --- brick terraces ---
  const styles = [
    { base: [150, 122, 78], mortar: '#5e5644' },   // London stock
    { base: [122, 58, 44], mortar: '#4a3a34' },    // red brick
    { base: [96, 92, 86], mortar: '#55524c' },     // sooty grey
    { base: [128, 118, 100], mortar: '#6a6458' },  // pale render-ish
  ];
  styles.forEach((s, si) => {
    const b = TILE.BRICK + si * 6;
    for (let k = 0; k < 6; k++) {
      [x, y] = at(b + k);
      bricks(ctx, x, y, s.base, s.mortar, r);
      if (k === 0) sash(ctx, e, x, y, 0, r);
      if (k === 1) sash(ctx, e, x, y, 2, r);
      if (k === 5) sash(ctx, e, x, y, 1, r);
      if (k === 3) {  // front door
        ctx.fillStyle = '#6f6a60'; ctx.fillRect(x + 18, y + 10, 28, 54);
        ctx.fillStyle = ['#1c2a22', '#2a1416', '#141a2a', '#1a1a1a'][si]; ctx.fillRect(x + 21, y + 20, 22, 44);
        ctx.fillStyle = '#0b0d12'; ctx.fillRect(x + 21, y + 12, 22, 7);
        ctx.fillStyle = '#9a8a50'; ctx.fillRect(x + 31, y + 42, 3, 2);
      }
      if (k === 4) {  // ground-floor window, a little wider
        sash(ctx, e, x, y, 0, r);
        ctx.fillStyle = 'rgba(30,30,28,0.5)'; ctx.fillRect(x, y + 58, T, 6);
      }
      noise(ctx, x, y, T, T, 10, r);
    }
  });

  // --- shops ---
  const shopBase = (i) => {
    [x, y] = at(i);
    ctx.fillStyle = '#1b1a18'; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = '#2c2a26'; ctx.fillRect(x, y + 54, T, 10);       // stall riser
    return [x, y];
  };
  [x, y] = shopBase(TILE.SHOP_SHUTTER);
  for (let i = 4; i < 54; i += 3) { ctx.fillStyle = i % 6 ? '#4c4e50' : '#3a3c3e'; ctx.fillRect(x + 3, y + i, 58, 2); }
  [x, y] = shopBase(TILE.SHOP_LIT);
  ctx.fillStyle = '#9fb09a'; ctx.fillRect(x + 4, y + 6, 56, 46);
  ctx.fillStyle = '#c8d4c0'; ctx.fillRect(x + 4, y + 6, 56, 8);       // strip light
  ctx.fillStyle = '#6f7c6c'; ctx.fillRect(x + 8, y + 30, 48, 3); ctx.fillRect(x + 8, y + 42, 48, 3);  // empty shelves
  ctx.fillStyle = '#1b1a18'; ctx.fillRect(x + 31, y + 6, 2, 46);
  e.fillStyle = '#fff'; e.fillRect(x + 4, y + 6, 56, 46);
  [x, y] = shopBase(TILE.SHOP_DOOR);
  ctx.fillStyle = '#0c0e12'; ctx.fillRect(x + 18, y + 4, 28, 60);
  ctx.fillStyle = '#3a3a38'; ctx.fillRect(x + 16, y + 4, 2, 60); ctx.fillRect(x + 46, y + 4, 2, 60);
  ctx.fillStyle = '#8a8a80'; ctx.fillRect(x + 40, y + 34, 3, 6);
  [x, y] = shopBase(TILE.SHOP_DARK);
  ctx.fillStyle = '#0c0e13'; ctx.fillRect(x + 4, y + 6, 56, 46);
  ctx.fillStyle = '#181b22'; ctx.fillRect(x + 8, y + 30, 48, 20);
  ctx.fillStyle = '#1b1a18'; ctx.fillRect(x + 31, y + 6, 2, 46);
  flat(TILE.FASCIA, '#23211e', 8);

  // --- industrial edges ---
  [x, y] = at(TILE.CORRUGATED);
  for (let i = 0; i < T; i += 4) { ctx.fillStyle = i % 8 ? '#3d4446' : '#2c3234'; ctx.fillRect(x + i, y, 4, T); }
  ctx.fillStyle = 'rgba(90,50,20,0.25)'; ctx.fillRect(x, y + 50, T, 14);
  noise(ctx, x, y, T, T, 12, r);
  [x, y] = at(TILE.ROLLER);
  ctx.fillStyle = '#34393b'; ctx.fillRect(x, y, T, T);
  for (let i = 6; i < T; i += 4) { ctx.fillStyle = i % 8 ? '#585c5a' : '#44484a'; ctx.fillRect(x + 6, y + i, 52, 3); }
  ctx.fillStyle = '#b59320'; ctx.fillRect(x + 6, y + 60, 52, 4);
  noise(ctx, x, y, T, T, 10, r);
  [x, y] = flat(TILE.CONCRETE, '#4b4a46', 20);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 20, y, 2, T); ctx.fillRect(x, y + 40, T, 1);
  [x, y] = flat(TILE.IND_WIN, '#4b4a46', 18);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const lit = i === 2 && j === 0;
    ctx.fillStyle = lit ? '#b8a468' : '#0d0f13';
    ctx.fillRect(x + 6 + i * 13, y + 14 + j * 14, 11, 12);
    if (lit) { e.fillStyle = '#fff'; e.fillRect(x + 6 + i * 13, y + 14 + j * 14, 11, 12); }
  }

  // --- street furniture ---
  [x, y] = flat(TILE.PHONE, '#7c1512', 10);
  ctx.fillStyle = '#c8b46a'; ctx.fillRect(x + 8, y + 2, 48, 7);       // lit header panel
  e.fillStyle = '#fff'; e.fillRect(x + 8, y + 2, 48, 7);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) {
    ctx.fillStyle = '#3d3a26'; ctx.fillRect(x + 9 + i * 16, y + 12 + j * 8, 13, 6);
    e.fillStyle = '#666'; e.fillRect(x + 9 + i * 16, y + 12 + j * 8, 13, 6);
  }
  [x, y] = flat(TILE.PILLAR, '#84130f', 10);
  ctx.fillStyle = '#12100f'; ctx.fillRect(x, y + 54, T, 10); ctx.fillRect(x + 14, y + 16, 36, 4);
  [x, y] = flat(TILE.BIN, '#1c1f1c', 12);
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x + 12, y + 10, 40, 8);

  // merge: alpha = 1 - emissive
  const img = ctx.getImageData(0, 0, size, size);
  const em = e.getImageData(0, 0, size, size).data;
  for (let i = 0; i < img.data.length; i += 4) img.data[i + 3] = 255 - em[i];
  const tex = new THREE.DataTexture(new Uint8Array(img.data.buffer), size, size, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Generic trade names only: the city is unnamed and has no real places.
export const SIGNS = [
  ['NEWSAGENT', '#1d3a2a', '#e8e2c8'], ['CHEMIST', '#e4e0d0', '#1a5a34'], ['FISH BAR', '#1a2c58', '#f0e08a'],
  ['LAUNDERETTE', '#d8d4c4', '#28408a'], ['OFF LICENCE', '#5a1418', '#f0e6c8'], ['BOOKMAKER', '#12301c', '#e8d890'],
  ['CAFE', '#7a1a14', '#f4ecd8'], ['PAWNBROKER', '#16161a', '#d8b850'], ['HARDWARE', '#2a2a2c', '#e0dccc'],
  ['BUTCHER', '#e0dccc', '#7a1a14'], ['CHEQUES CASHED', '#e0c020', '#141414'], ['TO LET', '#e8e4d8', '#aa1a14'],
  ['MINICABS', '#101010', '#e0c020'], ['FURNITURE', '#3a2a1c', '#e0d4b8'], ['TV REPAIRS', '#1c2c3c', '#e8e8e8'],
  ['GROCER', '#2c4a1c', '#f0ecd0'],
];
const SW = 128, SH = 16;

export function signUV(i) {
  const cols = 2, rows = 16;
  const tx = i % cols, ty = Math.floor(i / cols);
  const ix = 0.5 / (SW * cols), iy = 0.5 / (SH * rows);
  return { u0: tx / cols + ix, u1: (tx + 1) / cols - ix, vTop: ty / rows + iy, vBot: (ty + 1) / rows - iy };
}

export function makeSignAtlas() {
  const c = document.createElement('canvas'); c.width = SW * 2; c.height = SH * 16;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#222'; ctx.fillRect(0, 0, c.width, c.height);
  SIGNS.forEach(([text, bg, fg], i) => {
    const x = (i % 2) * SW, y = Math.floor(i / 2) * SH;
    ctx.fillStyle = bg; ctx.fillRect(x, y, SW, SH);
    ctx.fillStyle = fg;
    ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + SW / 2, y + SH / 2 + 1, SW - 10);
  });
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const tex = new THREE.DataTexture(new Uint8Array(img.data.buffer), c.width, c.height, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}
