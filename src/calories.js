import { app } from './cloudbase-client.js';
import { MEALS, ACTIVITY_TYPES, todayShanghai, endDate, planDays, difference, totalDifference, targetKcal, validCalories, describeDifference } from './calorie-math.mjs';

const $ = id => document.getElementById(id);
const { adminUid } = window.CLOUDBASE_CONFIG;
const names = { breakfast: '早餐', lunch: '中餐', dinner: '晚餐', snack: '加餐', exercise: '运动消耗' };
const auth = app.auth, db = app.rdb();
const defaultPlan = () => ({ id: 'main', start_date: todayShanghai(), breakfast: 550, lunch: 880, dinner: 770 });
const blankEditor = () => ({ id: null, note: '', calories: '' });
let plan = defaultPlan(), meals = [], entries = [], loaded = false, allowed = false, busy = false;
const drafts = {};
const editors = { snack: blankEditor(), exercise: blankEditor() };

$('date').value = todayShanghai();
$('date').max = todayShanghai();
function checked(result) { if (result.error) throw result.error; return result.data; }
function status(message, error = false) { if (!error) $('retry').hidden = true; $('status').textContent = message; $('status').classList.toggle('error', error); }
function admin(session) { return session?.user?.id === adminUid; }
function selectedDay() { return $('date').value; }
function validDay(day) { return /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= todayShanghai(); }
function controls() {
  document.querySelectorAll('button').forEach(b => { b.disabled = busy || (!loaded && !!b.closest('#meals, #activities, #settings-form')); });
  $('date').disabled = busy;
  document.querySelectorAll('#meals input, #activities input').forEach(i => { i.disabled = busy || !loaded; });
}
function mealCard(meal, day) {
  const row = meals.find(r => r.day === day && r.meal === meal);
  const form = document.createElement('form'); form.className = 'meal';
  form.innerHTML = `<div class="meal-top"><h2>${names[meal]}</h2><span>${row ? '已记录' : '未记录'}</span></div><p class="baseline">对比基准 ${row ? row.baseline : plan[meal]} 千卡</p><label>本餐总摄入 · 千卡<input type="number" min="0" max="10000" step="1" placeholder="输入千卡" required></label><p class="result${difference(row) < 0 ? ' over' : ''}">${row ? describeDifference(difference(row)) : '差额 0 千卡'}</p><div class="meal-actions"><button type="submit">${row ? '更新记录' : '保存记录'}</button>${row ? '<button class="secondary" type="button">清除记录</button>' : ''}</div>`;
  const input = form.querySelector('input'), key = `${day}_${meal}`;
  input.value = drafts[key] ?? (row ? row.calories : '');
  input.addEventListener('input', () => { drafts[key] = input.value; });
  form.addEventListener('submit', event => { event.preventDefault(); void run(async () => {
    if (!validDay(day)) throw new Error('请选择今天或之前的日期。');
    if (!validCalories(input.value)) throw new Error('请输入 0–10000 的整数千卡。');
    await requireAdmin();
    checked(await db.from('calorie_meals').upsert({ id: key, day, meal, calories: Number(input.value), baseline: row ? row.baseline : plan[meal] }, { onConflict: 'id' }));
    delete drafts[key]; await afterSave(`${day} 的${names[meal]}已保存。`);
  }); });
  form.querySelector('.secondary')?.addEventListener('click', () => {
    if (!confirm(`清除 ${day} 的${names[meal]}记录？`)) return;
    void run(async () => { await requireAdmin(); checked(await db.from('calorie_meals').delete().eq('id', row.id)); delete drafts[key]; await afterSave('记录已清除。'); });
  });
  return form;
}
function activityCard(kind, day) {
  const rows = entries.filter(r => r.day === day && r.kind === kind);
  const sum = rows.reduce((n, r) => n + r.calories, 0), editor = editors[kind];
  const card = document.createElement('section'); card.className = 'meal activity';
  card.innerHTML = `<div class="meal-top"><h2>${names[kind]}</h2><span>${rows.length} 条记录</span></div><p class="baseline">${kind === 'snack' ? '摄入抵扣净减少' : '消耗计入净减少'}</p><p class="result${kind === 'snack' && sum ? ' over' : ''}">${kind === 'snack' ? '摄入' : '消耗'}合计 ${sum.toLocaleString()} 千卡</p><div class="activity-list"></div><form class="activity-form"><label>做了什么<input name="note" type="text" maxlength="200" placeholder="${kind === 'snack' ? '例如：一杯奶茶' : '例如：快走 30 分钟'}" required></label><label>热量 · 千卡<input name="calories" type="number" min="0" max="10000" step="1" placeholder="输入千卡" required></label><div class="meal-actions"><button type="submit">${editor.id ? '保存修改' : '添加记录'}</button>${editor.id ? '<button class="secondary cancel-edit" type="button">取消编辑</button>' : ''}</div></form>`;
  const list = card.querySelector('.activity-list');
  for (const row of rows) {
    const item = document.createElement('div'); item.className = 'activity-item';
    const detail = document.createElement('span'); detail.textContent = `${row.note} · ${row.calories.toLocaleString()} 千卡`;
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'secondary'; edit.textContent = '编辑';
    edit.addEventListener('click', () => { editors[kind] = { id: row.id, note: row.note, calories: String(row.calories) }; render(); });
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'secondary'; remove.textContent = '删除';
    remove.addEventListener('click', () => { if (!confirm(`删除“${row.note}”这条记录？`)) return; void run(async () => {
      await requireAdmin(); checked(await db.from('calorie_entries').delete().eq('id', row.id));
      if (editors[kind].id === row.id) editors[kind] = blankEditor();
      await afterSave('记录已删除。');
    }); });
    item.append(detail, edit, remove); list.append(item);
  }
  if (!rows.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = '当天暂无记录'; list.append(empty); }
  const form = card.querySelector('form'), note = form.elements.namedItem('note'), calories = form.elements.namedItem('calories');
  note.value = editor.note; calories.value = editor.calories;
  note.addEventListener('input', () => { editor.note = note.value; });
  calories.addEventListener('input', () => { editor.calories = calories.value; });
  form.addEventListener('submit', event => { event.preventDefault(); void run(async () => {
    const text = note.value.trim();
    if (!validDay(day)) throw new Error('请选择今天或之前的日期。');
    if (!text || text.length > 200) throw new Error('备注需填写 1–200 个字符。');
    if (!validCalories(calories.value)) throw new Error('请输入 0–10000 的整数千卡。');
    await requireAdmin();
    if (editor.id) checked(await db.from('calorie_entries').update({ note: text, calories: Number(calories.value) }).eq('id', editor.id).eq('day', day).eq('kind', kind));
    else checked(await db.from('calorie_entries').insert({ id: crypto.randomUUID(), day, kind, note: text, calories: Number(calories.value) }));
    editors[kind] = blankEditor(); await afterSave(editor.id ? '记录已修改。' : '记录已添加。');
  }); });
  card.querySelector('.cancel-edit')?.addEventListener('click', () => { editors[kind] = blankEditor(); render(); });
  return card;
}
function render() {
  const day = selectedDay(), dayMeals = meals.filter(r => r.day === day && MEALS.includes(r.meal)), dayEntries = entries.filter(r => r.day === day);
  const all = [...meals.filter(r => MEALS.includes(r.meal)), ...entries];
  const total = totalDifference(all.filter(r => r.day >= plan.start_date && r.day < endDate(plan.start_date)));
  $('period').textContent = `${plan.start_date} 至 ${endDate(plan.start_date)}（${planDays(plan.start_date)} 天）`;
  $('daily-target').textContent = `日均计划差额 ${Math.round(targetKcal() / planDays(plan.start_date))} 千卡`;
  $('start-date').value = plan.start_date;
  MEALS.forEach(m => { $(`base-${m}`).value = plan[m]; });
  const intake = [...dayMeals, ...dayEntries.filter(r => r.kind === 'snack')].reduce((n, r) => n + r.calories, 0);
  $('intake').textContent = loaded ? `${intake.toLocaleString()} 千卡` : '—';
  $('coverage').textContent = loaded ? `${dayMeals.length} / 3 餐已记录` : '登录后查看';
  $('day-diff').textContent = loaded ? `${totalDifference([...dayMeals, ...dayEntries]).toLocaleString()} 千卡` : '—';
  $('total-diff').textContent = loaded ? `${total.toLocaleString()} 千卡` : '—';
  $('progress-text').textContent = loaded ? `目标进度 ${(total / targetKcal() * 100).toFixed(1)}%` : '登录后查看';
  $('progress').style.width = `${loaded ? Math.min(100, Math.max(0, total / targetKcal() * 100)) : 0}%`;
  $('meals').replaceChildren(...MEALS.map(m => mealCard(m, day)));
  $('activities').replaceChildren(...ACTIVITY_TYPES.map(k => activityCard(k, day)));
  controls();
}
async function requireAdmin() { const data = checked(await auth.getSession()); if (!admin(data?.session)) { clearPrivate(); throw new Error('请先用 homer 登录。'); } }
function clearPrivate() {
  for (const key of Object.keys(drafts)) delete drafts[key];
  for (const kind of ACTIVITY_TYPES) editors[kind] = blankEditor();
  allowed = false; loaded = false; meals = []; entries = []; plan = defaultPlan();
  $('login').hidden = false; $('logout').hidden = true; render();
}
async function fetchAll(table, columns) {
  const all = [];
  for (let offset = 0; ; offset += 500) {
    const rows = checked(await db.from(table).select(columns).order('id').range(offset, offset + 499));
    all.push(...rows); if (rows.length < 500) return all;
  }
}
async function load() {
  await requireAdmin();
  const plans = checked(await db.from('calorie_plan').select('*').eq('id', 'main'));
  if (!plans?.length) throw new Error('计划尚未初始化，请先执行饮食记录数据库脚本。');
  const nextMeals = await fetchAll('calorie_meals', 'id,day,meal,calories,baseline');
  const nextEntries = await fetchAll('calorie_entries', 'id,day,kind,note,calories');
  if (!allowed) return;
  plan = plans[0]; meals = nextMeals; entries = nextEntries; loaded = true; render();
}
async function afterSave(message) {
  try { await load(); status(message); }
  catch { loaded = false; meals = []; entries = []; render(); status('已保存，但刷新失败。请刷新页面重新读取，不要重复提交。', true); }
}
async function run(action) {
  if (busy) return; busy = true; controls();
  try { await action(); }
  catch (error) {
    const code = String(error?.code || '');
    const message = /PGRST205|42P01/.test(code) ? '记录表尚未创建，请检查数据库迁移。' : /42501/.test(code) ? '数据库拒绝访问，请检查表权限。' : error instanceof Error && !code ? error.message : '连接失败，请检查网络或数据库配置。';
    const safeCode = /^[A-Za-z0-9_.-]{1,80}$/.test(code) ? code : '';
    status(message + (safeCode ? `（错误码：${safeCode}）` : ''), true);
    $('retry').hidden = false; if (!allowed) $('login').hidden = false;
  } finally { busy = false; controls(); }
}
$('retry').addEventListener('click', () => void run(async () => {
  status('正在重新连接…'); const data = checked(await auth.getSession());
  if (!admin(data?.session)) { clearPrivate(); status('请重新登录。'); return; }
  allowed = true; $('login').hidden = true; $('logout').hidden = false;
  await load(); status('已从云端读取。');
}));
$('date').addEventListener('change', () => { if (!validDay(selectedDay())) $('date').value = todayShanghai(); for (const kind of ACTIVITY_TYPES) editors[kind] = blankEditor(); render(); });
$('login').addEventListener('submit', event => { event.preventDefault(); void run(async () => {
  status('正在登录…'); const password = $('password').value; $('password').value = '';
  checked(await auth.signInWithPassword({ username: $('username').value.trim(), password }));
  const data = checked(await auth.getSession());
  if (!admin(data?.session)) { checked(await auth.signOut()); throw new Error('此账号没有记录权限。'); }
  allowed = true; $('login').hidden = true; $('logout').hidden = false;
  await load(); status('已从云端读取。');
}); });
$('logout').addEventListener('click', () => void run(async () => { checked(await auth.signOut()); clearPrivate(); status('已退出登录。'); }));
$('settings-form').addEventListener('submit', event => { event.preventDefault(); void run(async () => {
  await requireAdmin(); const next = { id: 'main', start_date: $('start-date').value };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next.start_date) || next.start_date < '2000-01-01' || next.start_date > '2100-01-01') throw new Error('请填写有效的开始日期。');
  for (const meal of MEALS) {
    const value = $(`base-${meal}`).value;
    if (!validCalories(value) || Number(value) < 1) throw new Error('餐次基准必须是 1–10000 的整数。');
    next[meal] = Number(value);
  }
  checked(await db.from('calorie_plan').upsert(next, { onConflict: 'id' }));
  await afterSave('设置已保存，已有餐次的对比基准保持不变。');
}); });
auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') { clearPrivate(); status('已退出登录。'); } });
render();
void run(async () => {
  const data = checked(await auth.getSession());
  if (!admin(data?.session)) { clearPrivate(); status('登录后可以记录与查看个人数据。'); return; }
  allowed = true; $('logout').hidden = false; await load(); status('已从云端读取。');
});
