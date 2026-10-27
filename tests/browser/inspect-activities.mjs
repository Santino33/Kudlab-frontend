// Authenticate the real inspector browser against the isolated runner, without storing/exporting cookies.
import { pathToFileURL } from 'node:url';
const skill = process.env.KUDLAB_TASTE_SKILL, target = process.argv[2];
if (!skill || !target || !target.startsWith('http://localhost:5173/academico/cursos/')) throw new Error('Use an explicit local synthetic activity URL and KUDLAB_TASTE_SKILL');
const { Browser } = await import(pathToFileURL(`${skill}/scripts/lib/cdp.mjs`).href);
const launch = Browser.launch.bind(Browser);
Browser.launch = async (...args) => {
  const browser = await launch(...args), page = await browser.newPage();
  await page.goto('http://localhost:5173');
  const status = await page.eval(async () => {
    const response = await fetch('http://localhost:4300/api/auth/sign-in/email', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'teacher-a@pilot.edu.co', password: 'TeacherPass1' }) });
    return response.status;
  });
  if (status !== 200) { await browser.close(); throw new Error('SYNTHETIC_INSPECTOR_LOGIN_FAILED'); }
  return browser;
};
process.argv = [process.argv[0], `${skill}/scripts/inspect.mjs`, target, '--app', '--out', process.env.KUDLAB_INSPECT_OUTPUT ?? '/tmp/opencode/j02-inspect'];
await import(pathToFileURL(`${skill}/scripts/inspect.mjs`).href);
