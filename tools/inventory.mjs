/* tools/inventory.mjs — the Function Inventory and Feature Coverage Matrix,
   generated MECHANICALLY from index.html so it cannot drift from the app.

   Not a test. It asserts nothing. It answers "what is there", which is the
   question every matrix row in the Master Plan (2026-09-19 §3, §5) starts from,
   and it is re-runnable, so the inventory is never a hand-written list going
   stale the week after it was written.

   Writes:
     audit/inventory/functions.json   every application-defined function
     audit/inventory/controls.json    every inline on* handler and what it calls
     audit/inventory/FUNCTION-INVENTORY.md
     audit/inventory/summary.json     the counts the reports quote

   Run:  node tools/inventory.mjs
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';

const SRC = readFileSync(join(ROOT, 'index.html'), 'utf8');

/* ---------- 1. isolate the application's own inline <script> ------------- */
/* The file has four other <script> tags: #nd (JSON), and three Firebase CDN
   <script src>. The app is the one inline block with no src and no type. */
const OPEN = SRC.indexOf('\n<script>\n');
const CLOSE = SRC.lastIndexOf('\n</script>');
if (OPEN < 0 || CLOSE < OPEN) { console.error('could not isolate the app script'); process.exit(1); }
const JS = SRC.slice(OPEN + 10, CLOSE);
const JS_LINE0 = SRC.slice(0, OPEN + 10).split('\n').length;   /* 1-based line of JS[0] */

/* ---------- 2. a scanner that knows what is CODE and what is not ---------
   Brace counting is the only way to get a function's real extent, and a naive
   counter is wrong the moment a `}` appears inside a string, a template
   literal, a comment or a regex — all four of which this file is full of
   (it builds most of its HTML from template literals). So: one pass that
   classifies every character, and everything downstream reads the mask.      */
function maskCode(s) {
  const m = new Uint8Array(s.length);      /* 1 = real code, 0 = literal/comment */
  let i = 0;
  const tmplStack = [];                    /* brace depth at each ${ we are inside */
  let depth = 0;
  while (i < s.length) {
    const c = s[i], d = s[i + 1];
    if (c === '/' && d === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < s.length && s[i] !== q) { if (s[i] === '\\') i++; i++; }
      i++; continue;
    }
    if (c === '`') {
      i++;
      while (i < s.length) {
        if (s[i] === '\\') { i += 2; continue; }
        if (s[i] === '`') { i++; break; }
        if (s[i] === '$' && s[i + 1] === '{') {       /* ${ ... } IS code */
          m[i] = 0; m[i + 1] = 0; i += 2;
          tmplStack.push(depth);
          let sub = 0;
          while (i < s.length) {
            /* recurse by hand: mark code, stop at the matching } */
            const cc = s[i], dd = s[i + 1];
            if (cc === '/' && dd === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
            if (cc === '/' && dd === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
            if (cc === '"' || cc === "'" || cc === '`') {
              const q2 = cc; i++;
              if (q2 === '`') { let td = 0; while (i < s.length) { if (s[i] === '\\') { i += 2; continue; } if (s[i] === '{' ) td++; if (s[i] === '`' && td === 0) { i++; break; } if (s[i] === '}' && td > 0) td--; i++; } }
              else { while (i < s.length && s[i] !== q2) { if (s[i] === '\\') i++; i++; } i++; }
              continue;
            }
            if (cc === '{') sub++;
            if (cc === '}') { if (sub === 0) { i++; break; } sub--; }
            m[i] = 1; i++;
          }
          tmplStack.pop();
          continue;
        }
        i++;
      }
      continue;
    }
    if (c === '{') depth++;
    if (c === '}') depth--;
    m[i] = 1; i++;
  }
  return m;
}
const MASK = maskCode(JS);

/* extent of a function body, starting just after its parameter list.
   An arrow may have NO braces — `const inEd = n => !!(n && ed.contains(n))` —
   and reaching for the next `{` then swallows hundreds of lines, which is how
   the first cut of this tool reported four live helpers as dead code: their
   only caller sat on the very next line, inside the bogus body. */
function bodyEnd(from) {
  let i = from;
  while (i < JS.length && (!MASK[i] || /\s/.test(JS[i]))) i++;
  if (JS[i] === '{') {
    let depth = 0;
    for (; i < JS.length; i++) {
      if (!MASK[i]) continue;
      if (JS[i] === '{') depth++;
      else if (JS[i] === '}') { depth--; if (depth === 0) return i; }
    }
    return -1;
  }
  /* expression body: to the first `;` or newline at depth 0 */
  let d = 0;
  for (; i < JS.length; i++) {
    if (!MASK[i]) continue;
    const c = JS[i];
    if ('([{'.includes(c)) d++;
    else if (')]}'.includes(c)) { if (d === 0) return i - 1; d--; }
    else if (d === 0 && (c === ';' || c === '\n')) return i - 1;
  }
  return -1;
}
const lineAt = (idx) => JS_LINE0 + JS.slice(0, idx).split('\n').length - 1;

/* ---------- 3. every application-defined function ------------------------ */
const decls = [];
const seen = new Set();
const RX_FN = /(^|\n)[ \t]*(async[ \t]+)?function[ \t]+([A-Za-z_$][\w$]*)[ \t]*\(/g;
const RX_ASSIGN = /(^|\n)[ \t]*(?:const|let|var)[ \t]+([A-Za-z_$][\w$]*)[ \t]*=[ \t]*(?:async[ \t]*)?(?:function[ \t]*\(|\([^)]*\)[ \t]*=>|[A-Za-z_$][\w$]*[ \t]*=>)/g;
for (const [rx, gi] of [[RX_FN, 3], [RX_ASSIGN, 2]]) {
  let mm;
  while ((mm = rx.exec(JS))) {
    const at = mm.index + mm[1].length;
    if (!MASK[at]) continue;                         /* inside a template literal */
    const name = mm[gi];
    const start = at;
    /* for `function name(` / `function(` the params are still unread, so walk
       the parameter list first; for `=>` the match already consumed it */
    let after = mm.index + mm[0].length;
    if (mm[0].endsWith('(')) {
      let d = 1;
      while (after < JS.length && d > 0) { if (MASK[after]) { if (JS[after] === '(') d++; else if (JS[after] === ')') d--; } after++; }
    }
    const end = bodyEnd(after);
    if (end < 0) continue;
    const key = name + '@' + start;
    if (seen.has(key)) continue; seen.add(key);
    decls.push({ name, start, end, line: lineAt(start), body: JS.slice(start, end + 1) });
  }
}
decls.sort((a, b) => a.start - b.start);

/* ---------- 4. classify each one ----------------------------------------- */
const DOMAIN = [
  [/^(boot|loadDB|migrate|_mig|hydrate|initApp)/i, 'startup / load / migration'],
  [/^(render|_render|draw|paint|refresh)/i, 'render'],
  [/^(persist|snapshotState|_save|saveArt|_edCommit|_edTouched|autosave|_autosave)/i, 'persistence'],
  [/(export|import|backup|deploy|saveFile|getExportHTML|_cleanExport|_snapshotShell)/i, 'export / import / backup'],
  [/(merge|tombstone|stamp|_sync|cloud|firestore|firebase|signIn|signOut|initAuth|chunk)/i, 'cloud sync / auth'],
  [/^(_ed|ed[A-Z]|insertAtCaret|_edit|startEdit|stopEdit|_fw|popOutNote|openNotePopup)/, 'editor / pop-out'],
  [/(folder|section|group|tree|assign)/i, 'organisation'],
  [/(tag|kind|nti|type|favourite|fav|archive|pin|tab)/i, 'tags / types / tabs'],
  [/(search|smart|sf|filter|query)/i, 'find / smart views'],
  [/(cal|journal|contact|database|db[A-Z]|record|report)/i, 'calendar / journal / contacts / database'],
  [/(remind|rem[A-Z]|muraja|practice|revise|review)/i, 'reminders / review'],
  [/(trash|delete|del[A-Z]|remove|purge|wipe|restore)/i, 'destructive'],
  [/(theme|colour|color|preset|ink|contrast|appearance)/i, 'theme / appearance'],
  [/(modal|dialog|menu|ctx|pop|picker|toast|sheet|overlay|palette|card)/i, 'menus / dialogs'],
];
function domainOf(n) { for (const [rx, d] of DOMAIN) if (rx.test(n)) return d; return 'other / helpers'; }

const MUT = /\b(DB\.(articles|folders|sections|trash|theme|tabs)|DB\s*=)/;
const PERSIST = /\bpersist\s*\(|\blocalStorage\.(setItem|removeItem|clear)|\b_save\s*\(/;
const NET = /\bfetch\s*\(|firebase|firestore|XMLHttpRequest|navigator\.serviceWorker/;
const DOMW = /\b(document|window)\.|innerHTML|appendChild|remove\(\)|classList/;
const DESTRUCT = /\bsplice\s*\(|\bdelete\s+|DB\s*=\s*|\.length\s*=\s*0|removeItem|\bclear\s*\(\)/;
const PRIVACY = /getExportHTML|_cleanExportRoot|_snapshotShell|notebookId|apiKey|uid|export|download/i;

const functions = decls.map((f) => {
  /* callers: every other place the bare name is written as a call, in code */
  /* A reference is not always a call: `addEventListener('mousemove', _drag)`
     passes the name bare, and counting only `name(` reported 65 live drag and
     resize handlers as dead code. Count CALLS and BARE references separately. */
  const esc0 = f.name.replace(/\$/g, '\\$');
  let callers = 0, refs = 0, mm;
  const rxCall = new RegExp('\\b' + esc0 + '\\s*\\(', 'g');
  while ((mm = rxCall.exec(JS))) { if (MASK[mm.index] && (mm.index < f.start || mm.index > f.end)) callers++; }
  const rxRef = new RegExp('(?<![\\w$.])' + esc0 + '(?![\\w$])', 'g');
  while ((mm = rxRef.exec(JS))) { if (MASK[mm.index] && (mm.index < f.start || mm.index > f.end)) refs++; }
  /* markup handlers live inside template literals, which MASK excludes */
  const inHandlers = [...SRC.matchAll(new RegExp('\\b' + esc0 + '\\s*\\(', 'g'))].length - (callers + 1);
  /* a handler name can be COMPOSED rather than written:
     onclick="${cond?'removeFolderPin':'setFolderPin'}('${fid}')" — the name and
     its `(` never touch, so no call-shaped search can see it. This is also a
     risk class in its own right: app-check's handler scan cannot resolve it. */
  const byName = [...SRC.matchAll(new RegExp("['\"]" + esc0 + "['\"]", 'g'))].length;
  return {
    name: f.name, line: f.line, lines: f.body.split('\n').length,
    domain: domainOf(f.name),
    mutatesModel: MUT.test(f.body), persists: PERSIST.test(f.body),
    network: NET.test(f.body), touchesDOM: DOMW.test(f.body),
    destructive: DESTRUCT.test(f.body) && MUT.test(f.body),
    privacySensitive: PRIVACY.test(f.name) || /getExportHTML|_snapshotShell|_cleanExportRoot/.test(f.body),
    callersInScript: callers,
    bareRefsInScript: refs,
    referencedInMarkup: inHandlers > 0,
    namedAsString: byName > 0,
    reachable: callers > 0 || refs > 0 || inHandlers > 0 || byName > 0,
  };
});

/* ---------- 5. every inline on* handler in the markup -------------------- */
/* This is the app's dominant wiring style: 400+ of them, written inside
   template literals, so they are invisible to any JS-only analysis. */
const controls = [];
const RX_ON = /\bon(click|change|input|submit|keydown|keyup|keypress|contextmenu|focus|blur|dblclick|mousedown|mouseup|mouseover|mouseenter|touchstart|dragstart|dragover|drop|dragend|paste|wheel|pointerdown|load|error)\s*=\s*(["'])([\s\S]*?)\2/g;
let m2;
while ((m2 = RX_ON.exec(SRC))) {
  const code = m2[3];
  const called = [...code.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)].map((x) => x[1])
    .filter((n) => !['if', 'for', 'while', 'switch', 'return', 'catch', 'function', 'typeof'].includes(n));
  controls.push({ event: 'on' + m2[1], line: SRC.slice(0, m2.index).split('\n').length, calls: [...new Set(called)] });
}

/* ---------- 6. addEventListener wiring ----------------------------------- */
const listeners = [...JS.matchAll(/addEventListener\s*\(\s*['"]([a-z]+)['"]/g)]
  .filter((x) => MASK[x.index])
  .reduce((acc, x) => (acc[x[1]] = (acc[x[1]] || 0) + 1, acc), {});

/* ---------- 7. DOM surfaces the app builds ------------------------------- */
const ids = [...new Set([...SRC.matchAll(/\bid\s*=\s*["']([A-Za-z][\w-]*)["']/g)].map((x) => x[1]))].sort();

/* ---------- 8. write it out ---------------------------------------------- */
const byDomain = {};
for (const f of functions) (byDomain[f.domain] ||= []).push(f);

const summary = {
  generated: new Date().toISOString().slice(0, 10),
  appVersion: (SRC.match(/name="app-version" content="([\d.]+)"/) || [])[1],
  scriptLines: JS.split('\n').length,
  functions: functions.length,
  reachable: functions.filter((f) => f.reachable).length,
  unreferenced: functions.filter((f) => !f.reachable).map((f) => f.name),
  mutateModel: functions.filter((f) => f.mutatesModel).length,
  persist: functions.filter((f) => f.persists).length,
  destructive: functions.filter((f) => f.destructive).length,
  privacySensitive: functions.filter((f) => f.privacySensitive).length,
  network: functions.filter((f) => f.network).length,
  inlineHandlers: controls.length,
  distinctHandlerTargets: [...new Set(controls.flatMap((c) => c.calls))].length,
  addEventListener: listeners,
  domIds: ids.length,
  domains: Object.fromEntries(Object.entries(byDomain).map(([k, v]) => [k, v.length])),
};

const OUT = join(ROOT, 'audit', 'inventory');
writeFileSync(join(OUT, 'functions.json'), JSON.stringify(functions, null, 1));
writeFileSync(join(OUT, 'controls.json'), JSON.stringify(controls, null, 1));
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));

const esc = (s) => String(s).replace(/\|/g, '\\|');
let md = `# Siyagah — Function Inventory

*Generated mechanically by \`node tools/inventory.mjs\` from \`index.html\`.
Do not hand-edit: re-run it.*

| | |
|---|---|
| App version | v${summary.appVersion} |
| Generated | ${summary.generated} |
| Application script | ${summary.scriptLines.toLocaleString()} lines |
| Application-defined functions | **${summary.functions}** |
| …reachable (called in script or named in markup) | ${summary.reachable} |
| …never referenced anywhere | ${summary.unreferenced.length} |
| …that mutate the data model | ${summary.mutateModel} |
| …that reach a persistence boundary | ${summary.persist} |
| …classified destructive | ${summary.destructive} |
| …privacy-sensitive (export / identity) | ${summary.privacySensitive} |
| …that touch the network | ${summary.network} |
| Inline \`on*\` handlers in markup | **${summary.inlineHandlers}** |
| Distinct functions those handlers call | ${summary.distinctHandlerTargets} |
| Distinct DOM ids | ${summary.domIds} |

## Functions never referenced anywhere

${summary.unreferenced.length ? summary.unreferenced.map((n) => '- `' + n + '`').join('\n') : '_none_'}

## By domain

${Object.entries(summary.domains).sort((a, b) => b[1] - a[1]).map(([d, n]) => `- **${d}** — ${n}`).join('\n')}

## Full inventory

Legend: **M** mutates model · **P** persists · **N** network · **D** destructive ·
**Pr** privacy-sensitive · **R** reachable

| Function | Line | Lines | Domain | M | P | N | D | Pr | R | Callers |
|---|---:|---:|---|:-:|:-:|:-:|:-:|:-:|:-:|---:|
`;
const tick = (b) => (b ? '●' : '');
for (const f of functions) {
  md += `| \`${esc(f.name)}\` | ${f.line} | ${f.lines} | ${esc(f.domain)} | ${tick(f.mutatesModel)} | ${tick(f.persists)} | ${tick(f.network)} | ${tick(f.destructive)} | ${tick(f.privacySensitive)} | ${tick(f.reachable)} | ${f.callersInScript} |\n`;
}
writeFileSync(join(OUT, 'FUNCTION-INVENTORY.md'), md);

console.log(JSON.stringify(summary, null, 2));
