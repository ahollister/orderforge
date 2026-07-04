# Architecture

High-level shape of the system. The big pieces, how they fit together, and the constraints that shaped them.

## Stance: functional core, imperative shell

Decision-making and calculation are pure functions; I/O (files, console, clock)
lives in a thin orchestrating shell.

- **Core (pure):** `src/pricing.js` `computeTotal(order, taxRate)` - sums lines,
  applies the tax rate, returns totals plus `logLines` events; no I/O.
  `src/discounts.js` `percentOff` / `bestDiscount` - pure calculations over
  supplied coupon values. `src/orders.js` `isEligibleForFreeShip(order,
  freeShipThresholdCents)` - pure predicate over a supplied threshold; no I/O.
  `src/orders.js` `prepareOrder(input, taxRate, coupons, placedAt)` - pure order
  preparation: validates the input, prices it, picks the best discount, and
  assembles the order (via `buildOrder`), returning the order plus pricing
  `logLines`; everything arrives as values, no I/O or clock.
- **Shell (effects):** `src/orders.js` `processOrder` gathers config (coupons,
  tax rate) and the clock, calls `prepareOrder`, emits its log lines, then
  persists and notifies.
  `index.js` reads the shipping config and passes the threshold to
  `isEligibleForFreeShip`.
  `src/storage.js` (file DB) and `src/notify.js` (console) are effectful glue by
  design.

### Known remaining tangles (candidates for future passes)

- `index.js` is a small demo shell that reads config and calls into the core; it
  is effectful glue by design. No high-value tangles remain in the core modules:
  validation, pricing, discounting, and assembly are now pure (`prepareOrder`),
  and the shell (`processOrder`, `index.js`) is thin gather → call → act.
