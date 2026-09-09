// Opening hours, open/closed state and pickup time slots — all computed in the café's timezone.
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Parts of `date` expressed in the café timezone: {day:'mon', minutes: 9*60+30, iso date 'YYYY-MM-DD'} */
export function localParts(date, tz) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hour12: false, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const p = Object.fromEntries(fmt.formatToParts(date).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  const hour = Number(p.hour) % 24;
  return { day: p.weekday.toLowerCase().slice(0, 3), minutes: hour * 60 + Number(p.minute), date: `${p.year}-${p.month}-${p.day}`, hour, minute: Number(p.minute) };
}
const toMin = hhmm => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const fmtMin = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function todayHours(settings, now = new Date()) {
  const lp = localParts(now, settings.timezone || 'America/Toronto');
  // Test mode (admin): the café counts as open all day so orders can be tried outside opening hours.
  const h = settings.test_mode ? { open: '00:00', close: '23:59', closed: false } : ((settings.hours || {})[lp.day] || { closed: true });
  return { ...lp, open: h.open, close: h.close, closed: !!h.closed };
}

/** Open right now? Considers weekly hours and the manual "temporarily closed" switch. */
export function openState(settings, now = new Date()) {
  const t = todayHours(settings, now);
  const manual = !!settings.temporarily_closed && !settings.test_mode;
  let open = false, reason = 'closed';
  if (manual) reason = 'temporarily_closed';
  else if (t.closed) reason = 'closed_today';
  else if (t.minutes < toMin(t.open)) reason = 'before_opening';
  else if (t.minutes >= toMin(t.close)) reason = 'after_closing';
  else { open = true; reason = 'open'; }
  // next opening (for the "opens at …" message)
  let next = null;
  if (!open && !manual) {
    for (let i = 0; i < 8; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const lp = localParts(d, settings.timezone || 'America/Toronto');
      const h = (settings.hours || {})[lp.day];
      if (!h || h.closed) continue;
      if (i === 0 && t.minutes >= toMin(h.open)) continue;
      next = { day: lp.day, date: lp.date, open: h.open, close: h.close, today: i === 0, tomorrow: i === 1 };
      break;
    }
  }
  return { open, reason, today: { day: t.day, date: t.date, open: t.open, close: t.close, closed: t.closed }, now_local: fmtMin(t.minutes), next, test_mode: !!settings.test_mode };
}

/**
 * Pickup slots for today: 'asap' (+lead) then every slot_minutes until closing − last_order_minutes.
 * Returns [{value:'asap'|'HH:MM', label, minutes}] (empty when closed).
 */
export function pickupSlots(settings, now = new Date()) {
  const st = openState(settings, now);
  if (!st.open) return [];
  const lead = Number(settings.pickup_lead_minutes) || 15;
  const step = Number(settings.pickup_slot_minutes) || 15;
  const last = toMin(st.today.close) - (Number(settings.pickup_last_order_minutes) || 15);
  const t = todayHours(settings, now);
  const asapAt = t.minutes + lead;
  if (asapAt > last) return [];                    // too late to order for today
  const slots = [{ value: 'asap', minutes: asapAt, label: `asap` }];
  let m = Math.ceil((asapAt + step) / step) * step;
  for (; m <= last; m += step) slots.push({ value: fmtMin(m), minutes: m, label: fmtMin(m) });
  return slots;
}

/** Validates a requested pickup value and returns the resolved 'HH:MM' (local) or null. */
export function resolvePickup(settings, value, now = new Date()) {
  const slots = pickupSlots(settings, now);
  if (!slots.length) return null;
  if (!value || value === 'asap') return { time: fmtMin(slots[0].minutes), asap: true };
  const s = slots.find(x => x.value === value);
  return s ? { time: s.value, asap: false } : null;
}

export const weekDays = DAYS;
