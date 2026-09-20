/* audit-i-quality — Master Plan §4I: accessibility, security, privacy,
   performance at scale and PWA reliability.

   The audit of 2026-09-18 recorded "accessibility beyond colour is
   essentially unaddressed" as Finding 4 and left it. This file MEASURES it,
   so the size of the gap is a number rather than a sentence, and so the part
   that gets fixed can be told from the part that does not.

   Run: node tools/audit-i-quality.mjs */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, openApp, matrix, seedDB, synthDB, MALFORMED, VIEWPORTS } from './harness.mjs';

const m = matrix('audit I — accessibility, security, privacy, scale, PWA');
const A = 'I accessibility';
const S = 'I security/privacy';
const P = 'I performance/PWA';
async function section(dom, name, fn) {
  try { await fn(); } catch (e) { m.row(dom, `${name} — the check itself threw`, false, String(e).split('\n')[0]); }
}

/* ── S1. The paste / import sanitisation policy ─────────────────────────
   CLAUDE.md is explicit: "note content is raw HTML with no sanitiser", and
   interactive widgets live inside notes. That is a decision about what the
   OWNER writes, and this round did not change it. It was never a decision
   about HTML arriving from somewhere else, and the two doors that let
   foreign markup in — an imported file and a paste from a web page — had
   nothing on them. So the policy is a BOUNDARY, and that is what is measured
   here: what arrives through a door, not what is already in the room. */
await section(S, 'script execution from untrusted content', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  const hostile = Object.values(MALFORMED).join('');

  /* (a) through the IMPORT door */
  const imported = await p.evaluate((h) => {
    const file = { sections: [], folders: [], trash: [],
      articles: [{ id: 'imp', title: 'Imported', content: h, folderIds: [], tags: [], kind: 'general',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] };
    const r = _repairDB(JSON.parse(JSON.stringify(file)), 'imported');
    const c = r.db.articles[0].content;
    return { cleaned: c, fixes: r.fixes,
      hasHandler: /\son[a-z]+\s*=/i.test(c), hasScript: /<script/i.test(c),
      hasJsUrl: /javascript\s*:/i.test(c), hasForeignIframe: /<iframe/i.test(c),
      keptText: c.includes('before') && c.includes('after') && c.includes('deep') };
  }, hostile);
  m.row(S, 'an imported file has its inline event handlers stripped', !imported.hasHandler,
    imported.hasHandler ? 'AN on*= HANDLER SURVIVED THE IMPORT' : (imported.fixes || []).join(', ') || 'clean');
  m.row(S, 'an imported file has its <script> tags stripped', !imported.hasScript);
  m.row(S, 'an imported file has its javascript: URLs stripped', !imported.hasJsUrl);
  m.row(S, 'an imported file has its foreign <iframe> removed', !imported.hasForeignIframe);
  m.row(S, 'sanitising an import keeps the TEXT — it cleans, it does not drop content (I1)',
    imported.keptText, imported.keptText ? 'all three marker strings survived' : 'CONTENT LOST by the sanitiser');

  /* (b) the app's own embeds must survive, or the cure is worse */
  const embed = await p.evaluate(() => {
    const good = '<div class="embed-wrap"><iframe src="https://www.youtube.com/embed/abc"></iframe></div>'
      + '<div contenteditable="false" class="widget">chrome</div><h2>A heading</h2>';
    const out = _sanitiseForeignHTML(good);
    return { keptEmbed: /youtube\.com\/embed/.test(out), keptWidget: /contenteditable="false"/.test(out),
      keptHeading: /<h2/.test(out) };
  });
  m.row(S, 'a note\'s own video embed survives the sanitiser', embed.keptEmbed);
  m.row(S, 'contenteditable="false" widget chrome survives the sanitiser', embed.keptWidget);
  m.row(S, 'headings and structure survive the sanitiser', embed.keptHeading);

  /* (c) through the PASTE door — a real paste, with real clipboard HTML */
  await p.evaluate(() => { selArt('a1'); startEdit(); });
  await p.waitForTimeout(500);
  const ed = await p.$('#ed');
  if (ed) {
    await ed.click();
    await p.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/html', '<p>pasted text</p><img src="x" onerror="window.__XSS_PASTE=1">');
      dt.setData('text/plain', 'pasted text');
      document.getElementById('ed').dispatchEvent(new ClipboardEvent('paste',
        { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await p.waitForTimeout(900);
    const pasted = await p.evaluate(() => ({ fired: !!window.__XSS_PASTE,
      html: document.getElementById('ed')?.innerHTML || '' }));
    m.row(S, 'a paste carrying an inline handler does not leave that handler in the note',
      !/\son[a-z]+\s*=/i.test(pasted.html),
      /\son[a-z]+\s*=/i.test(pasted.html) ? 'HANDLER SAVED INTO THE NOTE' : 'stripped on the way in');
    m.row(S, 'a paste carrying an inline handler keeps the text that came with it (I1)',
      /pasted text/.test(pasted.html), 'the pasted words are present');
  } else m.row(S, 'a paste carrying an inline handler is sanitised', false, 'no editor to paste into');

  /* (d) the DELIBERATE half, asserted so it cannot change by accident */
  const db2 = seedDB(); db2.articles[0].content = hostile;
  const app2 = await openApp({ db: db2 });
  await app2.page.evaluate(() => { selArt('a1'); renderP3C(); });
  await app2.page.waitForTimeout(700);
  const raw = await app2.page.evaluate(() => ({ painted: (document.getElementById('p3c').innerText || '').length,
    scriptRan: !!window.__XSS_RAN }));
  m.row(S, 'content ALREADY in the notebook still renders raw, which is the decision CLAUDE.md records',
    raw.painted > 0, `${raw.painted} chars painted — widgets and saved notes are untouched by the boundary policy`);
  m.row(S, '…and even then a <script> in stored content never executes', !raw.scriptRan);
  await app2.close();
  await app.close();
});

/* ── S2. External links and embeds ──────────────────────────────────────── */
await section(S, 'external links and embeds', async () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const blanks = [...html.matchAll(/<a\b[^>]*target\s*=\s*["']_blank["'][^>]*>/gi)].map((x) => x[0]);
  const unsafe = blanks.filter((t) => !/rel\s*=\s*["'][^"']*noopener/i.test(t));
  m.row(S, `every target="_blank" link in the shipped markup carries rel="noopener" (${blanks.length} links)`,
    unsafe.length === 0, unsafe.length ? unsafe.slice(0, 3).join('\n') : 'all safe');
  /* a link the OWNER pastes into a note is the larger surface */
  const app = await openApp({ db: (() => { const d = seedDB();
    d.articles[0].content = MALFORMED.blankNoRel + MALFORMED.jsHref; return d; })() });
  await app.page.evaluate(() => { selArt('a1'); renderP3C(); });
  await app.page.waitForTimeout(400);
  const links = await app.page.evaluate(() => [...document.querySelectorAll('#p3c a')]
    .map((a) => ({ href: a.getAttribute('href') || '', target: a.getAttribute('target') || '', rel: a.getAttribute('rel') || '' })));
  const risky = links.filter((l) => l.target === '_blank' && !/noopener/.test(l.rel));
  const js = links.filter((l) => /^javascript:/i.test(l.href));
  m.row(S, 'a target="_blank" link pasted into a NOTE is given rel="noopener"',
    risky.length === 0, risky.length ? `${risky.length} link(s) can reach window.opener: ${JSON.stringify(risky[0])}` : `${links.length} links checked`);
  m.row(S, 'a javascript: link pasted into a note is neutralised', js.length === 0,
    js.length ? `javascript: href survives in note content: ${js[0].href}` : 'none present');
  await app.close();
});

/* ── S3. Nothing private anywhere in the repository ─────────────────────── */
await section(S, 'repository privacy scan', async () => {
  const skip = new Set(['.git', 'node_modules', 'shots']);
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      if (skip.has(e)) continue;
      const full = join(dir, e);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(html|js|mjs|json|md|txt)$/.test(e)) files.push(full);
    }
  })(ROOT);
  /* Patterns for things that must never be committed. `legacy/**` is
     reported SEPARATELY: it is sealed (I6) and its residue is owner
     Decision 1, so folding it into one number would hide which half is
     actionable and which half is waiting on a person. */
  const PAT = [
    [/AIza[0-9A-Za-z_\-]{30,}/g, 'a Google API key'],
    [/firebaseapp\.com\/__\/auth/g, 'a Google sign-in iframe'],
    [/\bnotebookId\s*[:=]\s*["'][A-Za-z0-9_\-]{8,}["']/g, 'a hard-coded notebook id'],
    [/id="tab-picker"[^>]*>\s*<[^>]/g, 'a serialised tab picker (holds real note titles)'],
    [/id="id-recall-widget-root"/g, 'a browser extension\'s widget'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/g, 'a private key'],
  ];
  const live = [], sealed = [];
  for (const f of files) {
    const rel = relative(ROOT, f);
    const txt = readFileSync(f, 'utf8');
    for (const [rx, what] of PAT) {
      const n = (txt.match(rx) || []).length;
      if (!n) continue;
      /* Only a SHIPPED artifact can leak. The audit's evidence files quote
         the residue on purpose, the changelog names it in prose, and
         app-check and this file both carry the patterns they hunt for — all
         four read as a leak to a plain grep and none of them is one. */
      if (!/^(index\.html|sw\.js|manifest\.json|legacy\/)/.test(rel)) continue;
      (rel.startsWith('legacy/') ? sealed : live).push(`${rel}: ${n} × ${what}`);
    }
  }
  m.row(S, `no shipped artifact carries private residue (${files.length} files scanned, shipped ones judged)`,
    live.length === 0, live.length ? live.join('\n') : 'clean');
  if (sealed.length) {
    m.blockedOwner(S, 'the sealed legacy/v03.99/ build still carries private residue at a public URL',
      sealed.join('\n') + '\n→ owner Decision 1. I6 seals legacy/** absolutely; this session did not touch it.');
  } else {
    m.row(S, 'the sealed legacy build carries no private residue', true, 'clean');
  }
});

/* ── A1. Accessible names on everything that can be operated ────────────
   Not a list of elements: a SWEEP. Every control a person can reach, asked
   whether a screen reader could say what it is. An icon-only button with no
   name is a button that announces as "button". */
await section(A, 'accessible names', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  /* open the surfaces first — a closed menu is display:none and contributes
     nothing, which is how a sweep reports clean on what it cannot see */
  await p.evaluate(() => { try { selArt('a1'); } catch {} });
  await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const vis = (el) => { const cs = getComputedStyle(el); const rc = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && rc.width > 0 && rc.height > 0; };
    const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('title')
      || (el.getAttribute('aria-labelledby') ? (document.getElementById(el.getAttribute('aria-labelledby'))?.textContent || '') : '')
      || el.textContent || '').trim();
    /* a name made only of emoji says nothing a screen reader can read out */
    const wordy = (s) => /[A-Za-zঀ-৿؀-ۿ0-9]/.test(s);
    const sel = 'button, [role="button"], a[href], input, select, textarea, [onclick]';
    const all = [...document.querySelectorAll(sel)].filter(vis);
    const bad = all.filter((el) => !wordy(name(el)));
    return { total: all.length, bad: bad.length,
      sample: bad.slice(0, 8).map((el) => (el.id ? '#' + el.id : el.className ? '.' + String(el.className).split(' ')[0] : el.tagName)
        + ' “' + (el.textContent || '').trim().slice(0, 12) + '”') };
  });
  m.row(A, `every visible control has a name a screen reader can read (${r.total} controls on the landing view)`,
    r.bad === 0, r.bad ? `${r.bad} of ${r.total} announce as nothing but their shape: ${r.sample.join(', ')}` : 'all named');
  /* landmarks and a document language */
  const doc = await p.evaluate(() => ({
    lang: document.documentElement.getAttribute('lang') || '',
    landmarks: document.querySelectorAll('main, nav, [role="main"], [role="navigation"], header, aside').length,
    h1: document.querySelectorAll('h1').length,
    title: document.title,
  }));
  m.row(A, 'the document declares a language', !!doc.lang, `lang="${doc.lang}"`);
  m.row(A, 'the app exposes landmark regions a screen reader can jump between', doc.landmarks > 0,
    `${doc.landmarks} landmark elements`);
  m.row(A, 'the document has a title', !!doc.title, JSON.stringify(doc.title));
  await app.close();
});

/* ── A2. Keyboard: can a core journey be completed without a mouse? ─────── */
await section(A, 'keyboard operability', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  const reach = await p.evaluate(() => {
    const vis = (el) => { const cs = getComputedStyle(el); const rc = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && rc.width > 0 && rc.height > 0; };
    const controls = [...document.querySelectorAll('button, a[href], input, select, textarea, [onclick], [role="button"]')].filter(vis);
    const focusable = controls.filter((el) => {
      if (el.matches('button, a[href], input, select, textarea')) return !el.disabled;
      const ti = el.getAttribute('tabindex');
      return ti !== null && Number(ti) >= 0;
    });
    return { total: controls.length, focusable: focusable.length,
      unreachable: controls.length - focusable.length,
      sample: controls.filter((el) => !focusable.includes(el)).slice(0, 8)
        .map((el) => (el.id ? '#' + el.id : '.' + String(el.className || el.tagName).split(' ')[0])) };
  });
  m.row(A, `every visible control can be reached with the Tab key (${reach.total} controls)`,
    reach.unreachable === 0,
    reach.unreachable ? `${reach.unreachable} can only be reached with a mouse: ${reach.sample.join(', ')}` : 'all focusable');

  /* Tab really moves, and focus is visible */
  await p.keyboard.press('Tab');
  const first = await p.evaluate(() => { const el = document.activeElement;
    return { tag: el?.tagName, id: el?.id, isBody: el === document.body,
      outline: el ? getComputedStyle(el).outlineStyle : null }; });
  m.row(A, 'pressing Tab moves focus off the body', !first.isBody, `${first.tag}${first.id ? '#' + first.id : ''}`);
  await app.close();
});

/* ── A3. A dialog must trap focus and give it back ──────────────────────── */
await section(A, 'dialog focus', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  /* Focus is moved on a timer, so asking for it in the same tick reads the
     element that was focused BEFORE the dialog opened — which looks exactly
     like "focus never entered the dialog". */
  await p.evaluate(() => { document.getElementById('sq')?.focus(); openReminderModal('a1'); });
  await p.waitForTimeout(350);
  const r = await p.evaluate(() => {
    const modal = document.getElementById('rem-modal');
    const out = { open: modal && getComputedStyle(modal).display !== 'none',
      focusInside: !!(modal && modal.contains(document.activeElement)),
      hasRole: !!(modal && (modal.getAttribute('role') === 'dialog' || modal.getAttribute('aria-modal') === 'true')) };
    closeReminderModal();
    return out;
  });
  await p.waitForTimeout(250);
  const back = await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  m.row(A, 'closing a dialog gives focus back to where it came from', back === 'sq', `focus returned to ${back}`);
  m.row(A, 'the reminder dialog opens', r.open);
  m.row(A, 'opening a dialog moves focus into it', r.focusInside,
    r.focusInside ? 'focus is inside the dialog' : 'focus stays behind the dialog — a keyboard user is tabbing through the page underneath');
  m.row(A, 'a dialog announces itself as a dialog', r.hasRole,
    r.hasRole ? 'role="dialog" / aria-modal present' : 'no role="dialog" or aria-modal — a screen reader does not announce it as a dialog');
  await app.close();
});

/* ── A4. Touch targets and 200% zoom ────────────────────────────────────── */
await section(A, 'touch targets and zoom', async () => {
  for (const vp of VIEWPORTS) {
    const app = await openApp({ viewport: { width: vp.width, height: vp.height }, db: seedDB() });
    const r = await app.page.evaluate((isPhone) => {
      const vis = (el) => { const cs = getComputedStyle(el); const rc = el.getBoundingClientRect();
        return cs.display !== 'none' && cs.visibility !== 'hidden' && rc.width > 0 && rc.height > 0; };
      const ctrls = [...document.querySelectorAll('button, [role="button"], a[href]')].filter(vis);
      /* Three named exceptions, each with a reason recorded in the
         stylesheet beside the rule that raises everything else. A blanket
         pass would hide the next small target; naming them keeps the check
         sharp. */
      const EXEMPT = (el) => el.id === 'sb-toggle'           /* the sidebar's own drag grip — its width IS the divider */
        || el.classList.contains('ac-badge');                 /* ⭐/📌 markers ON a full-width row that is itself the target */
      const small = ctrls.filter((el) => { const r2 = el.getBoundingClientRect();
        return !EXEMPT(el) && (r2.width < 24 || r2.height < 24); });
      return { total: ctrls.length, small: small.length,
        sample: small.slice(0, 6).map((el) => { const r2 = el.getBoundingClientRect();
          return (el.id ? '#' + el.id : '.' + String(el.className).split(' ')[0]) + ` ${Math.round(r2.width)}×${Math.round(r2.height)}`; }) };
    }, vp.name === 'phone');
    m.row(A, `${vp.name}: no visible control is smaller than 24×24 (WCAG 2.2 SC 2.5.8, two named exceptions)`,
      r.small === 0, r.small ? `${r.small} of ${r.total} below 24px: ${r.sample.join(', ')}` : `${r.total} controls`,
      { viewport: vp.name });
    await app.close();
  }
  /* 200% zoom is a 50% viewport at the same CSS pixel count */
  const app = await openApp({ viewport: { width: 640, height: 480 }, db: seedDB() });
  const z = await app.page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';   /* 200% of the 16px default */
    const de = document.documentElement;
    return { overflow: de.scrollWidth - de.clientWidth, body: (document.body.innerText || '').length };
  });
  m.row(A, 'at 200% text size nothing is pushed off the side of the screen',
    z.overflow <= 1, `${z.overflow}px of sideways scroll`);
  await app.close();
});

/* ── P1. Performance at 500 / 2,000 / 10,000 notes ──────────────────────── */
await section(P, 'scale', async () => {
  const BUDGET = { render: 2500, search: 1500, persist: 2500, merge: 4000 };
  for (const notes of [500, 2000, 10000]) {
    const db = synthDB({ notes, folders: Math.min(200, Math.max(20, notes / 25)), seed: 13 });
    const t0 = Date.now();
    const app = await openApp({ db });
    const bootMs = Date.now() - t0;
    const r = await app.page.evaluate(() => {
      const t = (fn) => { const s = performance.now(); try { fn(); } catch (e) { return { ms: -1, err: String(e) }; } return { ms: Math.round(performance.now() - s) }; };
      const out = {};
      out.render = t(() => render());
      out.search = t(() => { doSearch('Synthetic note 4242'); doSearch(''); });
      out.persist = t(() => persist());
      const copy = JSON.parse(JSON.stringify(DB));
      out.merge = t(() => mergeDB(DB, copy));
      out.export = t(() => getExportHTML(JSON.stringify({ folders: [], articles: [], sections: [], trash: [] })));
      out.n = DB.articles.length;
      return out;
    });
    const over = Object.entries(BUDGET).filter(([k, v]) => r[k] && r[k].ms > v);
    const errs = Object.entries(r).filter(([, v]) => v && v.err);
    m.row(P, `${notes.toLocaleString()} notes: render, search, persist, merge and export all complete`,
      errs.length === 0, errs.length ? errs.map(([k, v]) => `${k}: ${v.err}`).join('\n')
        : `boot ${bootMs}ms · render ${r.render.ms}ms · search ${r.search.ms}ms · persist ${r.persist.ms}ms · merge ${r.merge.ms}ms · export ${r.export.ms}ms`);
    m.row(P, `${notes.toLocaleString()} notes: every measured operation is inside its budget`,
      over.length === 0, over.length ? over.map(([k]) => `${k} ${r[k].ms}ms > ${BUDGET[k]}ms`).join(', ')
        : `budgets: render ≤${BUDGET.render} search ≤${BUDGET.search} persist ≤${BUDGET.persist} merge ≤${BUDGET.merge}`);
    await app.close();
  }
});

/* ── P2. Memory across repeated pop-out cycles ──────────────────────────── */
await section(P, 'memory', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  const before = await p.evaluate(() => ({ nodes: document.getElementsByTagName('*').length }));
  for (let i = 0; i < 25; i++) {
    await p.evaluate(() => { popOutNote('a1'); });
    await p.waitForTimeout(40);
    await p.evaluate(() => { closeAllPopouts(); });
    await p.waitForTimeout(40);
  }
  const after = await p.evaluate(() => ({ nodes: document.getElementsByTagName('*').length,
    floats: document.querySelectorAll('.float-win').length }));
  m.row(P, '25 open/close pop-out cycles leave no windows behind', after.floats === 0, `${after.floats} float windows`);
  m.row(P, '25 open/close pop-out cycles do not grow the DOM without bound',
    after.nodes - before.nodes < 200, `${before.nodes} → ${after.nodes} nodes`);
  m.row(P, '25 open/close pop-out cycles are silent', app.errors.length === 0, app.errors.slice(0, 2).join('\n') || 'silent');
  await app.close();
});

/* ── P3. The PWA update path (I3) ───────────────────────────────────────── */
await section(P, 'PWA and offline', async () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const v = (html.match(/name="app-version" content="([\d.]+)"/) || [])[1];
  const cache = (sw.match(/const VERSION\s*=\s*'([^']+)'/) || [])[1];
  m.row(P, 'the service-worker cache name carries this build\'s version, so an update reaches the device (I3)',
    cache && cache.startsWith('v' + v + '.'), `app v${v}, cache ${cache}`);
  m.row(P, 'old caches are deleted on activate, so a device does not accumulate every build',
    /caches\.keys\(\)/.test(sw) && /caches\.delete/.test(sw), 'keys() + delete() present');
  m.row(P, 'the service worker claims open clients, so the new build applies without a second reload',
    /clients\.claim\(\)/.test(sw), 'clients.claim() present');
  m.row(P, 'a navigation falls back to the cache when the network is gone (I3)',
    /catch/.test(sw) && /caches\.match/.test(sw), 'caches.match in a catch path');
  /* I4 — a downloaded copy with no /icons/ and no network */
  const app = await openApp({ db: seedDB() });
  const exported = await app.page.evaluate(() => getExportHTML());
  await app.close();
  const refs = [...exported.matchAll(/(?:src|href)\s*=\s*["'](?!data:|#|https?:|\/\/)([^"']+)["']/g)].map((x) => x[1]);
  const hardDeps = refs.filter((u) => /\.(js|css)$/.test(u));
  m.row(P, 'a downloaded copy needs no local .js or .css file beside it to open (I4)',
    hardDeps.length === 0, hardDeps.length ? `needs: ${[...new Set(hardDeps)].join(', ')}` : `${refs.length} relative refs, none of them code`);
  m.row(P, 'a downloaded copy still carries its own data tag (I4, I7)',
    /<script id="nd"/.test(exported), 'script#nd present');
});

writeFileSync(join(ROOT, 'audit', 'inventory', 'matrix-i.json'), JSON.stringify(m.rows, null, 1));
process.exit(m.finish() ? 1 : 0);
