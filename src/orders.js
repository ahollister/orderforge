import { readFileSync } from 'node:fs';
import { computeTotal } from './pricing.js';
import { saveOrder } from './storage.js';
import { notifyOrderPlaced } from './notify.js';
import { bestDiscount } from './discounts.js';

export async function processOrder(input) {
  if (!input.lines || input.lines.length === 0) {
    throw new Error('order has no lines');
  }

  const coupons = JSON.parse(readFileSync('./config/coupons.json', 'utf8'));
  const { rate } = JSON.parse(readFileSync('./config/tax.json', 'utf8'));

  const { subtotalCents, taxCents, totalCents, logLines } = computeTotal(input, rate);
  for (const line of logLines) console.log(line);

  const discountCents = bestDiscount(totalCents, coupons);

  const order = buildOrder(input, { subtotalCents, taxCents, totalCents }, discountCents, new Date().toISOString());

  saveOrder(order);
  await notifyOrderPlaced(order);
  return order;
}

// Functional core: pure order assembly. Takes the priced amounts, the chosen
// discount, and the placed-at timestamp as values, and returns the order shape
// with the net total computed. No I/O or clock access here.
export function buildOrder(input, priced, discountCents, placedAt) {
  return {
    id: input.id,
    lines: input.lines,
    subtotalCents: priced.subtotalCents,
    taxCents: priced.taxCents,
    discountCents,
    totalCents: priced.totalCents - discountCents,
    placedAt,
  };
}

// Functional core: pure predicate. The free-shipping threshold is supplied by
// the shell rather than read from disk here.
export function isEligibleForFreeShip(order, freeShipThresholdCents) {
  return order.totalCents >= freeShipThresholdCents;
}
