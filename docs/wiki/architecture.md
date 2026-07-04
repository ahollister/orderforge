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
- **Shell (effects):** `src/orders.js` `processOrder` gathers config (coupons,
  tax rate), calls the core, emits its log lines, then persists and notifies.
  `index.js` reads the shipping config and passes the threshold to
  `isEligibleForFreeShip`.
  `src/storage.js` (file DB) and `src/notify.js` (console) are effectful glue by
  design.

### Known remaining tangles (candidates for future passes)

- `processOrder` still mixes validation, config reads, the clock (`new Date`),
  persistence, and notification in one body - a pure `decideOrder(...)` could be
  extracted. In particular the order assembly (building the order object and
  computing `totalCents - discountCents`) is pure logic still inline in the
  shell.
