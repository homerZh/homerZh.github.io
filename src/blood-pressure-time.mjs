const parts = date => {
  const values = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(values.map(part => [part.type, part.value]));
};
export function shanghaiInput(date = new Date()) {
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function recordedTimestamp(mode, input, now = new Date()) {
  if (mode === 'current') return now.toISOString();
  if (mode !== 'historical' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input) || input < '2000-01-01T00:00') {
    throw new Error('请选择有效的历史日期和时间。');
  }
  const date = new Date(`${input}:00+08:00`);
  if (Number.isNaN(date.getTime()) || shanghaiInput(date) !== input || date > now) {
    throw new Error('历史日期和时间不能晚于现在。');
  }
  return date.toISOString();
}
export function displayShanghai(iso) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(new Date(iso));
}
