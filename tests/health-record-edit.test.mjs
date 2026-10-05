import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editedTimestamp, saveMeasurement } from '../src/health-record-edit.mjs';
import { glucoseRecord } from '../src/blood-glucose-data.mjs';

test('editing values preserves original measurement seconds', () => {
  const original = '2026-10-04T00:30:42.123Z';
  assert.equal(editedTimestamp(original, '2026-10-04T08:30'), original);
  assert.equal(glucoseRecord({ value: '5.9', relation: 'fasting', minutes: '', mode: 'historical',
    time: '2026-10-04T08:30', originalTimestamp: original }).recorded_at, original);
});
test('editing a timestamp saves the selected Shanghai time and rejects future dates', () => {
  const now = new Date('2026-10-05T05:00:00Z');
  const original = '2026-10-04T00:30:42.123Z';
  assert.equal(editedTimestamp(original, '2026-10-04T09:30', now), '2026-10-04T01:30:00.000Z');
  assert.throws(() => editedTimestamp(original, '2026-10-06T09:30', now));
});

function fakeDb(result = { data: [{ id: 'existing-row' }], error: null }) {
  const calls = [];
  const query = {
    update(value) { calls.push(['update', value]); return this; },
    eq(column, value) { calls.push(['eq', column, value]); return this; },
    select(columns) { calls.push(['select', columns]); return Promise.resolve(result); },
    insert(value) { calls.push(['insert', value]); return Promise.resolve(result); }
  };
  return { calls, from(table) { calls.push(['from', table]); return query; } };
}
test('editing targets one record in each health table instead of inserting', async () => {
  for (const table of ['blood_pressure_records', 'blood_glucose_records']) {
    const db = fakeDb(), record = { recorded_at: '2026-10-04T00:30:00.000Z' };
    await saveMeasurement(db, table, record, 'existing-row');
    assert.deepEqual(db.calls, [['from', table], ['update', record], ['eq', 'id', 'existing-row'], ['select', 'id']]);
  }
});
test('new measurements insert, while unmatched updates and errors are reported', async () => {
  const db = fakeDb();
  await saveMeasurement(db, 'blood_glucose_records', { glucose_mmol_l: 5.8 });
  assert.deepEqual(db.calls, [['from', 'blood_glucose_records'], ['insert', { glucose_mmol_l: 5.8 }]]);
  await assert.rejects(saveMeasurement(fakeDb({ data: [], error: null }), 'blood_glucose_records', {}, 'missing-row'));
  const error = new Error('database denied update');
  await assert.rejects(saveMeasurement(fakeDb({ data: null, error }), 'blood_glucose_records', {}, 'existing-row'), error);
});
