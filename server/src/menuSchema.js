// Validation + normalisation of the menu document coming from the admin panel.
// Keeps the database clean no matter what the browser sends.

const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';

function text(v, fallback = '') {
  if (v == null) return { fr: fallback, en: fallback };
  if (typeof v === 'string') return { fr: v, en: v };
  const fr = String(v.fr ?? '').trim();
  const en = String(v.en ?? '').trim();
  return { fr: fr || en || fallback, en: en || fr || fallback };
}

function num(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : d; }
function bool(v, d = true) { return v == null ? d : Boolean(v); }

export function uniqueId(base, taken) {
  let id = slug(base), i = 2;
  while (taken.has(id)) id = `${slug(base)}-${i++}`;
  taken.add(id);
  return id;
}

export function normalizeMenu(input) {
  const errors = [];
  if (!input || typeof input !== 'object') throw new Error('Menu must be an object');
  const catIds = new Set();
  const categories = (Array.isArray(input.categories) ? input.categories : []).map((c, idx) => {
    const name = text(c.name);
    if (!name.fr) errors.push(`Category #${idx + 1} has no name`);
    return {
      id: uniqueId(c.id || name.fr, catIds),
      name,
      description: text(c.description),
      icon: String(c.icon || '🍽️').slice(0, 8),
      sort: Number.isFinite(Number(c.sort)) ? Number(c.sort) : idx + 1,
      visible: bool(c.visible),
      daily_special: Boolean(c.daily_special),
      image: typeof c.image === 'string' && c.image ? c.image : undefined,
    };
  }).map(c => { if (c.image === undefined) delete c.image; return c; });
  const itemIds = new Set();
  const items = (Array.isArray(input.items) ? input.items : []).map((it, idx) => {
    const name = text(it.name);
    if (!name.fr) errors.push(`Item #${idx + 1} has no name`);
    if (!catIds.has(it.category_id)) errors.push(`Item "${name.fr}" refers to unknown category "${it.category_id}"`);
    const gIds = new Set();
    const option_groups = (Array.isArray(it.option_groups) ? it.option_groups : []).map(g => {
      const oIds = new Set();
      const gname = text(g.name);
      const maxRaw = g.max == null || g.max === '' ? null : Number(g.max);
      return {
        id: uniqueId(g.id || gname.fr, gIds),
        name: gname,
        hint: g.hint ? text(g.hint) : undefined,
        type: g.type === 'single' ? 'single' : 'multi',
        required: Boolean(g.required),
        min: Math.max(0, parseInt(g.min || 0, 10) || 0),
        max: Number.isFinite(maxRaw) && maxRaw > 0 ? Math.floor(maxRaw) : null,
        included: Math.max(0, parseInt(g.included || 0, 10) || 0),
        extra_price: num(g.extra_price),
        options: (Array.isArray(g.options) ? g.options : []).map(o => {
          const oname = text(o.name);
          const out = { id: uniqueId(o.id || oname.fr, oIds), name: oname, price: num(o.price), available: bool(o.available) };
          if (o.section && text(o.section).fr) out.section = text(o.section);
          return out;
        }),
      };
    }).map(g => { if (g.hint === undefined) delete g.hint; return g; });
    const vIds = new Set();
    const variants = (Array.isArray(it.variants) ? it.variants : []).map(v => {
      const vname = text(v.name);
      const out = { id: uniqueId(v.id || vname.fr, vIds), name: vname, price: num(v.price) };
      if (v.description && text(v.description).fr) out.description = text(v.description);
      if (v.included && typeof v.included === 'object') {
        const inc = {};
        for (const [k, n] of Object.entries(v.included)) if (gIds.has(k)) inc[k] = Math.max(0, parseInt(n, 10) || 0);
        if (Object.keys(inc).length) out.included = inc;
      }
      return out;
    });
    return {
      id: uniqueId(it.id || name.fr, itemIds),
      category_id: it.category_id,
      name,
      description: text(it.description),
      price: num(it.price),
      available: bool(it.available),
      sort: Number.isFinite(Number(it.sort)) ? Number(it.sort) : idx + 1,
      badge: it.badge && text(it.badge).fr ? text(it.badge) : null,
      image: typeof it.image === 'string' && it.image ? it.image : undefined,
      tags: Array.isArray(it.tags) ? [...new Set(it.tags.map(x => slug(x)).filter(Boolean))].slice(0, 8) : [],
      variants,
      option_groups,
    };
  }).map(it => { if (it.image === undefined) delete it.image; return it; });
  // Sections = the big tiles of the touch-screen home page; each groups one or more categories.
  const secIds = new Set();
  let sections = (Array.isArray(input.sections) ? input.sections : []).map((sec, idx) => ({
    id: uniqueId(sec.id || text(sec.name).fr || 'section', secIds),
    name: text(sec.name),
    image: typeof sec.image === 'string' && sec.image ? sec.image : '',
    sort: Number.isFinite(Number(sec.sort)) ? Number(sec.sort) : idx + 1,
    category_ids: (Array.isArray(sec.category_ids) ? sec.category_ids : []).filter(id => categories.some(c => c.id === id)),
  }));
  if (!sections.length) sections = defaultSections(categories);
  sections.sort((a, b) => a.sort - b.sort);
  if (errors.length) throw Object.assign(new Error(errors.join('; ')), { status: 400 });
  categories.sort((a, b) => a.sort - b.sort);
  items.sort((a, b) => a.sort - b.sort);
  return { currency: input.currency || 'CAD', sections, categories, items };
}

/** One section per category when the menu has no sections yet (older menus). */
export function defaultSections(categories) {
  return categories.filter(c => !c.daily_special).map((c, i) => ({ id: 'sec-' + c.id, name: { ...c.name }, image: c.image || '', sort: i + 1, category_ids: [c.id] }));
}
