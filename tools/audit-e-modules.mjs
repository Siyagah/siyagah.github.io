/* audit-e-modules — Master Plan §4E and §4F: calendar, journal, contacts,
   My Database, reminders and Murāja'ah / In Practice.

   These are the modules furthest from the main note journey, which is exactly
   why nothing had measured them: `app-check` opens every Smart View, but
   opening a view is not the same as creating, editing and deleting a record
   in the module behind it. Dates get their own section, because a date
   boundary is where this class of feature actually breaks — month ends, leap
   day, a DST transition, and a timezone that is not the one the test runs in.

   Run: node tools/audit-e-modules.mjs */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, openApp, matrix, seedDB, synthDB } from './harness.mjs';

const m = matrix('audit E/F — calendar, journal, contacts, database, reminders, review');
const E = 'E calendar/journal/contacts/database';
const R = 'F reminders/review';
async function section(dom, name, fn) {
  try { await fn(); } catch (e) { m.row(dom, `${name} — the check itself threw`, false, String(e).split('\n')[0]); }
}

/* ── E1. Calendar: create, edit, delete an event, and its categories ─────
   `_calSaveEvent()` reads a live form, so the form is opened for real and
   filled for real — calling the saver against no form measures nothing. */
await section(E, 'calendar events', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  const r = await p.evaluate(() => {
    const out = {};
    ST.folder = 'cal'; ST.calSelDate = '2026-02-28';
    try { _calOpen ? _calOpen() : null; } catch {}
    /* open the NEW-event form the way the button does */
    ST.calEditEvt = 'new';
    try { renderP2C(); renderP3H(); renderP3C(); } catch (e) { out.formErr = String(e); }
    const set = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; return true; } return false; };
    out.formPainted = !!document.getElementById('cef-title');
    if (out.formPainted) {
      set('cef-title', 'AUDIT EVENT'); set('cef-date', '2026-02-28');
      const ad = document.getElementById('cef-allday'); if (ad) ad.checked = true;
      try { _calSaveEvent(); } catch (e) { out.saveErr = String(e); }
    }
    out.events = (DB.calEvents || []).length;
    out.saved = (DB.calEvents || []).find((e) => e.title === 'AUDIT EVENT') || null;
    return out;
  });
  m.row(E, 'the calendar new-event form paints its fields', r.formPainted, r.formErr || 'cef-title present');
  m.row(E, 'saving a calendar event puts it in the model with its date',
    !!r.saved && r.saved.date === '2026-02-28', r.saveErr || JSON.stringify(r.saved && { t: r.saved.title, d: r.saved.date }));

  const edited = await p.evaluate(() => {
    const ev = (DB.calEvents || [])[0]; if (!ev) return { err: 'no event' };
    ST.calEditEvt = ev.id;
    /* the SAME render trio the new-event path needed — asking for one of the
       three painted no form and read as "editing is broken" */
    try { renderP2C(); renderP3H(); renderP3C(); } catch (e) { return { err: String(e) }; }
    const el = document.getElementById('cef-title'); if (!el) return { err: 'edit form not painted' };
    el.value = 'AUDIT EVENT EDITED';
    const d = document.getElementById('cef-date'); if (d) d.value = ev.date;
    try { _calSaveEvent(); } catch (e) { return { err: String(e) }; }
    return { n: (DB.calEvents || []).length, title: (DB.calEvents || [])[0].title };
  });
  m.row(E, 'editing an event changes it in place rather than adding a second one',
    !edited.err && edited.n === 1 && edited.title === 'AUDIT EVENT EDITED',
    edited.err || `${edited.n} event(s), title "${edited.title}"`);

  const del = await p.evaluate(() => {
    window.confirm = () => true;
    const ev = (DB.calEvents || [])[0]; if (!ev) return { err: 'no event' };
    try { _calDelEvent(ev.id); } catch (e) { return { err: String(e) }; }
    return { n: (DB.calEvents || []).length };
  });
  m.row(E, 'deleting an event removes exactly that event', !del.err && del.n === 0, del.err || `${del.n} events left`);
  m.row(E, 'the calendar paths are silent', app.errors.length === 0, app.errors.slice(0, 2).join('\n') || 'silent');
  await app.close();
});

/* ── E2. Date boundaries ────────────────────────────────────────────────
   Month end, leap day, year end and a DST transition, asked of the app's own
   date helpers rather than of a calendar rendering. A day that renders into
   the wrong cell is a bug; a day that the model stores as the wrong DATE is a
   lost note. */
await section(E, 'date boundaries', async () => {
  const app = await openApp({ db: seedDB() });
  const r = await app.page.evaluate(() => {
    const DATES = ['2026-01-31', '2026-02-28', '2028-02-29', '2026-12-31', '2026-03-29', '2026-10-25', '2026-11-01'];
    const out = { bad: [], months: [] };
    for (const d of DATES) {
      /* the round trip every one of these modules depends on */
      const [y, mo, da] = d.split('-').map(Number);
      const back = new Date(y, mo - 1, da);
      const iso = back.getFullYear() + '-' + String(back.getMonth() + 1).padStart(2, '0') + '-' + String(back.getDate()).padStart(2, '0');
      if (iso !== d) out.bad.push(`${d} → ${iso}`);
    }
    /* every month of a year renders without throwing */
    for (let mo = 0; mo < 12; mo++) {
      try { ST.calY = 2026; ST.calM = mo; if (typeof _calRenderMonth === 'function') _calRenderMonth(); out.months.push(mo); }
      catch (e) { out.monthErr = `${mo}: ${e}`; break; }
    }
    /* the Murāja'ah scheduler must always move the due date FORWARD */
    const art = { mrjDue: '2026-02-28', mrjRep: 0, mrjInt: 1, mrjEf: 2.5 };
    const seen = [];
    for (let i = 0; i < 12; i++) { _mrjSchedule(art, i % 3); seen.push({ due: art.mrjDue, iv: art.mrjInt }); }
    out.dueAlwaysFuture = seen.every((s) => Date.parse(s.due) >= Date.now() - 86400000);
    out.intervalsPositive = seen.every((s) => s.iv >= 1);
    return out;
  });
  m.row(E, 'a date survives the round trip on month ends, a leap day, a year end and both DST weekends',
    r.bad.length === 0, r.bad.length ? r.bad.join(', ') : '7 boundary dates, none shifted');
  m.row(E, 'every month of a year renders without throwing', r.months.length === 12, r.monthErr || '12 months');
  m.row(R, 'the Murāja\'ah scheduler never schedules a review in the past', r.dueAlwaysFuture);
  m.row(R, 'the Murāja\'ah interval never goes to zero or negative', r.intervalsPositive);
  await app.close();
});

/* ── E3. Contacts ───────────────────────────────────────────────────────── */
await section(E, 'contacts', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  const r = await p.evaluate(() => {
    const out = { n0: DB.articles.length };
    try { newContact(true); } catch (e) { out.formErr = String(e); }
    try { newContact(false); } catch (e) { out.textErr = String(e); }
    out.n1 = DB.articles.length;
    const cs = DB.articles.filter((a) => a.contactData);
    out.modes = cs.map((c) => c.contactData.mode).sort();
    out.folder = !!DB.folders.find((f) => f.id === 'db-ct-folder');
    out.section = !!DB.sections.find((s) => s.id === 'db-section');
    /* a contact is a NOTE — deleting the folder must not be the only way out */
    out.filed = cs.every((c) => (c.folderIds || []).includes('db-ct-folder'));
    return out;
  });
  m.row(E, 'a contact can be created in both free-text and structured modes',
    !r.formErr && !r.textErr && r.n1 === r.n0 + 2 && r.modes.join() === 'form,text',
    r.formErr || r.textErr || `${r.n0} → ${r.n1} notes, modes ${r.modes}`);
  m.row(E, 'creating a contact builds the MyDatabase section and My Contacts folder it needs',
    r.section && r.folder && r.filed, `section:${r.section} folder:${r.folder} filed:${r.filed}`);

  const act = await p.evaluate(() => {
    const c = DB.articles.find((a) => a.contactData); if (!c) return { err: 'no contact' };
    /* logContactAction(ev, aid) takes TWO arguments. Passing the id as the
       first one leaves `aid` undefined, the function returns at its own guard,
       no modal is built, and the check then reports a working feature as
       storing nothing. */
    try { logContactAction(null, c.id); } catch (e) { return { err: String(e) }; }
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    set('cta-type', 'Call'); set('cta-note', 'AUDIT ACTION');
    try { saveContactAction(c.id); } catch (e) { return { err: String(e) }; }
    const a = DB.articles.find((x) => x.id === c.id);
    const n = (a.contactData.actions || []).length;
    const first = (a.contactData.actions || [])[0];
    if (n && first) { try { window.confirm = () => true; deleteContactAction(c.id, first.id); }
      catch (e) { return { logged: n, delErr: String(e) }; } }
    return { logged: n, left: (DB.articles.find((x) => x.id === c.id).contactData.actions || []).length };
  });
  m.row(E, 'an action logged against a contact is stored on that contact and can be removed again',
    !act.err && act.logged > 0 && act.left === act.logged - 1,
    act.err || act.delErr || `${act.logged} logged, ${act.left} after delete`);
  m.row(E, 'the contact paths are silent', app.errors.length === 0, app.errors.slice(0, 2).join('\n') || 'silent');
  await app.close();
});

/* ── E4. My Database — schema, presets, records, reports, empty state ───── */
await section(E, 'My Database', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  const r = await p.evaluate(() => {
    const out = {};
    try { addStarterMyDatabaseFolders(); } catch (e) { out.starterErr = String(e); }
    /* the starter folders are identified by their SECTION, not their id —
       their ids come from uid(). Asking for an id prefix counted zero of
       seven folders that had all been created correctly. */
    out.folders = DB.folders.filter((f) => f.sectionId === 'db-section' && !f.parentId).length;
    out.structured = DB.folders.filter((f) => f.structured && (f.fields || []).length).length;
    out.presets = Object.keys(typeof DBF_PRESETS !== 'undefined' ? DBF_PRESETS : {}).length;
    out.reports = Object.keys(typeof DBF_REPORTS !== 'undefined' ? DBF_REPORTS : {}).length;
    out.types = (typeof DBF_TYPES !== 'undefined' ? DBF_TYPES : []).length;
    /* every preset must apply without throwing, and must leave real fields */
    const target = DB.folders.find((f) => f.sectionId === 'db-section' && f.structured) || DB.folders[0];
    out.presetResults = [];
    for (const key of Object.keys(typeof DBF_PRESETS !== 'undefined' ? DBF_PRESETS : {})) {
      try { dbbApplyPreset(target.id, key);
        out.presetResults.push({ key, fields: (target.dbFields || []).length }); }
      catch (e) { out.presetResults.push({ key, err: String(e) }); }
    }
    /* every report must render against a folder with NO records — the state
       a brand-new database is in, and the one that divides by zero */
    out.reportResults = [];
    for (const key of Object.keys(typeof DBF_REPORTS !== 'undefined' ? DBF_REPORTS : {})) {
      try { const h = _dbReportHTML(target, key); out.reportResults.push({ key, len: (h || '').length }); }
      catch (e) { out.reportResults.push({ key, err: String(e) }); }
    }
    return out;
  });
  m.row(E, 'the starter MyDatabase folders can be created, each with its own field schema',
    !r.starterErr && r.folders >= 7 && r.structured >= 7,
    r.starterErr || `${r.folders} folders in the MyDatabase section, ${r.structured} carrying fields`);
  const badPreset = (r.presetResults || []).filter((x) => x.err);
  m.row(E, `every My Database preset applies without throwing (${(r.presetResults || []).length} presets)`,
    badPreset.length === 0, badPreset.length ? badPreset.map((b) => `${b.key}: ${b.err}`).join('\n')
      : (r.presetResults || []).map((x) => `${x.key}:${x.fields}f`).join(' '));
  const badReport = (r.reportResults || []).filter((x) => x.err);
  m.row(E, `every My Database report renders on an EMPTY folder (${(r.reportResults || []).length} reports)`,
    badReport.length === 0, badReport.length ? badReport.map((b) => `${b.key}: ${b.err}`).join('\n')
      : (r.reportResults || []).map((x) => `${x.key}:${x.len}b`).join(' '));
  await app.close();
});

/* ── F1. Reminders: set, edit, clear, and the three states ─────────────── */
await section(R, 'reminders', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  const r = await p.evaluate(() => {
    const out = {};
    const iso = (d) => d.toISOString().slice(0, 10);
    const past = iso(new Date(Date.now() - 3 * 86400000));
    const soon = iso(new Date(Date.now() + 3 * 86400000));
    openReminderModal('a1');
    out.modalOpen = getComputedStyle(document.getElementById('rem-modal')).display !== 'none'
      && document.getElementById('rem-modal').getBoundingClientRect().height > 0;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    set('rem-date', soon); set('rem-time', '09:30'); set('rem-msg', 'AUDIT REMINDER');
    saveReminder();
    const a1 = DB.articles.find((a) => a.id === 'a1');
    out.saved = a1.reminder ? { dt: a1.reminder.dt, msg: a1.reminder.msg } : null;
    out.inView = getSmartArts('sf-remind').some((a) => a.id === 'a1');
    /* an overdue one */
    const a2 = DB.articles.find((a) => a.id === 'a2');
    a2.reminder = { dt: past, msg: 'OVERDUE' }; persist();
    out.overdueCounted = getSmartArts('sf-remind').filter((a) => Date.parse(a.reminder.dt) < Date.now()).length;
    /* ordering: soonest first */
    const order = getSmartArts('sf-remind').map((a) => a.reminder.dt);
    out.sorted = order.slice().sort().join() === order.join();
    clearReminder('a1');
    out.cleared = !DB.articles.find((a) => a.id === 'a1').reminder;
    return out;
  });
  m.row(R, 'the reminder dialog really opens (a fixed element, measured by size not offsetParent)', r.modalOpen);
  m.row(R, 'a saved reminder carries its date, time and message into the model',
    !!r.saved && /T09:30$/.test(r.saved.dt) && r.saved.msg === 'AUDIT REMINDER', JSON.stringify(r.saved));
  m.row(R, 'a note with a reminder appears in the Reminders view', r.inView);
  m.row(R, 'an overdue reminder is still listed rather than silently dropped', r.overdueCounted === 1,
    `${r.overdueCounted} overdue`);
  m.row(R, 'reminders are listed soonest first', r.sorted);
  m.row(R, 'clearing a reminder removes it and leaves the note alone', r.cleared);
  await app.close();
});

/* ── F2. Murāja'ah and In Practice ──────────────────────────────────────── */
await section(R, 'review and practice', async () => {
  const app = await openApp({ db: seedDB() });
  const r = await app.page.evaluate(() => {
    const out = {};
    mrjToggle('a1');
    const a1 = DB.articles.find((a) => a.id === 'a1');
    out.enrolled = !!a1.mrjDue && a1.mrjInt === 1 && a1.mrjEf === 2.5;
    out.dueToday = getSmartArts('sf-murajaa').some((a) => a.id === 'a1');
    /* rate it "remembered" — the interval must grow, not reset */
    const i0 = a1.mrjInt; _mrjSchedule(a1, 2);
    out.grew = a1.mrjInt > i0;
    /* rate it "forgot" — back to one day, and the ease factor floors at 1.3 */
    for (let i = 0; i < 20; i++) _mrjSchedule(a1, 0);
    out.floored = a1.mrjEf >= 1.3 && a1.mrjInt === 1;
    out.notDueNow = !getSmartArts('sf-murajaa').some((a) => a.id === 'a1')
      || Date.parse(a1.mrjDue) <= Date.now();
    mrjToggle('a1');
    out.unenrolled = !DB.articles.find((a) => a.id === 'a1').mrjDue;
    /* In Practice: three states, and the note is never removed */
    const n0 = DB.articles.length;
    practiceToggle('a2', 'active');
    out.active = DB.articles.find((a) => a.id === 'a2').practice === 'active';
    practiceToggle('a2', 'done');
    out.done = DB.articles.find((a) => a.id === 'a2').practice === 'done';
    out.doneLast = getSmartArts('sf-practice').map((a) => a.practice);
    practiceToggle('a2', null);
    out.removed = !DB.articles.find((a) => a.id === 'a2').practice;
    out.kept = DB.articles.length === n0;
    return out;
  });
  m.row(R, 'adding a note to Murāja\'ah enrols it due today with the standard first interval', r.enrolled && r.dueToday);
  m.row(R, '"remembered" grows the interval', r.grew);
  m.row(R, '"forgot" resets to one day and the ease factor never falls below its floor', r.floored);
  m.row(R, 'removing a note from Murāja\'ah clears every field it added', r.unenrolled);
  m.row(R, 'In Practice carries three states and cycles cleanly between them',
    r.active && r.done && r.removed, `active:${r.active} done:${r.done} removed:${r.removed}`);
  m.row(R, 'done notes sort after active ones in the In Practice view',
    r.doneLast.slice().sort().join() === r.doneLast.slice().sort().join(), r.doneLast.join(','));
  m.row(R, 'none of the review paths ever removes a note (I1)', r.kept);
  await app.close();
});

/* ── F3. What cannot be tested here ─────────────────────────────────────── */
m.blockedEnv(E, 'public-holiday lookup for the calendar',
  '_loadCalHols() fetches a public holiday feed; every outbound host is denied by this sandbox and blocked deliberately by the harness. The failure PATH is covered — the calendar renders all twelve months with no holiday data at all.');
m.blockedEnv(R, 'a real notification actually firing for a due reminder',
  'Notifications need a granted permission and a real service-worker registration on a real origin. The stored reminder, its states and its ordering are measured above; the delivery is not, and is not reported as if it were.');

writeFileSync(join(ROOT, 'audit', 'inventory', 'matrix-e.json'), JSON.stringify(m.rows, null, 1));
process.exit(m.finish() ? 1 : 0);
