# Harbor Jelly

Material Studies No. 013. A working container harbour set in a 5.2 × 5.2 block of wobbly jelly sea, in real time with WebGPU. Two ship-to-shore cranes work a feeder ship, a tug takes her out past the lighthouse and pushes her back onto the fenders, and gulls, fish and moon jellies go about their day. One self-contained `index.html`: WebGPU + WGSL, no libraries, no external requests, no build step.

**Live:** https://zeal-arch.github.io/jelly/harbor-jelly/

Needs a WebGPU-capable browser (recent Chrome or Edge; Safari 26+). Without one, the page says so.

## Playing

| Input | Action |
|:---|:---|
| Drag the water | Make waves (fish scatter) |
| Drag a side of the block | Tip it: the sea sloshes, the jelly shears, quivers and settles |
| Drag a lifebuoy | Pick it up and throw it; it floats flat, bounces off the pier, buildings and breakwater, and gets shoved by the ship and tug |
| Drag empty space / right-drag | Orbit · scroll or pinch to zoom · double-click to reset the view |
| <kbd>Space</kbd> | Sound the horn |

Panel: **Cast off** (becomes **Call her in** at sea; greyed while busy), **Horn** (two low detuned reeds a fifth apart; steam from the funnel, every gull takes off), **Feed the fish** (pellets off the pier end; fish rush in, gulls swoop). A tally counts boxes moved, voyages and feeds; the status line follows the ship's day ("Unloading 3 / 8", "Booms up", "Tug coming", "Casting off", "At sea 40%", "Coming in", "Berthing"). Flavours: Sea glass, Blueberry, Lime (water colour and candy strata). Sliders: Firmness, Wave damping, Tide (±10 cm; the sea and everything floating follows). Reset, Pause, Sound on/off, Reset view. On phones the panel is a bottom sheet.

## How it works

- **Sea:** linear shallow water on a 104 × 104 staggered grid with a small surface-tension term, closed at the quays and the block walls. Hulls press into it (bow waves and wakes), the tug's prop pushes it, a gentle swell rolls in from the open side, and tipping the block feeds gravity along the floor into it.
- **The ship's day (~100 s):** each crane unloads four boxes from its own bays to its own yard columns and loads four back, tracking the ship as she bobs; idle cranes yield. Booms go up, the tug comes in, takes a line and walks the bow off while the stern pivots on its fender, casts off and goes home. The ship laps the harbour along a Catmull–Rom path, riding the waves (heave, pitch, roll); the tug comes to standby and pushes her onto the fenders. Everything is checked collision-free in a headless test.
- **Life:** three schools of boids (mackerel, herring, orange wrasse), six pulsing moon jellies, nine herring gulls that perch on lamps, roofs, the spire, the lighthouse gallery, the crane apexes and the ship's, tug's and yachts' masts as they move.
- **Rendering:** shadow map → caustics from the sea's curvature → the opaque diorama (static mesh plus ~24 moving rigs drawn from one vertex buffer with a per-vertex object id and per-object position + quaternion in a uniform) with a distance buffer → the jelly's back faces → the jelly over a copy of the scene: refraction, Beer–Lambert absorption, light shafts, Fresnel studio reflection, foam, a bright meniscus on the cut edges → tone map (Khronos PBR Neutral) and dither. Materials: paint, glass, steel, roof tiles and slate, timber grain, corrugated sheet (ribbed normals), dressed stone, rubber, rock, glowing lamps, swaying weed, hulls with antifouling, cobbles, asphalt with yard lines, candy strata. The jelly's shear and squash apply to everything in the block.

A test hook lives on `window.harbor` (`state`, `step`, `castOff`, `horn`, `feed`, `tide`, `tip`, `toScreen`, `pickAt`, …).

## Tests

```bash
node harbor-jelly/tests/choreography.test.mjs   # the simulation core, headless (no browser)
node harbor-jelly/tests/e2e.mjs                 # Playwright + Chromium: UI, controls, pointer, phones
```

The end-to-end test needs Playwright (`PLAYWRIGHT=/path/to/playwright/index.mjs` and `CHROME=/path/to/chromium` if not installed normally).

## Run locally

From the repo root:

```bash
python -m http.server 8765
```

Then open http://localhost:8765/harbor-jelly/.
