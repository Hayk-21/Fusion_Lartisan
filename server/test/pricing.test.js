import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { priceLine, priceOrder } from '../src/pricing.js';

const menu = JSON.parse(fs.readFileSync(new URL('../data/menu.seed.json', import.meta.url), 'utf8'));
const settings = { tax_gst: 5, tax_qst: 9.975 };
const pick = (g, o) => ({ group_id: g, option_id: o });

test('galette: included fillings are free, extras and surcharges add up', () => {
  const r = priceLine(menu, { item_id: 'galette-composer', variant_id: 'essentiel', qty: 1,
    options: [pick('garnitures', 'cheddar'), pick('garnitures', 'jambon-dinde'), pick('garnitures', 'champignons'), pick('garnitures', 'saumon-fume'), pick('sauces', 'pesto')] });
  assert.equal(r.ok, true);
  // 14.99 + (4th filling: 2.99 extra + 5.99 salmon surcharge) + pesto 1.55
  assert.equal(r.priced.unit_price, 25.52);
});

test('galette: variant overrides the included count', () => {
  const opts = ['cheddar', 'jambon-dinde', 'champignons', 'epinards'].map(o => pick('garnitures', o));
  assert.equal(priceLine(menu, { item_id: 'galette-composer', variant_id: 'gourmand', options: opts }).priced.unit_price, 17.99);
  assert.equal(priceLine(menu, { item_id: 'galette-composer', variant_id: 'essentiel', options: opts }).priced.unit_price, 14.99 + 2.99);
});

test('sweet crêpe: base required, waffle +2.49, premium cream +3.50', () => {
  const r = priceLine(menu, { item_id: 'crepe-composer', variant_id: 'gourmand', options: [pick('base', 'gaufre'), pick('garnitures', 'nutella'), pick('garnitures', 'fraises'), pick('garnitures', 'bananes'), pick('premium', 'pistache')] });
  assert.equal(r.priced.unit_price, 12.99 + 2.49 + 2.49 + 3.50);
  const noBase = priceLine(menu, { item_id: 'crepe-composer', variant_id: 'gourmand', options: [pick('garnitures', 'nutella')] });
  assert.equal(noBase.ok, false);
});

test('milkshake vs coupe: different included flavours', () => {
  const two = [pick('parfums', 'vanille'), pick('parfums', 'chocolat'), pick('toppings', 'oreo')];
  assert.equal(priceLine(menu, { item_id: 'glace-composer', variant_id: 'coupe', options: two }).priced.unit_price, 7.99);
  assert.equal(priceLine(menu, { item_id: 'glace-composer', variant_id: 'milkshake', options: two }).priced.unit_price, 8.99 + 2.50);
});

test('sizes and plant milk', () => {
  const r = priceLine(menu, { item_id: 'hot-latte', variant_id: 'l', qty: 2, options: [pick('lait', 'avoine')] });
  assert.equal(r.priced.unit_price, 6.50); assert.equal(r.priced.line_total, 13.00);
  assert.equal(priceLine(menu, { item_id: 'hot-latte', qty: 1 }).ok, false); // size is required
});

test('single-choice group rejects two picks; required group rejects none', () => {
  assert.equal(priceLine(menu, { item_id: 'hot-the-infusion', options: [pick('the', 'menthe'), pick('the', 'jasmin')] }).ok, false);
  assert.equal(priceLine(menu, { item_id: 'hot-the-infusion', options: [] }).ok, false);
  assert.equal(priceLine(menu, { item_id: 'hot-the-infusion', options: [pick('the', 'menthe')] }).priced.unit_price, 3.50);
});

test('order totals: GST and QST both on the subtotal', () => {
  const o = priceOrder(menu, [{ item_id: 'cold-eska', qty: 4 }], settings, 'fr');
  assert.equal(o.subtotal, 10.00); assert.equal(o.tax_gst, 0.50); assert.equal(o.tax_qst, 1.00); assert.equal(o.total, 11.50);
});

test('unknown / unavailable items are rejected', () => {
  assert.equal(priceLine(menu, { item_id: 'nope' }).ok, false);
  const m2 = JSON.parse(JSON.stringify(menu)); m2.items.find(i => i.id === 'cold-eska').available = false;
  assert.equal(priceLine(m2, { item_id: 'cold-eska' }).ok, false);
});
