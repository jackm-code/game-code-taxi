// PSX-style world rendering: vertex snapping, affine texture mapping,
// per-vertex lighting, heavy fog. Used only for the world outside the cab.
import * as THREE from 'three';

export const FOG_COLOR = new THREE.Color(0.060, 0.038, 0.026);

// Uniforms shared by every world material.
export const shared = {
  uRes: { value: new THREE.Vector2(427, 240) },
  uFogColor: { value: FOG_COLOR },
  uFogDensity: { value: 0.0155 },
  uCabPos: { value: new THREE.Vector3() },
  uCabDir: { value: new THREE.Vector3(0, 0, -1) },
  uHeadOn: { value: 1 },
  uLinearOut: { value: 0 },
  uTime: { value: 0 },
};

const SNAP = /* glsl */ `
  vec4 psxSnap(vec4 clip) {
    if (clip.w > 0.0) {
      vec2 g = uRes * 0.5;
      clip.xy = floor(clip.xy / clip.w * g + 0.5) / g * clip.w;
    }
    return clip;
  }
`;

const HEAD = /* glsl */ `
  vec3 headlight(vec3 wp, vec3 wn) {
    vec3 h = uCabPos + uCabDir * 2.0 + vec3(0.0, 0.7, 0.0);
    vec3 L = wp - h;
    float d = length(L);
    vec3 dir = L / max(d, 0.001);
    vec3 aim = normalize(uCabDir + vec3(0.0, -0.07, 0.0));
    float cone = smoothstep(0.78, 0.97, dot(dir, aim));
    float att = (1.0 / (1.0 + 0.012 * d * d)) * (1.0 - smoothstep(26.0, 44.0, d));
    float ndl = 0.35 + 0.65 * max(dot(wn, -dir), 0.0);
    return vec3(1.0, 0.86, 0.62) * cone * att * ndl * 1.7 * uHeadOn;
  }
`;

const worldVert = /* glsl */ `
  uniform vec2 uRes;
  uniform vec3 uCabPos;
  uniform vec3 uCabDir;
  uniform float uHeadOn;
  uniform float uFogDensity;
  uniform vec3 uObjLight;
  attribute vec3 tint;
  varying vec3 vCol;
  varying vec3 vUvW;
  varying float vFog;
  ${SNAP}
  ${HEAD}
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 wn = normalize(mat3(modelMatrix) * normal);
    vec4 clip = psxSnap(projectionMatrix * viewMatrix * wp);
    gl_Position = clip;
    float w = max(clip.w, 0.05);
    vUvW = vec3(uv * w, w);            // affine (screen-linear) UVs
    vCol = (color * uObjLight + headlight(wp.xyz, wn)) * tint;
    float dist = length(wp.xyz - cameraPosition);
    float f = dist * uFogDensity;
    vFog = 1.0 - exp(-f * f);
  }
`;

const worldFrag = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 uFogColor;
  uniform float uLinearOut;
  varying vec3 vCol;
  varying vec3 vUvW;
  varying float vFog;
  void main() {
    vec2 uv = vUvW.xy / vUvW.z;
    vec4 t = texture2D(map, uv);
    // alpha channel is an emissive mask: 1 = lit by scene, 0 = self-lit
    vec3 c = t.rgb * mix(vec3(1.0), vCol, t.a);
    c = mix(c, uFogColor, vFog);
    if (uLinearOut > 0.5) c = pow(c, vec3(2.2));
    gl_FragColor = vec4(c, 1.0);
  }
`;

export function worldMaterial(map, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      map: { value: map },
      uObjLight: { value: new THREE.Vector3(1, 1, 1) },
    },
    vertexShader: worldVert,
    fragmentShader: worldFrag,
    vertexColors: true,
    depthWrite: opts.depthWrite !== false,
    side: opts.side ?? THREE.FrontSide,
  });
}

// Additive camera-facing glows: lamp halos and their smeared reflections on
// the wet road. Each quad carries its centre, a corner offset and a colour.
const glowVert = /* glsl */ `
  uniform vec2 uRes;
  uniform float uFogDensity;
  attribute vec3 center;
  attribute vec2 corner;
  attribute vec4 glow;       // rgb, kind (0 halo, 1 reflection)
  varying vec2 vC;
  varying vec4 vGlow;
  varying float vFade;
  varying vec3 vWp;
  ${SNAP}
  void main() {
    vec3 toCam = cameraPosition - center;
    vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x));
    vec3 up = vec3(0.0, 1.0, 0.0);
    if (glow.a < 0.5) up = normalize(cross(right, -normalize(toCam)));
    vec3 wp = center + right * corner.x + up * corner.y;
    vWp = wp;
    gl_Position = psxSnap(projectionMatrix * viewMatrix * vec4(wp, 1.0));
    vC = sign(corner);
    vGlow = glow;
    float f = length(toCam) * uFogDensity;
    vFade = exp(-f * f * 0.8);
  }
`;
const glowFrag = /* glsl */ `
  uniform float uLinearOut;
  uniform float uTime;
  varying vec2 vC;
  varying vec4 vGlow;
  varying float vFade;
  varying vec3 vWp;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float a;
    if (vGlow.a < 0.5) {
      float r = length(vC);
      a = pow(max(1.0 - r, 0.0), 2.2);
    } else {
      // reflection: narrow, long, broken up by the rough wet surface
      float x = abs(vC.x);
      float y = vC.y * 0.5 + 0.5;            // 0 far end, 1 near the lamp foot
      a = pow(max(1.0 - x, 0.0), 1.5) * smoothstep(0.0, 0.25, y) * smoothstep(1.0, 0.7, y);
      float n = hash(floor(vec2(vWp.y * 6.0, vWp.x * 3.0 + vWp.z * 3.0)));
      a *= 0.35 + 0.65 * n;
    }
    vec3 c = vGlow.rgb * a * vFade;
    if (uLinearOut > 0.5) c = pow(c, vec3(2.2));
    gl_FragColor = vec4(c, 1.0);
  }
`;

export function glowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: glowVert,
    fragmentShader: glowFrag,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
}

// Rain: line segments in a box that wraps around the camera.
const rainVert = /* glsl */ `
  uniform vec2 uRes;
  uniform float uTime;
  uniform vec3 uCabPos;
  uniform vec3 uCabDir;
  uniform float uHeadOn;
  attribute float end;
  varying float vA;
  varying vec3 vC;
  ${SNAP}
  ${HEAD}
  void main() {
    vec3 box = vec3(36.0, 16.0, 36.0);
    vec3 p = position;
    float speed = 15.0 + fract(p.x * 7.13) * 5.0;
    p.y -= uTime * speed;
    p.x += uTime * 1.6;
    p = mod(p - cameraPosition, box) - box * 0.5;
    float near = length(p.xz);
    p.y += end * 0.38;
    p.x += end * 0.04;
    vec3 wp = p + cameraPosition;
    gl_Position = psxSnap(projectionMatrix * viewMatrix * vec4(wp, 1.0));
    vA = smoothstep(2.2, 3.4, near) * (1.0 - smoothstep(13.0, 18.0, near));
    vC = vec3(0.26, 0.19, 0.12) + headlight(wp, normalize(-uCabDir)) * 0.45;
  }
`;
const rainFrag = /* glsl */ `
  uniform float uLinearOut;
  varying float vA;
  varying vec3 vC;
  void main() {
    vec3 c = vC * vA * 0.5;
    if (uLinearOut > 0.5) c = pow(c, vec3(2.2));
    gl_FragColor = vec4(c, 1.0);
  }
`;

export function makeRain(count = 1400) {
  const pos = new Float32Array(count * 6);
  const end = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = Math.random() * 36, y = Math.random() * 16, z = Math.random() * 36;
    pos.set([x, y, z, x, y, z], i * 6);
    end[i * 2] = 0; end[i * 2 + 1] = 1;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('end', new THREE.BufferAttribute(end, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: rainVert,
    fragmentShader: rainFrag,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const lines = new THREE.LineSegments(g, m);
  lines.frustumCulled = false;
  lines.renderOrder = 10;
  return lines;
}

// Final blit of the low-res world image: ordered dither + 15-bit colour.
export function blitMaterial(tex) {
  return new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: tex }, uRes: shared.uRes },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 uRes;
      varying vec2 vUv;
      float bayer(vec2 p) {
        vec2 q = floor(mod(p, 4.0));
        float i = q.x + q.y * 4.0;
        float v = 0.0;
        if (i < 0.5) v = 0.0; else if (i < 1.5) v = 8.0; else if (i < 2.5) v = 2.0; else if (i < 3.5) v = 10.0;
        else if (i < 4.5) v = 12.0; else if (i < 5.5) v = 4.0; else if (i < 6.5) v = 14.0; else if (i < 7.5) v = 6.0;
        else if (i < 8.5) v = 3.0; else if (i < 9.5) v = 11.0; else if (i < 10.5) v = 1.0; else if (i < 11.5) v = 9.0;
        else if (i < 12.5) v = 15.0; else if (i < 13.5) v = 7.0; else if (i < 14.5) v = 13.0; else v = 5.0;
        return v / 16.0 - 0.5;
      }
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float d = bayer(vUv * uRes);
        c = floor(c * 31.0 + 0.5 + d) / 31.0;
        gl_FragColor = vec4(c, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });
}
