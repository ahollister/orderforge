import { readFileSync } from 'node:fs';
import { computeTotal } from './pricing.js';
import { saveOrder, loadOrder, updateOrder } from './storage.js';
import { notifyOrderPlaced, notifyOrderCancelled } from './notify.js';
import { bestDiscount } from './discounts.js';

const CANCELLABLE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

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
    status: 'placed',
    placedAt: new Date().toISOString(),
  };

  saveOrder(order);
  await notifyOrderPlaced(order);
  return order;
}

// ── functional core ───────────────────────────────────────────────────────────

// Pure decision: given an order and the current time (ms since epoch), decide
// whether it can be cancelled. Returns either a refusal with a reason, or an
// approval carrying the updated order. No I/O, no clock, no mutation.
export function decideCancellation(order, nowMs) {
  if (order.status === 'cancelled') {
    return { ok: false, reason: 'already_cancelled' };
  }
  if (order.status === 'shipped') {
    return { ok: false, reason: 'already_shipped' };
  }

  const ageMs = nowMs - new Date(order.placedAt).getTime();
  if (ageMs > CANCELLABLE_WINDOW_MS) {
    return { ok: false, reason: 'too_late' };
  }

  return {
    ok: true,
    order: {
      ...order,
      status: 'cancelled',
      cancelledAt: new Date(nowMs).toISOString(),
    },
  };
}

// ── imperative shell ──────────────────────────────────────────────────────────

export async function cancelOrder(orderId) {
  const order = loadOrder(orderId);
  if (!order) throw new Error(`order ${orderId} not found`);

  const decision = decideCancellation(order, Date.now());
  if (!decision.ok) return decision;

  updateOrder(decision.order);
  await notifyOrderCancelled(decision.order);
  return decision;
}

export function isEligibleForFreeShip(order) {
  const config = JSON.parse(readFileSync('./config/shipping.json', 'utf8'));
  return order.totalCents >= config.freeShipThresholdCents;
}
