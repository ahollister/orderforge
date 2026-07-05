# Decisions

Append-only log of significant project decisions. Each entry should record what was decided, why, and (where useful) what was rejected.

---

## 2024 — Adopt functional-core / imperative-shell stance

**Decision:** Apply the functional-core / imperative-shell (FC/IS) stance as the governing architectural pattern for this codebase. The rule: *a function either decides or acts, never both.* Pure core functions take plain values and return plain values; all I/O (config reads, clock, persistence, notifications, logging) lives in shell functions.

**Why:** The original code tangled calculation with I/O in multiple places (`computeTotal` read `config/tax.json` mid-sum; `isEligibleForFreeShip` read `config/shipping.json` itself; `processOrder` blended order assembly with `saveOrder`/`notifyOrderPlaced`). This made the business logic untestable without mocks and made behaviour hard to reason about in isolation.

**Rejected alternatives:**
- Dependency injection / mocking frameworks — adds indirection and test machinery without making the functions genuinely pure.
- Leaving I/O in core functions and testing with stubs — masks the coupling rather than removing it.

**Delivered incrementally across three passes:**
1. `computeTotal` extracted to pure core; shell (`processOrder`) now reads tax config and emits returned `logLines`.
2. `isEligibleForFreeShip` made pure predicate; threshold injected by shell (`index.js`).
3. `buildOrder` extracted from `processOrder`; order assembly and net-total calculation now pure; shell reduced to gather → call core → act.

**Remaining:** `processOrder`'s input-validation throw (empty-lines guard) is still interleaved with shell I/O — a candidate for a pure core validator in the next pass.

---

## 2024 — Extract `prepareOrder`; FC/IS refactor complete (run `b6127c44`)

**Decision:** Extract a pure `prepareOrder(input, taxRate, coupons, placedAt)` function from `processOrder`, capturing the remaining decision logic (input validation + price → discount → assemble orchestration) that was still interleaved with I/O in the shell. Declare the FC/IS refactor complete; make no further extractions.

**Why:** The input-validation throw (empty-lines guard) and the `computeTotal` → `bestDiscount` → `buildOrder` orchestration were the last decisions living inside the shell. Pulling them into `prepareOrder` completes the separation: the shell now reads as a strict "gather → call core → act" with zero decision logic of its own.

**Why stop here:** What remains (`index.js`, `src/storage.js`, `src/notify.js`) is genuinely effectful glue — file DB, console notification, demo entry point. Extracting from these would churn thin edge code for no purity gain.

**Rejected alternatives:**
- Continuing to extract from `storage.js` / `notify.js` / `index.js` — these are legitimately effectful by design; forcing a pure wrapper would be meaningless abstraction.

**Result:** 11/11 tests passing, all exercising core functions with plain values and no mocks. The codebase exhibits a clean FC/IS separation end-to-end.

---

## 2024 — Add `cancelOrder`; intentionally defer FC/IS cleanup (run `9cf42a3f`)

**Decision:** Implement `cancelOrder(orderId)` in `src/orders.js` in the straightforward way — decision logic (24h window check, status check, reason production) interleaved with I/O (storage load/save, `notifyOrderCancelled`) — without pre-emptively applying the FC/IS stance.

**Why:** The task was explicitly scoped to produce fresh, working code so that a subsequent *task-scoped refactor pass* has something concrete in the working tree to clean up. Applying the architecture stance at implementation time would have pre-empted that follow-on task.

**What was added:**
- `cancelOrder(orderId)` — shell function; loads order, checks cancellability, sets `status: 'cancelled'` and `cancelledAt`, persists, notifies.
- `notifyOrderCancelled(order)` added to `src/notify.js`.
- Orders now carry a `status` field (default `'placed'`; also `'shipped'` and `'cancelled'`); `buildOrder` sets `status: 'placed'` at creation time.
- `index.js` routes a second path to `cancelOrder`.
- At least one new test covering the cancellation happy path and refusal cases.

**Pending:** Extract a pure `checkCancellable(order, now)` → `{ cancellable, reason }` core function to bring `cancelOrder` in line with the FC/IS stance. This is the obvious next extraction target.

---

## 2024 — FC/IS cleanup of `cancelOrder`: extract `decideCancellation` (run `4d8f91a3`)

**Decision:** Apply the FC/IS stance to `cancelOrder` by extracting a pure `decideCancellation(order, now)` function, completing the task-scoped refactor pass that was deferred in run `9cf42a3f`.

**What changed:**
- `decideCancellation(order, now)` added to `src/orders.js` as a pure core function. Takes plain values, no I/O, no clock read (time injected as `now`), does not mutate input. Returns `{ ok: false, reason }` or `{ ok: true, order }`.
- `cancelOrder(orderId)` reduced to a thin shell: load → `decideCancellation` → (on success) `updateOrder` + `notifyOrderCancelled`.
- `test/orders.test.js` cleaned up: deleted the locally-duplicated `buildCancelDecision` / `CANCELLATION_WINDOW_MS` helpers; unit tests now exercise the real `decideCancellation` with plain values, including a purity/no-mutation assertion.
- ADR recorded at `docs/adr/0001-functional-core-imperative-shell-cancellation.md`.
- Domain context recorded in `CONTEXT.md`.

**Why:** Test duplication of decision logic (the `buildCancelDecision` helper in the test file) is a reliable signal that the decision belongs in a named pure function in the source. Extracting it eliminates the duplication and makes the business rules testable with plain values and no mocks.

**Result:** 12/12 tests passing. `cancelOrder` is now FC/IS-clean.

**Next candidate (logged, not acted on):** `processOrder` and `isEligibleForFreeShip` still read config inline (`coupons.json`, `shipping.json`) and `processOrder` accesses the clock — the same core/shell split applies (pass the config value and `now` as arguments to a pure decider). Deferred per the one-change-per-pass contract.
