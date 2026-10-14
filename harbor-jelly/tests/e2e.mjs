// End-to-end test for Harbor Jelly in a real browser (Playwright + Chromium with WebGPU).
//   node harbor-jelly/tests/e2e.mjs
// Env: PLAYWRIGHT=<path to playwright's index.mjs> (default: the 'playwright' package), CHROME=<chromium binary>.
// Serves the repo root itself. Headless Chromium can't present a WebGPU canvas, so a small shim renders the
// canvas to a texture and copies it to an overlay 2D canvas; pixel checks read that overlay.
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const root = fileURLToPath(new URL('../..', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!p.startsWith(root) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
}).listen(0);
const url = `http://localhost:${server.address().port}/harbor-jelly/`;

const SHIM = `(() => {
  const orig = HTMLCanvasElement.prototype.getContext, shims = [];
  if (!window.GPUQueue) return;
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    if (type !== 'webgpu') return orig.call(this, type, opts);
    if (this.__shim) return this.__shim;
    const canvas = this, s = { canvas, cfg: null, tex: null, pending: false, busy: false, overlay: null };
    s.ctx = { canvas, configure(c) { s.cfg = c; }, unconfigure() {}, getConfiguration() { return s.cfg; },
      getCurrentTexture() { const w = canvas.width, h = canvas.height;
        if (!s.tex || s.tex.width !== w || s.tex.height !== h) { s.tex && s.tex.destroy(); s.tex = s.cfg.device.createTexture({ size: [w, h], format: s.cfg.format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC }); }
        s.pending = true; return s.tex; } };
    shims.push(s); this.__shim = s.ctx; return s.ctx;
  };
  const submit = GPUQueue.prototype.submit;
  GPUQueue.prototype.submit = function (cmds) {
    submit.call(this, cmds);
    for (const s of shims) {
      if (!s.pending || s.busy || !s.tex) continue; s.pending = false; s.busy = true;
      const dev = s.cfg.device, w = s.tex.width, h = s.tex.height, stride = Math.ceil(w * 4 / 256) * 256;
      const buf = dev.createBuffer({ size: stride * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      const enc = dev.createCommandEncoder(); enc.copyTextureToBuffer({ texture: s.tex }, { buffer: buf, bytesPerRow: stride }, [w, h]); submit.call(this, [enc.finish()]);
      buf.mapAsync(GPUMapMode.READ).then(() => {
        const src = new Uint8Array(buf.getMappedRange()), img = new ImageData(w, h), bgra = s.cfg.format.startsWith('bgra');
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * stride + x * 4, o = (y * w + x) * 4; img.data[o] = src[i + (bgra ? 2 : 0)]; img.data[o + 1] = src[i + 1]; img.data[o + 2] = src[i + (bgra ? 0 : 2)]; img.data[o + 3] = 255; }
        buf.unmap(); buf.destroy();
        if (!s.overlay) { s.overlay = document.createElement('canvas'); s.overlay.id = 'shim-overlay'; s.overlay.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;opacity:0'; document.body.appendChild(s.overlay); }
        s.overlay.width = w; s.overlay.height = h; s.overlay.getContext('2d', { willReadFrequently: true }).putImageData(img, 0, 0); s.busy = false;
      }).catch(() => { s.busy = false; });
    }
  };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => raf(t => { if (shims.some(s => s.busy)) return window.requestAnimationFrame(cb); cb(t); });
})();`;

let failed = 0, passed = 0, skipped = 0;
const check = (name, ok, detail = '') => { if (ok) { passed++; console.log(`  ok   ${name}`); } else { failed++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--enable-unsafe-webgpu', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] });

async function open(viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && !/willReadFrequently|experimental/i.test(m.text()))) errors.push(m.type() + ': ' + m.text()); });
  await page.addInitScript({ content: SHIM });
  await page.goto(url);
  await page.waitForFunction(() => document.getElementById('status').dataset.state !== 'boot', null, { timeout: 30000 });
  return { page, errors };
}
const noScroll = page => page.evaluate(() => { scrollTo(0, 500); const s = { y: scrollY, h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, vh: innerHeight, vw: innerWidth }; return s.y === 0 && s.h <= s.vh + 1 && s.w <= s.vw + 1 ? true : JSON.stringify(s); });
const text = (page, sel) => page.$eval(sel, el => el.textContent.trim());

console.log('Harbor Jelly · end to end');
{
  const { page, errors } = await open({ width: 1280, height: 800 });
  const live = (await text(page, '#statusText')) === 'WebGPU · Live';
  check('page shell: title, eyebrow and status pill', (await page.$eval('h1', el => el.innerText)).replace(/\s+/g, ' ').trim() === 'Harbor Jelly.' && /Material Studies/i.test(await text(page, '.kicker')) && /WebGPU/.test(await text(page, '#statusText')));
  check('no page scroll (desktop)', (await noScroll(page)) === true, String(await noScroll(page)));
  if (!live) {
    check('friendly fallback without WebGPU', await page.isVisible('#fallback'));
    skipped++; console.log('  skip the rest: no WebGPU device in this browser');
  } else {
    check('shaders compile cleanly', (await page.evaluate(() => harbor.compileErrors())).length === 0);
    // software WebGPU is slow: give the first frames time to come back
    await page.waitForFunction(() => document.getElementById('shim-overlay'), null, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const px = await page.evaluate(() => {
      const c = document.getElementById('shim-overlay'); if (!c) return null;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0, s2 = 0, n = 0;
      for (let i = 0; i < d.length; i += 4 * 97) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; s2 += l * l; n++; }
      const k = (c.height - 6) * c.width * 4 + 6 * 4; return { sd: Math.sqrt(s2 / n - (s / n) ** 2), corner: [d[k], d[k + 1], d[k + 2]] };
    });
    if (px) {
      check('the diorama renders (varied pixels)', px.sd > 15, `sd ${px.sd?.toFixed(1)}`);
      check('the studio paper is #E2DFDA', px.corner.every((v, i) => Math.abs(v - [226, 223, 218][i]) < 8), px.corner.join(','));
    } else { skipped++; console.log('  skip pixel checks: no frame read back'); }
    await page.evaluate(() => harbor.pause(true));
    await page.click('#feed'); check('Feed the fish counts', (await text(page, '#tFed')) === '1');
    await page.click('#horn'); await page.keyboard.press('Space');
    check('Horn and Space work without errors', errors.length === 0, errors.join(' | '));
    check('status reads the ship\'s work', /^Unloading \d+ \/ 8$/.test(await text(page, '#shipStatus')), await text(page, '#shipStatus'));
    await page.click('#castOff');
    check('Cast off greys while she finishes up', (await text(page, '#shipStatus')) === 'Finishing up' && await page.$eval('#castOff', b => b.disabled));
    await page.evaluate(() => harbor.step(60 * 30));
    check('…then she goes to sea and the button offers Call her in', /^At sea \d+%$/.test(await text(page, '#shipStatus')) && (await text(page, '#castOff')) === 'Call her in' && !(await page.$eval('#castOff', b => b.disabled)), await text(page, '#shipStatus'));
    await page.click('#castOff'); await page.evaluate(() => harbor.step(60 * 25));
    const st = await page.evaluate(() => harbor.state());
    check('Call her in brings her home', st.tally.voyages === 1 && st.issues.length === 0, JSON.stringify(st.tally));
    await page.click('[data-v="blueberry"]');
    check('flavour swatches switch', (await page.evaluate(() => harbor.state().flavour)) === 'blueberry' && (await page.$eval('[data-v="blueberry"]', b => b.getAttribute('aria-checked'))) === 'true');
    await page.$eval('#tide', el => { el.value = 6; el.dispatchEvent(new Event('input')); });
    await page.evaluate(() => harbor.step(120));
    check('Tide raises the sea', (await text(page, '#tideOut')) === '+6 cm' && Math.abs((await page.evaluate(() => harbor.state().level)) - 0.06) < 0.002);
    await page.$eval('#firm', el => { el.value = 0.9; el.dispatchEvent(new Event('input')); });
    await page.$eval('#damp', el => { el.value = 1.2; el.dispatchEvent(new Event('input')); });
    check('Firmness and Wave damping sliders apply', (await text(page, '#firmOut')) === '0.90' && (await page.evaluate(() => harbor.H.sea.damping)) === 1.2);
    // pointer: make waves, tip the block, throw a lifebuoy
    await page.evaluate(() => { harbor.pause(false); harbor.resetView(); });
    await page.waitForTimeout(400);
    const water = await page.evaluate(() => harbor.toScreen([0.4, 0, 1.5]));
    check('the water is under the pointer', (await page.evaluate(([x, y]) => harbor.pickAt(x, y)?.kind, water)) === 'water');
    const e0 = await page.evaluate(() => harbor.H.sea.foam.reduce((a, v) => a + v, 0));
    await page.mouse.move(water[0], water[1]); await page.mouse.down(); for (let i = 0; i < 12; i++) { await page.mouse.move(water[0] + i * 9, water[1] + Math.sin(i) * 6); await page.waitForTimeout(30); } await page.mouse.up();
    check('dragging the water stirs it up', (await page.evaluate(() => harbor.H.sea.foam.reduce((a, v) => a + v, 0))) > e0);
    const side = await page.evaluate(() => harbor.toScreen([0.3, -1.05, 2.6]));
    check('the block side is under the pointer', (await page.evaluate(([x, y]) => harbor.pickAt(x, y)?.kind, side)) === 'side');
    await page.evaluate(() => harbor.pause(true)); // step the sim by hand: headless frames are too slow to rely on
    await page.mouse.move(side[0], side[1]); await page.mouse.down(); await page.mouse.move(side[0], side[1] - 60, { steps: 6 });
    const tipped = await page.evaluate(() => harbor.step(60).tilt[1]);
    await page.mouse.up();
    const settled = await page.evaluate(() => harbor.step(300));
    await page.evaluate(() => harbor.pause(false));
    check('dragging a side tips the block, and it settles back', tipped > 0.03 && Math.abs(settled.tilt[1]) < 0.01, `tipped ${tipped} settled ${settled.tilt}`);
    await page.click('#pause');
    check('Pause pauses', (await text(page, '#statusText')) === 'WebGPU · Paused' && (await text(page, '#pause')) === 'Resume');
    await page.click('#pause'); await page.click('#sound');
    check('Sound toggles', (await page.$eval('#sound', b => b.getAttribute('aria-pressed'))) === 'false' && (await text(page, '#sound')) === 'Sound off');
    await page.click('#reset');
    check('Reset starts the day again', (await text(page, '#tBoxes')) === '0' && (await text(page, '#tFed')) === '0');
    await page.click('#resetView');
    check('no console errors or warnings', errors.length === 0, errors.slice(0, 4).join(' | '));
  }
  await page.close();
}
{ // phones: the panel is a collapsible bottom sheet; still no page scroll
  const { page, errors } = await open({ width: 390, height: 844, hasTouch: true, isMobile: true });
  const r0 = await page.$eval('#panel', p => { const r = p.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height }; });
  check('phone: the panel sits at the bottom as a sheet', Math.abs(r0.bottom - 844) < 2 && r0.h < 844 * 0.4, JSON.stringify(r0));
  await page.click('#sheetToggle');
  const r1 = await page.$eval('#panel', p => p.getBoundingClientRect().height);
  check('phone: the sheet opens', r1 > r0.h + 80 && (await page.$eval('#sheetToggle', b => b.getAttribute('aria-expanded'))) === 'true', `${r0.h} → ${r1}`);
  check('phone: no page scroll', (await noScroll(page)) === true, String(await noScroll(page)));
  check('phone: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}
await browser.close(); server.close();
console.log(`\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ''}`);
process.exit(failed ? 1 : 0);
