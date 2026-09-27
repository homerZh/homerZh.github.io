export function validDuration(value) {
  return value === '' || (Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 1440);
}
export function exerciseWeek(entries, endDay) {
  const end = Date.parse(`${endDay}T00:00:00Z`);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(end - (6 - i) * 86400000).toISOString().slice(0, 10);
    const rows = entries.filter(r => r.kind === 'exercise' && r.day === day);
    return { day, count: rows.length, calories: rows.reduce((n,r) => n + r.calories, 0),
      minutes: rows.reduce((n,r) => n + (r.duration_minutes ?? 0), 0), missing: rows.filter(r => r.duration_minutes == null).length };
  });
  return { days, count: days.reduce((n,d) => n + d.count, 0), calories: days.reduce((n,d) => n + d.calories, 0),
    minutes: days.reduce((n,d) => n + d.minutes, 0), missing: days.reduce((n,d) => n + d.missing, 0), activeDays: days.filter(d => d.count).length };
}
export function shortcutDescription(kind, note) {
  const text = note.trim().replace(/\s+/g, ' ');
  if (kind === 'exercise') {
    if (/动感单车/.test(text)) return '动感单车';
    if (/步行/.test(text)) return '步行';
    return text.replace(/\d+(?:\.\d+)?\s*(?:分钟|小时)/g, '').trim();
  }
  return text.replace(/^一个(.+)$/, '$1（1个）');
}
export function activityShortcuts(entries, kind) {
  const groups = new Map();
  for (const row of entries.filter(r => r.kind === kind).sort((a,b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id))) {
    if (row.note === '此前记录的当日总量') continue;
    const note = shortcutDescription(kind, row.note);
    const key = JSON.stringify([note, row.calories]);
    if (!groups.has(key)) groups.set(key, { note, calories: row.calories, count: 0, duration_minutes: null });
    const item = groups.get(key); item.count++;
    if (row.duration_minutes != null) item.duration_minutes = row.duration_minutes;
  }
  return [...groups.values()].filter(r => r.count >= 3).sort((a,b) => b.count - a.count || a.note.localeCompare(b.note) || a.calories - b.calories);
}
