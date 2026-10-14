// Headless choreography test for Harbor Jelly: runs the page's own simulation core (no browser, no GPU).
//   node harbor-jelly/tests/choreography.test.mjs
// It extracts the core from index.html (between /* @core-begin */ and /* @core-end */) and checks that
// the ship's day runs in order, loops in about 100 s, moves boxes, never collides, and copes with the
// controls (cast off early, call her in, tide at both extremes, feeding, the horn, a thrown lifebuoy).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const src = html.slice(html.indexOf('/* @core-begin */'), html.indexOf('/* @core-end */'));
if (!src) throw new Error('core markers not found in index.html');
const core = new Function(src + '\nreturn { Harbor, HB, OBJ, audit, groundH };')();
const { Harbor, HB, audit } = core;

let failed = 0, passed = 0;
function check(name, ok, detail = '') { if (ok) { passed++; console.log(`  ok   ${name}`); } else { failed++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); } }
const DT = 1 / 60;

// run a harbour for `secs`, collecting phases, collision issues and the closest the cranes come
function run(H, secs, opts = {}, each) {
  const issues = new Map(); let craneMin = Infinity, nan = false;
  for (let i = 0; i < Math.round(secs / DT); i++) {
    H.step(DT, opts);
    each && each(H);
    for (const m of audit(H)) if (!issues.has(m)) issues.set(m, `${H.t.toFixed(1)}s ${H.phase}`);
    craneMin = Math.min(craneMin, Math.abs(H.cranes[0].x - H.cranes[1].x));
    if (!Number.isFinite(H.ship.y) || !Number.isFinite(H.ship.pose.x) || !Number.isFinite(H.sea.h[5000])) nan = true;
  }
  return { issues: [...issues].map(([k, v]) => `${k} @${v}`), craneMin, nan };
}
const ORDER = ['boomsUp', 'tugComing', 'castOff', 'atSea', 'comingIn', 'berthing', 'boomsDown', 'work'];

console.log('Harbor Jelly · choreography');
{ // two full ship's days
  const H = new Harbor(11), t0 = performance.now();
  const r = run(H, 215);
  const ms = (performance.now() - t0) / (215 / DT);
  const seq = H.log.map(([, p]) => p);
  check('phases follow the ship\'s day in order', seq.slice(0, 16).every((p, i) => p === ORDER[i % ORDER.length]), seq.join(' → '));
  const works = H.log.filter(([, p]) => p === 'work').map(([t]) => t);
  const loop = works.length > 1 ? works[1] - works[0] : works[0];
  check('the day loops in about 100 s', works.length >= 2 && loop > 85 && loop < 120, `loop ${loop?.toFixed(1)} s`);
  check('boxes are moved (8 off and 8 on per call)', H.tally.boxes >= 32, `${H.tally.boxes} boxes`);
  check('two voyages completed', H.tally.voyages === 2, `${H.tally.voyages} voyages`);
  check('nothing collides (ship, tug, quay, pier, breakwater, yachts, buoys, sea bed)', r.issues.length === 0, r.issues.slice(0, 5).join('; '));
  check('the cranes keep their distance', r.craneMin >= HB.crane.legW, `closest ${r.craneMin.toFixed(3)}`);
  check('the simulation stays finite', !r.nan);
  check('a sim step stays cheap (< 4 ms in node)', ms < 4, `${ms.toFixed(2)} ms/step`);
}
{ // cast off early
  const H = new Harbor(3); run(H, 8);
  check('Cast off is offered while working', H.canCastOff());
  H.castOff(); check('Cast off greys while finishing up', !H.canCastOff() && H.status() === 'Finishing up');
  const r = run(H, 30), atSea = H.log.find(([, p]) => p === 'atSea');
  check('casting off early goes to sea sooner', atSea && atSea[0] < 34, atSea ? `at sea at ${atSea[0].toFixed(1)} s` : 'never left');
  check('no collisions after an early cast-off', r.issues.length === 0, r.issues.slice(0, 3).join('; '));
}
{ // call her in
  const H = new Harbor(5); H.castOff(); run(H, 40);
  check('at sea, the status reads a percentage', /^At sea \d+%$/.test(H.status()), H.status());
  check('Call her in is offered at sea', H.canCallIn());
  const tCall = H.t; H.callIn();
  const r = run(H, 60), back = H.log.find(([t, p]) => p === 'berthing' && t > tCall);
  check('calling her in brings her home faster', back && back[0] - tCall < 20, back ? `${(back[0] - tCall).toFixed(1)} s` : 'never came in');
  check('no collisions when hurried home', r.issues.length === 0, r.issues.slice(0, 3).join('; '));
}
for (const level of [0.1, -0.1]) { // tide extremes: the sea and everything floating follows
  const H = new Harbor(7); const r = run(H, 110, { level });
  check(`tide ${level > 0 ? '+' : '−'}10 cm: a full day without collisions`, r.issues.length === 0 && H.tally.voyages === 1, r.issues.slice(0, 3).join('; ') + ` voyages ${H.tally.voyages}`);
  check(`tide ${level > 0 ? '+' : '−'}10 cm: ship and buoys ride the new level`, Math.abs(H.ship.y - level) < 0.05 && Math.abs(H.buoys[0].y - level) < 0.05, `ship ${H.ship.y.toFixed(3)} buoy ${H.buoys[0].y.toFixed(3)}`);
}
{ // feeding and the horn
  const H = new Harbor(9); run(H, 20);
  H.feed(); check('feeding counts', H.tally.fed === 1);
  check('pellets fly off the pier end', H.pellets.length > 10);
  let rushed = 0; run(H, 4, {}, h => { const near = h.fish.filter(f => h.pellets.some(q => q.wet && Math.hypot(q.p[0] - f.p[0], q.p[2] - f.p[2]) < 0.5)).length; rushed = Math.max(rushed, near); });
  check('fish rush to the food', rushed >= 5, `${rushed} fish near pellets`);
  run(H, 30); const perched = H.gulls.filter(g => g.state === 'perched').length;
  H.horn(); const flying = H.gulls.filter(g => g.state === 'fly').length;
  check('the horn sends every gull up', flying === H.gulls.length, `${perched} were perched, ${flying}/${H.gulls.length} flying`);
}
{ // a thrown lifebuoy lands, floats flat and stays in the block
  const H = new Harbor(13), b = H.lifebuoys[0];
  b.p = [1.55, 0.45, -0.2]; b.v = [-0.9, 0.6, 1.1];
  run(H, 6);
  check('a thrown lifebuoy ends up floating', b.floating && Math.abs(b.p[1] - (H.level + H.sea.height(b.p[0], b.p[2]))) < 0.01, b.p.map(v => v.toFixed(2)).join(','));
  check('…flat on the water', Math.abs(b.tiltX) < 0.3 && Math.abs(b.tiltZ) < 0.3);
  check('…inside the block', Math.abs(b.p[0]) < HB.half && Math.abs(b.p[2]) < HB.half);
}
{ // the jelly sea settles after a big disturbance
  const H = new Harbor(17); H.swellAmp = 0;
  for (let i = 0; i < 90; i++) H.step(DT, { ax: -0.12 });
  const energy = () => H.sea.h.reduce((a, v, k) => a + (H.sea.D[k] ? v * v : 0), 0);
  const e0 = energy(); run(H, 12); const e1 = energy();
  check('a slosh from tipping the block dies away', e1 < e0 * 0.35, `${e0.toFixed(3)} → ${e1.toFixed(3)}`);
  check('wave heights stay bounded', Math.max(...H.sea.h) < 0.15);
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
