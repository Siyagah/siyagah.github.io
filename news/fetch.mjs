/* Siyagah's own news service (v05.37, Z13c). Run by .github/workflows/news.yml every 15 minutes.
   It runs the SAME helper the app hands out (_newsGs() in index.html, one parser, never a copy) in a Node vm, with UrlFetchApp
   served by curl, and prints the helper's answer {at,chans:[{id,q,ok,name?,src?,items:[{t,s,u,d}],err?}]} for news/channels.json. */
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const here = new URL('.', import.meta.url);
const html = fs.readFileSync(new URL('../index.html', here), 'utf8');
const m = /function _newsGs\(\)\{\s*return String\.raw`([\s\S]*?)`;\s*\}/.exec(html);
if (!m) throw new Error('_newsGs() not found in index.html');
const chans = JSON.parse(fs.readFileSync(new URL('channels.json', here), 'utf8'));
const per = Math.max(1, Math.min(50, +(process.env.NEWS_PER || 20)));

function fetchSync(url, opt) {
  const h = (opt && opt.headers) || {};
  const args = ['-sS', '-L', '--compressed', '--max-time', '25', '-o', '-', '-w', '\n%{http_code}'];
  for (const k of Object.keys(h)) args.push('-H', k + ': ' + h[k]);
  args.push(url);
  let out;
  try { out = execFileSync('curl', args, { maxBuffer: 64 << 20 }).toString('utf8'); }
  catch (e) { throw new Error('the site could not be reached'); }
  const k = out.lastIndexOf('\n');
  const code = +out.slice(k + 1), body = out.slice(0, k);
  return { getResponseCode: () => code, getContentText: () => body };
}
let text = '';
const ctx = {
  UrlFetchApp: { fetch: fetchSync },
  CacheService: { getScriptCache: () => null },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => { text = s; return { setMimeType() { return this; } }; } },
  JSON, Date, Math, String, Array, parseInt, isNaN, RegExp, Error
};
vm.createContext(ctx);
vm.runInContext(m[1], ctx);
ctx.doGet({ parameter: { c: JSON.stringify(chans.map(x => ({ id: x.id, src: x.src }))), n: String(per) } });
const out = JSON.parse(text);
out.chans.forEach((c, k) => { c.q = chans[k].src; });   /* the address asked for: the app finds a channel by it (a site page answers with its feed's address in src) */
for (const c of out.chans) console.error(c.id, c.ok ? c.items.length + ' headlines' : 'FAILED: ' + c.err);
process.stdout.write(JSON.stringify(out));
