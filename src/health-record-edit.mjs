import { shanghaiInput, recordedTimestamp } from './blood-pressure-time.mjs';

export function editedTimestamp(original, input, now = new Date()) {
  // The minute-only editor should not discard seconds when only other fields change.
  if (shanghaiInput(new Date(original)) === input) return original;
  return recordedTimestamp('historical', input, now);
}

export async function saveMeasurement(db, table, record, id = null) {
  const result = id
    ? await db.from(table).update(record).eq('id', id).select('id')
    : await db.from(table).insert(record);
  if (result.error) throw result.error;
  if (id && (result.data?.length !== 1 || result.data[0].id !== id)) {
    throw new Error('记录未修改，请重新读取后重试。');
  }
}
