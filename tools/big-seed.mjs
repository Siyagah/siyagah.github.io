/* tools/big-seed.mjs — v05.81, J138: the big-notebook seed shared by block 139 (backup-big.mjs) and block 140 (savefile-big.mjs).
   The pictures are made INSIDE the page (random bytes, nothing compresses → _picPut into siyagah-pics-v1), so nothing big crosses to Node.
   About 5% of the notes are in Trash. */
export const PIC = 200 * 1024;
export const bigSizes = (MB) => {
  const NPICS = Math.max(30, Math.round((MB * 1048576) / PIC));
  return { MB, BIG: MB >= 300, PIC, NPICS, NNOTES: Math.max(10, Math.round(NPICS / 3)) };
};
export const seedBig = (page, { NPICS, NNOTES, PIC }) => page.evaluate(async ({ NPICS, NNOTES, PIC }) => {
  const shas = [];
  for (let i = 0; i < NPICS; i++) {
    const u8 = new Uint8Array(PIC);
    for (let o = 0; o < PIC; o += 65536) crypto.getRandomValues(u8.subarray(o, Math.min(PIC, o + 65536)));
    shas.push(await _picPut(new Blob([u8], { type: 'image/png' }), 'image/png'));
  }
  const now = new Date().toISOString(), arts = [], trash = [];
  let p = 0;
  for (let n = 0; n < NNOTES; n++) {
    const k = 1 + (n % 5); let html = '<p>Note ' + n + ' — ünïcode “quotes” & more</p>';
    for (let j = 0; j < k; j++) html += '<p>pic</p><img class="ed-img" data-pic="' + shas[p++ % shas.length] + '" data-mime="image/png" alt="">';
    const a = { id: 'bn' + n, title: 'Big note ' + n, content: html, folderIds: ['f1'], tags: ['big'], createdAt: now, updatedAt: now, kind: 'general' };
    if (n % 20 === 7) trash.push({ id: 'bt' + n, type: 'article', deletedAt: now, item: a }); else arts.push(a);
  }
  DB.articles = DB.articles.concat(arts); DB.trash = (DB.trash || []).concat(trash);
  persist();
  return { pics: shas.length, notes: arts.length, trashed: trash.length };
}, { NPICS, NNOTES, PIC });
