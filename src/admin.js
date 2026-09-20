import cloudbase from '@cloudbase/js-sdk';

const config = window.CLOUDBASE_CONFIG;
const $ = (id) => document.getElementById(id);
let app, auth, db, busy = false;
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function checked(result) {
  if (result.error) throw result.error;
  return result.data;
}
function isAdmin(session) {
  return typeof session?.user?.id === 'string' && session.user.id === config.adminUid;
}
function showSession(session) {
  const allowed = isAdmin(session);
  $('login').hidden = allowed;
  $('workspace').hidden = !allowed;
  if (!allowed) { $('records').replaceChildren(); $('content').value = ''; }
  return allowed;
}
async function requireAdmin() {
  const data = checked(await auth.getSession());
  if (!isAdmin(data?.session)) {
    showSession(null);
    throw new Error('请使用管理员账号登录。');
  }
}
async function readRecords() {
  await requireAdmin();
  const data = checked(await db.from('toolbox_connection_checks')
    .select('id,content,created_at').order('created_at', { ascending: false }).limit(20));
  $('records').replaceChildren();
  if (!data?.length) {
    const item = document.createElement('li'); item.textContent = '暂无记录。'; $('records').append(item);
  }
  for (const record of data || []) {
    const item = document.createElement('li');
    item.textContent = record.content;
    const date = document.createElement('time');
    date.dateTime = record.created_at; date.textContent = new Date(record.created_at).toLocaleString();
    item.append(date); $('records').append(item);
  }
}
async function run(action) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach((b) => b.disabled = true);
  try { await action(); }
  catch (error) {
    const code = String(error?.code || '');
    const hint = /42P01|PGRST205/.test(code) ? '测试表尚未创建，请先执行数据库配置脚本。' :
      /42501/.test(code) ? '数据库拒绝访问，请检查管理员 UID 和表权限。' : '操作失败，请检查网络、账号及 CloudBase 配置。';
    // Do not display raw SDK responses, which may include request/session details.
    status(`${hint}${/^[A-Za-z0-9_-]{1,60}$/.test(code) ? `（${code}）` : ''}`, true);
  } finally {
    busy = false;
    document.querySelectorAll('button').forEach((b) => b.disabled = !auth);
  }
}
$('login').addEventListener('submit', (event) => {
  event.preventDefault();
  void run(async () => {
    status('正在登录…');
    const password = $('password').value;
    $('password').value = '';
    checked(await auth.signInWithPassword({ username: $('username').value.trim(), password }));
    const { session } = checked(await auth.getSession());
    if (!isAdmin(session)) {
      checked(await auth.signOut()); showSession(null); status('此账号没有管理权限。', true); return;
    }
    showSession(session);
    status('登录成功，正在读取数据…');
    await readRecords(); status('登录和数据库读取成功。');
  });
});
$('record-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void run(async () => {
    const content = $('content').value.trim();
    if (!content) { status('请输入测试内容。', true); return; }
    await requireAdmin();
    status('正在保存…');
    checked(await db.from('toolbox_connection_checks').insert({ content }));
    $('content').value = '';
    status('已保存，正在重新读取…');
    try { await readRecords(); status('已保存到云端，并重新读取。'); }
    catch { status('保存已成功，但重新读取失败。请点击“重新读取”，不要重复保存。', true); }
  });
});
$('reload').addEventListener('click', () => void run(async () => {
  status('正在读取…'); await readRecords(); status('已从云端重新读取。');
}));
$('logout').addEventListener('click', () => void run(async () => {
  checked(await auth.signOut()); showSession(null); status('已退出登录。');
}));
void run(async () => {
  if (!config?.env || !config?.accessKey || !config?.adminUid) throw new Error('Missing config');
  app = cloudbase.init({ env: config.env, region: config.region, accessKey: config.accessKey });
  auth = app.auth; db = app.rdb();
  auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') { showSession(null); status('已退出登录。'); }
    else if (session && !isAdmin(session)) showSession(null);
  });
  const { session } = checked(await auth.getSession());
  if (showSession(session)) { await readRecords(); status('已登录，数据已读取。'); }
  else status('请使用管理员账号登录。');
});
