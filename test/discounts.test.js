import test from 'node:test';
import assert from 'node:assert/strict';
import { percentOff, bestDiscount } from '../src/discounts.js';

test('percentOff computes a rounded percentage', () => {
  assert.equal(percentOff(1000, 10), 100);
  assert.equal(percentOff(999, 10), 100);
});

test('percentOff rejects an out-of-range percent', () => {
  assert.throws(() => percentOff(1000, 150), RangeError);
});

test('bestDiscount picks the largest coupon', () => {
  const coupons = [{ percent: 5 }, { percent: 15 }, { percent: 10 }];
  assert.equal(bestDiscount(2000, coupons), 300);
});
