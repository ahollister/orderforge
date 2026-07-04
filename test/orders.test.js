import test from 'node:test';
import assert from 'node:assert/strict';
import { isEligibleForFreeShip, buildOrder } from '../src/orders.js';

test('isEligibleForFreeShip is true when the total meets the supplied threshold', () => {
  assert.equal(isEligibleForFreeShip({ totalCents: 5000 }, 5000), true);
  assert.equal(isEligibleForFreeShip({ totalCents: 7500 }, 5000), true);
});

test('isEligibleForFreeShip is false below the supplied threshold', () => {
  assert.equal(isEligibleForFreeShip({ totalCents: 4999 }, 5000), false);
});

test('buildOrder assembles the order shape and computes the net total from its inputs', () => {
  const input = { id: 'ord-1', lines: [{ sku: 'A', qty: 2, unitPriceCents: 500 }] };
  const priced = { subtotalCents: 1000, taxCents: 100, totalCents: 1100 };

  const order = buildOrder(input, priced, 150, '2024-01-01T00:00:00.000Z');

  assert.deepEqual(order, {
    id: 'ord-1',
    lines: input.lines,
    subtotalCents: 1000,
    taxCents: 100,
    discountCents: 150,
    totalCents: 950,
    placedAt: '2024-01-01T00:00:00.000Z',
  });
});
