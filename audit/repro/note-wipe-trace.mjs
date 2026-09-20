import { openApp } from '../../tools/harness.mjs';
const s = await openApp({ viewport: { width: 1440, height: 900 } });
const p = s.page;
await p.evaluate(() => selFolder('f1'));
await p.waitForTimeout(200);
await p.evaluate(() => quickNewNote());
await p.waitForTimeout(400);
const id = await p.evaluate(() => ST.article);
await p.evaluate(() => { if (typeof startEdit === 'function') startEdit(); });
await p.waitForTimeout(400);
const el = await p.$('.float-win .fw-ed');
await el.click();
await p.keyboard.type('REPRO CONTENT MARKER');
await p.waitForTimeout(2800);

/* Trap every write to a.content for this note, with a stack. */
await p.evaluate((i) => {
  window.__log = [];
  const a = DB.articles.find(x => x.id === i);
  let v = a.content;
  Object.defineProperty(a, 'content', {
    get(){ return v; },
    set(nv){
      window.__log.push({ from: String(v).slice(0,40), to: String(nv).slice(0,40),
                          stack: new Error().stack.split('\n').slice(1,7).join(' << ') });
      v = nv;
    }, configurable: true });
}, id);

await p.evaluate(() => selFolder('f2'));
await p.waitForTimeout(800);

const log = await p.evaluate(() => window.__log);
console.log('writes to a.content during selFolder:');
for (const w of log) console.log(`\n  "${w.from}" -> "${w.to}"\n    ${w.stack}`);
console.log('\nfinal content:', JSON.stringify(await p.evaluate((i)=> (DB.articles.find(a=>a.id===i)||{}).content, id)));
console.log('fw editor innerHTML now:', JSON.stringify(await p.evaluate((i)=> (document.getElementById('fw-ed-'+i)||{}).innerHTML, id)));
await s.close();
