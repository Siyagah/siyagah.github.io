/* Investigative probe — does the export sanitiser remove the debris that is
   actually sitting in the committed index.html? Not a check; evidence. */
import { openApp } from '../../tools/harness.mjs';

const s = await openApp();
const out = await s.page.evaluate(() => {
  /* Reproduce EXACTLY the classes of debris found in the shipped index.html */
  const ifr = document.createElement('iframe');
  ifr.setAttribute('ng-non-bindable','');
  ifr.setAttribute('aria-hidden','true');
  ifr.id = 'I0_9999999999';
  ifr.src = 'https://aaas-notebook.firebaseapp.com/__/auth/iframe?apiKey=PROBE_APIKEY_MARKER&appName=siyagah-main';
  document.body.appendChild(ifr);

  const sec = document.createElement('section');       /* id only, no class */
  sec.id = 'id-recall-widget-root';
  sec.setAttribute('style','background: initial; border: initial;');
  document.body.appendChild(sec);

  const tp = document.createElement('div');
  tp.id = 'tab-picker'; tp.className = 'open';
  tp.innerHTML = '<div class="tp-list"><div class="tp-it" onclick="addToTabPicker(\'probeid123\')">'
               + '<span>PROBE_PRIVATE_NOTE_TITLE</span><span class="tp-it-sub">📁 PROBE_PRIVATE_FOLDER</span></div></div>';
  document.body.appendChild(tp);

  const nti = document.createElement('div'); nti.id='nti-picker'; nti.textContent='PROBE_NTI'; document.body.appendChild(nti);
  const jrn = document.createElement('div'); jrn.id='jrn-picker'; jrn.textContent='PROBE_JRN'; document.body.appendChild(jrn);
  const ebp = document.createElement('div'); ebp.id='eb-pop'; ebp.className='fl-pop'; ebp.textContent='PROBE_EBPOP'; document.body.appendChild(ebp);

  /* Deploy Export is the one the code says must be "an empty shell" so that
     "visitors who view the page source see no private data". */
  const deployHTML = getExportHTML(JSON.stringify({folders:[],articles:[],sections:[],trash:[]}));
  const saveHTML   = getExportHTML();

  const probe = (h) => ({
    gapiIframe:      h.includes('PROBE_APIKEY_MARKER'),
    recallSection:   h.includes('id-recall-widget-root'),
    privateTitle:    h.includes('PROBE_PRIVATE_NOTE_TITLE'),
    privateFolder:   h.includes('PROBE_PRIVATE_FOLDER'),
    noteIdLeak:      h.includes('probeid123'),
    ntiPicker:       h.includes('PROBE_NTI'),
    jrnPicker:       h.includes('PROBE_JRN'),
    ebPop:           h.includes('PROBE_EBPOP'),
  });
  return { deploy: probe(deployHTML), save: probe(saveHTML), deployBytes: deployHTML.length };
});
console.log('DEPLOY EXPORT (must be an empty shell):', JSON.stringify(out.deploy, null, 2));
console.log('SAVE FILE EXPORT:', JSON.stringify(out.save, null, 2));
console.log('deploy bytes:', out.deployBytes);
console.log('boot errors:', s.errors);
await s.close();
