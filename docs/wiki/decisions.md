# Decisions

Append-only log of significant project decisions. Each entry should record what was decided, why, and (where useful) what was rejected.

## 2026-07-04 - Free-shipping eligibility made a pure predicate

**Decided:** `isEligibleForFreeShip(order, freeShipThresholdCents)` in
`src/orders.js` is now a pure predicate. It no longer reads
`config/shipping.json`; the threshold is passed in. The caller (`index.js`, the
shell) reads the shipping config and supplies the threshold value.

**Why:** Aligns with the functional-core / imperative-shell stance - a predicate
must take its inputs as arguments rather than fetch them from disk, so it is
unit-testable with plain values (see `test/orders.test.js`, no mocks or I/O).

**Rejected:** Keeping the `readFileSync` inside the predicate (a decision that
also acts / fetches its own config).

## 2026-07-04 - Pricing calculation made a pure functional core

**Decided:** `computeTotal(order, taxRate)` in `src/pricing.js` is now a pure
function. It no longer reads `config/tax.json` (the tax rate is passed in) and
no longer calls `console.log` (it returns `logLines` as events for the shell to
emit). `processOrder` in `src/orders.js` is the shell: it reads the tax config,
calls the core, and prints the returned log lines.

**Why:** Aligns with the project's functional-core / imperative-shell stance -
business calculation stays pure and unit-testable with plain values (see
`test/pricing.test.js`, no mocks or I/O), while file reads and console output
live at the edges.

**Rejected:** Keeping the config read / logging inside `computeTotal` (leaves a
calculation tangled with I/O); logging from within the core (a decision that
also acts).
