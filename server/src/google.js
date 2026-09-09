// Google reviews via Places API (New). Needs settings.google_api_key (Places API enabled).
// Results are cached for 1 hour in the kv table so the site never hammers Google.
import { kvGet, kvSet, setSettings } from './db.js';

const CACHE_KEY = 'google_reviews';
const TTL_MS = 60 * 60 * 1000;

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

export async function getReviews(settings, { force = false } = {}) {
  const cached = kvGet(CACHE_KEY);
  if (cached && !force && Date.now() - new Date(cached.updated_at).getTime() < TTL_MS) return cached.value;
  if (!settings.google_api_key) return cached?.value || null;
  try {
    const placeId = await resolvePlaceId(settings);
    const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=fr-CA`, {
      headers: { 'X-Goog-Api-Key': settings.google_api_key, 'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri,displayName' },
    });
    if (!r.ok) throw new Error(`Google placeDetails ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const d = await r.json();
    const value = {
      rating: d.rating || null, count: d.userRatingCount || 0, url: d.googleMapsUri || settings.google_maps_url,
      reviews: (d.reviews || []).map(x => ({
        author: x.authorAttribution?.displayName || '', photo: x.authorAttribution?.photoUri || '', rating: x.rating || 0,
        text: x.text?.text || x.originalText?.text || '', when: x.relativePublishTimeDescription || '', time: x.publishTime || '',
      })),
      fetched_at: new Date().toISOString(),
    };
    kvSet(CACHE_KEY, value);
    return value;
  } catch (e) {
    console.warn('[google]', e.message);
    if (cached) return cached.value;              // stale is better than nothing
    return { error: e.message, rating: null, count: 0, reviews: [], url: settings.google_maps_url };
  }
}
