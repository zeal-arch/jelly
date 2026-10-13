# Hanami Dango

Material Studies No. 012. Three mochi dumplings on a bamboo skewer, simulated in real time with WebGPU: squish them, slide them off the stick, stretch them until they string out and tear, and press the pieces back together so they stick. One self-contained `index.html`: WebGPU + WGSL, no libraries, no build step.

**Live:** https://zeal-arch.github.io/jelly/mochi-dango/

Needs a WebGPU-capable browser (recent Chrome or Edge; Safari 26+).

## Controls

| Input | Action |
|:---:|:---|
| <kbd>H</kbd> | Hand: grab a dango and pull; it squishes, stretches and slides along the skewer. Scroll or a second finger twists. |
| <kbd>T</kbd> | Pull apart: the far side is held while you stretch the near side until it tears |
| <kbd>P</kbd> | Poke: press a fingertip in; with Memory up, the dimple stays |
| <kbd>B</kbd> | Roll them round: rest shapes ease back to spheres |
| <kbd>N</kbd> / <kbd>R</kbd> / <kbd>Space</kbd> | Nudge / reset / pause |

Drag empty space to orbit, scroll to zoom, double-click to reset the view. Varieties: Hanami (pink, white, green), Mitarashi (soy-caramel glaze), Kinako (roasted soybean flour). Sliders: Softness, Stickiness, Memory, Toughness.

## How it works

- **Soft body:** each ball is an icosphere skin, an inner shell and a centre point, joined into prisms and pyramids (about 1,300 tets per ball). XPBD with per-tet co-rotational shape matching and near-incompressible volume constraints, 8 substeps at a fixed 60 Hz.
- **Memory (viscoplasticity):** beyond a small yield, each tet's rest shape creeps toward its current rotation-free shape, at constant volume.
- **Tearing:** tets stretched past a limit (relative to both their plastic and original rest shapes) are removed; nodes are split where the remaining tets no longer share a face, and the boundary is rebuilt. Crumbs are swept away.
- **Sticking:** bonds form between touching particles of different pieces and break when pulled past a distance that grows with stickiness.
- **Skewer:** a two-particle rigid rod resting in a ceramic chopstick rest; each ball's centre and poles are threaded on it and slide with friction until they pass an end.
- **Rendering:** the coarse boundary is rounded on the GPU into curved PN triangles (vertex pulling from storage buffers). Starch-dusted skin, glossy torn flesh, soft wrap lighting with PCF shadows, light through thin strands from a back-face thickness pass, PCSS floor shadows and contact AO, Khronos PBR Neutral tone mapping.

A test hook lives on `window.dango` (`state`, `ballCentre`, `toScreen`, `variety`, `round`, …).

## Run locally

From the repo root:

```bash
python -m http.server 8765
```

Then open http://localhost:8765/mochi-dango/.
