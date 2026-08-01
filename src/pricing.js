// Functional core: pure pricing calculations. No I/O - the tax rate is supplied
// by the shell, and human-readable pricing lines are returned as events for the
// shell to emit rather than logged here.

export function computeTotal(order, taxRate) {
  let subtotal = 0;
  const logLines = [];

  for (const line of order.lines) {
    const lineTotal = line.qty * line.unitPriceCents;
    logLines.push(`[pricing] ${line.sku} x${line.qty} = ${lineTotal}`);
    subtotal += lineTotal;
  }

  const tax = Math.round(subtotal * taxRate);
  logLines.push(`[pricing] subtotal=${subtotal} tax=${tax}`);

  return {
    subtotalCents: subtotal,
    taxCents: tax,
    totalCents: subtotal + tax,
    logLines,
  };
}
