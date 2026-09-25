import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shanghaiInput, recordedTimestamp } from '../src/blood-pressure-time.mjs';

test('current mode saves the actual submission time', () => {
  const now = new Date('2026-09-25T03:02:00Z');
  assert.equal(shanghaiInput(now), '2026-09-25T11:02');
  assert.equal(recordedTimestamp('current', '2020-01-01T00:00', now), now.toISOString());
});
test('historical Shanghai time becomes the correct UTC timestamp', () => {
  assert.equal(recordedTimestamp('historical', '2026-09-24T21:30', new Date('2026-09-25T03:02:00Z')), '2026-09-24T13:30:00.000Z');
});
test('future and invalid historical dates are rejected', () => {
  const now = new Date('2026-09-25T03:02:00Z');
  for (const value of ['2026-09-25T11:03', '2026-02-30T10:00', '']) {
    assert.throws(() => recordedTimestamp('historical', value, now));
  }
});
