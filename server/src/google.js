// Google Maps data via Places API (New): rating, review count, latest reviews, opening hours, description.
// Needs settings.google_api_key (Places API (New) enabled). Cached 1 hour in the kv table so the site never hammers Google.
import { kvGet, kvSet, setSettings } from './db.js';

const CACHE_KEY = 'google_reviews';
const TTL_MS = 60 * 60 * 1000;
const DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

async function resolvePlaceId(settings) {
  if (settings.google_place_id) return settings.google_place_id;
  const query = `${settings.cafe_name} ${settings.address}`;
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': settings.google_api_key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress' },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });
  if (!r.ok) throw new Error(`Google searchText ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const id = data.places?.[0]?.id;
  if (!id) throw new Error('Place not found for "' + query + '"');
  setSettings({ google_place_id: id });
  return id;
}

/** Google "regularOpeningHours.periods" → our weekly {mon:{open,close,closed}} structure. */
export function hoursFromPeriods(periods) {
  if (!Array.isArray(periods) || !periods.length) return null;
  const out = {};
  for (const d of DAY) out[d] = { open: '00:00', close: '00:00', closed: true };
  for (const p of periods) {
    const o = p.open, c = p.close;
    if (!o || o.day == null) continue;
    const d = DAY[o.day];
    const hh = x => `${String(x?.hour ?? 0).padStart(2, '0')}:${String(x?.minute ?? 0).padStart(2, '0')}`;
    // open 24 h (no close) or closing after midnight → clamp to 23:59 for the day it opened
    const close = !c || c.day !== o.day ? '23:59' : hh(c);
    if (out[d].closed) out[d] = { open: hh(o), close, closed: false };
    else { // several periods in a day (lunch break): keep the widest span
      if (hh(o) < out[d].open) out[d].open = hh(o);
      if (close > out[d].close) out[d].close = close;
    }
  }
  return out;
}

export async function getReviews(settings, { force = false } = {}) {
  const cached = kvGet(CACHE_KEY);
  if (cached && !force && Date.now() - new Date(cached.updated_at).getTime() < TTL_MS) return cached.value;
  if (!settings.google_api_key) return cached?.value || null;
  try {
    const placeId = await resolvePlaceId(settings);
    const fields = 'rating,userRatingCount,reviews,googleMapsUri,displayName,regularOpeningHours,editorialSummary,nationalPhoneNumber,internationalPhoneNumber,websiteUri';
    const fetchLang = async lang => {
      const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${lang}`, { headers: { 'X-Goog-Api-Key': settings.google_api_key, 'X-Goog-FieldMask': fields } });
      if (!r.ok) throw new Error(`Google placeDetails ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return r.json();
    };
    const d = await fetchLang('fr-CA');
    let en = null; try { en = await fetchLang('en-CA'); } catch {}
    // Google returns up to 5 reviews; keep the 3 most recent ones.
    const reviews = (d.reviews || []).map(x => ({
      author: x.authorAttribution?.displayName || '', photo: x.authorAttribution?.photoUri || '', rating: x.rating || 0,
      text: x.text?.text || x.originalText?.text || '', when: x.relativePublishTimeDescription || '', time: x.publishTime || '',
      when_en: en?.reviews?.find(y => y.publishTime === x.publishTime)?.relativePublishTimeDescription || '',
      url: x.googleMapsUri || '',
    })).sort((a, b) => (b.time || '').localeCompare(a.time || '')).slice(0, 3);
    const hours = hoursFromPeriods(d.regularOpeningHours?.periods);
    const value = {
      rating: d.rating || null, count: d.userRatingCount || 0, url: d.googleMapsUri || settings.google_maps_url,
      reviews,
      hours,
      summary: { fr: d.editorialSummary?.text || '', en: en?.editorialSummary?.text || d.editorialSummary?.text || '' },
      phone: d.internationalPhoneNumber || d.nationalPhoneNumber || '',
      fetched_at: new Date().toISOString(),
    };
    kvSet(CACHE_KEY, value);
    // Opening hours follow Google Maps automatically (unless the admin switched to manual hours).
    if (hours && settings.hours_from_google !== false) setSettings({ hours });
    if (value.phone && !settings.phone) setSettings({ phone: value.phone });
    return value;
  } catch (e) {
    console.warn('[google]', e.message);
    if (cached) return cached.value;              // stale is better than nothing
    return { error: e.message, rating: null, count: 0, reviews: [], url: settings.google_maps_url };
  }
}
