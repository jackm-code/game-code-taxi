# Opening Fare: proof of concept

Playable prototype of the opening loan shark fare, built from `../07-poc-brief.md`.

## Run it

```bash
cd poc
npm install
npm run dev
```

Open the URL Vite prints (normally http://localhost:5173) and click to begin.
`npm run build` writes a single self-contained `dist/index.html` that opens by double-click.

## Controls

| Input | Action |
|---|---|
| W / Up | Accelerate |
| S / Down | Brake; hold at a standstill to reverse |
| A, D / Left, Right | Steer |
| Mouse | Look around the cab (the mirror shows the back seat) |
| R | Restart, on the end card |

Touch screens get four on-screen buttons.

## Engine choice

Three.js on WebGL, bundled with Vite. No install for players, it runs in any browser, and the
whole POC is a few small source files. The PSX look needs custom shaders (vertex snapping,
affine textures, dithering), which are simple to write here. Revisit before the full build,
as `00-README.md` says.

## How the look is made

- **World (PSX):** drawn to a 240-line target with vertex snapping, affine texture mapping,
  per-vertex lighting, fog, then upscaled with ordered dither and 15-bit colour.
- **Cab interior (high resolution):** drawn over the top at native resolution with smooth
  shading. Interior view only; there is no exterior model of the cab.
- **Rear-view mirror:** a second camera rendered to a texture.

## Files

| File | Contents |
|---|---|
| `src/main.js` | Loop, driving, the scripted scene (`scene()` and `tutorial()`) |
| `src/dialogue.js` | All spoken lines. Placeholder wording, flagged in the file |
| `src/city.js` | Blockout city grid, lamps, baked light, pickup point |
| `src/cab.js` | Cab interior, mirror, rain on glass, placeholder passenger |
| `src/psx.js` | PSX shaders, rain, final dither |
| `src/textures.js` | Procedural low-res textures and shop signs |
| `src/audio.js` | Temporary procedural sound |

## Placeholders

- The loan shark is a featureless mannequin (appearance is Open).
- The monologue wording is stand-in text. Only "Just drive." and "Keep the change." are canon.
- "Here will do." is a stand-in cue to end the fare; the canon gives no destination.
- All art and sound are blockout. There is no voice, only subtitles.

## Deliberately not built

Ambulance, partition, radio, passenger conversations, streetlight degradation, loops,
later-phase horror, fail states, scoring, progression. The taxi meter is set dressing and
tracks nothing. Hitting a kerb only slows the cab.
