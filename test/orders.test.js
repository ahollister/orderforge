import test from 'node:test';
import assert from 'node:assert/strict';
import { isEligibleForFreeShip } from '../src/orders.js';

test('isEligibleForFreeShip is true when the total meets the supplied threshold', () => {
  assert.equal(isEligibleForFreeShip({ totalCents: 5000 }, 5000), true);
  assert.equal(isEligibleForFreeShip({ totalCents: 7500 }, 5000), true);
});

test('isEligibleForFreeShip is false below the supplied threshold', () => {
  assert.equal(isEligibleForFreeShip({ totalCents: 4999 }, 5000), false);
});
