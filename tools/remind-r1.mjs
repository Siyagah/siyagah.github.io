#!/usr/bin/env node
/* tools/remind-r1.mjs — v05.06, R1: reminder emails (checks 67a–67c).

   67a  the cloud doc notebooks/{nb}/remind/v1, on the fake Firestore of s1-fake.mjs (the cloud the sync checks use)
   67b  the helper: the generated Code.gs EXECUTED in Node `vm` against mocks of UrlFetchApp, ScriptApp, MailApp,
        PropertiesService, Session, Utilities and Logger; and appsscript.json
   67c  the panel: reached by real clicks from 🧰 and from the reminder dialog at 1440 / 820 / 390 (touch)

   `--only=67b` runs one. `--base=<git rev>` serves that build's index.html + sw.js instead of the working tree (the
   "before" column: every check here must fail on a build without R1). Each printed ok/FAIL line becomes one
   app-check check (block 67). */
import { playwright, serve, seedDB, ROOT } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, push, waitSeeded, check, results, freshDevice } from './s1-fake.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const baseRev = (argv.find((a) => a.startsWith('--base=')) || '').slice(7);

let srvRoot = ROOT;
if (baseRev) {
  srvRoot = mkdtempSync(join(tmpdir(), 'siyagah-base-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(srvRoot, f), execFileSync('git', ['show', baseRev + ':' + f], { cwd: ROOT, maxBuffer: 1 << 28 })); } catch (e) { if (f === 'index.html') throw e; } }
}
const pw = await playwright();
const srv = await serve(srvRoot);
const browser = await pw.chromium.launch();
const DOC = 'notebooks/nb-s1/remind/v1';
const p2 = (n) => String(n).padStart(2, '0');
const lt = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const ld = (ms) => lt(ms).slice(0, 10);
const H = 3600e3, D = 24 * H;
const NOW = Date.now();
const until = async (fn, ms = 25000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch {} await sleep(300); } return false; };
const remWrites = (cloud) => cloud.log.filter((o) => o.t === 'set' && o.p === DOC);
const readDoc = (cloud) => { const d = cloud.store.get(DOC); return d ? { ...d, o: JSON.parse(d.j) } : null; };
const mkArt = (id, title, reminder, extra = {}) => ({ id, title, content: '<p>x</p>', folderIds: ['f1'], tags: [], kind: 'general', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', ...(reminder ? { reminder } : {}), ...extra });
const LONG = 'L'.repeat(150);
const seed = () => {
  const db = seedDB('2026-10-01T00:00:00.000Z');
  db.articles.push(
    mkArt('rPast', 'Due three hours ago', { dt: lt(NOW - 3 * H), msg: 'Call back' }),
    mkArt('rDate', LONG, { dt: ld(NOW + 5 * D) }),
    mkArt('rFar', 'Too far away', { dt: ld(NOW + 90 * D) }),
    mkArt('rOld', 'Too old', { dt: ld(NOW - 5 * D) }),
    mkArt('rNone', 'No reminder', null),
    mkArt('rB', 'Edited on B', null),
  );
  db.trash = [{ id: 'tr1', type: 'article', deletedAt: '2026-10-02T00:00:00.000Z', item: mkArt('rTrash', 'In the trash', { dt: lt(NOW + 2 * H) }) }];
  return db;
};

/* ══ 67a — the doc ══ */
if (want('67a')) {
  /* off writes nothing */
  const cloud = makeCloud();
  const A = await addDevice(browser, srv.base, cloud, 'A', { width: 1440, height: 900 }, false, seed());
  await waitSeeded(cloud, A); await quiet(cloud, A);
  await on(A, () => _remTick(true));
  await sleep(11000);   /* two real ticks of the 5 s timer */
  check(remWrites(cloud).length === 0, '67a off writes nothing — not at boot, not on a forced tick, not over two timer ticks', JSON.stringify(remWrites(cloud).length));
  check(typeof (await on(A, () => typeof _remTick)) === 'string' && (await on(A, () => _remCfg().on === false && _remCfg().hour === 8)), '67a the setting defaults to off, hour 8');

  /* on writes the right list (through the real timer: debounce included) */
  const t0 = Date.now();
  await on(A, () => _remSet({ on: true, hour: 9 }));
  const wrote = await until(() => remWrites(cloud).length > 0, 25000);
  check(wrote, '67a turning it on writes remind/v1 by itself (timer, debounced)', wrote ? `after ${Date.now() - t0} ms` : 'nothing written');
  const doc = readDoc(cloud);
  const ids = doc ? doc.o.list.map((x) => x.id) : [];
  check(!!doc && doc.o.v === 1 && doc.o.hour === 9 && typeof doc.j === 'string' && doc.off === undefined, '67a the doc is {j: JSON string, at, b} with v:1 and the chosen hour, and no off flag', doc && JSON.stringify({ v: doc.o.v, hour: doc.o.hour, off: doc.off }));
  const ver = await on(A, () => document.querySelector('meta[name="app-version"]').content);
  check(!!doc && doc.b === ver && !!doc.at && !!doc.at.__ts, '67a it carries the app version and a server time', doc && JSON.stringify({ b: doc.b, at: !!doc.at }));
  check(ids.join(',') === 'rPast,rDate', '67a it holds exactly the reminders inside now−2 days … now+60 days, in due order (not Trash, not far, not old, not none)', ids.join(','));
  const dateIt = doc && doc.o.list.find((x) => x.id === 'rDate');
  const wantAt = (() => { const d = new Date(ld(NOW + 5 * D) + 'T00:00'); d.setHours(9, 0, 0, 0); return d.getTime(); })();
  check(!!dateIt && dateIt.at === wantAt, '67a a date-only reminder is due at the chosen hour, local', dateIt && `${dateIt.at} vs ${wantAt}`);
  check(!!dateIt && dateIt.title.length === 120, '67a a title is trimmed to 120 characters', dateIt && String(dateIt.title.length));
  const pastIt = doc && doc.o.list.find((x) => x.id === 'rPast');
  check(!!pastIt && pastIt.at === new Date(lt(NOW - 3 * H)).getTime() && pastIt.msg === 'Call back' && pastIt.dt === lt(NOW - 3 * H), '67a a timed reminder is its own absolute time, with its message and dt', JSON.stringify(pastIt));

  /* not part of recs, the blob, the merge, the Save File */
  const keys = [...cloud.store.keys()];
  check(!keys.some((k) => /\/recs\/[^/]*remind/i.test(k) || /\/recparts\/[^/]*remind/i.test(k)), '67a remind/v1 is not a rec', keys.filter((k) => /remind/i.test(k)).join(','));
  const inStore = [...cloud.store.entries()].filter(([k]) => k !== DOC).some(([, v]) => JSON.stringify(v).includes('\\"list\\":[{\\"id\\"'));
  check(!inStore, '67a no other cloud doc (recs, blob, chunks) carries the reminder list');
  const inDB = await on(A, () => JSON.stringify(DB).includes('\\"list\\":[{\\"id\\"') || Object.keys(DB).some((k) => /remind/i.test(k) && k !== 'theme'));
  check(!inDB, '67a the notebook (DB, so also its backup and Save File) has no reminder-list key');
  const sf = await on(A, async () => { try { return typeof _picExportHTML === 'function' ? String(await _picExportHTML()).includes('\\"list\\":[{\\"id\\"') : false; } catch (e) { return false; } });
  check(!sf, '67a the Save File export does not carry it');

  /* set, edit, clear */
  let n = remWrites(cloud).length;
  await on(A, (when) => { const a = DB.articles.find((x) => x.id === 'rNone'); a.reminder = { dt: when, msg: 'new' }; a.updatedAt = new Date().toISOString(); persist(); }, lt(NOW + 2 * D + 3 * H));
  check(await until(() => remWrites(cloud).length > n && readDoc(cloud).o.list.some((x) => x.id === 'rNone')), '67a setting a reminder rewrites the doc');
  n = remWrites(cloud).length;
  await on(A, (when) => { const a = DB.articles.find((x) => x.id === 'rNone'); a.reminder = { dt: when, msg: 'new' }; a.updatedAt = new Date().toISOString(); persist(); }, lt(NOW + 3 * D));
  check(await until(() => remWrites(cloud).length > n && readDoc(cloud).o.list.find((x) => x.id === 'rNone').dt === lt(NOW + 3 * D)), '67a editing a reminder rewrites the doc');
  n = remWrites(cloud).length;
  await on(A, () => clearReminder('rNone'));
  check(await until(() => remWrites(cloud).length > n && !readDoc(cloud).o.list.some((x) => x.id === 'rNone')), '67a clearing a reminder rewrites the doc');
  n = remWrites(cloud).length;
  await sleep(11000);
  check(remWrites(cloud).length === n, '67a an unchanged list is not written again (signature)', `${remWrites(cloud).length - n} extra writes in 11 s`);
  await on(A, () => deleteNote('rPast'));
  check(await until(() => !readDoc(cloud).o.list.some((x) => x.id === 'rPast')), '67a a note moved to Trash leaves the list');

  /* a change on device B reaches A's doc after a merge */
  const B = await addDevice(browser, srv.base, cloud, 'B', { width: 1440, height: 900 }, false, seed());
  await sleep(2500); await quiet(cloud, B);
  await on(B, (when) => { const a = DB.articles.find((x) => x.id === 'rB'); a.reminder = { dt: when, msg: 'from B' }; a.updatedAt = new Date().toISOString(); persist(); }, lt(NOW + 4 * D + 5 * H));
  await push(cloud, B);
  const reached = await until(async () => (await on(A, () => _remList(_remCfg().hour).some((x) => x.id === 'rB'))) && readDoc(cloud).o.list.some((x) => x.id === 'rB' && x.msg === 'from B'), 40000);
  check(reached, "67a a reminder set on device B is in A's list after the merge, and in the doc");
  const aSig = await on(A, () => _remState.sig);
  check(aSig.includes('rB'), "67a A itself wrote that list (its last written signature has it)", aSig.slice(0, 80));

  /* a refused write never fails the push; the panel says so; it recovers */
  cloud.refuse.push('/remind/');
  const failsBefore = await on(A, () => _pushFailures);
  await on(A, (when) => { const a = DB.articles.find((x) => x.id === 'a1'); a.reminder = { dt: when }; a.updatedAt = new Date().toISOString(); a.title = 'Seeded note one (refused test)'; persist(); }, lt(NOW + 6 * D));
  await until(async () => (await on(A, () => !!_remState.err)), 30000);
  await push(cloud, A);
  const st = await on(A, () => ({ fails: _pushFailures, err: _remState.err && _remState.err.code, text: _remStateText(), sync: document.getElementById('sync-dot').className }));
  check(st.err === 'permission-denied' && /refused/i.test(st.text), '67a a refused write is named in plain words', st.text);
  check(st.fails === failsBefore && !/err/.test(st.sync), '67a …and the push still succeeded (no failure counted, the sync dot is not in error)', JSON.stringify(st));
  const recDone = [...cloud.store.entries()].some(([k, v]) => k.includes('/recs/articles~a1') && JSON.stringify(v).includes('refused test'));
  check(recDone, '67a …and the note edit reached the cloud');
  await on(A, () => { openRemindMail(); });
  const panelText = await on(A, () => document.getElementById('rm-state').textContent);
  check(/refused/i.test(panelText), '67a the panel shows it', panelText);
  await on(A, () => closeRemindMail());
  cloud.refuse.length = 0;
  await on(A, (when) => { const a = DB.articles.find((x) => x.id === 'a1'); a.reminder = { dt: when }; a.updatedAt = new Date().toISOString(); persist(); }, lt(NOW + 7 * D));
  check(await until(() => readDoc(cloud).o.list.some((x) => x.id === 'a1' && x.dt === lt(NOW + 7 * D)), 40000), '67a the next change retries and the doc catches up');

  /* off writes off:true once */
  n = remWrites(cloud).length;
  await on(A, () => _remSet({ on: false }));
  check(await until(() => { const d = readDoc(cloud); return d && d.off === true && d.o.list.length === 0 && d.o.v === 1; }), '67a turning it off writes {j:{v:1,hour,list:[]}, off:true}', JSON.stringify(readDoc(cloud) && { off: readDoc(cloud).off, n: readDoc(cloud).o.list.length }));
  const n2 = remWrites(cloud).length;
  await sleep(11000);
  check(n2 === n + 1 && remWrites(cloud).length === n2, '67a …exactly once, then nothing more', `${n2 - n} then ${remWrites(cloud).length - n2}`);
  check(A.errors.length === 0 && B.errors.length === 0, '67a no page errors on either device', A.errors.concat(B.errors).join(' | '));
  await A.ctx.close(); await B.ctx.close();

  /* never before the first read */
  const cloud2 = makeCloud();
  const db2 = seed(); db2.theme.remindMail = { on: true, hour: 8 };
  const C = await addDevice(browser, srv.base, cloud2, 'C', { width: 1440, height: 900 }, false, db2, { holdQ: true });
  await sleep(13000);
  check(remWrites(cloud2).length === 0, '67a nothing is written before the first read (reader held back, 13 s, two ticks)', String(remWrites(cloud2).length));
  C.holdQ = false; cloud2.reconnect(C);
  check(await until(() => remWrites(cloud2).length > 0, 40000), '67a …and it is written once the reader has caught up');
  await C.ctx.close();
}

/* ══ 67b — the helper, executed ══ */
if (want('67b')) {
  const cloud = makeCloud();
  const A = await addDevice(browser, srv.base, cloud, 'A', { width: 1440, height: 900 }, false, seed());
  await waitSeeded(cloud, A);
  const gs = await on(A, () => _remGs());
  const json = await on(A, () => _remJson());
  const tz = await on(A, () => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const verMeta = await on(A, () => document.querySelector('meta[name="app-version"]').content);
  await A.ctx.close();
  check(/PROJECT_ID = "fake"/.test(gs) && /NOTEBOOK_ID = "nb-s1"/.test(gs), '67b Code.gs is pre-filled with the project id and the notebook id');
  let parsed = null; try { parsed = JSON.parse(json); } catch {}
  const SCOPES = ['https://www.googleapis.com/auth/script.external_request', 'https://www.googleapis.com/auth/datastore', 'https://www.googleapis.com/auth/script.send_mail', 'https://www.googleapis.com/auth/script.scriptapp', 'https://www.googleapis.com/auth/userinfo.email'];
  check(!!parsed && parsed.timeZone === tz && parsed.exceptionLogging === 'STACKDRIVER' && parsed.runtimeVersion === 'V8', '67b appsscript.json parses; timeZone is the device\'s; STACKDRIVER; V8', json.slice(0, 120));
  check(!!parsed && JSON.stringify([...parsed.oauthScopes].sort()) === JSON.stringify([...SCOPES].sort()) && parsed.oauthScopes.length === 5, '67b …and lists exactly the five scopes', parsed && parsed.oauthScopes.join(' '));
  check(!/<\/script/i.test(gs) && !/`|\$\{/.test(gs), '67b Code.gs has no backtick or ${ (safe for Apps Script and for the page)');

  /* the Apps Script world, mocked */
  const mkGas = (nowMs, props0 = {}) => {
    const g = { mails: [], fetches: [], triggers: [], deleted: 0, resp: { code: 200, body: '' }, throwFetch: false, props: new Map(Object.entries(props0)), now: nowMs, logs: [] };
    const RD = Date;
    class FD extends RD { constructor(...a) { if (a.length === 0) super(g.now); else super(...a); } static now() { return g.now; } }
    const sandbox = {
      Date: FD,
      Logger: { log: (m) => g.logs.push(String(m)) },
      UrlFetchApp: { fetch: (url, opts) => { g.fetches.push({ url, opts }); if (g.throwFetch) throw new Error('DNS fail'); return { getResponseCode: () => g.resp.code, getContentText: () => g.resp.body }; } },
      ScriptApp: {
        getOAuthToken: () => 'tok-123',
        getProjectTriggers: () => [{ id: 'old1' }, { id: 'old2' }],
        deleteTrigger: () => { g.deleted++; },
        newTrigger: (fn) => ({ timeBased: () => ({ everyMinutes: (m) => ({ create: () => { g.triggers.push({ fn, m }); } }) }) }),
      },
      MailApp: { sendEmail: (a, b, c) => { g.mails.push(typeof a === 'object' ? a : { to: a, subject: b, body: c }); } },
      PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (g.props.has(k) ? g.props.get(k) : null), setProperty: (k, v) => { g.props.set(k, v); } }) },
      Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.invalid' }), getScriptTimeZone: () => 'UTC' },
      Utilities: { formatDate: (d, z, f) => `${new RD(d).toISOString().replace('T', ' ').slice(0, 16)} [${f}]` },
    };
    const ctx = vm.createContext(sandbox);
    vm.runInContext(gs, ctx);
    g.run = (fn) => vm.runInContext(fn + '()', ctx);
    g.feed = (list, extra = {}) => { g.resp = { code: 200, body: JSON.stringify({ fields: { j: { stringValue: JSON.stringify({ v: 1, hour: 8, list }) }, ...(extra.off ? { off: { booleanValue: true } } : {}) } }) }; };
    return g;
  };
  const NOWT = Date.UTC(2026, 9, 10, 12, 0, 0);
  const item = (id, at, extra = {}) => ({ id, title: 'Title ' + id, msg: '', dt: new Date(at).toISOString().slice(0, 16), at, ...extra });

  let g = mkGas(NOWT);
  g.feed([item('due', NOWT - H, { msg: 'Call back' }), item('late', NOWT - 37 * H), item('future', NOWT + H), item('edge', NOWT)]);
  g.run('check'); g.run('check');
  const sentIds = g.mails.map((m) => (m.body.match(/open=([\w-]+)/) || [])[1]);
  check(JSON.stringify(sentIds.sort()) === JSON.stringify(['due', 'edge']), '67b a due reminder sends exactly once over two runs; >36 h old and future ones do not; "at <= now" counts', sentIds.join(','));
  const m1 = g.mails.find((m) => /open=due/.test(m.body));
  check(!!m1 && m1.to === 'owner@example.invalid' && m1.subject === '🔔 Call back', '67b it goes to the effective user, subject 🔔 <msg>', m1 && m1.subject);
  const m2 = g.mails.find((m) => /open=edge/.test(m.body));
  check(!!m2 && m2.subject === '🔔 Title edge', '67b with no message the subject is 🔔 <title>', m2 && m2.subject);
  check(!!m1 && m1.body.includes('https://siyagah.github.io/?open=due') && m1.htmlBody.includes('href="https://siyagah.github.io/?open=due"') && m1.body.includes('Title due') && m1.body.includes('Call back') && /Due: /.test(m1.body) && m1.htmlBody.includes('<b>Title due</b>'), '67b the body has the title, when, the message and the /?open=<id> link — plain text and HTML', m1 && m1.body);
  const u = g.fetches[0];
  check(u && u.url === 'https://firestore.googleapis.com/v1/projects/fake/databases/(default)/documents/notebooks/nb-s1/remind/v1' && u.opts.headers.Authorization === 'Bearer tok-123', '67b it reads the Firestore REST doc with the script\'s OAuth token', u && u.url);
  /* an edited time sends again */
  g.feed([item('due', NOWT - 30 * 60e3, { msg: 'Call back' })]);
  g.run('check');
  check(g.mails.length === 3, '67b editing the time makes a new id|at and emails again', String(g.mails.length));
  /* html is escaped */
  g.feed([item('x<b>', NOWT - 60e3, { title: '<script>alert(1)</script> & co' })]); g.run('check');
  const mx = g.mails[g.mails.length - 1];
  check(mx.htmlBody.includes('&lt;script&gt;') && !mx.htmlBody.includes('<script>') && mx.htmlBody.includes('open=x%3Cb%3E'), '67b the HTML body escapes the title; the id is encoded in the link');

  g = mkGas(NOWT); g.feed([item('o', NOWT - H)], { off: true }); g.run('check');
  check(g.mails.length === 0, '67b off:true sends nothing');
  g = mkGas(NOWT); g.resp = { code: 500, body: 'oops' };
  let threw = null; try { g.run('check'); } catch (e) { threw = e; }
  check(!threw && g.mails.length === 0, '67b a 500 is quiet (no throw, no mail)', threw && threw.message);
  g = mkGas(NOWT); g.throwFetch = true; threw = null; try { g.run('check'); } catch (e) { threw = e; }
  check(!threw && g.mails.length === 0, '67b a network failure is quiet and retried by the next run');
  g = mkGas(NOWT); g.resp = { code: 200, body: 'not json' }; threw = null; try { g.run('check'); } catch (e) { threw = e; }
  check(!threw && g.mails.length === 0, '67b a garbled doc is quiet');

  /* the sent set is pruned (entries older than 4 days) */
  g = mkGas(NOWT, { sent: JSON.stringify({ 'ancient|1': NOWT - 5 * D, 'recent|2': NOWT - 2 * D }) });
  g.feed([item('due', NOWT - H)]); g.run('check');
  const kept = Object.keys(JSON.parse(g.props.get('sent'))).sort();
  check(JSON.stringify(kept) === JSON.stringify(['due|' + (NOWT - H), 'recent|2']), '67b entries older than 4 days are pruned; newer ones and the new one stay', kept.join(','));

  /* setup() */
  g = mkGas(NOWT); g.feed([item('n1', NOWT + 2 * H, { title: 'Pay the bill' }), item('n2', NOWT + 3 * H)]);
  g.run('setup');
  check(g.deleted === 2 && g.triggers.length === 1 && g.triggers[0].fn === 'check' && g.triggers[0].m === 5, '67b setup() removes its old triggers and adds `check` every 5 minutes', JSON.stringify({ d: g.deleted, t: g.triggers }));
  const tm = g.mails[0];
  check(g.mails.length === 1 && tm.to === 'owner@example.invalid' && /Siyagah reminder emails are on/.test(tm.subject) && /^Siyagah reminder emails are on — 2 upcoming reminders \(next: Pay the bill, /.test(tm.body), '67b …and sends the test email "…are on — N upcoming reminders (next: <title>, <date time>)"', tm && tm.body);
  g = mkGas(NOWT); g.resp = { code: 403, body: '{}' }; threw = null; try { g.run('setup'); } catch (e) { threw = e; }
  check(threw && /can't read the Siyagah notebook/.test(threw.message) && /owns the Firebase project/.test(threw.message) && g.mails.length === 0, '67b setup() with a 403 throws the plain-words message', threw && threw.message);
  g = mkGas(NOWT); g.resp = { code: 404, body: '{}' }; threw = null; try { g.run('setup'); } catch (e) { threw = e; }
  check(threw && /hasn't sent the reminder list yet/.test(threw.message) && /turn Reminder emails on in Siyagah/.test(threw.message) && /run setup again/.test(threw.message), '67b setup() with a 404 throws the plain-words message', threw && threw.message);
  g = mkGas(NOWT); g.resp = { code: 500, body: '' }; threw = null; try { g.run('setup'); } catch (e) { threw = e; }
  check(threw && /500/.test(threw.message), '67b setup() with anything else says the code and to wait', threw && threw.message);

  /* fed with the doc the app really wrote */
  const cloud3 = makeCloud();
  const db3 = seed(); db3.theme.remindMail = { on: true, hour: 8 };
  const E = await addDevice(browser, srv.base, cloud3, 'E', { width: 1440, height: 900 }, false, db3);
  await until(() => cloud3.store.has(DOC), 40000);
  const real = cloud3.store.get(DOC);
  const gsE = await on(E, () => _remGs());
  await E.ctx.close();
  g = mkGas(Date.now() + H); const _gs = gsE;
  g.resp = { code: 200, body: JSON.stringify({ fields: { j: { stringValue: real.j } } }) };
  g.run('check');
  check(g.mails.some((m) => /open=rPast/.test(m.body)) && !g.mails.some((m) => /open=rDate/.test(m.body)), '67b the doc the app really wrote makes the helper email the due note (and only it)', g.mails.map((m) => m.subject).join(' | '));
}

/* ══ 67c — the panel ══ */
if (want('67c')) {
  const VPS = [{ name: '1440', w: 1440, h: 900, touch: false }, { name: '820', w: 820, h: 1180, touch: true }, { name: '390', w: 390, h: 844, touch: true }];
  for (const vp of VPS) {
    const t = `67c@${vp.name}`;
    const { cloud, d } = await freshDevice(browser, srv.base, vp, seed());
    await d.ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: srv.base });
    const act = (sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
    const rect = (sel) => on(d, (s) => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom, w: q.width, h: q.height, vw: innerWidth, vh: innerHeight, sw: e.scrollWidth, cw: e.clientWidth }; }, sel);
    const fits = (q) => q && q.w > 100 && q.l >= -0.5 && q.t >= -0.5 && q.r <= q.vw + 0.5 && q.b <= q.vh + 0.5 && q.sw <= q.cw + 1;
    try {
      await waitSeeded(cloud, d);
      /* from 🧰 */
      await act('#sb-tools-btn'); await sleep(400);
      const mi = await on(d, () => { const e = [...document.querySelectorAll('#sb-tools .sb-mi')].find((x) => /Reminder emails/.test(x.textContent)); if (!e) return null; const q = e.getBoundingClientRect(); return { w: q.width, l: q.left, r: q.right, t: q.top, b: q.bottom, vw: innerWidth, vh: innerHeight }; });
      check(!!mi && mi.w > 60 && mi.l >= 0 && mi.r <= mi.vw + 0.5 && mi.t >= 0 && mi.b <= mi.vh + 0.5, `${t} 🧰 shows "🔔 Reminder emails", whole and on the screen`, JSON.stringify(mi));
      await d.page.locator('#sb-tools .sb-mi', { hasText: 'Reminder emails' }).first()[vp.touch ? 'tap' : 'click'](); await sleep(400);
      const box = await rect('#remmail-box');
      check(fits(box), `${t} the panel opens from 🧰 and fits the screen`, JSON.stringify(box));
      if (vp.w < 640) check(box && Math.abs(box.w - box.vw) < 1 && Math.abs(box.b - box.vh) < 1.5, `${t} on a phone it is a sheet from the bottom`, JSON.stringify(box));
      else check(box && box.l > 20 && box.w <= 500 && box.t > 0 && box.b < box.vh, `${t} on PC and tablet it is a dialog in the middle`, JSON.stringify(box));
      /* the switch and the hour persist */
      await act('#rm-on'); await sleep(300);
      await d.page.selectOption('#rm-hour', '7'); await sleep(400);
      const set = await on(d, () => ({ th: JSON.parse(JSON.stringify(DB.theme.remindMail || null)), ls: (localStorage.getItem('my-notebook-v1') || '').includes('"remindMail"'), on: document.getElementById('rm-on').checked }));
      check(set.th && set.th.on === true && set.th.hour === 7 && set.on, `${t} the switch and the hour are saved in DB.theme.remindMail`, JSON.stringify(set));
      const stampd = await on(d, () => { persist(); return !!(DB.themeAt && Object.keys(DB.themeAt).some((k) => k.startsWith('remindMail'))); });
      check(stampd, `${t} …and stamped for sync`);
      const stt = await on(d, () => document.getElementById('rm-state').textContent);
      check(stt.length > 10, `${t} the state is in words`, stt);
      /* steps */
      const stepsTxt = await on(d, () => document.getElementById('remmail-box').innerText);
      check(['Copy the helper', 'Open Google Apps Script', 'Copy the settings file', 'Advanced', 'Go to (unsafe)', 'Allow', 'setup', 'appsscript.json', 'reminder emails are on'].every((w) => stepsTxt.includes(w)), `${t} the seven steps are there`);
      const bigs = await on(d, () => [...document.querySelectorAll('#remmail-box .rm-big')].map((b) => Math.round(b.getBoundingClientRect().height)));
      check(bigs.length >= 3 && bigs.every((h) => h >= 40), `${t} the buttons are big (≥ 40 px)`, bigs.join(','));
      /* copy */
      await d.page.locator('.rm-big', { hasText: 'Copy the helper' })[vp.touch ? 'tap' : 'click'](); await sleep(300);
      const clip = await on(d, () => navigator.clipboard.readText());
      const want1 = await on(d, () => _remGs());
      check(clip === want1 && clip.includes('function check()'), `${t} "Copy the helper" puts Code.gs on the clipboard`, clip.slice(0, 60));
      await d.page.locator('.rm-big', { hasText: 'Copy the settings file' })[vp.touch ? 'tap' : 'click'](); await sleep(300);
      const clip2 = await on(d, () => navigator.clipboard.readText());
      check(clip2 === (await on(d, () => _remJson())) && JSON.parse(clip2).oauthScopes.length === 5, `${t} "Copy the settings file" puts appsscript.json on the clipboard`);
      /* fallback */
      await on(d, () => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }); });
      await d.page.locator('.rm-big', { hasText: 'Copy the helper' })[vp.touch ? 'tap' : 'click'](); await sleep(300);
      const fb = await on(d, () => { const e = document.getElementById('rm-fbt'); return e && { v: e.value === _remGs(), sel: e.selectionEnd - e.selectionStart > 100 }; });
      check(fb && fb.v && fb.sel, `${t} a copy that fails falls back to a selectable text box with the text selected`, JSON.stringify(fb));
      /* Open Google Apps Script: a new tab */
      const [pop] = await Promise.all([d.ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null), act('.rm-big:has-text("Open Google Apps Script")')]);
      check(!!pop && /script\.google\.com\/home\/projects\/create/.test(pop.url() || ''), `${t} "Open Google Apps Script" opens script.google.com/home/projects/create in a new tab`, pop && pop.url());
      if (pop) await pop.close().catch(() => {});
      await act('#remmail-box .rem-btn');   /* ✕ */
      await sleep(300);
      check(!(await rect('#remmail-modal.open')), `${t} ✕ closes it`);

      /* from the reminder dialog, by the quick-add that promises it */
      await on(d, () => selFolder('sf-remind')); await sleep(300);
      let opened = false;
      try {
        await d.page.fill('#p2c #qt-inp', 'A reminder for the panel'); await d.page.press('#p2c #qt-inp', 'Enter'); await sleep(700);
        opened = await on(d, () => document.getElementById('rem-modal').classList.contains('open'));
      } catch {}
      check(opened, `${t} the reminder dialog opens by the real quick-add`);
      const line = await on(d, () => document.getElementById('rem-mail-line').textContent);
      check(/Email me reminders: On/.test(line), `${t} the dialog's line reads "On" when it is on`, line);
      await act('#rem-mail-line'); await sleep(400);
      const box2 = await rect('#remmail-box');
      check(fits(box2) && !!(await rect('#remmail-modal.open')), `${t} the panel opens from the reminder dialog, over it, and fits`, JSON.stringify(box2));
      await on(d, () => { const e = document.getElementById('rm-on'); e.checked = false; e.dispatchEvent(new Event('change')); });
      await act('#remmail-box .rem-btn'); await sleep(300);
      const line2 = await on(d, () => document.getElementById('rem-mail-line').textContent);
      check(/Set up/.test(line2), `${t} …and the line reads "Set up" when it is off`, line2);
      check(d.errors.length === 0, `${t} no page errors`, d.errors.join(' | '));
    } finally { await d.ctx.close(); }
  }
  /* no sync on this device: say so, no steps */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(p, (r) => r.abort());
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree')); await sleep(500);
  await page.click('#sb-tools-btn'); await sleep(300);
  await page.locator('#sb-tools .sb-mi', { hasText: 'Reminder emails' }).first().click(); await sleep(300);
  const nt = await page.evaluate(() => document.getElementById('remmail-box').innerText);
  check(/Cloud Sync/.test(nt) && !/Copy the helper/.test(nt), '67c with no sync set up the panel says sync is needed and shows no steps', nt.slice(0, 120));
  check(errs.length === 0, '67c …without page errors', errs.join(' | '));
  await ctx.close();
}

await browser.close(); await srv.close();
const bad = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed`);
process.exit(bad ? 1 : 0);
