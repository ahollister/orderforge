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
  const { subtotalCents, taxCents, totalCents } = computeTotal(input);
  const discountCents = bestDiscount(totalCents, coupons);

  const order = {
    id: input.id,
    lines: input.lines,
    subtotalCents,
    taxCents,
    discountCents,
    totalCents: totalCents - discountCents,
    placedAt: new Date().toISOString(),
  };

  saveOrder(order);
  await notifyOrderPlaced(order);
  return order;
}

export function isEligibleForFreeShip(order) {
  const config = JSON.parse(readFileSync('./config/shipping.json', 'utf8'));
  return order.totalCents >= config.freeShipThresholdCents;
}
