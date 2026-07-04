# Decisions

Append-only log of significant project decisions. Each entry should record what was decided, why, and (where useful) what was rejected.

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
