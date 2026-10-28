// Authenticate the real inspector browser against the isolated runner, without storing/exporting cookies.
import { pathToFileURL } from 'node:url';
const skill = process.env.KUDLAB_TASTE_SKILL, target = process.argv[2];
const teacherOrigin = process.env.KUDLAB_TEACHER_ORIGIN ?? 'http://localhost:5173', apiOrigin = process.env.KUDLAB_API_ORIGIN ?? 'http://localhost:4300';
if (![teacherOrigin, apiOrigin].every(value => /^http:\/\/localhost:\d+$/.test(value)) || !skill || !target || !target.startsWith(`${teacherOrigin}/academico/cursos/`)) throw new Error('Use an explicit local synthetic activity URL and KUDLAB_TASTE_SKILL');
const { Browser } = await import(pathToFileURL(`${skill}/scripts/lib/cdp.mjs`).href);
const launch = Browser.launch.bind(Browser);
Browser.launch = async (...args) => {
  const browser = await launch(...args), page = await browser.newPage();
  await page.goto(teacherOrigin);
  const status = await page.eval(async (origin) => {
    const response = await fetch(`${origin}/api/auth/sign-in/email`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'teacher-a@pilot.edu.co', password: 'TeacherPass1' }) });
    return response.status;
  }, apiOrigin);
  if (status !== 200) { await browser.close(); throw new Error('SYNTHETIC_INSPECTOR_LOGIN_FAILED'); }
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => {
    const page = await newPage(...args), goto = page.goto.bind(page);
    page.goto = async (url, ...options) => {
      const result = await goto(url, ...options);
      if (url === target) await page.eval(async () => {
        for (let n = 0; n < 75; n++) {
          if (document.querySelector('.classroom-roster')) {
            const hide = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Ocultar códigos' || b.textContent === 'Ocultar códigos');
            if (!hide) throw new Error('HIDE_CODES_CONTROL_REQUIRED');
            hide.click();
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        throw new Error('LOADED_CLASSROOM_REQUIRED');
      });
      return result;
    };
    return page;
  };
  return browser;
};
process.argv = [process.argv[0], `${skill}/scripts/inspect.mjs`, target, '--app', '--out', process.env.KUDLAB_INSPECT_OUTPUT ?? '/tmp/opencode/j02-inspect'];
await import(pathToFileURL(`${skill}/scripts/inspect.mjs`).href);
