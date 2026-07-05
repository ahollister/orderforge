import { readFileSync } from 'node:fs';
import { computeTotal } from './pricing.js';
import { saveOrder } from './storage.js';
import { notifyOrderPlaced } from './notify.js';
import { bestDiscount } from './discounts.js';

export async function processOrder(input) {
  const coupons = JSON.parse(readFileSync('./config/coupons.json', 'utf8'));
  const { rate } = JSON.parse(readFileSync('./config/tax.json', 'utf8'));

  const { order, logLines } = prepareOrder(input, rate, coupons, new Date().toISOString());

  for (const line of logLines) console.log(line);
  saveOrder(order);
  await notifyOrderPlaced(order);
  return order;
}

// Functional core: pure order preparation. Validates the input, prices it with
// the supplied tax rate, picks the best discount from the supplied coupons, and
// assembles the order at the supplied placed-at timestamp. Everything it needs
// arrives as values; it performs no reads, writes, logging, or clock access.
// Returns the assembled order plus the pricing log lines for the shell to emit.
export function prepareOrder(input, taxRate, coupons, placedAt) {
  if (!input.lines || input.lines.length === 0) {
    throw new Error('order has no lines');
  }

  const { subtotalCents, taxCents, totalCents, logLines } = computeTotal(input, taxRate);
  const discountCents = bestDiscount(totalCents, coupons);
  const order = buildOrder(input, { subtotalCents, taxCents, totalCents }, discountCents, placedAt);

  return { order, logLines };
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
