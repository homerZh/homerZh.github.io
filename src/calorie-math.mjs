export const MEALS = ['breakfast', 'lunch', 'dinner'];
export function todayShanghai() {
  const p = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get = t => p.find(x => x.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function endDate(start) {
  const [y,m,d] = start.split('-').map(Number);
  const last = new Date(Date.UTC(y,m+6,0)).getUTCDate();
  return new Date(Date.UTC(y,m-1+6,Math.min(d,last))).toISOString().slice(0,10);
}
export function planDays(start) { return Math.round((Date.parse(endDate(start))-Date.parse(start))/86400000); }
export function difference(record) { return record ? record.baseline-record.calories : 0; }
export function totalDifference(records) { return records.reduce((sum,r)=>sum+difference(r),0); }
export function targetKcal(from=90,to=75) { return Math.round((from-to)*7700); }
export function validCalories(value) { return value !== '' && Number.isInteger(Number(value)) && Number(value)>=0 && Number(value)<=10000; }
export function describeDifference(n) { return n>0 ? `少了 ${n.toLocaleString()} 千卡` : n<0 ? `多了 ${(-n).toLocaleString()} 千卡` : '差额 0 千卡'; }
