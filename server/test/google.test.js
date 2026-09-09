import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.LARTISAN_DATA_DIR ||= '/tmp/lartisan-test-data';
const { hoursFromPeriods } = await import('../src/google.js');

test('Google opening periods → weekly hours', () => {
  const periods = [
    { open: { day: 1, hour: 8, minute: 0 }, close: { day: 1, hour: 20, minute: 0 } },
    { open: { day: 2, hour: 8, minute: 0 }, close: { day: 2, hour: 20, minute: 0 } },
    { open: { day: 5, hour: 11, minute: 30 }, close: { day: 6, hour: 1, minute: 0 } },   // closes after midnight
  ];
  const h = hoursFromPeriods(periods);
  assert.deepEqual(h.mon, { open: '08:00', close: '20:00', closed: false });
  assert.equal(h.fri.close, '23:59');
  assert.equal(h.sun.closed, true);
  assert.equal(hoursFromPeriods([]), null);
});
