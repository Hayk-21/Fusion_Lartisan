/* Homepage: loads /api/site and renders intro, featured dishes, reviews, hours, open/closed state. */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STR = {
    fr: { tagline: 'Crêperie & Café', 'nav.menu': 'Menu', 'nav.reviews': 'Avis', 'nav.contact': 'Nous trouver', 'nav.order': 'Commander', 'hero.order': 'Commander en ligne', 'hero.menu': 'Voir le menu',
      'how.title': 'Commandez en ligne, ramassez au café', 'how.sub': "Pas d'attente : votre commande vous attend au comptoir à l'heure choisie.",
      'how.s1': 'Composez votre commande', 'how.s1d': "Galettes, crêpes, cafés · les mêmes options qu'au café, avec le prix en direct.", 'how.s2': "Choisissez l'heure de ramassage", 'how.s2d': '« Dès que possible » (environ {m} minutes) ou un créneau plus tard dans la journée.',
      'how.s3': 'Passez au comptoir', 'how.s3d.counter': 'Donnez votre numéro de commande, réglez au comptoir et savourez.', 'how.s3d.stripe': 'Payez en ligne (carte, Apple Pay, Google Pay) ou au comptoir, puis savourez.',
      'dishes.title': 'Nos spéciaux du jour', 'dishes.sub': 'Les favoris de la section « du jour », faits maison chaque jour.', 'dishes.all': 'Tout le menu →', from: 'à partir de',
      'about.title': 'Notre histoire', 'about.motto': "L'art du fait maison.", 'v.fresh': 'Produits frais et bio', 'v.home': 'Fait maison chaque jour', 'v.coffee': 'Café de spécialité', 'v.breton': 'Coupes glacées & milkshakes', 'v.gf': 'Galettes de sarrasin sans gluten', 'v.welcome': 'Accueil chaleureux à Montréal',
      'reviews.title': 'Ce que disent nos clients', 'reviews.link': 'Voir les avis sur Google →', 'reviews.count': '{n} avis Google', 'hours.google': 'Heures synchronisées avec Google Maps', 'banner.test': 'Mode test : le site accepte les commandes hors des heures d\'ouverture.', 'reviews.none': 'Les avis Google apparaîtront ici.',
      'loc.title': 'Nous trouver', 'loc.hours': "Heures d'ouverture", closed: 'Fermé', 'foot.tag': 'Crêperie artisanale · Café de spécialité · Sur place & à emporter', 'foot.thanks': "Merci de soutenir l'artisanat local !",
      open: 'Ouvert', 'open.until': 'Ouvert · ferme à {t}', 'open.test': 'Ouvert (mode test)', 'closed.now': 'Fermé', 'closed.today': "Fermé aujourd'hui", 'closed.temp': 'Fermé exceptionnellement', 'opens.today': 'ouvre à {t}', 'opens.tomorrow': 'ouvre demain à {t}', 'opens.day': 'ouvre {d} à {t}', 'hours.today': "Aujourd'hui : {o} - {c}",
      'banner.closed': 'Le café est fermé · la commande en ligne reprend {when}.', 'banner.temp': 'Le café est fermé pour le moment · la commande en ligne reprendra à la réouverture.', 'banner.late': "Trop tard pour commander aujourd'hui · à demain !", 'banner.off': 'La commande en ligne est temporairement désactivée.',
      days: { mon: 'Lundi', tue: 'Mardi', wed: 'Mercredi', thu: 'Jeudi', fri: 'Vendredi', sat: 'Samedi', sun: 'Dimanche' } },
    en: { tagline: 'Crêperie & Café', 'nav.menu': 'Menu', 'nav.reviews': 'Reviews', 'nav.contact': 'Find us', 'nav.order': 'Order', 'hero.order': 'Order online', 'hero.menu': 'See the menu',
      'how.title': 'Order online, pick up at the café', 'how.sub': 'No waiting: your order is ready at the counter at the time you choose.',
      'how.s1': 'Build your order', 'how.s1d': 'Galettes, crêpes, coffees · the same options as in the café, priced live.', 'how.s2': 'Choose a pickup time', 'how.s2d': '"As soon as possible" (about {m} minutes) or a later slot today.',
      'how.s3': 'Come to the counter', 'how.s3d.counter': 'Give your order number, pay at the counter and enjoy.', 'how.s3d.stripe': 'Pay online (card, Apple Pay, Google Pay) or at the counter, then enjoy.',
      'dishes.title': "Today's specials", 'dishes.sub': 'The favourites of our daily-special section, made in-house every day.', 'dishes.all': 'Full menu →', from: 'from',
      'about.title': 'Our story', 'about.motto': 'The art of made in-house.', 'v.fresh': 'Fresh, organic products', 'v.home': 'Made in-house daily', 'v.coffee': 'Specialty coffee', 'v.breton': 'Ice-cream cups & milkshakes', 'v.gf': 'Gluten-free buckwheat galettes', 'v.welcome': 'A warm welcome in Montréal',
      'reviews.title': 'What our customers say', 'reviews.link': 'See reviews on Google →', 'reviews.count': '{n} Google reviews', 'hours.google': 'Hours synced with Google Maps', 'banner.test': 'Test mode: the site accepts orders outside opening hours.', 'reviews.none': 'Google reviews will appear here.',
      'loc.title': 'Find us', 'loc.hours': 'Opening hours', closed: 'Closed', 'foot.tag': 'Artisan crêperie · Specialty coffee · Dine in & take out', 'foot.thanks': 'Thank you for supporting local artisans!',
      open: 'Open', 'open.until': 'Open · closes at {t}', 'open.test': 'Open (test mode)', 'closed.now': 'Closed', 'closed.today': 'Closed today', 'closed.temp': 'Exceptionally closed', 'opens.today': 'opens at {t}', 'opens.tomorrow': 'opens tomorrow at {t}', 'opens.day': 'opens {d} at {t}', 'hours.today': 'Today: {o} - {c}',
      'banner.closed': 'The café is closed · online ordering resumes {when}.', 'banner.temp': 'The café is closed at the moment · online ordering resumes when it reopens.', 'banner.late': 'Too late to order today · see you tomorrow!', 'banner.off': 'Online ordering is temporarily disabled.',
      days: { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' } },
  };
  let lang = localStorage.getItem('site_lang') || ((navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr');
  const t = (k, v = {}) => { let s = STR[lang][k] ?? STR.fr[k] ?? k; if (typeof s !== 'string') return s; for (const [a, b] of Object.entries(v)) s = s.replace('{' + a + '}', b); return s; };
  const tx = o => o ? ((lang === 'en' && o.en) ? o.en : (o.fr || o.en || '')) : '';
  const money = n => { const v = (Math.round(n * 100) / 100).toFixed(2); return lang === 'en' ? '$' + v : v.replace('.', ',') + ' $'; };
  const fmtT = hhmm => { if (!hhmm) return ''; const [h, m] = hhmm.split(':').map(Number); return lang === 'en' ? `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}` : `${h} h${m ? ' ' + String(m).padStart(2, '0') : ''}`; };
  let site = null;

  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
    document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    if (site) render();
  }
  document.querySelectorAll('.lang button').forEach(b => b.onclick = () => { lang = b.dataset.lang; localStorage.setItem('site_lang', lang); applyLang(); });

  function render() {
    const s = site, st = s.state;
    document.title = `${s.cafe_name}, ${t('tagline')}, Montréal`;
    $('#navName').textContent = s.cafe_name; $('#footName').textContent = s.cafe_name; $('#heroTitle').textContent = s.cafe_name;
    $('#navLogo').src = s.logo_url || '/shared/logo-mark.png';
    $('#heroEyebrow').textContent = tx(s.tagline);
    $('#heroLead').textContent = tx(s.about).split('. ').slice(0, 2).join('. ') + (tx(s.about).includes('. ') ? '.' : '');
    $('#aboutText').textContent = tx(s.about);
    $('#howPay').textContent = t(st.payment_modes.includes('stripe') ? 'how.s3d.stripe' : 'how.s3d.counter');
    document.querySelector('[data-i18n="how.s2d"]').textContent = t('how.s2d', { m: st.lead_minutes || 15 });
    $('#year').textContent = new Date().getFullYear();
    // open / closed
    const badge = $('#openBadge');
    badge.className = 'badge ' + (st.open ? 'open' : 'closed');
    let text, hint = '';
    if (st.test_mode) { text = t('open.test'); }
    else if (st.open) { text = t('open.until', { t: fmtT(st.today.close) }); }
    else {
      text = st.reason === 'temporarily_closed' ? t('closed.temp') : st.reason === 'closed_today' ? t('closed.today') : t('closed.now');
      if (st.next) hint = st.next.today ? t('opens.today', { t: fmtT(st.next.open) }) : st.next.tomorrow ? t('opens.tomorrow', { t: fmtT(st.next.open) }) : t('opens.day', { d: t('days')[st.next.day].toLowerCase(), t: fmtT(st.next.open) });
    }
    $('#openText').textContent = text; $('#hoursToday').textContent = st.test_mode ? '' : hint ? '· ' + hint : (st.today && !st.today.closed ? '· ' + t('hours.today', { o: fmtT(st.today.open), c: fmtT(st.today.close) }) : '');
    const banner = $('#closedBanner');
    if (!st.ordering) {
      banner.classList.remove('hidden');
      banner.textContent = st.reason === 'temporarily_closed' ? (tx(s.closed_message) || t('banner.temp'))
        : !st.open ? t('banner.closed', { when: hint || '' }) : (st.slots?.length === 0 && s.state.open ? t('banner.late') : t('banner.off'));
    } else banner.classList.add('hidden');
    // hero images: first 3 featured
    $('#heroImgs').innerHTML = s.featured.slice(0, 3).map(f => `<img src="${esc(f.image || '/shared/logo-full.png')}" alt="${esc(tx(f.name))}">`).join('');
    // dishes
    $('#dishGrid').innerHTML = s.featured.map(f => `<a class="dish" href="/commander/#${esc(f.category_id)}">${f.image ? `<img src="${esc(f.image)}" alt="">` : ''}<div class="body">${f.badge ? `<span class="tag">${esc(tx(f.badge))}</span>` : ''}<div class="nm">${esc(tx(f.name))}</div><div class="ds">${esc(tx(f.description))}</div><div class="pr">${f.from ? `<small>${t('from')}</small> ` : ''}${money(f.price)}</div></div></a>`).join('');
    // reviews
    const r = s.reviews;
    $('#reviewsLink').href = (r && r.url) || s.google_maps_url;
    if (r && r.rating) {
      $('#ratingBox').innerHTML = `<span class="score">${r.rating.toFixed(1)}</span><div><div class="stars">${'★'.repeat(Math.round(r.rating))}${'☆'.repeat(5 - Math.round(r.rating))}</div><div class="gbadge">${t('reviews.count', { n: r.count })}</div></div>`;
      $('#reviewList').innerHTML = (r.reviews || []).slice(0, 3).map(x => `<div class="review"><div class="who">${x.photo ? `<img src="${esc(x.photo)}" alt="" referrerpolicy="no-referrer">` : '<img alt="">'}<div><b>${esc(x.author)}</b><small>${esc(lang === 'en' && x.when_en ? x.when_en : x.when)}</small></div></div><div class="stars">${'★'.repeat(x.rating)}${'☆'.repeat(5 - x.rating)}</div><p>${esc(x.text)}</p></div>`).join('');
    } else { $('#ratingBox').innerHTML = `<span class="gbadge">${t('reviews.none')}</span>`; $('#reviewList').innerHTML = ''; }
    // location
    $('#addr').textContent = s.address; $('#addrLink').href = s.google_maps_url || `https://www.google.com/maps/search/${encodeURIComponent(s.address)}`;
    $('#map').src = `https://www.google.com/maps?q=${encodeURIComponent(s.cafe_name + ', ' + s.address)}&output=embed&hl=${lang}`;
    if (s.phone) { $('#phoneLi').classList.remove('hidden'); $('#phoneLink').textContent = s.phone; $('#phoneLink').href = 'tel:' + s.phone.replace(/[^\d+]/g, ''); }
    if (s.email) { $('#mailLi').classList.remove('hidden'); $('#mailLink').textContent = s.email; $('#mailLink').href = 'mailto:' + s.email; }
    if (s.instagram) { $('#igLi').classList.remove('hidden'); $('#igLink').textContent = '@' + s.instagram.replace(/^@/, ''); $('#igLink').href = 'https://instagram.com/' + s.instagram.replace(/^@/, ''); }
    const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    $('#hoursSource').textContent = s.hours_from_google ? t('hours.google') : '';
    const tb = $('#testBanner'); tb.classList.toggle('hidden', !st.test_mode); tb.textContent = t('banner.test');
    $('#hoursTable').innerHTML = order.map(d => { const h = s.hours[d] || { closed: true }; return `<tr class="${d === st.today.day ? 'today' : ''}"><td>${t('days')[d]}</td><td>${h.closed ? t('closed') : `${fmtT(h.open)} - ${fmtT(h.close)}`}</td></tr>`; }).join('');
  }

  async function load() {
    try { site = await fetch('/api/site').then(r => r.json()); render(); }
    catch (e) { const el = $('#toast'); el.textContent = 'Erreur de chargement'; el.className = 'toast err'; }
  }
  applyLang(); load();
  setInterval(async () => { try { site.state = await fetch('/api/site/state').then(r => r.json()); render(); } catch {} }, 60000);
})();
