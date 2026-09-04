/* shot — screenshots at the three real screen sizes, into tools/shots/.
   Assertions miss what a picture catches (something overlapping, a colour
   that vanished, text that wrapped to nothing). Not checked in — the folder
   is gitignored; look at them, then let them go.

     node tools/shot.mjs                # default view, three sizes
     node tools/shot.mjs f1 a1          # with a folder and note open
*/

import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, openApp, seedDB, VIEWPORTS } from './harness.mjs';

const [folder, article] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dir = join(ROOT, 'tools', 'shots');
await mkdir(dir, { recursive: true });

for (const vp of VIEWPORTS) {
  const app = await openApp({ viewport: { width: vp.width, height: vp.height }, db: seedDB() });
  await app.page.evaluate(([f, a]) => { if (f) ST.folder = f; if (a) ST.article = a; window.render(); }, [folder, article]);
  await app.page.waitForTimeout(200);
  const file = join(dir, `${vp.name}.png`);
  await app.page.screenshot({ path: file, fullPage: false });
  console.log(`${vp.name.padEnd(8)} ${vp.width}×${vp.height}  →  ${file}${app.errors.length ? `  (${app.errors.length} errors)` : ''}`);
  await app.close();
}
