/* Builds profile-seed/: a Chromium profile whose IndexedDB holds the owner-scale notebook
   (500 ordinary notes + ~12,000 Evernote-imported notes shaped exactly as _enxImport makes them).
     node seed.mjs [--enx=12000] [--plain=500]                                                       */
import { serveFixed, launch, PROFILE } from './common.mjs';
import { rmSync } from 'node:fs';
const arg = (k, d) => +((process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]) || d;
const ENX = arg('enx', 12000), PLAIN = arg('plain', 500);
rmSync(PROFILE, { recursive: true, force: true });
const T0 = Date.now();
const srv = await serveFixed();
const { ctx, page, errors } = await launch(PROFILE);
page.setDefaultTimeout(900000);
await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__appBooted === true);
const info = await page.evaluate(async ({ ENX, PLAIN }) => {
  let seed = 12345; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const W = 'the of and to in is that for it with as was on be at by this have from or one had not but what all were when we there can an your which their said if do will each about how up out them then she many some so these would other into has more her two like him see time could no make than first been its who now people my made over did down only way find use may water long little very after words called just where most know get through back much before go good new write our used me man too any day same right look think also around another came come work three word must because does part even place well such here take why things help put years different away again off went old number great tell men say small every found still between name should home big give air line set own under read last never us left end along while might next sound below saw something thought both few those always looked show large often together asked house world going want school important until form food keep children feet land side without boy once animals life enough took sometimes four head above kind began almost live page got earth need far hand high year mother light parts country father let night following picture being study second eyes soon times story boys since white days ever paper hard near sentence better best across during today others however sure means knew try told young miles sun ways thing whole hear example heard several change answer room sea against top turned learned point city play toward five using himself usually money seen car morning'.split(' ');
  const words = (n) => { let s = ''; for (let i = 0; i < n; i++) s += W[(rnd() * W.length) | 0] + ' '; return s; };
  /* body: ENML-converted look — divs, br, lists, links, occasionally a checkbox line and a media marker */
  const body = (bytes) => {
    let h = '';
    if (rnd() < 0.3) h += '<p class="enx-src">Source: <a href="https://example.com/a/' + ((rnd() * 1e6) | 0) + '">https://example.com/a/' + ((rnd() * 1e6) | 0) + '</a></p>';
    while (h.length < bytes) {
      const r = rnd();
      if (r < 0.55) h += '<div>' + words(8 + ((rnd() * 40) | 0)) + '</div>';
      else if (r < 0.7) h += '<div><br></div>';
      else if (r < 0.8) { h += '<ul>'; for (let i = 0; i < 3; i++) h += '<li><div>' + words(6) + '</div></li>'; h += '</ul>'; }
      else if (r < 0.87) h += '<div>' + (rnd() < .5 ? '☑ ' : '☐ ') + words(5) + '</div>';
      else if (r < 0.93) h += '<div><b>' + words(4) + '</b> <a href="https://example.org/' + ((rnd() * 1e5) | 0) + '">' + words(2) + '</a></div>';
      else if (r < 0.96) h += '<h2>' + words(3) + '</h2>';
      else h += '<span class="enx-media" contenteditable="false" data-enx-hash="' + ((rnd() * 1e12) | 0).toString(16) + '" data-mime="image/jpeg" data-name="">🖼 picture — arrives with the next import step</span>';
    }
    return h;
  };
  /* size: lognormal-ish around ~3 KB, 1% long tail 50–200 KB */
  const size = () => { const r = rnd(); if (r < 0.01) return 50000 + rnd() * 150000; const g = (rnd() + rnd() + rnd() - 1.5) * 1.6; return Math.max(150, Math.min(40000, 2200 * Math.exp(g))); };
  const now = new Date().toISOString(), Y10 = Date.now() - 10 * 365 * 864e5;
  const iso = (t) => new Date(t).toISOString();
  /* ordinary notebook: keep the default sections; 8 folders + 4 subfolders, 500 notes */
  const sec = DB.sections[0].id;
  DB.folders = DB.folders || [];
  const base = Math.max(0, ...DB.folders.filter((f) => !f.parentId).map((f) => f.order || 0));
  const plainF = [];
  for (let i = 0; i < 8; i++) { const f = { id: 'pf' + i, name: '(' + String(i + 1).padStart(3, '0') + ') Folder ' + i, parentId: null, order: base + i + 1, sectionId: sec, updatedAt: now }; DB.folders.push(f); plainF.push(f.id); }
  for (let i = 0; i < 4; i++) { const f = { id: 'pf' + i + 'c', name: 'Sub ' + i, parentId: 'pf' + i, order: 1, updatedAt: now }; DB.folders.push(f); plainF.push(f.id); }
  const kinds = ['general', 'idea', 'task', 'journal'];
  for (let i = 0; i < PLAIN; i++) {
    const c = Date.now() - rnd() * 3 * 365 * 864e5, u = c + rnd() * (Date.now() - c);
    DB.articles.push({ id: 'pn' + i, title: words(3 + ((rnd() * 4) | 0)).trim(), content: body(size()), folderIds: [plainF[(rnd() * plainF.length) | 0]], tags: rnd() < .3 ? ['own' + ((rnd() * 40) | 0)] : [], createdAt: iso(c), updatedAt: iso(u), kind: kinds[(rnd() * 4) | 0] });
  }
  /* Evernote: stacks + 40 notebooks with Zipf-like sizes */
  const stacks = ['', 'Work', 'Personal', 'Research', 'Archive', 'Travel', 'Recipes'];
  const nbs = []; let tot = 0;
  for (let i = 0; i < 40; i++) { const w = 1 / Math.pow(i + 1, 1.1); nbs.push({ name: 'Notebook ' + String.fromCharCode(65 + (i % 26)) + (i >= 26 ? '2' : '') + ' ' + words(1).trim(), stack: stacks[i % stacks.length], w }); tot += w; }
  const FIX = [0.215, 0.18, 0.168]; let wt = 0; nbs.slice(3).forEach((x) => { wt += x.w; });
  nbs.forEach((x, i) => { x.n = i < 3 ? Math.round(ENX * FIX[i]) : Math.max(3, Math.round(ENX * (1 - 0.563) * x.w / wt)); });
  let diff = ENX - nbs.reduce((s, n) => s + n.n, 0); nbs[0].n += diff;
  /* folders exactly as _enxImport's ensure() makes them */
  const at0 = Date.now() - 36 * 3600e3;
  const enxSec = (DB.sections.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).find((s) => s.name === 'My Notebooks') || DB.sections[0]);
  const fById = new Map(DB.folders.map((f) => [f.id, f])), kids = new Map();
  DB.folders.forEach((f) => { const p = f.parentId || ''; kids.set(p, (kids.get(p) || 0) + 1); });
  const ensure = (id, name, parentId, kind) => {
    if (fById.has(id)) return id;
    let order;
    if (parentId) { order = (kids.get(parentId) || 0) + 1; kids.set(parentId, order); }
    else order = 1 + Math.max(0, ...DB.folders.filter((f) => !f.parentId && (f.sectionId || null) === (enxSec ? enxSec.id : null)).map((f) => f.order || 0));
    const f = { id, name, parentId: parentId || null, order, enx: { kind, name }, updatedAt: iso(at0) };
    if (!parentId && enxSec) f.sectionId = enxSec.id;
    DB.folders.push(f); fById.set(id, f); return id;
  };
  const root = ensure('enx-root', 'Evernote', null, 'root');
  /* tags: 1,500 distinct, Zipf-ish use */
  const TAGS = []; for (let i = 0; i < 1500; i++) TAGS.push((words(1) + (i > 300 ? i : '')).trim() + (i % 7 === 0 ? ' ' + words(1).trim() : ''));
  const pickTag = () => TAGS[Math.min(1499, Math.floor(Math.pow(rnd(), 2.2) * 1500))];
  const used = new Set(); let n = 0, bytes = 0, big = [];
  for (const nb of nbs) {
    const ck = nb.stack + '\u0001' + nb.name;
    const par = nb.stack ? ensure(_enxId('enx-s-', nb.stack), nb.stack, root, 'stack') : root;
    const fid = ensure(_enxId('enx-b-', ck), nb.name, par, 'nb');
    nb.fid = fid;
    for (let i = 0; i < nb.n; i++, n++) {
      const sz = size(), content = body(sz); bytes += content.length; if (content.length > 140000 && big.length < 3) big.push('?');
      const cr = Y10 + rnd() * (Date.now() - Y10 - 864e5 * 3), up = cr + rnd() * Math.min(864e5 * 700, Date.now() - 864e5 * 3 - cr);
      const title = (words(2 + ((rnd() * 6) | 0)).trim() || 'Untitled (Evernote)');
      const sec = Math.floor(cr / 1000), k = nb.stack + '/' + nb.name + '\u0001' + sec + '\u0001' + title.toLowerCase() + '\u0001' + content.length;
      const tags = []; const nt = rnd() < .35 ? 0 : 1 + ((rnd() * 4) | 0); for (let t = 0; t < nt; t++) { const g = pickTag(); if (!tags.includes(g)) { tags.push(g); used.add(g); } }
      const ati = iso(at0 + (n / ENX) * 30 * 3600e3);
      DB.articles.push({ id: _enxId('enx-n-', k), title, content, folderIds: [fid], tags, createdAt: iso(cr * 1 - (cr % 1000)), updatedAt: iso(up - (up % 1000)), fromEvernote: { nb: nb.name, stack: nb.stack, k, at: ati } });
    }
  }
  const t = performance.now();
  persist();
  await _ljChain.catch(() => {});
  const persistMs = performance.now() - t;
  _ljCheckpoint(); await new Promise((r) => setTimeout(r, 50)); await _ljChain.catch(() => {});
  return { notes: DB.articles.length, folders: DB.folders.length, enxFolders: DB.folders.filter((f) => f.enx).length, distinctTags: used.size, contentMB: +(bytes / 1048576).toFixed(1), persistMs: Math.round(persistMs), biggestNb: nbs.slice(0, 4).map((x) => [x.name, x.n, x.fid]), jm: _ljWanted(), ljStat: _ljStat };
}, { ENX, PLAIN });
await page.waitForTimeout(3000);
const chk = await page.evaluate(() => ({ full: _ljStat.full, ckpt: _ljCkpt, seq: _ljSeq }));
console.log(JSON.stringify({ ...info, chk, errors: errors.slice(0, 5) }, null, 1));
await ctx.close(); await srv.close();
console.log('SEED_MS', Date.now() - T0);
