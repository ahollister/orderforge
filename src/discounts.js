export function percentOff(amountCents, percent) {
  if (percent < 0 || percent > 100) {
    throw new RangeError('percent out of range');
  }
  return Math.round(amountCents * (percent / 100));
}

export function bestDiscount(amountCents, coupons) {
  return coupons.reduce(
    (best, coupon) => Math.max(best, percentOff(amountCents, coupon.percent)),
    0,
  );
}
