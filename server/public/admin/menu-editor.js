/* Menu editor — categories, items, variants, option groups. Works on a local copy; "Save" sends the whole menu. */
(function () {
  let menu = null, selCat = null, selItem = null, dirty = false;
  const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 7);

  window.MenuEditor = { isDirty: () => dirty };
  function setDirty(v) { dirty = v; $('#menuDirty').classList.toggle('hidden', !v); }
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  async function load() {
    menu = await api('/admin/menu');
    menu.categories.sort((a, b) => a.sort - b.sort); menu.items.sort((a, b) => a.sort - b.sort);
    if (!selCat || !menu.categories.find(c => c.id === selCat)) selCat = menu.categories[0]?.id || null;
    selItem = null; setDirty(false); renderAll();
  }
  function renderAll() {
    $('#menuVersionLabel').textContent = t('menu.version', { v: menu.version, c: menu.categories.length, i: menu.items.length });
    renderCats(); renderItems(); renderEditor();
  }

  // ---------------------------------------------------------------- categories
  function renderCats() {
    $('#catList').innerHTML = menu.categories.map((c, i) => `<li class="${c.id === selCat ? 'active' : ''} ${c.visible === false ? 'off' : ''}" data-id="${c.id}">
      <span>${esc(c.icon || '')}</span><span class="nm">${esc(tx(c.name))}<span class="sub">${menu.items.filter(x => x.category_id === c.id).length} ${t('menu.items').toLowerCase()}${c.visible === false ? ' · ' + t('menu.hidden') : ''}</span></span>
      <span class="mini"><button data-mv="-1" title="${t('ed.up')}" ${i === 0 ? 'disabled' : ''}>▲</button><button data-mv="1" title="${t('ed.down')}" ${i === menu.categories.length - 1 ? 'disabled' : ''}>▼</button></span></li>`).join('');
  }
  $('#catList').addEventListener('click', e => {
    const li = e.target.closest('li'); if (!li) return;
    const mv = e.target.closest('[data-mv]');
    if (mv) { moveInArray(menu.categories, li.dataset.id, Number(mv.dataset.mv)); menu.categories.forEach((c, i) => c.sort = i + 1); setDirty(true); renderCats(); return; }
    selCat = li.dataset.id; selItem = null; renderCats(); renderItems(); renderEditor();
  });
  $('#catAdd').addEventListener('click', () => {
    const c = { id: uid('cat'), name: { fr: t('menu.newCategory'), en: 'New category' }, description: { fr: '', en: '' }, icon: '🍽️', sort: menu.categories.length + 1, visible: true };
    menu.categories.push(c); selCat = c.id; selItem = null; setDirty(true); renderAll();
    $('#catEditor input')?.focus();
  });
  function renderCatEditor() {
    const c = menu.categories.find(x => x.id === selCat);
    if (!c) { $('#catEditor').innerHTML = ''; return; }
    $('#catEditor').innerHTML = `
      <div class="row"><label style="flex:1"><span>${t('menu.catName')}</span><input data-cb="name.fr" value="${esc(c.name.fr)}"></label>
        <label style="flex:1"><span>${t('menu.catNameEn')}</span><input data-cb="name.en" value="${esc(c.name.en || '')}"></label>
        <label style="width:64px"><span>${t('menu.icon')}</span><input data-cb="icon" value="${esc(c.icon || '')}"></label></div>
      <div class="row"><label style="flex:1"><span>${t('menu.catDesc')}</span><input data-cb="description.fr" value="${esc(c.description?.fr || '')}"></label>
        <label style="flex:1"><span>${t('menu.catDescEn')}</span><input data-cb="description.en" value="${esc(c.description?.en || '')}"></label></div>
      <div class="row" style="justify-content:space-between;align-items:center">
        <label class="check"><input type="checkbox" data-cb="visible" ${c.visible !== false ? 'checked' : ''}><span>${t('menu.visible')}</span></label>
        <label class="check"><input type="checkbox" data-cb="daily_special" ${c.daily_special ? 'checked' : ''}><span>${t('menu.dailySpecial')}</span></label>
        <button class="small ghost danger-text" id="catDelete">🗑 ${t('common.delete')}</button></div>`;
    $$('#catEditor [data-cb]').forEach(inp => inp.addEventListener('input', () => {
      setPath(c, inp.dataset.cb, inp.type === 'checkbox' ? inp.checked : inp.value); setDirty(true); renderCats();
    }));
    $('#catDelete').addEventListener('click', async () => {
      const n = menu.items.filter(i => i.category_id === c.id).length;
      if (!(await confirmDialog(t('menu.deleteCat', { n: tx(c.name), i: n }), { danger: true }))) return;
      menu.items = menu.items.filter(i => i.category_id !== c.id);
      menu.categories = menu.categories.filter(x => x.id !== c.id);
      selCat = menu.categories[0]?.id || null; selItem = null; setDirty(true); renderAll();
    });
  }

  // ---------------------------------------------------------------- items list
  function renderItems() {
    renderCatEditor();
    const c = menu.categories.find(x => x.id === selCat);
    $('#itemsTitle').textContent = c ? tx(c.name) : t('menu.items');
    const list = menu.items.filter(i => i.category_id === selCat);
    $('#itemList').innerHTML = list.map((it, i) => `<li class="${it.id === selItem ? 'active' : ''} ${it.available === false ? 'off' : ''}" data-id="${it.id}">
      <span class="nm">${esc(tx(it.name))}<span class="sub">${it.variants?.length ? it.variants.map(v => tx(v.name) + ' ' + money(v.price)).join(' · ') : money(it.price)}${it.available === false ? ' · ' + t('menu.unavailable') : ''}</span></span>
      <span class="mini"><button data-mv="-1" ${i === 0 ? 'disabled' : ''}>▲</button><button data-mv="1" ${i === list.length - 1 ? 'disabled' : ''}>▼</button></span></li>`).join('');
  }
  $('#itemList').addEventListener('click', e => {
    const li = e.target.closest('li'); if (!li) return;
    const mv = e.target.closest('[data-mv]');
    if (mv) {
      const list = menu.items.filter(i => i.category_id === selCat);
      moveInArray(list, li.dataset.id, Number(mv.dataset.mv));
      list.forEach((it, i) => it.sort = i + 1);
      menu.items.sort((a, b) => a.sort - b.sort); setDirty(true); renderItems(); return;
    }
    selItem = li.dataset.id; renderItems(); renderEditor();
  });
  $('#itemAdd').addEventListener('click', () => {
    if (!selCat) return;
    const it = { id: uid('item'), category_id: selCat, name: { fr: t('menu.newItem'), en: 'New item' }, description: { fr: '', en: '' }, price: 0, available: true,
      sort: menu.items.filter(i => i.category_id === selCat).length + 1, badge: null, variants: [], option_groups: [] };
    menu.items.push(it); selItem = it.id; setDirty(true); renderItems(); renderEditor();
    $('#itemEditor input')?.focus();
  });

  // ---------------------------------------------------------------- item editor
  function renderEditor() {
    const it = menu.items.find(x => x.id === selItem);
    const ed = $('#itemEditor');
    if (!it) { ed.innerHTML = `<div class="empty">${t('menu.selectItem')}</div>`; return; }
    const catOpts = menu.categories.map(c => `<option value="${c.id}" ${c.id === it.category_id ? 'selected' : ''}>${esc(c.icon || '')} ${esc(tx(c.name))}</option>`).join('');
    ed.innerHTML = `
      <h3><span>${esc(tx(it.name))}</span><span class="toolbar"><button class="small ghost" id="itDup">⧉ ${t('ed.duplicate')}</button><button class="small ghost danger-text" id="itDel">🗑 ${t('ed.delete')}</button></span></h3>
      <fieldset><legend>${t('ed.general')}</legend>
        <div class="row2"><label><span>${t('ed.nameFr')}</span><input data-b="name.fr" value="${esc(it.name.fr)}"></label><label><span>${t('ed.nameEn')}</span><input data-b="name.en" value="${esc(it.name.en || '')}"></label></div>
        <div class="row2"><label><span>${t('ed.descFr')}</span><textarea data-b="description.fr" rows="3">${esc(it.description?.fr || '')}</textarea></label><label><span>${t('ed.descEn')}</span><textarea data-b="description.en" rows="3">${esc(it.description?.en || '')}</textarea></label></div>
        <div class="row4"><label><span>${t('ed.category')}</span><select data-b="category_id">${catOpts}</select></label>
          <label><span>${t('ed.badgeFr')}</span><input data-b="badge.fr" value="${esc(it.badge?.fr || '')}"></label>
          <label><span>${t('ed.badgeEn')}</span><input data-b="badge.en" value="${esc(it.badge?.en || '')}"></label>
          <label><span>${t('ed.price')}</span><input type="number" step="0.01" min="0" data-b="price" value="${it.price}" ${it.variants.length ? 'disabled title="Prix défini par les tailles/formules"' : ''}></label></div>
        <div class="row2" style="align-items:center">
          <label class="check"><input type="checkbox" data-b="available" ${it.available !== false ? 'checked' : ''}><span>${t('ed.available')}</span></label>
          <div style="display:flex;gap:10px;align-items:center"><img class="img-preview" src="${it.image ? esc(it.image) : '/shared/logo-mark.png'}" id="imgPrev"><span><button class="small ghost" id="imgUp">📷 ${t('ed.upload')}</button> ${it.image ? `<button class="small ghost danger-text" id="imgRm">${t('ed.removeImage')}</button>` : ''}</span></div>
        </div>
      </fieldset>
      <fieldset><legend>${t('ed.variants')}</legend><p class="help">${t('ed.variantsHelp')}</p>
        <div id="variants">${it.variants.map((v, vi) => variantHtml(it, v, vi)).join('')}</div>
        <button class="small ghost" id="vAdd">${t('ed.addVariant')}</button>
      </fieldset>
      <fieldset><legend>${t('ed.groups')}</legend><p class="help">${t('ed.groupsHelp')}</p>
        <div id="groups">${it.option_groups.map((g, gi) => groupHtml(g, gi, it.option_groups.length)).join('')}</div>
        <button class="small ghost" id="gAdd">${t('ed.addGroup')}</button>
      </fieldset>`;

    // generic binding: data-b="path" relative to the item
    $$('#itemEditor [data-b]').forEach(inp => inp.addEventListener('input', () => {
      let v = inp.type === 'checkbox' ? inp.checked : inp.value;
      if (inp.type === 'number') v = v === '' ? (inp.dataset.nullable ? null : 0) : Number(v);
      setPath(it, inp.dataset.b, v); setDirty(true);
      if (inp.dataset.b.startsWith('name') || inp.dataset.b === 'price' || inp.dataset.b === 'available' || inp.dataset.b.startsWith('variants')) { renderItems(); $('#itemEditor h3 span:first-child').textContent = tx(it.name); }
      if (inp.dataset.b === 'category_id') { selCat = it.category_id; renderCats(); renderItems(); }
    }));
    // structural buttons
    $('#itDup').onclick = () => { const copy = JSON.parse(JSON.stringify(it)); copy.id = uid('item'); copy.name = { fr: it.name.fr + ' (copie)', en: (it.name.en || it.name.fr) + ' (copy)' }; copy.sort = it.sort + 0.5; menu.items.push(copy); menu.items.sort((a, b) => a.sort - b.sort); menu.items.filter(i => i.category_id === selCat).forEach((x, i) => x.sort = i + 1); selItem = copy.id; setDirty(true); renderItems(); renderEditor(); };
    $('#itDel').onclick = async () => { if (!(await confirmDialog(t('menu.deleteItem', { n: tx(it.name) }), { danger: true }))) return; menu.items = menu.items.filter(x => x.id !== it.id); selItem = null; setDirty(true); renderItems(); renderEditor(); };
    $('#imgUp').onclick = () => { $('#imageFile').onchange = () => uploadImage(it); $('#imageFile').click(); };
    $('#imgRm')?.addEventListener('click', () => { delete it.image; setDirty(true); renderEditor(); });
    $('#vAdd').onclick = () => { it.variants.push({ id: uid('v'), name: { fr: '', en: '' }, price: it.price || 0, included: {} }); setDirty(true); renderEditor(); };
    $('#gAdd').onclick = () => { it.option_groups.push({ id: uid('g'), name: { fr: '', en: '' }, type: 'multi', required: false, min: 0, max: null, included: 0, extra_price: 0, options: [] }); setDirty(true); renderEditor(); };
    ed.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => structural(it, b.dataset.act, b.dataset)));
  }

  function variantHtml(it, v, vi) {
    const inc = it.option_groups.filter(g => g.type !== 'single').map(g => `<label><span>${t('ed.vIncluded', { g: esc(tx(g.name) || g.id) })}</span><input type="number" min="0" data-b="variants.${vi}.included.${g.id}" value="${v.included?.[g.id] ?? ''}" placeholder="${g.included || 0}"></label>`).join('');
    return `<div class="subcard"><div class="subhead"><b>#${vi + 1}</b><span class="toolbar">
      <button class="small ghost" data-act="vmove" data-i="${vi}" data-d="-1">▲</button><button class="small ghost" data-act="vmove" data-i="${vi}" data-d="1">▼</button><button class="small ghost danger-text" data-act="vdel" data-i="${vi}">🗑</button></span></div>
      <div class="row3"><label><span>${t('ed.vName')}</span><input data-b="variants.${vi}.name.fr" value="${esc(v.name.fr)}"></label><label><span>${t('ed.vNameEn')}</span><input data-b="variants.${vi}.name.en" value="${esc(v.name.en || '')}"></label><label><span>${t('ed.vPrice')}</span><input type="number" step="0.01" min="0" data-b="variants.${vi}.price" value="${v.price}"></label></div>
      <div class="row2"><label><span>${t('ed.vDesc')}</span><input data-b="variants.${vi}.description.fr" value="${esc(v.description?.fr || '')}"></label><label><span>${t('ed.vDescEn')}</span><input data-b="variants.${vi}.description.en" value="${esc(v.description?.en || '')}"></label></div>
      ${inc ? `<div class="row3">${inc}</div>` : ''}</div>`;
  }
  function groupHtml(g, gi, n) {
    return `<div class="subcard"><div class="subhead"><b>${esc(tx(g.name) || '#' + (gi + 1))}</b><span class="toolbar">
      <button class="small ghost" data-act="gmove" data-i="${gi}" data-d="-1" ${gi === 0 ? 'disabled' : ''}>▲</button><button class="small ghost" data-act="gmove" data-i="${gi}" data-d="1" ${gi === n - 1 ? 'disabled' : ''}>▼</button><button class="small ghost danger-text" data-act="gdel" data-i="${gi}">🗑</button></span></div>
      <div class="row3"><label><span>${t('ed.gName')}</span><input data-b="option_groups.${gi}.name.fr" value="${esc(g.name.fr)}"></label><label><span>${t('ed.gNameEn')}</span><input data-b="option_groups.${gi}.name.en" value="${esc(g.name.en || '')}"></label>
        <label><span>${t('ed.gType')}</span><select data-b="option_groups.${gi}.type"><option value="multi" ${g.type !== 'single' ? 'selected' : ''}>${t('ed.multi')}</option><option value="single" ${g.type === 'single' ? 'selected' : ''}>${t('ed.single')}</option></select></label></div>
      <div class="row4"><label class="check" style="margin-top:22px"><input type="checkbox" data-b="option_groups.${gi}.required" ${g.required ? 'checked' : ''}><span>${t('ed.required')}</span></label>
        <label><span>${t('ed.min')}</span><input type="number" min="0" data-b="option_groups.${gi}.min" value="${g.min || 0}"></label>
        <label><span>${t('ed.max')}</span><input type="number" min="0" data-nullable="1" data-b="option_groups.${gi}.max" value="${g.max ?? ''}"></label>
        <label><span>${t('ed.included')}</span><input type="number" min="0" data-b="option_groups.${gi}.included" value="${g.included || 0}"></label></div>
      <div class="row3"><label><span>${t('ed.extra')}</span><input type="number" step="0.01" min="0" data-b="option_groups.${gi}.extra_price" value="${g.extra_price || 0}"></label>
        <label><span>${t('ed.hint')}</span><input data-b="option_groups.${gi}.hint.fr" value="${esc(g.hint?.fr || '')}"></label><label><span>${t('ed.hintEn')}</span><input data-b="option_groups.${gi}.hint.en" value="${esc(g.hint?.en || '')}"></label></div>
      <table class="opt-table"><thead><tr><th>${t('ed.oName')}</th><th>${t('ed.oNameEn')}</th><th>${t('ed.oSection')}</th><th>${t('ed.oSectionEn')}</th><th class="narrow">${t('ed.oPrice')}</th><th class="x">${t('ed.oAvail')}</th><th class="x"></th><th class="x"></th></tr></thead><tbody>
      ${g.options.map((o, oi) => `<tr><td><input data-b="option_groups.${gi}.options.${oi}.name.fr" value="${esc(o.name.fr)}"></td><td><input data-b="option_groups.${gi}.options.${oi}.name.en" value="${esc(o.name.en || '')}"></td>
        <td><input data-b="option_groups.${gi}.options.${oi}.section.fr" value="${esc(o.section?.fr || '')}"></td><td><input data-b="option_groups.${gi}.options.${oi}.section.en" value="${esc(o.section?.en || '')}"></td>
        <td class="narrow"><input type="number" step="0.01" min="0" data-b="option_groups.${gi}.options.${oi}.price" value="${o.price || 0}"></td>
        <td class="x"><input type="checkbox" data-b="option_groups.${gi}.options.${oi}.available" ${o.available !== false ? 'checked' : ''}></td>
        <td class="x"><button class="small ghost" data-act="omove" data-g="${gi}" data-i="${oi}" data-d="-1">▲</button></td><td class="x"><button class="small ghost danger-text" data-act="odel" data-g="${gi}" data-i="${oi}">✕</button></td></tr>`).join('')}
      </tbody></table>
      <div class="toolbar"><button class="small ghost" data-act="oadd" data-g="${gi}">${t('ed.addOption')}</button><button class="small ghost" data-act="opaste" data-g="${gi}">📋 ${t('ed.pasteOptions')}</button></div></div>`;
  }
  function structural(it, act, d) {
    const i = Number(d.i), gi = Number(d.g), dir = Number(d.d);
    if (act === 'vdel') it.variants.splice(i, 1);
    else if (act === 'vmove') swap(it.variants, i, i + dir);
    else if (act === 'gdel') it.option_groups.splice(i, 1);
    else if (act === 'gmove') swap(it.option_groups, i, i + dir);
    else if (act === 'oadd') it.option_groups[gi].options.push({ id: uid('o'), name: { fr: '', en: '' }, price: 0, available: true });
    else if (act === 'odel') it.option_groups[gi].options.splice(i, 1);
    else if (act === 'omove') swap(it.option_groups[gi].options, i, i + dir);
    else if (act === 'opaste') return pasteOptions(it.option_groups[gi]);
    setDirty(true); renderEditor();
  }
  function pasteOptions(g) {
    modal(`<h2>${t('ed.pasteOptions')}</h2><p class="muted">${t('ed.pasteHelp')}</p><textarea id="pasteTa" rows="10" style="width:100%"></textarea>
      <div class="modal-actions"><button class="ghost" onclick="closeModal()">${t('common.cancel')}</button><button class="primary" id="pasteOk">OK</button></div>`);
    $('#pasteOk').onclick = () => {
      $('#pasteTa').value.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
        const [fr, en, price] = l.split('|').map(s => s.trim());
        g.options.push({ id: uid('o'), name: { fr, en: en || fr }, price: Number(price) || 0, available: true });
      });
      closeModal(); setDirty(true); renderEditor();
    };
  }
  async function uploadImage(it) {
    const f = $('#imageFile').files[0]; if (!f) return;
    const data = await resizeImage(f, 800);
    try { const r = await api('/admin/upload', { method: 'POST', body: { data, name: it.name.fr } }); it.image = r.url; setDirty(true); renderEditor(); }
    catch (e) { toast(e.message, 'err'); }
    $('#imageFile').value = '';
  }
  function resizeImage(file, max) {
    return new Promise(res => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = url;
    });
  }

  // ---------------------------------------------------------------- save / import / export / reset
  async function save() {
    $('#menuSave').disabled = true;
    try {
      const saved = await api('/admin/menu', { method: 'PUT', body: menu });
      menu = saved; setDirty(false); toast(t('menu.saved', { v: saved.version }), 'ok');
      if (selItem && !menu.items.find(i => i.id === selItem)) selItem = null;
      renderAll();
    } catch (e) { toast(e.message, 'err'); }
    $('#menuSave').disabled = false;
  }
  $('#menuSave').addEventListener('click', save);
  $('#menuExport').addEventListener('click', () => { location.href = '/api/admin/menu/export'; });
  $('#menuPush').addEventListener('click', async () => { await api('/admin/menu/push', { method: 'POST' }); toast('OK', 'ok'); });
  $('#menuReset').addEventListener('click', async () => { if (!(await confirmDialog(t('menu.resetConfirm'), { danger: true }))) return; await api('/admin/menu/reset', { method: 'POST' }); await load(); toast('OK', 'ok'); });
  $('#menuImport').addEventListener('click', () => { $('#importFile').onchange = async () => {
    const f = $('#importFile').files[0]; if (!f) return;
    try { const data = JSON.parse(await f.text()); await api('/admin/menu/import', { method: 'POST', body: data }); await load(); toast('OK', 'ok'); } catch (e) { toast(e.message, 'err'); }
    $('#importFile').value = '';
  }; $('#importFile').click(); });

  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 's' && currentView() === 'menu') { e.preventDefault(); save(); } });
  document.addEventListener('view', e => { if (e.detail === 'menu' && !menu) load(); });
  document.addEventListener('langchange', () => { if (menu) renderAll(); });
  document.addEventListener('app-stop', () => { menu = null; });

  // ---------------------------------------------------------------- utils
  function setPath(obj, path, value) {
    const parts = path.split('.'); let o = obj;
    for (let i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
    o[parts[parts.length - 1]] = value;
  }
  function moveInArray(arr, id, dir) { const i = arr.findIndex(x => x.id === id); swap(arr, i, i + dir); }
  function swap(arr, a, b) { if (a < 0 || b < 0 || a >= arr.length || b >= arr.length) return; [arr[a], arr[b]] = [arr[b], arr[a]]; }
})();
