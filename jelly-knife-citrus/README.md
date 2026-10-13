# Citrus Jelly Cutters

Material Studies No. 010. A real-time WebGPU soft-body gummy orange slice you can stretch by hand, cut with a straight knife or a wavy crinkle knife, and stamp with cookie cutters. Every piece becomes its own jelly body. One self-contained `index.html`: WebGPU + WGSL, no libraries, no build step.

**Live:** https://zeal-arch.github.io/jelly/jelly-knife-citrus/

Needs a WebGPU-capable browser (recent Chrome or Edge; Safari 26+).

## Controls

| Input | Action |
|:---:|:---|
| <kbd>H</kbd> | Hand: grab any piece and pull; scroll or a second finger twists the held patch |
| <kbd>K</kbd> | Knife (nakiri): draw a stroke across the slice |
| <kbd>W</kbd> | Wavy knife (crinkle cutter): draw a stroke; cut both ways for crinkle cubes |
| <kbd>C</kbd> | Cutter: click a flat piece to stamp it |
| <kbd>1</kbd>–<kbd>4</kbd> | Cutter shape: star, heart, flower, round |
| <kbd>N</kbd> / <kbd>R</kbd> / <kbd>Space</kbd> | Nudge / reset / pause |

Drag empty space with the hand to orbit, scroll to zoom, double-click to reset the view. Up to 14 pieces.

## How it works

- **Pieces** are signed-distance grids (0.01 resolution) over the slice's original rest plane, so zest, pith, segments and membranes stay where they grew. Cuts and stamps are booleans on that grid; new corners are rounded by a closing then an opening with an exact Euclidean distance transform, only near the cut. Parts are split into connected components and crumbs are dropped.
- **Meshing:** marching squares → resampled, smoothed outline projected back onto the zero set → Delaunay with an interior lattice → prisms → tets. The render surface (rounded walls with bevels limited by the local inscribed radius, two caps, membranes, air bubbles) rides inside the tets by barycentric coordinates. Cuts are meshed in a Web Worker while the knife lines up.
- **Physics:** XPBD at a fixed 60 Hz with 10 substeps: co-rotational per-tet shape matching (warm-started quaternions), volume constraints, stiffer rind and pith, edge-velocity damping, floor contact with Coulomb friction, and particle-to-particle repulsion between pieces. After a cut, the new world takes positions and velocities from the old one by barycentric interpolation.
- **Rendering:** procedural cyclorama with softboxes, PCSS key shadows tinted by the jelly, contact AO from a top-down height map; refraction by view-ray thickness from a back-face pass, Beer–Lambert absorption, milky pith scattering, back-lit edge glow, Fresnel reflections and GGX highlights; Khronos PBR Neutral tone mapping. Tools are drawn behind the jelly surface so buried steel is seen refracted.

A deterministic test hook lives on `window.citrus` (`cut`, `stamp`, `grab`, `state`, …).

## Run locally

WebGPU needs HTTPS or localhost. From the repo root:

```bash
python -m http.server 8765
```

Then open http://localhost:8765/jelly-knife-citrus/.
