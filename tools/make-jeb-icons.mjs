/* Renders the Siyagah Jeb PNG icons from icons/icon-jeb.svg (v05.04, J5).
   Run: node tools/make-jeb-icons.mjs   — the SVG is the source; the PNGs are output. */
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { playwright } from './harness.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(join(ROOT, 'icons', 'icon-jeb.svg'), 'utf8');
/* maskable: full-bleed background (no rounded corners), art kept inside the safe zone */
const maskable = svg.replace(' rx="88"', '');
const jobs = [
  ['icon-jeb-192.png', 192, svg],
  ['icon-jeb-512.png', 512, svg],
  ['icon-jeb-maskable-512.png', 512, maskable],
  ['apple-touch-icon-jeb.png', 180, maskable],   /* iOS rounds the corners itself */
];
const pw = await playwright();
const browser = await pw.chromium.launch();
for (const [name, px, src] of jobs) {
  const page = await browser.newPage({ viewport: { width: px, height: px } });
  await page.setContent(`<body style="margin:0">${src.replace(/width="512" height="512"/, `width="${px}" height="${px}"`)}</body>`);
  await writeFile(join(ROOT, 'icons', name), await page.screenshot({ clip: { x: 0, y: 0, width: px, height: px } }));
  await page.close();
  console.log('wrote', name, px + 'x' + px);
}
await browser.close();
