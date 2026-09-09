import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTestTicket, toCP1252, PRINT_DEFAULTS } from '../src/printer.js';

test('cp1252 encoding keeps French accents and maps œ/€', () => {
  const b = toCP1252('éàçœ€ – ✎');
  assert.deepEqual([...b], [0xe9, 0xe0, 0xe7, 0x9c, 0x80, 0x20, 0x96, 0x20, 0x3e]);
});
test('star ticket starts with init + code page and ends with a cut', () => {
  const b = buildTestTicket({ ...PRINT_DEFAULTS, cafe_name: 'Test' });
  assert.deepEqual([...b.subarray(0, 6)], [0x1b, 0x40, 0x1b, 0x1d, 0x74, 32]);
  assert.deepEqual([...b.subarray(-3)], [0x1b, 0x64, 3]);
  assert.ok(b.includes(Buffer.from('TOTAL')));
});
test('escpos ticket uses GS V cut and hides prices when asked', () => {
  const b = buildTestTicket({ ...PRINT_DEFAULTS, print_cmd: 'escpos', print_prices: false });
  assert.deepEqual([...b.subarray(-4)], [0x1d, 0x56, 66, 0]);
  assert.ok(!b.includes(Buffer.from('TOTAL')));
});
