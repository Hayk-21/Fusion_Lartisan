import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openState, pickupSlots, resolvePickup, localParts } from '../src/hours.js';

const base = {
  timezone: 'America/Toronto',
  hours: { mon: { open: '09:00', close: '19:30' }, tue: { open: '09:00', close: '19:30' }, wed: { open: '09:00', close: '19:30' }, thu: { open: '09:00', close: '19:30' }, fri: { open: '09:00', close: '19:30' }, sat: { open: '09:00', close: '19:30' }, sun: { open: '09:00', close: '19:30', closed: true } },
  pickup_lead_minutes: 15, pickup_slot_minutes: 15, pickup_last_order_minutes: 15,
};
// 2026-09-08 is a Tuesday. 14:00 Montréal (EDT, UTC-4) = 18:00Z
const tue14 = new Date('2026-09-08T18:00:00Z');
const tue08 = new Date('2026-09-08T12:00:00Z');
const tue1920 = new Date('2026-09-08T23:20:00Z');
const sun14 = new Date('2026-09-13T18:00:00Z');

test('localParts follows the café timezone', () => {
  const p = localParts(tue14, 'America/Toronto');
  assert.equal(p.day, 'tue'); assert.equal(p.minutes, 14 * 60); assert.equal(p.date, '2026-09-08');
});

test('open inside hours, closed before/after and on closed days', () => {
  assert.equal(openState(base, tue14).open, true);
  assert.equal(openState(base, tue08).reason, 'before_opening');
  assert.equal(openState(base, new Date('2026-09-09T00:00:00Z')).reason, 'after_closing'); // 20:00 local
  const sun = openState(base, sun14);
  assert.equal(sun.open, false); assert.equal(sun.reason, 'closed_today');
  assert.equal(sun.next.day, 'mon'); assert.equal(sun.next.tomorrow, true);
});

test('temporarily_closed overrides the schedule', () => {
  const st = openState({ ...base, temporarily_closed: true }, tue14);
  assert.equal(st.open, false); assert.equal(st.reason, 'temporarily_closed');
});

test('pickup slots: asap then 15-minute steps until closing − 15', () => {
  const slots = pickupSlots(base, tue14);
  assert.equal(slots[0].value, 'asap'); assert.equal(slots[0].minutes, 14 * 60 + 15);
  assert.equal(slots[1].value, '14:30');
  assert.equal(slots.at(-1).value, '19:15');
  assert.deepEqual(resolvePickup(base, 'asap', tue14), { time: '14:15', asap: true });
  assert.deepEqual(resolvePickup(base, '15:00', tue14), { time: '15:00', asap: false });
  assert.equal(resolvePickup(base, '15:07', tue14), null);
  assert.equal(resolvePickup(base, '19:30', tue14), null);
});

test('too late to order for today → no slots', () => {
  assert.equal(openState(base, tue1920).open, true);
  assert.deepEqual(pickupSlots(base, tue1920), []);
  assert.equal(resolvePickup(base, 'asap', tue1920), null);
});
