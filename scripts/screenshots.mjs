// Renders the App Store and Google Play screenshots and the Play feature
// graphic from the real game (www/index.html) into store-assets/.
// Needs: npm run fonts; npm install --no-save playwright; npx playwright install chromium
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const out = path.join(root, 'store-assets');
const tmp = path.join(out, '.work');
fs.mkdirSync(tmp, { recursive: true });
const gameURL = pathToFileURL(path.join(root, 'www', 'index.html')).href;
const fontsCSS = pathToFileURL(path.join(root, 'www', 'fonts', 'fonts.css')).href;
const emblem = pathToFileURL(path.join(root, 'assets', 'generated', 'emblem-1024.png')).href;

/* ---------- A believable season, built the same way the game builds one ---------- */
let seed = 20261101;
const rand = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const ri = n => Math.floor(rand() * n);
const LEAGUE = [
  { name: 'Ironmen', color: '#97a3b4', style: 'ground', o: 1, d: 1 },
  { name: 'Thunderhawks', color: '#f0b429', style: 'air', o: 2, d: -1 },
  { name: 'Bandits', color: '#9b6bea', style: 'blitz', o: 0, d: 2 },
  { name: 'Mariners', color: '#1fb5b0', style: 'bend', o: -1, d: 1 },
  { name: 'Lumberjacks', color: '#5bb365', style: 'grinder', o: 0, d: 0 },
  { name: 'Stallions', color: '#c08a52', style: 'gambler', o: 1, d: -1 },
  { name: 'Foxes', color: '#5aa9e6', style: 'balanced', o: 0, d: 0 },
];
const DIFF = -0.5;
const teams = [{ id: 0, name: 'Comets', color: '#e04a3a', style: null, o: 0, d: 0 }]
  .concat(LEAGUE.map((t, i) => ({ ...t, id: i + 1, o: t.o + DIFF, d: t.d + DIFF })));
let arr = teams.map(t => t.id); const rounds = [];
for (let r = 0; r < 7; r++) { const g = []; for (let i = 0; i < 4; i++) { const a = arr[i], b = arr[7 - i]; g.push((r + i) % 2 ? [b, a] : [a, b]); } rounds.push(g); arr = [arr[0], arr[7]].concat(arr.slice(1, 7)); }
// Week 7 (index 6) is the Comets vs. Thunderhawks game
const thIdx = rounds.findIndex(g => g.some(([a, b]) => (a === 0 && b === 2) || (a === 2 && b === 0)));
const [th] = rounds.splice(thIdx, 1); rounds.splice(6, 0, th);
const weeks = rounds.concat(rounds.slice(0, 3).map(g => g.map(([a, b]) => [b, a])));
const cpuScore = () => { const s = [0, 3, 7, 10, 13, 14, 17, 20, 21, 24, 27, 28, 31, 35][ri(14)]; return s; };
const USER = [[24, 17], [31, 14], [17, 20], [27, 10], [21, 13], [34, 24], [24, 20], [20, 23], [28, 17], [31, 21]];
function play(nWeeks) {
  return weeks.slice(0, nWeeks).map((wk, w) => wk.map(([a, b]) => {
    if (a === 0) return { a, b, sa: USER[w][0], sb: USER[w][1] };
    if (b === 0) return { a, b, sa: USER[w][1], sb: USER[w][0] };
    let sa = cpuScore(), sb = cpuScore(); if (sa === sb) sa += 3; return { a, b, sa, sb };
  }));
}
function standings(results) {
  const rec = {}; teams.forEach(t => rec[t.id] = { id: t.id, w: 0, l: 0, t: 0, pf: 0, pa: 0 });
  results.forEach(wk => wk.forEach(g => { const A = rec[g.a], B = rec[g.b]; A.pf += g.sa; A.pa += g.sb; B.pf += g.sb; B.pa += g.sa; if (g.sa > g.sb) { A.w++; B.l++; } else if (g.sb > g.sa) { B.w++; A.l++; } else { A.t++; B.t++; } }));
  const pct = r => (r.w + r.t * .5) / Math.max(1, r.w + r.l + r.t);
  return Object.values(rec).sort((x, y) => pct(y) - pct(x) || (y.pf - y.pa) - (x.pf - x.pa) || y.pf - x.pf || x.id - y.id);
}
const base = { teams, diff: DIFF, qtrLen: 300, weeks, po: null, seeds: null, champ: null, userOut: false };
const seaWeek7 = { ...base, week: 6, results: play(6), phase: 'regular' };
const fullRes = play(10);
const seeds = standings(fullRes).map(r => r.id).slice(0, 4);
const semis = [[seeds[0], seeds[3]], [seeds[1], seeds[2]]].map(([a, b]) => {
  if (a === 0) return { a, b, sa: 27, sb: 17 }; if (b === 0) return { a, b, sa: 17, sb: 27 };
  return { a, b, sa: 24, sb: 20 };
});
const win = semis.map(g => g.sa > g.sb ? g.a : g.b);
const seaPlayoffs = { ...base, week: 10, results: fullRes, phase: 'playoffs', seeds, po: { round: 1, games: [[win[0], win[1]]], results: [semis] } };

/* ---------- Game states ---------- */
const blank = () => ({ fd: 0, ra: 0, ry: 0, pa: 0, pc: 0, py: 0, sk: 0, to: 0, top: 0 });
const th2 = teams[2];
function game(over) {
  return {
    mode: 'cpu', names: { home: 'Comets', away: 'Thunderhawks' }, qtrLen: 300, firstReceiver: 'home',
    handNext: null, offPick: null, defPick: null, result: null, afterScore: null, patFor: null,
    over: false, winner: null, recorded: false,
    season: { opp: 2, week: 6, round: -1, phase: 'regular', playoff: false }, seasonDone: false, noTies: false,
    style: 'air', rate: { home: { o: 0, d: 0 }, away: { o: th2.o, d: th2.d } }, colors: { home: '#e04a3a', away: th2.color },
    stats: { home: blank(), away: blank() }, ...over,
  };
}
const log = (q, c, txt) => ({ q, c, txt, plain: false });
const S_call = game({
  score: { home: 17, away: 13 }, quarter: 3, clock: 402, poss: 'home', ballOn: 62, down: 2, toGo: 6, phase: 'pickOff',
  stats: { home: { fd: 11, ra: 14, ry: 61, pa: 17, pc: 11, py: 138, sk: 1, to: 0, top: 412 }, away: { fd: 10, ra: 9, ry: 34, pa: 21, pc: 13, py: 171, sk: 0, to: 1, top: 378 } },
  log: [log(3, '7:16', '<b>COM 1st &amp; 10 THU 42</b> · Off Tackle vs Nickel · +4 yards'), log(3, '7:58', '<b>COM 3rd &amp; 3 COM 49</b> · Slant vs Run Blitz · Complete, +9 yards')],
});
const S_td = game({
  score: { home: 24, away: 20 }, quarter: 4, clock: 134, poss: 'home', ballOn: 98, down: 1, toGo: 10, phase: 'result',
  afterScore: { kickTo: 'away' },
  result: { dice: [6, 6], tone: 'score', head: 'TOUCHDOWN!', detail: 'Comets +6', offName: 'Deep Post', defName: 'Zone Blitz', offTeam: 'home', pat: { ok: true, txt: 'Extra point is good. +1' } },
  stats: { home: { fd: 17, ra: 20, ry: 92, pa: 26, pc: 16, py: 214, sk: 2, to: 1, top: 801 }, away: { fd: 15, ra: 13, ry: 51, pa: 30, pc: 18, py: 236, sk: 1, to: 1, top: 665 } },
  log: [log(4, '2:14', '<b>COM 3rd &amp; 8 THU 34</b> · Deep Post vs Zone Blitz · TOUCHDOWN!'), log(4, '2:14', 'Comets: Extra point is good. +1')],
});
const S_final = game({
  score: { home: 27, away: 20 }, quarter: 4, clock: 0, poss: 'away', ballOn: 41, down: 4, toGo: 7, phase: 'over',
  over: true, winner: 'home', recorded: true, seasonDone: true,
  stats: { home: { fd: 21, ra: 24, ry: 118, pa: 31, pc: 19, py: 241, sk: 2, to: 1, top: 1012 }, away: { fd: 17, ra: 15, ry: 58, pa: 36, pc: 21, py: 263, sk: 1, to: 2, top: 788 } },
  log: [log(4, '0:00', 'Final.'), log(4, '0:21', '<b>THU 4th &amp; 7 THU 41</b> · Bomb vs Prevent · Intercepted!')],
});

const scenes = [
  { id: '1-call-the-play', title: 'Call the play', sub: 'Outguess the defense', data: { S: S_call, SEA: seaWeek7, VIEW: 'game' } },
  { id: '2-roll-for-it', title: 'Roll for the big one', sub: 'Two dice decide how far it goes', data: { S: S_td, SEA: seaWeek7, VIEW: 'game' } },
  { id: '3-scout-rivals', title: 'Scout your rivals', sub: 'Seven coaches, seven styles', data: { S: null, SEA: seaWeek7, VIEW: 'hub' } },
  { id: '4-chase-the-title', title: 'Chase the title', sub: 'A 10-week season and a playoff', data: { S: null, SEA: seaPlayoffs, VIEW: 'hub' } },
  { id: '5-every-snap', title: 'Every snap tracked', sub: 'Box scores, offline, no ads', data: { S: S_final, SEA: seaWeek7, VIEW: 'game' } },
];

// Logical sizes at 3x: iPhone 6.3" (required) 1206x2622, 6.9" 1320x2868, Android 1080x1920
const SETS = [
  { dir: 'app-store-6.3in', W: 402, H: 874 },
  { dir: 'app-store-6.9in', W: 440, H: 956 },
  { dir: 'google-play-phone', W: 360, H: 640 },
];

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
async function appShot(scene, w, h, file) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 3, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.addInitScript(d => {
    try { localStorage.clear(); localStorage.setItem('huddle-duel-v1-snd', 'off'); localStorage.setItem('huddle-duel-v1-record', JSON.stringify({ w: 14, l: 5, t: 1 })); } catch (e) { }
    window.claude = { hot: { data: d } };
  }, scene.data);
  await page.goto(gameURL);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  await page.screenshot({ path: file, type: 'png' });
  await ctx.close();
}
async function compose(scene, set, appFile, outFile) {
  const { W, H } = set;
  const capH = H * 0.215, frameW = Math.round(W * 0.84), frameH = Math.round(H * 0.74);
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${fontsCSS}"><style>
    html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
    body{background:radial-gradient(120% 60% at 50% 0%,#1d3150 0%,#0f1a2c 55%,#090f1a 100%);color:#eef1ea;
      font-family:"Barlow Semi Condensed","Arial Narrow",Arial,sans-serif;display:flex;flex-direction:column;align-items:center}
    .cap{height:${capH}px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 ${W * 0.06}px}
    h1{margin:0;font-family:Graduate,Rockwell,Georgia,serif;font-weight:400;color:#ffb547;font-size:${W * 0.088}px;line-height:1.05;letter-spacing:.01em;text-shadow:0 0 ${W * 0.05}px rgba(255,181,71,.35)}
    p{margin:${W * 0.022}px 0 0;font-size:${W * 0.052}px;font-weight:600;color:#dfe5ee}
    .shot{width:${frameW}px;height:${frameH}px;border-radius:${W * 0.075}px;overflow:hidden;border:${W * 0.014}px solid #05080e;
      box-shadow:0 0 0 1.5px #2f3e58,0 ${H * 0.02}px ${H * 0.05}px rgba(0,0,0,.55)}
    .shot img{width:100%;height:100%;display:block;object-fit:cover;object-position:top}
  </style></head><body><div class="cap"><h1>${scene.title}</h1><p>${scene.sub}</p></div>
  <div class="shot"><img src="${pathToFileURL(appFile).href}"></div></body></html>`;
  const f = path.join(tmp, `compose-${set.dir}-${scene.id}.html`);
  fs.writeFileSync(f, html);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(f).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: outFile, type: 'jpeg', quality: 92 });
  await ctx.close();
}

for (const set of SETS) {
  fs.mkdirSync(path.join(out, set.dir), { recursive: true });
  const frameW = set.W * 0.84 - set.W * 0.028, frameH = set.H * 0.74 - set.W * 0.028;
  const appW = 390, appH = Math.round(appW * frameH / frameW);
  for (const scene of scenes) {
    const appFile = path.join(tmp, `${set.dir}-${scene.id}.png`);
    await appShot(scene, appW, appH, appFile);
    await compose(scene, set, appFile, path.join(out, set.dir, `${scene.id}.jpg`));
    console.log('✓', set.dir, scene.id);
  }
}

// Google Play feature graphic, 1024 x 500
{
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${fontsCSS}"><style>
    html,body{margin:0;width:1024px;height:500px;overflow:hidden}
    body{background:radial-gradient(80% 120% at 25% 50%,#22385a 0%,#0f1a2c 60%,#090f1a 100%);color:#eef1ea;
      font-family:"Barlow Semi Condensed","Arial Narrow",Arial,sans-serif;display:flex;align-items:center;gap:36px;padding:0 64px;box-sizing:border-box}
    img{width:330px;height:330px;flex:none;filter:drop-shadow(0 18px 30px rgba(0,0,0,.5))}
    .t{display:flex;flex-direction:column;gap:14px}
    h1{margin:0;font-family:Graduate,Rockwell,Georgia,serif;font-weight:400;font-size:84px;line-height:.95;color:#ffb547;text-shadow:0 0 30px rgba(255,181,71,.35)}
    p{margin:0;font-size:34px;font-weight:600;line-height:1.2}
    .turf{position:absolute;left:0;right:0;bottom:0;height:22px;background:repeating-linear-gradient(90deg,#2e7a3c 0 42px,#286c35 42px 84px);border-top:3px solid #eef1ea}
  </style></head><body><img src="${emblem}"><div class="t"><h1>HUDDLE<br>DUEL</h1><p>Call the play. Roll the dice.<br>Win the title.</p></div><div class="turf"></div></body></html>`;
  const f = path.join(tmp, 'feature.html'); fs.writeFileSync(f, html);
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(f).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  fs.mkdirSync(path.join(out, 'google-play-graphics'), { recursive: true });
  await page.screenshot({ path: path.join(out, 'google-play-graphics', 'feature-graphic-1024x500.jpg'), type: 'jpeg', quality: 92 });
  fs.copyFileSync(path.join(root, 'assets', 'generated', 'play-store-icon-512.png'), path.join(out, 'google-play-graphics', 'app-icon-512.png'));
  await ctx.close();
  console.log('✓ feature graphic');
}
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log('Done: store-assets/');
