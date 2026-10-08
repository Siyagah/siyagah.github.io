/* S3 measurement (not a check): how the tag surfaces behave with ~3,000 tags on
   9,000 notes, on a 1440 laptop, an 820 tablet and a 390 phone with the CPU
   throttled ×4. Reports numbers only.  node tools/s3-measure.mjs [--tags=3000] [--notes=9000] */
import { openApp, seedDB } from './harness.mjs';

const arg = (k, d) => +((process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]) || d;
const NT = arg('tags', 3000), NN = arg('notes', 9000);
const SIZES = [
  { name: 'laptop', width: 1440, height: 900, throttle: 1 },
  { name: 'tablet', width: 820, height: 1180, throttle: 1 },
  { name: 'phone', width: 390, height: 844, throttle: 4 },
];
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

function seed(page) {
  return page.evaluate(({ NT, NN }) => {
    let a = 12345 >>> 0; const R = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const words = ['fiqh', 'hadith', 'tafsir', 'seerah', 'aqeedah', 'history', 'recipe', 'travel', 'finance', 'tax', 'health', 'project', 'meeting', 'book', 'lecture', 'arabic', 'urdu', 'family', 'work', 'idea'];
    const tags = []; for (let i = 0; i < NT; i++) tags.push(words[i % words.length] + (i >= words.length ? ' ' + words[Math.floor(i / words.length) % words.length] + ' ' + i : ''));
    const now = new Date().toISOString(), t0 = Date.now() - 4e6;
    DB.folders = [{ id: 'f1', name: '(001) A', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: now }];
    DB.articles = []; DB.trash = []; DB.tombstones = [];
    for (let i = 0; i < NN; i++) {
      const k = Math.floor(R() * 7), ts = new Set();
      for (let j = 0; j < k; j++) ts.add(tags[Math.floor(Math.pow(R(), 2) * NT)]);   /* skewed: a few tags are on many notes */
      const at = new Date(t0 + i * 400).toISOString();
      DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>Body ' + i + '</p>', folderIds: ['f1'], tags: [...ts], createdAt: at, updatedAt: at, kind: 'general' });
    }
    tags.forEach((t) => { if (!DB.articles.some((x) => x.tags.includes(t))) { DB.globalTags = DB.globalTags || []; DB.globalTags.push(t); } });
    DB.tagColors = {}; DB.tagColorsAt = {}; for (let i = 0; i < 300; i++) { DB.tagColors[tags[i * 7]] = '#a05030'; DB.tagColorsAt[tags[i * 7]] = Date.now(); }
    _seedThemeSnap(); _seedRecSnap(); persist(); _histReset();
    return { notes: DB.articles.length, tags: getAllTags().length, tagRefs: DB.articles.reduce((s, x) => s + x.tags.length, 0) };
  }, { NT, NN });
}

/* times fn in the page, N runs, plus the paint that follows */
async function timeIt(page, src, n = 3) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(await page.evaluate(async (src) => {
      const t = performance.now(); (0, eval)(src);
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      return performance.now() - t;
    }, src));
  }
  return Math.round(med(out));
}

const results = {};
for (const vp of SIZES) {
  const app = await openApp({ viewport: { width: vp.width, height: vp.height }, db: seedDB(), hasTouch: vp.name === 'phone' });
  const { page } = app;
  const info = await seed(page);
  await page.waitForTimeout(500);
  if (vp.throttle > 1) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.throttle }); }
  const r = { info };
  r.getAllTags = await timeIt(page, 'getAllTags()');
  await page.evaluate(() => { ST.tagOpen = false; });
  r.renderTree_tagsClosed = await timeIt(page, 'renderTree()');
  await page.evaluate(() => { ST.tagOpen = true; });
  r.renderTree_tagsOpen = await timeIt(page, 'renderTree()');
  r.tree_nodes_open = await page.evaluate(() => document.getElementById('tree').querySelectorAll('*').length);
  r.tag_section_px = await page.evaluate(() => Math.round(document.querySelector('.tag-sec')?.getBoundingClientRect().height || 0));
  r.render_all_tagsOpen = await timeIt(page, 'render()');
  await page.evaluate(() => { ST.tagOpen = false; renderTree(); });
  r.render_all_tagsClosed = await timeIt(page, 'render()');
  r.selTag_busy = await timeIt(page, "selTag('fiqh');selTag('fiqh')", 3);   /* select then unselect */
  r.selTag_fiqh_notes = await page.evaluate(() => DB.articles.filter((a) => a.tags.includes('fiqh')).length);
  r.selTag_rare = await timeIt(page, "selTag('idea work 2999');selTag('idea work 2999')", 3);
  r.selFolder_9000 = await timeIt(page, "selFolder('f1');selFolder('f1')", 3);
  r.sidebarSearch_keystroke = await timeIt(page, "ST.search='fiq';renderTree();ST.search='';", 3);
  /* tag editor: open a note for editing, type into its tag input */
  await page.evaluate(() => { selArt('n1'); });
  await page.waitForTimeout(300);
  r.suggest_keystroke = await timeIt(page, "(()=>{const i=document.querySelector('.tag-inp');if(i)showTagSuggest('fi',null,i);})()", 3);
  r.addTagModal_open = await timeIt(page, "promptAddArtTag('n2')", 1);
  r.addTagModal_rows = await page.evaluate(() => document.querySelectorAll('#tp-list .ltn-row').length);
  r.addTagModal_keystroke = await timeIt(page, "tagPickerRender('n2','h')", 3);
  await page.evaluate(() => { try { closeModal(); } catch {} });
  r.pickerTagsList = await timeIt(page, '_pkTagsListHTML()', 3);
  r.tagApply_full = await timeIt(page, "tagPickerApply('n3','brand new tag '+Math.random().toString(36).slice(2,6));closeModal&&0", 3);
  r.persist = await timeIt(page, 'persist()', 3);
  r.errors = app.errors.slice(0, 5);
  results[vp.name] = r;
  console.log(vp.name, JSON.stringify(r));
  await app.close();
}

/* correctness probe, laptop only: a tag with an apostrophe (Evernote tags keep them) */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 } });
  const { page } = app;
  const out = await page.evaluate(() => {
    DB.articles[0].tags = ["Qur'an", 'A & B', 'تفسير']; persist(); ST.tagOpen = true; renderTree();
    return [...document.querySelectorAll('.tag-row')].map((e) => e.dataset.tag);
  });
  const errs0 = app.errors.length;
  const clicked = [];
  for (let i = 0; i < out.length; i++) { await page.locator('.tag-row').nth(i).click(); await page.waitForTimeout(150); clicked.push(await page.evaluate(() => ST.tag)); await page.evaluate(() => { ST.tag = null; ST.tagOpen = true; renderTree(); }); }
  console.log('apostrophe probe', JSON.stringify({ rows: out, newErrors: app.errors.slice(errs0), clicked }));
  await app.close();
}
