# Architecture

High-level shape of the system. The big pieces, how they fit together, and the constraints that shaped them.

# Architecture

High-level shape of the system. The big pieces, how they fit together, and the constraints that shaped them.

## Guiding stance: Functional Core, Imperative Shell

The project applies the **functional-core / imperative-shell** (FC/IS) stance throughout. The rule is: **a function either decides or acts, never both.** Pure core functions take plain values and return plain values (or value collections like `logLines` arrays). Side effects — config reads, clock access, persistence, notifications, console output — live exclusively in shell functions that "gather, call core, act."

## Module map

### Pure functional core

| Function | Module | Responsibility |
|---|---|---|
| `computeTotal(order, taxRate)` | `src/pricing.js` | Sums line items, applies tax; returns totals + `logLines[]`. No I/O. |
| `percentOff(amount, pct)` | `src/discounts.js` | Calculates a percentage discount. |
| `bestDiscount(order, coupons)` | `src/discounts.js` | Selects the best applicable coupon discount. |
| `isEligibleForFreeShip(order, freeShipThresholdCents)` | `src/orders.js` | Pure predicate; threshold passed in as argument. |
| `buildOrder(input, priced, discountCents, placedAt)` | `src/orders.js` | Assembles the order shape and computes net `totalCents`. No I/O, no clock. |

### Imperative shell

| Function | Module | Responsibility |
|---|---|---|
| `processOrder(input)` | `src/orders.js` | Reads config, gets clock (`new Date()`), calls core functions, persists, notifies. Thin orchestrator. |
| `index.js` (entry point) | — | Reads `config/shipping.json`, passes threshold to `isEligibleForFreeShip`. |

## Known remaining tangles (as of last pass)

- `processOrder` contains an input-validation throw (empty-lines guard, lines 8–10) interleaved with I/O. Per the stance this guard is a candidate for a pure core validator. This is the next concrete extraction opportunity.

## Config files

- `config/tax.json` — tax rate; read by the shell before calling `computeTotal`.
- `config/shipping.json` — free-shipping threshold; read by the shell before calling `isEligibleForFreeShip`.

## Test strategy

Pure core functions are tested with plain values — no mocks, no I/O. Shell functions are verified via integration (full-suite green + `node index.js` byte-identical output checks). Current suite: **9 tests, 9 passing**.

| Function | Module | Responsibility |
|---|---|---|
| `computeTotal(order, taxRate)` | `src/pricing.js` | Sums line items, applies tax; returns totals + `logLines[]`. No I/O. |
| `percentOff(amount, pct)` | `src/discounts.js` | Calculates a percentage discount. |
| `bestDiscount(order, coupons)` | `src/discounts.js` | Selects the best applicable coupon discount. |
| `isEligibleForFreeShip(order, freeShipThresholdCents)` | `src/orders.js` | Pure predicate; threshold passed in as argument. |
| `buildOrder(input, priced, discountCents, placedAt)` | `src/orders.js` | Assembles the order shape and computes net `totalCents`. No I/O, no clock. |
| `prepareOrder(input, taxRate, coupons, placedAt)` | `src/orders.js` | Pure orchestration core: validates input, calls `computeTotal` → `bestDiscount` → `buildOrder`; returns `{ order, logLines }`. No reads, writes, logging, or clock access. |

None in the core. The FC/IS refactor is complete. The input-validation guard that was previously interleaved with I/O in `processOrder` is now inside `prepareOrder` (a pure function), so all decision logic lives in the core.

What remains (`index.js`, `src/storage.js`, `src/notify.js`) is genuinely effectful edge-glue and should stay in the shell by design. No further extractions are warranted.

Pure core functions are tested with plain values — no mocks, no I/O. Shell functions are verified via integration (full-suite green + `node index.js` byte-identical output checks). Current suite: **11 tests, 11 passing**.

| Function | Module | Responsibility |
|---|---|---|
| `processOrder(input)` | `src/orders.js` | Reads config, gets clock (`new Date()`), calls `prepareOrder` (core), emits log lines, persists, notifies. Strict "gather → call core → act" shell with no decision logic. |
| `index.js` (entry point) | — | Reads `config/shipping.json`, passes threshold to `isEligibleForFreeShip`. |
| `src/storage.js` | — | File-based persistence (effectful by design; stays in shell). |
| `src/notify.js` | — | Console notification (effectful by design; stays in shell). |

### Pure functional core

| Function | Module | Responsibility |
|---|---|---|
| `computeTotal(order, taxRate)` | `src/pricing.js` | Sums line items, applies tax; returns totals + `logLines[]`. No I/O. |
| `percentOff(amount, pct)` | `src/discounts.js` | Calculates a percentage discount. |
| `bestDiscount(order, coupons)` | `src/discounts.js` | Selects the best applicable coupon discount. |
| `isEligibleForFreeShip(order, freeShipThresholdCents)` | `src/orders.js` | Pure predicate; threshold passed in as argument. |
| `buildOrder(input, priced, discountCents, placedAt)` | `src/orders.js` | Assembles the order shape (with `status: 'placed'`) and computes net `totalCents`. No I/O, no clock. |
| `prepareOrder(input, taxRate, coupons, placedAt)` | `src/orders.js` | Pure orchestration core: validates input, calls `computeTotal` → `bestDiscount` → `buildOrder`; returns `{ order, logLines }`. No reads, writes, logging, or clock access. |

### Imperative shell

| Function | Module | Responsibility |
|---|---|---|
| `processOrder(input)` | `src/orders.js` | Reads config, gets clock (`new Date()`), calls `prepareOrder` (core), emits log lines, persists, notifies. Strict "gather → call core → act" shell with no decision logic. |
| `cancelOrder(orderId)` | `src/orders.js` | Loads order from storage, decides cancellability (24h window, status check), sets `status: 'cancelled'` + `cancelledAt`, persists, and calls `notifyOrderCancelled`. **Not yet FC/IS-clean** — decision logic is currently interleaved with I/O; flagged for a task-scoped refactor pass. |
| `index.js` (entry point) | — | Reads `config/shipping.json`; routes to `processOrder` or `cancelOrder` based on path. |
| `src/storage.js` | — | File-based persistence (effectful by design; stays in shell). |
| `src/notify.js` | — | Console notification (effectful by design; stays in shell). Includes `notifyOrderCancelled`. |

## Known remaining tangles (as of run `9cf42a3f`)

- `cancelOrder` in `src/orders.js` blends cancellability decisions (24h check, status check, reason production) with I/O (storage load + save, notification call). This is an intentional deferral — the function was written straightforwardly so a task-scoped refactor pass has something concrete to clean up. The natural extraction is a pure `checkCancellable(order, now)` → `{ cancellable, reason }` core function.

Pure core functions are tested with plain values — no mocks, no I/O. Shell functions are verified via integration (full-suite green + `node index.js` byte-identical output checks). Current suite: **12+ tests passing** (11 pre-existing + at least 1 new cancellation test).

Tests for `cancelOrder` are necessarily integration-level (they touch storage/notify) or use the shell directly. A pure core extraction (`checkCancellable`) would enable plain-value unit tests for the cancellation business rules.

None. The FC/IS refactor of `cancelOrder` is complete as of run `4d8f91a3`. `decideCancellation(order, now)` is now a pure core function; `cancelOrder(orderId)` is a thin shell. All business logic lives in the core; all effects live in the shell.

| Function | Module | Responsibility |
|---|---|---|
| `computeTotal(order, taxRate)` | `src/pricing.js` | Sums line items, applies tax; returns totals + `logLines[]`. No I/O. |
| `percentOff(amount, pct)` | `src/discounts.js` | Calculates a percentage discount. |
| `bestDiscount(order, coupons)` | `src/discounts.js` | Selects the best applicable coupon discount. |
| `isEligibleForFreeShip(order, freeShipThresholdCents)` | `src/orders.js` | Pure predicate; threshold passed in as argument. |
| `buildOrder(input, priced, discountCents, placedAt)` | `src/orders.js` | Assembles the order shape (with `status: 'placed'`) and computes net `totalCents`. No I/O, no clock. |
| `prepareOrder(input, taxRate, coupons, placedAt)` | `src/orders.js` | Pure orchestration core: validates input, calls `computeTotal` → `bestDiscount` → `buildOrder`; returns `{ order, logLines }`. No reads, writes, logging, or clock access. |
| `decideCancellation(order, now)` | `src/orders.js` | Pure cancellation decision: checks status and 24h window; returns `{ ok: false, reason }` or `{ ok: true, order }` with the cancelled order to persist. No I/O, no clock read (time injected as `now`). |

| Function | Module | Responsibility |
|---|---|---|
| `processOrder(input)` | `src/orders.js` | Reads config, gets clock (`new Date()`), calls `prepareOrder` (core), emits log lines, persists, notifies. Strict "gather → call core → act" shell with no decision logic. |
| `cancelOrder(orderId)` | `src/orders.js` | Thin shell: loads order from storage, calls `decideCancellation(order, Date.now())` (core), and on success persists and calls `notifyOrderCancelled`. FC/IS-clean as of run `4d8f91a3`. |
| `index.js` (entry point) | — | Reads `config/shipping.json`; routes to `processOrder` or `cancelOrder` based on CLI path. |
| `src/storage.js` | — | File-based persistence: `saveOrder`, `loadOrderById`, `updateOrder` (effectful by design; stays in shell). |
| `src/notify.js` | — | Console notification (effectful by design; stays in shell). Includes `notifyOrderPlaced` and `notifyOrderCancelled`. |

Pure core functions are tested with plain values — no mocks, no I/O. Shell functions are verified via integration. Current suite: **12 tests, 12 passing** (as of run `4d8f91a3`).

- `decideCancellation` is tested with plain values and fixed timestamps — no storage, no mocks.
- `cancelOrder` shell integration tests cover happy-path (persisted + notified) and refusal cases.
- A purity/no-mutation assertion confirms `decideCancellation` does not mutate its input.

Pure core functions are tested with plain values — no mocks, no I/O. Shell functions are verified via integration. Current suite: **14 tests, 14 passing** (as of run `e741a93d` / refactor pass).

- `decideCancellation` is tested with plain values and fixed timestamps — no storage, no mocks (5 pure unit tests).
- `cancelOrder` shell integration tests cover happy-path (persisted + notified) and refusal cases.
- A purity/no-mutation assertion confirms `decideCancellation` does not mutate its input.
