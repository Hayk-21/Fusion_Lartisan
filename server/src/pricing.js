// Pricing engine — the single source of truth for how a line is priced.
// Pure ES module (no Node imports) so the same file is served to the tablet web app,
// and the Kotlin app implements the identical rules (see android-app/.../Pricing.kt).
//
// Rules
//  1. Base price = variant.price if a variant is chosen, else item.price.
//  2. For every option group:
//       - `included` = variant.included[group.id] if defined, else group.included (free picks).
//       - Picks are counted in selection order; picks beyond `included` cost group.extra_price each.
//       - Every selected option ALSO adds its own option.price (surcharge, e.g. smoked salmon +5.99).
//  3. Line total = (base + options) × qty.
//  4. Taxes are computed on the order subtotal: GST and QST both on the subtotal (Québec rule).

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function findItem(menu, itemId) {
  return menu.items.find(i => i.id === itemId) || null;
}

/**
 * @param {object} menu       full menu document
 * @param {object} line       { item_id, variant_id?, options: [{group_id, option_id}], qty, note? }
 * @param {string} lang       'fr' | 'en' — for the human-readable description
 * @returns {{ ok: boolean, error?: string, priced?: object }}
 */
export function priceLine(menu, line, lang = 'fr') {
  const item = findItem(menu, line.item_id);
  if (!item) return { ok: false, error: `Unknown item ${line.item_id}` };
  if (item.available === false) return { ok: false, error: `${name(item, lang)} is not available` };
  const cat = menu.categories.find(c => c.id === item.category_id);
  if (cat && cat.visible === false) return { ok: false, error: `${name(item, lang)} is not available` };

  const qty = Math.max(1, Math.min(50, parseInt(line.qty || 1, 10) || 1));
  let variant = null;
  if (item.variants && item.variants.length) {
    variant = item.variants.find(v => v.id === line.variant_id) || null;
    if (!variant) return { ok: false, error: `Please choose a size / formula for ${name(item, lang)}` };
  }
  let unit = variant ? variant.price : item.price;
  const chosen = [];   // [{group_id, option_id, name, price, extra}]
  const selections = Array.isArray(line.options) ? line.options : [];

  for (const g of item.option_groups || []) {
    const picks = selections.filter(s => s.group_id === g.id);
    const included = (variant && variant.included && g.id in variant.included) ? variant.included[g.id] : (g.included || 0);
    const type = g.type === 'single' ? 'single' : 'multi';
    if (type === 'single' && picks.length > 1) return { ok: false, error: `Only one choice allowed in ${name(g, lang)}` };
    const min = g.required ? Math.max(1, g.min || 0) : (g.min || 0);
    if (picks.length < min) return { ok: false, error: `${name(g, lang)}: please choose at least ${min}` };
    if (g.max != null && g.max > 0 && picks.length > g.max) return { ok: false, error: `${name(g, lang)}: maximum ${g.max}` };
    picks.forEach((p, idx) => {
      const o = (g.options || []).find(o => o.id === p.option_id);
      if (!o) throw Object.assign(new Error(`Unknown option ${p.option_id} in ${g.id}`), { user: true });
      if (o.available === false) throw Object.assign(new Error(`${name(o, lang)} is not available`), { user: true });
      const extra = idx >= included ? (g.extra_price || 0) : 0;
      const price = round2((o.price || 0) + extra);
      unit += price;
      chosen.push({ group_id: g.id, option_id: o.id, group_name: name(g, lang), name: name(o, lang), price, extra, surcharge: o.price || 0 });
    });
  }
  // Selections referring to groups the item doesn't have are ignored on purpose (stale app cache).
  unit = round2(unit);
  return {
    ok: true,
    priced: {
      item_id: item.id,
      category_id: item.category_id,
      name: name(item, lang),
      name_fr: item.name.fr, name_en: item.name.en || item.name.fr,
      variant_id: variant ? variant.id : null,
      variant_name: variant ? name(variant, lang) : null,
      options: chosen,
      qty,
      unit_price: unit,
      line_total: round2(unit * qty),
      note: (line.note || '').toString().slice(0, 200),
    },
  };
}

export function priceOrder(menu, lines, settings, lang = 'fr') {
  const priced = [];
  for (const l of lines) {
    let r;
    try { r = priceLine(menu, l, lang); }
    catch (e) { if (e.user) return { ok: false, error: e.message }; throw e; }
    if (!r.ok) return r;
    priced.push(r.priced);
  }
  if (!priced.length) return { ok: false, error: 'Empty order' };
  const subtotal = round2(priced.reduce((s, p) => s + p.line_total, 0));
  const gst = round2(subtotal * (Number(settings.tax_gst) || 0) / 100);
  const qst = round2(subtotal * (Number(settings.tax_qst) || 0) / 100);
  const total = round2(subtotal + gst + qst);
  return { ok: true, lines: priced, subtotal, tax_gst: gst, tax_qst: qst, total };
}

export function name(obj, lang) {
  if (!obj || !obj.name) return '';
  if (typeof obj.name === 'string') return obj.name;
  return (lang === 'en' && obj.name.en) ? obj.name.en : (obj.name.fr || obj.name.en || '');
}

export function formatPrice(n, lang = 'fr') {
  const v = (Math.round(n * 100) / 100).toFixed(2);
  return lang === 'en' ? `$${v}` : `${v.replace('.', ',')} $`;
}
