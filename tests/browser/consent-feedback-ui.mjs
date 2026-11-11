// Production UI, synthetic HTTP intercepted in Chromium; never writes to Backend/R2.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { Browser } from './vendor/cdp.mjs';
const origin = process.env.CONSENT_FRONTEND_ORIGIN ?? 'http://localhost:5218';
const api = process.env.CONSENT_API_ORIGIN ?? 'http://localhost:3218';
assert.equal(new URL(origin).hostname, 'localhost'); assert.equal(new URL(api).hostname, 'localhost');
const output = process.env.TASTE_SKILL_TMP ?? '/tmp/opencode/consent-feedback';
await mkdir(output, { recursive: true }); process.env.TASTE_SKILL_TMP = output;
const id = '00000000-0000-4000-8000-000000000001', group = '00000000-0000-4000-8000-000000000002';
let writes = 0, mode = 'reject', version = 0, denied = false;
let student = { id, groupId: group, studentCode: 'FEEDBACK-FICTICIO', firstName: 'Persona', lastName: 'Ficticia', isActive: false };
const record = { id, signedOn: '2026-01-01', receivedOn: '2026-01-01', mediaType: 'image/png', byteSize: 1, sha256: 'a'.repeat(64) };
const snapshot = () => ({ student, consent: { state: version ? 'CURRENT' : 'NONE', version, currentRecord: version ? record : null }, evaluatedAt: '2026-11-10T12:00:00.000Z' });
const browser = await Browser.launch(), page = await browser.newPage();
let stop, interceptError; const inFlight = new Set();
async function wait(fn) { await page.eval(async source => { const f = (0, eval)(`(${source})`); for (let i = 0; i < 400; i++) { if (f()) return; await new Promise(r => setTimeout(r, 25)); } throw Error('Missing UI condition: ' + source); }, fn.toString()); }
async function date(field, value) { await page.eval(({field,value}) => { const e = document.getElementById(`consent-${field}`); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, value); e.dispatchEvent(new Event('input', { bubbles: true })); }, {field,value}); }
async function submit() { await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await page.eval(() => document.getElementById('consent-file').form.requestSubmit()); }
async function file() { const doc = await page.send('DOM.getDocument'); const input = await page.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#consent-file' }); await page.send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [`${output}/synthetic.png`] }); }
async function refresh() { await page.eval(() => [...document.querySelectorAll('button')].find(e => e.textContent === 'Actualizar estado').click()); await wait(() => ![...document.querySelectorAll('button')].find(e => e.textContent === 'Actualizar estado')?.disabled); }
try {
  await page.send('Fetch.enable', { patterns: [{ urlPattern: api + '/*', requestStage: 'Request' }] });
  const intercept = async e => {
    const path = new URL(e.request.url).pathname; let status = 200, data;
    if (e.request.method === 'OPTIONS') data = {};
    else if (path.endsWith('/get-session')) data = { user: { id, email: 'ficticio@example.edu.co', name: 'Docente ficticio', role: 'TEACHER' }, session: { id: 'mock', expiresAt: '2099-01-01T00:00:00.000Z' } };
    else if (denied) { status = 403; data = { code: 'FORBIDDEN' }; }
    else if (path.endsWith('/consents') && e.request.method === 'POST') {
      writes++;
      if (mode === 'reject') { status = 400; data = { code: 'INVALID_INPUT', fields: [{ field: 'receivedOn', reason: 'future_date' }] }; }
      else if (mode === 'general') { status = 400; data = { code: 'INVALID_INPUT', fields: [{ field: 'metadata', reason: 'invalid_format' }] }; }
      else {
        const requestId = await page.eval(() => JSON.parse(sessionStorage.getItem('kudlab.consent-operation')).requestId);
        version++; student = { ...student, isActive: true }; status = 201;
        data = { acknowledgement: { requestId, eventId: id, recordId: id, version, confirmedAt: '2026-11-10T12:00:00.000Z', repeated: false }, snapshot: snapshot() };
      }
    } else if (path.endsWith('/consents')) data = snapshot();
    else if (path.endsWith('/consents/history') || path.endsWith('/task-assignments') || path.endsWith('/observations')) data = { items: [], nextCursor: null };
    else { status = 404; data = { code: 'NOT_FOUND' }; }
    await page.send('Fetch.fulfillRequest', { requestId: e.requestId, responseCode: status, responseHeaders: [
      {name:'Content-Type',value:'application/json'}, {name:'Access-Control-Allow-Origin',value:origin}, {name:'Access-Control-Allow-Credentials',value:'true'},
      {name:'Access-Control-Allow-Headers',value:'content-type'}, {name:'Access-Control-Allow-Methods',value:'GET,POST,OPTIONS'},
    ], body: Buffer.from(JSON.stringify(data)).toString('base64') }).catch(error => { if (!error.message.includes('Invalid InterceptionId')) throw error; });
  };
  stop = browser.on(page.sessionId, 'Fetch.requestPaused', e => { const task = intercept(e); inFlight.add(task); task.then(() => inFlight.delete(task), error => { inFlight.delete(task); interceptError ??= error; }); });
  await page.goto(`${origin}/academico/estudiantes/${id}`, { settleMs: 100 });
  await wait(() => Boolean(document.getElementById('consent-file')) && ![...document.querySelectorAll('button')].find(e => e.textContent === 'Actualizar estado').disabled);
  await writeFile(`${output}/synthetic.png`, 'synthetic only'); await file(); await date('signedOn','2026-01-01');
  await page.eval(() => document.getElementById('consent-file').form.querySelector('button[type="submit"]').focus());
  await page.send('Input.dispatchKeyEvent', {type:'keyDown', key:'Enter', code:'Enter', text:'\r', unmodifiedText:'\r', windowsVirtualKeyCode:13});
  await page.send('Input.dispatchKeyEvent', {type:'keyUp', key:'Enter', code:'Enter', windowsVirtualKeyCode:13});
  if (process.env.FEEDBACK_BEFORE) {
    await wait(() => Boolean(document.getElementById('consent-result').textContent));
    const before = await page.eval(() => ({ message: document.getElementById('consent-result').textContent, focus: document.activeElement.id, signedOn: document.getElementById('consent-signedOn-error').textContent, receivedOn: document.getElementById('consent-receivedOn-error').textContent }));
    assert.equal(before.focus,'consent-result'); assert.match(before.message,/Revisa los campos/); assert.match(before.signedOn,/anterior/); assert.equal(writes,0);
    await page.screenshot({ path: `${output}/before.png`, format:'png' });
    console.log(JSON.stringify({before,writes}));
  } else {
    await wait(() => document.activeElement.id === 'consent-receivedOn');
    assert.equal(await page.eval(() => document.getElementById('consent-signedOn-error').textContent),'');
    assert.equal(writes,0);
    await wait(() => Boolean(document.getElementById('consent-feedback')));
    assert.match(await page.eval(() => document.getElementById('consent-feedback').textContent),/fecha de recepción/);
    assert.equal(await page.eval(() => document.getElementById('consent-result').getAttribute('role')),null);
    // Same text restarts the deadline; inspect timers without changing app source.
    await page.eval(() => new Promise(r => setTimeout(r, 3500))); await submit();
    await page.eval(() => new Promise(r => setTimeout(r, 3500)));
    assert.equal(await page.eval(() => Boolean(document.getElementById('consent-feedback'))),true);
    await wait(() => !document.getElementById('consent-feedback'));
    assert.match(await page.eval(() => document.getElementById('consent-receivedOn-error').textContent),/fecha de recepción/);
    await date('signedOn',''); await submit(); await wait(() => document.activeElement.id === 'consent-signedOn');
    assert.equal(await page.eval(() => document.querySelectorAll('#consent-file, #consent-signedOn, #consent-receivedOn').length),3);
    for (const width of [1440,768,390,320]) {
      await page.setViewport({width,height:900}); await submit();
      await page.eval(() => new Promise(r => setTimeout(r, 250)));
      assert.equal(await page.eval(() => document.documentElement.scrollWidth <= innerWidth),true);
      const layout = await page.eval(() => { const card=document.getElementById('consent-feedback').getBoundingClientRect(), field=document.activeElement.getBoundingClientRect(); return {inside:card.left>=0 && card.right<=innerWidth,overlap:card.left<field.right && card.right>field.left && card.top<field.bottom && card.bottom>field.top}; });
      assert.equal(layout.inside,true); assert.equal(layout.overlap,false);
      await page.screenshot({path:`${output}/feedback-${width}.png`,format:'png'});
    }
    await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await page.eval(() => {document.documentElement.style.fontSize='200%';}); await submit();
    assert.equal(await page.eval(() => document.documentElement.scrollWidth <= innerWidth),true);
    assert.equal(await page.eval(() => getComputedStyle(document.getElementById('consent-feedback')).animationName),'none');
    await page.screenshot({path:`${output}/feedback-zoom-reduced.png`,format:'png'});
    const ax=await page.send('Accessibility.getFullAXTree');
    assert.ok(ax.nodes.some(n=>n.name?.value==='Fecha de firma' && n.description?.value?.includes('Indica la fecha de firma.')));
    await page.eval(() => {document.documentElement.style.fontSize='';}); await page.setViewport({width:1440,height:900});
    await date('signedOn','2026-01-01'); await date('receivedOn','2026-01-01');
    await wait(() => !document.getElementById('consent-signedOn-error').textContent && !document.getElementById('consent-receivedOn-error').textContent);
    await submit(); await wait(() => document.activeElement.id==='consent-receivedOn' && document.getElementById('consent-receivedOn-error').textContent.includes('futura'));
    assert.equal(writes,1); assert.equal(await page.eval(()=>document.getElementById('consent-file').files.length),1);
    await date('receivedOn','2026-01-02'); mode='success'; await submit();
    await wait(()=>document.body.textContent.includes('El consentimiento se guardó.') && document.getElementById('consent-title').closest('section').textContent.includes('Estado actual del estudiante: Activo'));
    assert.equal(writes,2);
    await file(); await submit(); await wait(()=>Boolean(document.getElementById('consent-feedback')));
    assert.doesNotMatch(await page.eval(()=>document.getElementById('consent-feedback').textContent),/inactivo|no se ha activado/i);
    assert.equal(writes,2);
    await date('signedOn','2026-01-01'); await date('receivedOn','2026-01-01'); mode='general'; await submit();
    await wait(()=>document.activeElement.id==='consent-result'); assert.equal(writes,3);
    student={...student,groupId:'00000000-0000-4000-8000-000000000003'}; await refresh();
    await wait(()=>!document.getElementById('consent-feedback') && document.getElementById('consent-signedOn').value==='');
    await submit(); denied=true; await refresh();
    await wait(()=>!document.getElementById('consent-file'));
    assert.equal(await page.eval(()=>Boolean(document.getElementById('consent-feedback'))),false);
    console.log(JSON.stringify({ok:true,writes,backendRequests:0,checks:['missing dates and focus','6s timer restart','persistent errors','server rejection','confirmed registration','active renewal','general error','scope and access loss','responsive/AX/reduced motion']}));
  }
} catch (error) {
  console.error(await page.eval(() => ({focus:document.activeElement?.id,result:document.getElementById('consent-result')?.textContent,fields:['signedOn','receivedOn'].map(f=>({field:f,value:document.getElementById(`consent-${f}`)?.value,error:document.getElementById(`consent-${f}-error`)?.textContent}))})));
  throw error;
} finally { stop?.(); await Promise.allSettled([...inFlight]); await browser.close(); if(interceptError) throw interceptError; }
