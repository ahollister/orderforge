import { readFileSync } from 'node:fs';

export function computeTotal(order) {
  const config = JSON.parse(readFileSync('./config/tax.json', 'utf8'));

  let subtotal = 0;
  for (const line of order.lines) {
    const lineTotal = line.qty * line.unitPriceCents;
    console.log(`[pricing] ${line.sku} x${line.qty} = ${lineTotal}`);
    subtotal += lineTotal;
  }

  const tax = Math.round(subtotal * config.rate);
  console.log(`[pricing] subtotal=${subtotal} tax=${tax}`);

  return {
    subtotalCents: subtotal,
    taxCents: tax,
    totalCents: subtotal + tax,
  };
}
