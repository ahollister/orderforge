# Functional Core / Imperative Shell — Refactor Learnings

Notes from the iterative FC/IS refactor across three agent passes (run `4960c3ae`).

## The pattern in one sentence

Pure functions decide; shell functions act. They never do both.

## What was extracted and why

### Pass 1 — `computeTotal`

**Before:** `computeTotal(order)` read `config/tax.json` via `readFileSync` mid-calculation and called `console.log` inside its summing loop.

**After:** `computeTotal(order, taxRate)` takes the tax rate as an argument and returns `{ totalCents, taxCents, logLines }`. The shell (`processOrder`) reads the config and emits the log lines.

**Key insight:** Returning log output as a *value* (`logLines: string[]`) instead of calling `console.log` directly is the canonical FC/IS move for logging — the decision about what to log stays in the core; the act of emitting it stays in the shell.

### Pass 2 — `isEligibleForFreeShip`

**Before:** `isEligibleForFreeShip(order)` called `readFileSync('./config/shipping.json')` and then made the eligibility decision — a predicate that fetched its own config.

**After:** `isEligibleForFreeShip(order, freeShipThresholdCents)` is a pure predicate. The shell (`index.js`) reads the config and passes the threshold in.

**Key insight:** Predicates are especially important to keep pure — they're the clearest "decide, don't act" functions, and they're trivially testable once pure (just pass values, assert a boolean).

### Pass 3 — `buildOrder`

**Before:** `processOrder` built the order object inline, computing `totalCents: totalCents - discountCents` interleaved with `new Date().toISOString()`, `saveOrder(order)`, and `await notifyOrderPlaced(order)`.

**After:** `buildOrder(input, priced, discountCents, placedAt)` assembles the order shape and computes net `totalCents` as a pure function. `processOrder` passes `new Date().toISOString()` in as `placedAt`, then calls `buildOrder`, then acts.

**Key insight:** The clock is an effect. Reading `new Date()` at the shell boundary and passing the result as a plain value into the core keeps the core timeless (and makes time-dependent logic trivially testable with a fixed timestamp).

## Testing pattern

Each extracted core function got a dedicated test file exercising it with plain values:

- `test/pricing.test.js` — `computeTotal` with explicit tax rates
- `test/orders.test.js` — `isEligibleForFreeShip` at/above/below threshold; `buildOrder` with fixed inputs

No mocks, no I/O, no `beforeEach` config stubs. This is the payoff of the extraction.

## What's still tangled

`processOrder` contains an input-validation throw (empty-lines guard) interleaved with I/O. Per the stance this is a decision inside a shell function — a candidate for extraction into a pure `validateOrderInput(input)` or similar core validator.

## The "gather → call core → act" heuristic

After each pass, `processOrder` reads more cleanly as:

```
// GATHER
const { taxRate } = JSON.parse(readFileSync(...))
const { freeShipThreshold } = JSON.parse(readFileSync(...))
const priced = computeTotal(order, taxRate)
const discountCents = bestDiscount(order, coupons)
const placedAt = new Date().toISOString()

// CALL CORE
const orderEntity = buildOrder(input, priced, discountCents, placedAt)

// ACT
await saveOrder(orderEntity)
await notifyOrderPlaced(orderEntity)
for (const line of priced.logLines) console.log(line)
```

This structure — gather inputs (including effects), call pure core, perform effects — is the canonical shell shape.

Nothing remains tangled in the core. The refactor is complete as of run `b6127c44` — see Pass 4 below.

Edge-glue modules (`index.js`, `src/storage.js`, `src/notify.js`) are intentionally effectful shell code and should stay as-is.

Each extracted core function got a dedicated test exercising it with plain values:

- `test/pricing.test.js` — `computeTotal` with explicit tax rates
- `test/orders.test.js` — `isEligibleForFreeShip` at/above/below threshold; `buildOrder` with fixed inputs; `prepareOrder` full price/discount/assemble path; `prepareOrder` validation throw (no I/O)

No mocks, no I/O, no `beforeEach` config stubs. This is the payoff of the extraction. Current suite: **11 tests, 11 passing**.

### Pass 4 — `prepareOrder` (run `b6127c44`)

**Before:** `processOrder` still contained the input-validation throw (empty-lines guard) interleaved with I/O, and it directly orchestrated `computeTotal` → `bestDiscount` → `buildOrder` inline in the shell.

**After:** `prepareOrder(input, taxRate, coupons, placedAt)` is a new pure function that validates the input, calls `computeTotal`, `bestDiscount`, and `buildOrder` in sequence, and returns `{ order, logLines }`. `processOrder` is now a strict thin shell: read coupon/tax config → capture the clock → call `prepareOrder` → emit log lines, persist, notify.

**Key insight:** The orchestration of pure-core calls is itself a decision and belongs in the core. When a shell function is doing more than "gather → one core call → act", that multi-step orchestration is a candidate for extraction into a higher-level pure function.

**Verdict:** Refactor complete. The codebase exhibits clean FC/IS separation end-to-end. No further extractions are warranted in the core.

### Intentional deferral — `cancelOrder` (run `36316b0d`)

**Context:** A new `cancelOrder(orderId)` function was added to `src/orders.js` **without** applying the FC/IS stance, by design. The task was explicitly scoped to produce fresh working code so a subsequent task-scoped refactor pass has something concrete to clean up.

**What the tangle looks like:** `cancelOrder` interleaves decisions (24h window check, status guard, reason production) with I/O (load from storage, save updated order, call `notifyOrderCancelled`). This is the same pattern that existed in `processOrder` before Pass 3/4.

**The obvious extraction:** A pure `checkCancellable(order, now)` → `{ cancellable: boolean, reason?: string }` function would capture all the business-rule logic and make it testable with plain values (fixed timestamps, fixed status strings — no storage mocks needed).

**Key learning:** The FC/IS pattern compounds over time. Even when a function is *intentionally* written in a tangled way, naming the tangle and the extraction target immediately (in comments, in architecture notes, in the decisions log) makes the follow-on refactor task self-describing. The refactor pass has a concrete target before it even starts.

### Pass 5 — `decideCancellation` / FC/IS cleanup of `cancelOrder` (run `4d8f91a3`)

**Before:** `cancelOrder(orderId)` interleaved the cancellation decision (24h window, status guard, reason production) with I/O (storage load/save, `notifyOrderCancelled`). Tests had duplicated the decision logic locally (`buildCancelDecision`) because the source never exposed a pure function to test.

**After:** `decideCancellation(order, now)` is a new pure core function. It takes plain values (the order object and the current timestamp as a number), performs no I/O, does not mutate its input, and returns either `{ ok: false, reason }` or `{ ok: true, order }` with the cancelled order to persist. `cancelOrder(orderId)` is now a strict thin shell: load order → call `decideCancellation(order, Date.now())` → on success, `updateOrder` + `notifyOrderCancelled`.

**Test cleanup:** The duplicated `buildCancelDecision` / `CANCELLATION_WINDOW_MS` helpers were deleted from `test/orders.test.js`. Unit tests now exercise the real `decideCancellation` with plain values and include a purity/no-mutation assertion.

**Key insight:** When tests must duplicate decision logic locally to get coverage, that's a signal the decision belongs in a named pure function. The test duplication is the smell; the extraction eliminates it.

**Key insight (time injection):** `decideCancellation` receives `now` as a plain number injected by the shell (`Date.now()`). This makes any time-dependent logic trivially testable — just pass a fixed timestamp — without mocking the clock.

**ADR recorded:** `docs/adr/0001-functional-core-imperative-shell-cancellation.md`.
**Domain context recorded:** `CONTEXT.md` (domain vocabulary, core/shell layer map, known next tangles).

**Verdict:** FC/IS refactor for `cancelOrder` complete. 12/12 tests passing.

### Note — final test count after run `e741a93d`

The combined implementation + refactor pass (initial `cancelOrder` added, then `decideCancellation` extracted) brought the suite to **14 tests, 14 passing**: 9 pre-existing + 5 new pure unit tests for `decideCancellation` (including boundary cases driven by explicit `nowMs` and a no-mutation check).
