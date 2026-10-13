# Melon Jelly Knife

An interactive 3D watermelon-jelly slice you can stretch, poke, wobble, and cut into pieces with a knife, right in the browser. One self-contained `index.html`: WebGPU + WGSL, no libraries, no build step.

**Live:** https://zeal-arch.github.io/jelly/melon-jelly-knife/

Needs a WebGPU-capable browser (recent Chrome or Edge; Safari 17.4+).

## Controls

| Input | Action |
|:---:|:---|
| <kbd>H</kbd> | Hand tool: grab, stretch, pull or flick the jelly |
| <kbd>K</kbd> | Knife tool: draw a line across a piece to slice it |
| <kbd>C</kbd> | Quick cut along the current angle (<kbd>Shift</kbd>+<kbd>C</kbd> reverses) |
| <kbd>[</kbd> / <kbd>]</kbd> | Rotate the cut angle in 15° steps |
| <kbd>Z</kbd> | Undo the last cut |
| <kbd>N</kbd> | Nudge |
| <kbd>R</kbd> | Reset |
| <kbd>Space</kbd> | Pause / resume |
| <kbd>O</kbd> | Auto-orbit |
| <kbd>D</kbd> | Night studio |
| <kbd>P</kbd> | Save PNG |

- **Hand:** drag to pull; scroll or a second finger twists the held patch.
- **Knife:** drag a line across the slice and release to drop the blade.
- **Camera:** drag empty space to orbit, scroll to zoom, double-click to reset.

## How it works

- **Soft body:** a tetrahedral mesh (Delaunay of a jittered lattice) solved with small-step XPBD: co-rotational shape matching, per-tet volume constraints, edge damping, and floor contact with friction.
- **Cutting:** each piece is a convex polygon in the slice's rest plane. A cut maps the blade plane into each crossed piece's rest frame, clips the polygon in two, rebuilds both meshes, and transfers positions and velocities from the old tets. Up to 14 pieces, all in one simulation.
- **Rendering:** screen-space refraction with per-pixel thickness from a back-face depth pass, Beer–Lambert absorption, Fresnel and GGX highlights, soft tinted shadows and contact AO, MSAA ×4, PBR-Neutral tone mapping.
- **Knife:** a procedural nakiri drawn behind the jelly surface, so the buried part of the blade is seen refracted through it.

## Run locally

WebGPU needs HTTPS or localhost, so serve the folder rather than opening the file directly:

```bash
python -m http.server 8765
```

Run it from the repo root, then open http://localhost:8765/melon-jelly-knife/.

## License

MIT. See [LICENSE](LICENSE).
