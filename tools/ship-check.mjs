/* ship-check — the things that make an update fail to REACH a device, or
   quietly lose the notebook. All static: no browser, about a second.
   Run it before every push. `node tools/ship-check.mjs` */

import { execSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, report, pngSize } from './harness.mjs';

const r = report('ship-check — version, data tag, service worker, manifest, legacy');
const html = await readFile(join(ROOT, 'index.html'), 'utf8');
const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');
const claudeMd = await readFile(join(ROOT, 'CLAUDE.md'), 'utf8');
const manifest = JSON.parse(await readFile(join(ROOT, 'manifest.json'), 'utf8'));
const exists = async (p) => { try { await stat(join(ROOT, p)); return true; } catch { return false; } };
/* maxBuffer matters: index.html is over 1 MB, and execSync's 1 MB default
   throws ENOBUFS on `git show`, which silently looked like "no origin/main". */
const git = (c) => { try { return execSync(c, { cwd: ROOT, maxBuffer: 64 << 20 }).toString(); } catch { return null; } };

/* ── 1. The version rule: one number, three places ─────────────────────── */
const meta = html.match(/<meta name="app-version" content="([^"]+)">/)?.[1];
const tag = html.match(/id="app-version-tag"[^>]*>\s*v([0-9.]+)</)?.[1];
const swv = sw.match(/const VERSION\s*=\s*'v([0-9.]+)'/)?.[1];

r.check(meta, 'index.html carries a <meta name="app-version">', meta ? `v${meta}` : 'tag missing');
r.check(tag === meta, '.sb-logo pre-boot tag matches the meta tag',
  tag === meta ? `both v${meta}` : `meta v${meta} vs sb-logo v${tag} — the old number paints for a frame`);
r.check(swv && swv.startsWith(meta + '.'), "sw.js VERSION is 'v<meta>.NN' — the cache name",
  swv && swv.startsWith(meta + '.') ? `v${swv}` : `sw.js has v${swv}, expected v${meta}.NN — devices keep serving the old build`);

/* CLAUDE.md's own "Current version" line went stale for two whole rounds
   (v04.63, v04.64 both left it reading v04.62) because nothing checked it.
   It is prose, not a source of truth, so this only ever compares it to the
   meta tag — never the other way round. */
const claudeV = claudeMd.match(/\*\*Current version: v([0-9.]+)\.\*\*/)?.[1];
r.check(claudeV === meta, "CLAUDE.md's \"Current version\" line matches the meta tag",
  claudeV === meta ? `both v${meta}` : `CLAUDE.md says v${claudeV}, meta tag says v${meta} — CLAUDE.md line 6 is stale`);

/* Every round bumps. A build identical in version to main has not shipped. */
const mainHtml = git('git show origin/main:index.html 2>/dev/null');
if (mainHtml) {
  const mainV = mainHtml.match(/<meta name="app-version" content="([^"]+)">/)?.[1];
  /* The standing rule is that EVERY round bumps — a docs- or tools-only
     round still ships a new number — so this compares the whole repo.
     `git diff` alone only sees tracked files: a round whose entire
     deliverable is a NEW file (a doc, a new tools/*.mjs, an icon) is
     invisible to it, so untracked files are unioned in via `git
     ls-files --others --exclude-standard` — which, like `git diff`,
     already respects .gitignore, so tools/shots/ and node_modules/
     stay invisible. */
  const trackedChanged = git('git diff --name-only origin/main')?.trim();
  const untracked = git('git ls-files --others --exclude-standard')?.trim();
  const changed = [trackedChanged, untracked].filter(Boolean).join('\n').trim();
  if (changed) r.check(meta !== mainV, 'version bumped past origin/main',
    meta !== mainV ? `v${mainV} → v${meta}` : `still v${meta} with changes in: ${changed.split('\n').join(', ')}`);
  else r.pass('version bumped past origin/main', 'tree is genuinely clean against origin/main — nothing to bump');
} else r.pass('version bumped past origin/main', 'skipped: no origin/main to compare against');

/* ── 2. The notebook data tag ──────────────────────────────────────────── */
const nd = html.match(/<script id="nd" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
let ndOk = false, ndDetail = 'tag missing entirely — Save File has nowhere to write';
if (nd) {
  try {
    const d = JSON.parse(nd);
    const missing = ['folders', 'articles', 'sections', 'trash'].filter((k) => !Array.isArray(d[k]));
    ndOk = missing.length === 0;
    ndDetail = ndOk
      ? `valid JSON, ${d.folders.length} folders / ${d.articles.length} notes`
      : `missing or non-array keys: ${missing.join(', ')}`;
  } catch (e) { ndDetail = `present but not valid JSON: ${e.message}`; }
}
r.check(ndOk, '<script id="nd"> is intact and parses', ndDetail);

/* ── 3. sw.js CORE is all-or-nothing ───────────────────────────────────── */
const core = [...(sw.match(/const CORE\s*=\s*\[([\s\S]*?)\];/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
r.check(core.length > 0, 'sw.js declares a CORE precache list', `${core.length} entries`);
const missingCore = [];
for (const p of core) {
  const rel = p.replace(/^\.\//, '').replace(/^\//, '') || 'index.html';
  if (!(await exists(rel))) missingCore.push(p);
}
r.check(missingCore.length === 0, 'every sw.js CORE path exists on disk',
  missingCore.length ? `missing: ${missingCore.join(', ')} — addAll() rejects and the WHOLE precache is silently skipped` : `all ${core.length} present`);

/* ── 4. Manifest icons: declared sizes must be the real pixels ─────────── */
const iconProblems = [];
for (const ic of manifest.icons ?? []) {
  const rel = ic.src.replace(/^\//, '');
  if (!(await exists(rel))) { iconProblems.push(`${ic.src} does not exist`); continue; }
  if (!rel.endsWith('.png')) continue;
  const real = pngSize(await readFile(join(ROOT, rel)));
  if (!real) { iconProblems.push(`${ic.src} is not a readable PNG`); continue; }
  if (ic.sizes !== `${real.w}x${real.h}`) iconProblems.push(`${ic.src} declares ${ic.sizes} but is really ${real.w}x${real.h} — Chrome drops it without saying so`);
}
r.check(iconProblems.length === 0, 'manifest icon sizes match the real pixels',
  iconProblems.length ? iconProblems.join('\n') : `${(manifest.icons ?? []).length} icons checked`);

const shotProblems = [];
for (const s of manifest.screenshots ?? []) {
  const rel = s.src.replace(/^\//, '');
  if (!(await exists(rel))) { shotProblems.push(`${s.src} does not exist`); continue; }
  const real = pngSize(await readFile(join(ROOT, rel)));
  if (real && s.sizes !== `${real.w}x${real.h}`) shotProblems.push(`${s.src} declares ${s.sizes}, really ${real.w}x${real.h}`);
}
r.check(shotProblems.length === 0, 'manifest screenshots exist at their declared sizes',
  shotProblems.length ? shotProblems.join('\n') : `${(manifest.screenshots ?? []).length} screenshots checked`);

/* index.html references icons too, and they 404 just as silently. */
const linked = [...html.matchAll(/<link[^>]+href="(\/icons\/[^"]+)"/g)].map((m) => m[1]);
const missingLinked = [];
for (const p of linked) if (!(await exists(p.replace(/^\//, '')))) missingLinked.push(p);
r.check(missingLinked.length === 0, 'every /icons/ path linked from index.html exists',
  missingLinked.length ? `missing: ${missingLinked.join(', ')}` : `${linked.length} links checked`);

/* ── 5. legacy/** is sealed ────────────────────────────────────────────── */
const legacyTouched = git('git diff --name-only origin/main -- legacy 2>/dev/null');
if (legacyTouched === null) r.pass('legacy/** untouched since origin/main', 'skipped: no origin/main to compare against');
else r.check(!legacyTouched.trim(), 'legacy/** untouched since origin/main',
  legacyTouched.trim() ? `EDITED: ${legacyTouched.trim().split('\n').join(', ')} — frozen builds are never changed` : 'clean');

/* ── 6. no live-page debris serialized into the source (v04.58) ─────────
   index.html was at some point saved from a RUNNING page's DOM, and two
   pieces of that session rode along for three weeks: Firebase's hidden
   auth iframes, a browser extension's widget root, and the tab picker
   ALREADY FILLED with real note titles from the owner's notebook — served
   publicly with the app. Every element involved is one the app creates on
   demand, so none of it belongs in the file. Nothing threw; only a reader
   found it. The patterns are the fingerprints of runtime-only markup, not
   of anything the source ever writes itself. */
const debris = [
  [/<iframe[^>]*ng-non-bindable/, 'a Google/Firebase auth iframe (injected at runtime)'],
  [/firebaseapp\.com\/__\/auth\/iframe/, 'a Firebase auth iframe URL'],
  [/id="id-recall-widget-root"/, "a browser extension's widget root"],
  [/addToTabPicker\('[a-z0-9]{6,}'\)/, 'a tab-picker row with a REAL note id (the source only ever writes ${a.id})'],
  /* v04.60 — v04.58 named the tab PICKER and missed the tab BAR beside it:
     the static #tab-bar still held two real note titles as rendered chips,
     and #ctx a real data-aid. The general fingerprint is any literal note
     id where the source only ever interpolates one. */
  [/data-(tid|aid)="[a-z0-9]{6,}"/, 'a data-tid/data-aid holding a REAL note id'],
  [/(tabSelect|pinTabToPanel|closeTabGroup|closeTab|openTabClrPicker)\('[a-z0-9]{6,}'\)|pinTabDStart\(event,'[a-z0-9]{6,}'\)/, 'a tab-bar chip calling a handler with a REAL note id'],
].filter(([re]) => re.test(html)).map(([, what]) => what);
r.check(debris.length === 0, 'index.html carries no markup captured from a running page',
  debris.length ? `found: ${debris.join('; ')}` : 'clean');

process.exit(r.finish() ? 1 : 0);
