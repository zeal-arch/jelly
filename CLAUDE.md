# Jelly

A collection of single-file interactive browser studies ("Material Studies"). Live at https://zeal-arch.github.io/jelly/ via GitHub Pages, deployed from `main` / root on every push.

## Layout

- One folder per study, named after the prompt title in kebab-case (e.g. `melon-jelly-knife/`, `citrus-jelly-cutters/`, `harbor-jelly/`).
- Each folder holds a self-contained `index.html` (all JS/CSS inline, no build step) plus a short `README.md`.
- Root `index.html` is the landing page: add one `<li>` per new study. Root `README.md` has a table: add one row per new study.

## Adding a study

1. The user pastes a build prompt. Build it from scratch in a new folder as `index.html`; follow the prompt's own spec for libraries (most are WebGPU + WGSL with no libraries; a few ask for Three.js from a CDN).
2. Add it to the root `index.html` list and the root `README.md` table.
3. Commit and push to `main`. The live URL is `https://zeal-arch.github.io/jelly/<folder>/`.

## Conventions

- Shared look: warm paper background `#E2DFDA`, italic serif display title, small uppercase kicker "Material Studies / No. NNN", status pill top-right, control panel on the right.
- WebGPU needs HTTPS or localhost. To test locally, serve the repo root: `python -m http.server 8765`.
- Expose a deterministic test hook on `window` where the prompt asks for one, and verify the page actually runs before calling it done. Cloud sandboxes usually have no GPU, so say plainly when rendering could not be verified.
- `melon-jelly-knife/` is third-party MIT code; keep its `LICENSE` file. Everything else is written here.
- Never force-push `main`.
