import { test } from 'node:test';
import assert from 'node:assert/strict';
import { glucoseRecord } from '../src/blood-glucose-data.mjs';

const input = { value: '5.8', relation: 'fasting', minutes: '', mode: 'current', time: '' };

test('fasting 5.8 uses server time even when the client clock is ahead', () => {
  assert.deepEqual(glucoseRecord(input, new Date('2030-01-01')), {
    glucose_mmol_l: 5.8, meal_relation: 'fasting', after_meal_minutes: null
  });
});
test('historical measurements preserve the selected Shanghai time', () => {
  const row = glucoseRecord({ ...input, mode: 'historical', time: '2026-10-04T08:30' }, new Date('2026-10-05T05:00:00Z'));
  assert.equal(row.recorded_at, '2026-10-04T00:30:00.000Z');
});
test('after-meal minutes are optional and do not carry over to fasting', () => {
  assert.equal(glucoseRecord({ ...input, relation: 'after_meal', minutes: '135' }).after_meal_minutes, 135);
  assert.equal(glucoseRecord({ ...input, relation: 'after_meal' }).after_meal_minutes, null);
  assert.equal(glucoseRecord({ ...input, minutes: '135' }).after_meal_minutes, null);
});
test('bedtime measurements support manual time without retaining an after-meal interval', () => {
  const row = glucoseRecord({ ...input, value: '4.8', relation: 'bedtime', minutes: '120',
    mode: 'historical', time: '2026-09-24T23:30' }, new Date('2026-09-25T03:00:00Z'));
  assert.deepEqual(row, { glucose_mmol_l: 4.8, meal_relation: 'bedtime', after_meal_minutes: null,
    recorded_at: '2026-09-24T15:30:00.000Z' });
});
test('invalid measurements and intervals are rejected before saving', () => {
  for (const value of ['', '0', '5.888', 'abc', '101']) assert.throws(() => glucoseRecord({ ...input, value }));
  for (const minutes of ['0', '1.5', '1441', 'abc']) assert.throws(() => glucoseRecord({ ...input, relation: 'after_meal', minutes }));
  assert.throws(() => glucoseRecord({ ...input, relation: '' }));
});
