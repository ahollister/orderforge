import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTotal } from '../src/pricing.js';

test('computeTotal sums line totals as the subtotal', () => {
  const order = {
    lines: [
      { sku: 'A1', qty: 2, unitPriceCents: 500 },
      { sku: 'B2', qty: 1, unitPriceCents: 1200 },
    ],
  };
  const { subtotalCents } = computeTotal(order, 0);
  assert.equal(subtotalCents, 2200);
});

test('computeTotal applies the supplied tax rate, rounded', () => {
  const order = { lines: [{ sku: 'A1', qty: 1, unitPriceCents: 999 }] };
  const { taxCents, totalCents } = computeTotal(order, 0.1);
  assert.equal(taxCents, 100);
  assert.equal(totalCents, 1099);
});

test('computeTotal returns pricing log lines as events, not console output', () => {
  const order = { lines: [{ sku: 'A1', qty: 2, unitPriceCents: 500 }] };
  const { logLines } = computeTotal(order, 0.2);
  assert.deepEqual(logLines, [
    '[pricing] A1 x2 = 1000',
    '[pricing] subtotal=1000 tax=200',
  ]);
});
