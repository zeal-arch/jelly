# Tropical Cove

Material Studies No. 011. A miniature tropical cove inside a 10 × 10 block of clear water: a procedural, seeded crescent of limestone cliffs with a sand beach and turquoise shallows, and water you can stir. One self-contained `index.html`, Three.js r160 from jsDelivr via an import map (plus `OrbitControls` and `BufferGeometryUtils`), no build step.

**Live:** https://zeal-arch.github.io/jelly/tropical-cove/

## Controls

- Move over the water to stir ripples; click or tap to splash.
- Drag to orbit, scroll or pinch to zoom.
- The dock: **Reset** (view + calm water), **Tune the island** (settings panel), **New island** (new seed), fullscreen.
- Settings: water colour, wave height, ripple strength, damping, tide level, clarity, caustics, sun azimuth and elevation, tilt-shift, theme. They are remembered in this browser.
- `?seed=1234` loads a specific island.

## How it works

- **Island:** a 400 × 400 heightfield warped onto the rounded block, shaped by a tapering IQ-style arc SDF that is domain-warped with fbm. Near-vertical cliffs with rounded rims plunge into deep water outside; inside, a sand beach slopes into the shallows. Optional sea stack, instanced boulders and seabed rocks, ~5k instanced "cauliflower" canopy blobs with neighbour AO. A skirt wall shows the cross-section through the water. Rock is shaded by world height (strata, drip stains, limestone cap, waterline and wet bands, algae) with derivative bump mapping and CPU-baked horizon AO.
- **Water:** the opaque scene renders to an MSAA half-float target with a depth texture; the water is drawn over a copy with a manual depth test. Colour comes from the real path length through the block (Beer–Lambert toward a deep-blue scatter colour), with screen-space refraction, Fresnel sky reflection and sun glints. A 256² wave-equation ripple simulation (fixed 60 Hz, land mask so waves reflect off the shore and walls) drives the surface; shore foam appears only on gentle slopes. Animated caustics light the seabed. A final pass applies ACES, sRGB and a tilt-shift blur onto a transparent canvas.
- **Adaptive:** pixel ratio follows the frame rate; touch devices get a lighter mode; reduced motion skips the intro and ambient drops.

## Run locally

From the repo root:

```bash
python -m http.server 8765
```

Then open http://localhost:8765/tropical-cove/ (needs network access to cdn.jsdelivr.net).
