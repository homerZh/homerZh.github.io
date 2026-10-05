import { recordedTimestamp } from './blood-pressure-time.mjs';
import { editedTimestamp } from './health-record-edit.mjs';

export function glucoseRecord({ value, relation, minutes, mode, time, originalTimestamp }, now = new Date()) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) < 0.01 || Number(value) > 100) {
    throw new Error('血糖请填写 0.01–100 之间、最多两位小数的数值。');
  }
  if (!['fasting', 'before_meal', 'after_meal'].includes(relation)) {
    throw new Error('请选择空腹、餐前或餐后。');
  }
  const interval = relation === 'after_meal' && minutes !== '' ? Number(minutes) : null;
  if (interval !== null && (!Number.isInteger(interval) || interval < 1 || interval > 1440)) {
    throw new Error('餐后时间请填写 1–1440 分钟的整数，或留空。');
  }
  const record = { glucose_mmol_l: Number(value), meal_relation: relation, after_meal_minutes: interval };
  // Current measurements use the database clock, so clock drift cannot violate its time constraint.
  if (mode === 'historical') record.recorded_at = originalTimestamp
    ? editedTimestamp(originalTimestamp, time, now) : recordedTimestamp(mode, time, now);
  else if (mode !== 'current') throw new Error('请选择记录时间方式。');
  return record;
}
