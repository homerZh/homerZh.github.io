import { app } from './cloudbase-client.js';
import { shanghaiInput, recordedTimestamp, displayShanghai } from './blood-pressure-time.mjs';

const $ = id => document.getElementById(id);
const { adminUid } = window.CLOUDBASE_CONFIG;
const auth = app.auth, db = app.rdb();
let allowed = false, busy = false;

function checked(result) { if (result.error) throw result.error; return result.data; }
function isAdmin(session) { return session?.user?.id === adminUid; }
function mode() { return document.querySelector('input[name="time-mode"]:checked').value; }
function glucoseMode() { return document.querySelector('input[name="glucose-time-mode"]:checked').value; }
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
  if (!error) $('retry').hidden = true;
}
function controls() {
  document.querySelectorAll('button').forEach(button => {
    button.disabled = busy || (!allowed && !!button.closest('#record-form, #glucose-form, .history'));
  });
  document.querySelectorAll('#record-form input').forEach(input => {
    input.disabled = busy || !allowed || (input.id === 'recorded-at' && mode() === 'current');
  });
  document.querySelectorAll('#glucose-form input, #glucose-form select').forEach(input => {
    input.disabled = busy || !allowed || (input.id === 'glucose-recorded-at' && glucoseMode() === 'current') ||
      (input.id === 'after-meal-minutes' && $('glucose-relation').value !== 'after_meal');
  });
}
function syncTime() {
  const now = shanghaiInput();
  $('recorded-at').max = now;
  if (mode() === 'current') $('recorded-at').value = now;
  $('time-hint').textContent = mode() === 'current' ? '保存时会采用当前时间。' : '选择测量时的日期和时间（北京时间）。';
  $('glucose-recorded-at').max = now;
  if (glucoseMode() === 'current') $('glucose-recorded-at').value = now;
  $('glucose-time-hint').textContent = glucoseMode() === 'current' ? '保存时会采用当前时间。' : '选择测量时的日期和时间（北京时间）。';
  controls();
}
function syncMealRelation() {
  const afterMeal = $('glucose-relation').value === 'after_meal';
  $('after-meal-field').hidden = !afterMeal;
  if (!afterMeal) $('after-meal-minutes').value = '';
  controls();
}
function clearPrivate() {
  allowed = false;
  $('login').hidden = false;
  $('logout').hidden = true;
  $('records').replaceChildren();
  $('glucose-records').replaceChildren();
  $('record-form').reset();
  $('glucose-form').reset();
  syncMealRelation();
  syncTime();
}
async function requireAdmin() {
  const data = checked(await auth.getSession());
  if (!isAdmin(data?.session)) { clearPrivate(); throw new Error('请先用 homer 登录。'); }
}
function addValue(item, label, number, unit) {
  const cell = document.createElement('div');
  const title = document.createElement('small'); title.textContent = label;
  const value = document.createElement('strong'); value.textContent = String(number);
  const suffix = document.createElement('small'); suffix.textContent = ` ${unit}`;
  cell.append(title, value, suffix); item.append(cell);
}
async function readRecords() {
  await requireAdmin();
  const rows = checked(await db.from('blood_pressure_records')
    .select('id,recorded_at,systolic,diastolic,pulse')
    .order('recorded_at', { ascending: false }).limit(50));
  const list = $('records'); list.replaceChildren();
  if (!rows?.length) {
    const empty = document.createElement('li'); empty.className = 'empty'; empty.textContent = '暂无记录。'; list.append(empty); return;
  }
  for (const row of rows) {
    const item = document.createElement('li');
    const date = document.createElement('time'); date.dateTime = row.recorded_at; date.textContent = displayShanghai(row.recorded_at);
    item.append(date);
    addValue(item, '上压', row.systolic, 'mmHg');
    addValue(item, '下压', row.diastolic, 'mmHg');
    addValue(item, '心跳', row.pulse, '次/分钟');
    list.append(item);
  }
}
const relationLabels = { fasting: '空腹', before_meal: '餐前', after_meal: '餐后' };
async function readGlucoseRecords() {
  await requireAdmin();
  const rows = checked(await db.from('blood_glucose_records')
    .select('id,recorded_at,glucose_mmol_l,meal_relation,after_meal_minutes')
    .order('recorded_at', { ascending: false }).limit(50));
  const list = $('glucose-records'); list.replaceChildren();
  if (!rows?.length) {
    const empty = document.createElement('li'); empty.className = 'empty'; empty.textContent = '暂无记录。'; list.append(empty); return;
  }
  for (const row of rows) {
    const item = document.createElement('li');
    const date = document.createElement('time'); date.dateTime = row.recorded_at; date.textContent = displayShanghai(row.recorded_at);
    item.append(date);
    addValue(item, '血糖', row.glucose_mmol_l, 'mmol/L');
    const relation = document.createElement('div'); relation.className = 'glucose-relation';
    relation.textContent = relationLabels[row.meal_relation] || row.meal_relation;
    item.append(relation);
    const interval = document.createElement('div'); interval.className = 'glucose-interval';
    interval.textContent = row.meal_relation === 'after_meal' && row.after_meal_minutes != null
      ? `餐后 ${row.after_meal_minutes} 分钟` : '';
    item.append(interval);
    list.append(item);
  }
}
async function readAllRecords() {
  await readRecords();
  await readGlucoseRecords();
}
async function run(action) {
  if (busy) return;
  busy = true; controls();
  try { await action(); }
  catch (error) {
    const code = String(error?.code || '');
    const message = /42P01|PGRST205/.test(code) ? '记录表尚未创建。' :
      /42501/.test(code) ? '数据库拒绝访问，请检查账号权限。' :
      error instanceof Error && !code ? error.message : '操作失败，请检查网络或数据库配置。';
    const safeCode = /^[A-Za-z0-9_.-]{1,80}$/.test(code) ? code : '';
    status(message + (safeCode ? `（错误码：${safeCode}）` : ''), true);
    $('retry').hidden = false;
  } finally { busy = false; controls(); }
}
document.querySelectorAll('input[name="time-mode"]').forEach(input => input.addEventListener('change', syncTime));
document.querySelectorAll('input[name="glucose-time-mode"]').forEach(input => input.addEventListener('change', syncTime));
$('glucose-relation').addEventListener('change', syncMealRelation);
setInterval(() => { if (!busy) syncTime(); }, 30000);
$('login').addEventListener('submit', event => { event.preventDefault(); void run(async () => {
  status('正在登录…');
  const password = $('password').value; $('password').value = '';
  checked(await auth.signInWithPassword({ username: $('username').value.trim(), password }));
  const data = checked(await auth.getSession());
  if (!isAdmin(data?.session)) { checked(await auth.signOut()); throw new Error('此账号没有记录权限。'); }
  allowed = true; $('login').hidden = true; $('logout').hidden = false;
  await readAllRecords(); status('已从云端读取。');
}); });
$('record-form').addEventListener('submit', event => { event.preventDefault(); void run(async () => {
  const values = ['systolic', 'diastolic', 'pulse'].map(id => $('' + id).value);
  if (values.some(value => value === '' || !Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 300)) {
    throw new Error('上压、下压和心跳需填写 1–300 的整数。');
  }
  const recordedAt = recordedTimestamp(mode(), $('recorded-at').value);
  await requireAdmin();
  checked(await db.from('blood_pressure_records').insert({
    recorded_at: recordedAt, systolic: Number(values[0]), diastolic: Number(values[1]), pulse: Number(values[2])
  }));
  for (const id of ['systolic', 'diastolic', 'pulse']) $(id).value = '';
  syncTime();
  try { await readRecords(); status('已保存到云端。'); }
  catch { status('已保存，但刷新失败。请重新读取，不要重复提交。', true); }
}); });
$('reload').addEventListener('click', () => void run(async () => { await readRecords(); status('已从云端重新读取。'); }));
$('glucose-form').addEventListener('submit', event => { event.preventDefault(); void run(async () => {
  const glucose = Number($('glucose-value').value);
  if (!/^\d+(?:\.\d{1,2})?$/.test($('glucose-value').value) || glucose < 0.01 || glucose > 100) {
    throw new Error('血糖请填写 0.01–100 之间、最多两位小数的数值。');
  }
  const relation = $('glucose-relation').value;
  if (!Object.hasOwn(relationLabels, relation)) throw new Error('请选择空腹、餐前或餐后。');
  const intervalText = $('after-meal-minutes').value;
  const interval = relation === 'after_meal' && intervalText !== '' ? Number(intervalText) : null;
  if (interval !== null && (!Number.isInteger(interval) || interval < 1 || interval > 1440)) {
    throw new Error('餐后时间请填写 1–1440 分钟的整数，或留空。');
  }
  const recordedAt = recordedTimestamp(glucoseMode(), $('glucose-recorded-at').value);
  await requireAdmin();
  checked(await db.from('blood_glucose_records').insert({
    recorded_at: recordedAt, glucose_mmol_l: glucose, meal_relation: relation, after_meal_minutes: interval
  }));
  $('glucose-value').value = '';
  $('glucose-relation').value = '';
  syncMealRelation(); syncTime();
  try { await readGlucoseRecords(); status('血糖记录已保存到云端。'); }
  catch { status('血糖记录已保存，但刷新失败。请重新读取，不要重复提交。', true); }
}); });
$('glucose-reload').addEventListener('click', () => void run(async () => { await readGlucoseRecords(); status('已从云端重新读取。'); }));
$('retry').addEventListener('click', () => void run(async () => {
  const data = checked(await auth.getSession());
  if (!isAdmin(data?.session)) { clearPrivate(); status('请重新登录。'); return; }
  allowed = true; $('login').hidden = true; $('logout').hidden = false;
  await readAllRecords(); status('已从云端读取。');
}));
$('logout').addEventListener('click', () => void run(async () => { checked(await auth.signOut()); clearPrivate(); status('已退出登录。'); }));
auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') { clearPrivate(); status('已退出登录。'); } });
syncTime();
syncMealRelation();
void run(async () => {
  const data = checked(await auth.getSession());
  if (!isAdmin(data?.session)) { clearPrivate(); status('登录后可以保存和查看记录。'); return; }
  allowed = true; $('login').hidden = true; $('logout').hidden = false;
  await readAllRecords(); status('已从云端读取。');
});
