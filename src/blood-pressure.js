import { app } from './cloudbase-client.js';
import { shanghaiInput, recordedTimestamp, displayShanghai } from './blood-pressure-time.mjs';
import { glucoseRecord } from './blood-glucose-data.mjs';
import { editedTimestamp, saveMeasurement } from './health-record-edit.mjs';

const $ = id => document.getElementById(id);
const { adminUid } = window.CLOUDBASE_CONFIG;
const auth = app.auth, db = app.rdb();
let allowed = false, busy = false;
let editingPressure = null, editingGlucose = null;

function checked(result) { if (result.error) throw result.error; return result.data; }
function isAdmin(session) { return session?.user?.id === adminUid; }
function mode() { return document.querySelector('input[name="time-mode"]:checked').value; }
function glucoseMode() { return document.querySelector('input[name="glucose-time-mode"]:checked').value; }
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
  if (!error) $('retry').hidden = true;
}
function glucoseStatus(message, error = false) {
  $('glucose-status').textContent = message;
  $('glucose-status').classList.toggle('error', error);
}
function pressureStatus(message, error = false) {
  $('pressure-status').textContent = message;
  $('pressure-status').classList.toggle('error', error);
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
  if (!editingPressure && mode() === 'current') $('recorded-at').value = now;
  $('time-hint').textContent = editingPressure ? '修改这条记录的测量日期和时间（北京时间）。' :
    mode() === 'current' ? '保存时会采用当前时间。' : '选择测量时的日期和时间（北京时间）。';
  $('glucose-recorded-at').max = now;
  if (!editingGlucose && glucoseMode() === 'current') $('glucose-recorded-at').value = now;
  $('glucose-time-hint').textContent = editingGlucose ? '修改这条记录的测量日期和时间（北京时间）。' :
    glucoseMode() === 'current' ? '保存时采用服务器当前时间（北京时间）。' : '选择测量时的日期和时间（北京时间）。';
  controls();
}
function syncMealRelation() {
  const afterMeal = $('glucose-relation').value === 'after_meal';
  $('after-meal-field').hidden = !afterMeal;
  if (!afterMeal) $('after-meal-minutes').value = '';
  controls();
}
function editUi() {
  $('record-title').textContent = editingPressure ? '修改血压记录' : '新增记录';
  $('save').textContent = editingPressure ? '保存修改' : '保存记录';
  $('pressure-time-options').hidden = !!editingPressure;
  $('pressure-cancel').hidden = !editingPressure;
  $('glucose-record-title').textContent = editingGlucose ? '修改血糖记录' : '新增记录';
  $('glucose-save').textContent = editingGlucose ? '保存修改' : '保存血糖记录';
  $('glucose-time-options').hidden = !!editingGlucose;
  $('glucose-cancel').hidden = !editingGlucose;
  for (const [list, editing] of [[$('records'), editingPressure], [$('glucose-records'), editingGlucose]]) {
    list.querySelectorAll('li').forEach(item => item.classList.toggle('is-editing', !!editing && item.dataset.id === editing.id));
  }
}
function resetPressureEditor() {
  editingPressure = null;
  $('record-form').reset(); editUi(); syncTime();
}
function resetGlucoseEditor() {
  editingGlucose = null;
  $('glucose-form').reset(); editUi(); syncMealRelation(); syncTime();
}
function beginPressureEdit(row) {
  if (busy || !allowed) return;
  editingPressure = row;
  document.querySelector('input[name="time-mode"][value="historical"]').checked = true;
  $('recorded-at').value = shanghaiInput(new Date(row.recorded_at));
  for (const id of ['systolic', 'diastolic', 'pulse']) $(id).value = row[id];
  editUi(); syncTime(); pressureStatus('正在修改所选血压记录，保存后更新原记录。');
  $('record-form').scrollIntoView({ block: 'center' }); $('systolic').focus({ preventScroll: true });
}
function beginGlucoseEdit(row) {
  if (busy || !allowed) return;
  editingGlucose = row;
  document.querySelector('input[name="glucose-time-mode"][value="historical"]').checked = true;
  $('glucose-recorded-at').value = shanghaiInput(new Date(row.recorded_at));
  $('glucose-value').value = row.glucose_mmol_l;
  $('glucose-relation').value = row.meal_relation;
  $('after-meal-minutes').value = row.after_meal_minutes ?? '';
  editUi(); syncMealRelation(); syncTime(); glucoseStatus('正在修改所选血糖记录，保存后更新原记录。');
  $('glucose-form').scrollIntoView({ block: 'center' }); $('glucose-value').focus({ preventScroll: true });
}
function addEditButton(item, row, beginEdit) {
  item.dataset.id = row.id;
  const actions = document.createElement('div'); actions.className = 'record-actions';
  const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary';
  button.textContent = '修改'; button.setAttribute('aria-label', `修改 ${displayShanghai(row.recorded_at)} 的记录`);
  button.addEventListener('click', () => beginEdit(row));
  actions.append(button); item.append(actions);
}
function clearPrivate() {
  allowed = false;
  $('login').hidden = false;
  $('logout').hidden = true;
  $('records').replaceChildren();
  $('glucose-records').replaceChildren();
  resetPressureEditor(); resetGlucoseEditor();
  pressureStatus('');
  glucoseStatus('');
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
    addEditButton(item, row, beginPressureEdit);
    item.classList.toggle('is-editing', editingPressure?.id === row.id);
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
    addEditButton(item, row, beginGlucoseEdit);
    item.classList.toggle('is-editing', editingGlucose?.id === row.id);
    list.append(item);
  }
}
async function readAllRecords() {
  await readRecords();
  await readGlucoseRecords();
}
async function run(action, scope = 'page') {
  if (busy) return;
  busy = true; controls();
  try { await action(); }
  catch (error) {
    const code = String(error?.code || '');
    const message = /23514/.test(code) ? '记录未保存：日期、测量值或餐后时间不符合数据库规则，请核对后重试。' :
      /42P01|PGRST205/.test(code) ? '记录表尚未创建。' :
      /42501/.test(code) ? '数据库拒绝访问，请检查账号权限。' :
      error instanceof Error && !code ? error.message : '操作失败，请检查网络或数据库配置。';
    const safeCode = /^[A-Za-z0-9_.-]{1,80}$/.test(code) ? code : '';
    const feedback = message + (safeCode ? `（错误码：${safeCode}）` : '');
    status(feedback, true);
    if (scope === 'glucose') glucoseStatus(feedback, true);
    if (scope === 'pressure') pressureStatus(feedback, true);
    $('retry').hidden = false;
  } finally { busy = false; controls(); }
}
document.querySelectorAll('input[name="time-mode"]').forEach(input => input.addEventListener('change', syncTime));
document.querySelectorAll('input[name="glucose-time-mode"]').forEach(input => input.addEventListener('change', syncTime));
$('glucose-relation').addEventListener('change', syncMealRelation);
document.querySelectorAll('.after-meal-shortcuts button').forEach(button => button.addEventListener('click', () => {
  $('after-meal-minutes').value = button.dataset.minutes;
}));
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
  const editing = editingPressure;
  const values = ['systolic', 'diastolic', 'pulse'].map(id => $('' + id).value);
  if (values.some(value => value === '' || !Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 300)) {
    throw new Error('上压、下压和心跳需填写 1–300 的整数。');
  }
  const recordedAt = editing ? editedTimestamp(editing.recorded_at, $('recorded-at').value) :
    recordedTimestamp(mode(), $('recorded-at').value);
  pressureStatus('正在保存血压记录…');
  await requireAdmin();
  await saveMeasurement(db, 'blood_pressure_records', {
    recorded_at: recordedAt, systolic: Number(values[0]), diastolic: Number(values[1]), pulse: Number(values[2])
  }, editing?.id);
  if (editing) resetPressureEditor();
  else for (const id of ['systolic', 'diastolic', 'pulse']) $(id).value = '';
  syncTime();
  const message = editing ? '血压记录已修改。' : '血压记录已保存到云端。';
  pressureStatus(message);
  try { await readRecords(); status(message); }
  catch {
    const feedback = '已保存，但刷新失败。请重新读取，不要重复提交。';
    status(feedback, true); pressureStatus(feedback, true);
  }
}, 'pressure'); });
$('record-form').addEventListener('invalid', event => pressureStatus(event.target.validationMessage, true), true);
$('pressure-cancel').addEventListener('click', () => { resetPressureEditor(); pressureStatus('已取消修改。'); });
$('glucose-cancel').addEventListener('click', () => { resetGlucoseEditor(); glucoseStatus('已取消修改。'); });
$('reload').addEventListener('click', () => void run(async () => { await readRecords(); status('已从云端重新读取。'); pressureStatus('血压记录已从云端重新读取。'); }, 'pressure'));
$('glucose-form').addEventListener('submit', event => { event.preventDefault(); void run(async () => {
  const editing = editingGlucose;
  const record = glucoseRecord({ value: $('glucose-value').value, relation: $('glucose-relation').value,
    minutes: $('after-meal-minutes').value, mode: editing ? 'historical' : glucoseMode(), time: $('glucose-recorded-at').value,
    originalTimestamp: editing?.recorded_at });
  glucoseStatus('正在保存血糖记录…');
  await requireAdmin();
  await saveMeasurement(db, 'blood_glucose_records', record, editing?.id);
  const message = editing ? '血糖记录已修改。' : '血糖记录已保存到云端。';
  if (editing) resetGlucoseEditor();
  else { $('glucose-value').value = ''; $('glucose-relation').value = ''; }
  glucoseStatus(message);
  syncMealRelation(); syncTime();
  try { await readGlucoseRecords(); status(message); }
  catch {
    const message = '血糖记录已保存，但刷新失败。请重新读取，不要重复提交。';
    status(message, true); glucoseStatus(message, true);
  }
}, 'glucose'); });
$('glucose-form').addEventListener('invalid', event => glucoseStatus(event.target.validationMessage, true), true);
$('glucose-reload').addEventListener('click', () => void run(async () => {
  glucoseStatus('正在读取血糖记录…');
  await readGlucoseRecords(); status('已从云端重新读取。'); glucoseStatus('血糖记录已从云端重新读取。');
}, 'glucose'));
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
