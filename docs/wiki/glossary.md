# Glossary

Project-specific terminology and definitions. When something is referred to by a name that wouldn't be obvious to a newcomer, it belongs here.

---

## Functional Core / Imperative Shell (FC/IS)

The architectural stance this project follows. Pure **core** functions take plain values and return plain values (including side-effect-free collections like `logLines` arrays) — same inputs always produce the same output, no I/O. The **shell** gathers inputs (reads config, gets the clock, etc.), calls core functions, and then acts on the results (persists, notifies, logs). The guiding rule: *a function either decides or acts, never both.*

## `logLines`

The `string[]` array returned by `computeTotal` containing human-readable pricing-event strings. Returning them as data (rather than calling `console.log` directly) keeps the core pure and lets the shell decide when and how to emit them.

## Shell (imperative shell)

The thin orchestrating layer around pure core functions. In this project: `processOrder` in `src/orders.js` and the `index.js` entry point. Shell functions are allowed to read config files, access the clock, persist data, send notifications, and emit log output.

## Pure predicate

A boolean-returning function that takes all it needs as arguments and performs no I/O. Example: `isEligibleForFreeShip(order, freeShipThresholdCents)` — previously impure because it read `config/shipping.json` itself; now pure because the threshold is injected by the shell.

## Order `status`

A string field added to every order entity. Set to `'placed'` by `buildOrder` at creation time. `cancelOrder` transitions it to `'cancelled'`. The value `'shipped'` is a terminal state that also blocks cancellation (no shipping flow is implemented yet — the status is recognised but never set by live code). Possible values: `placed` | `shipped` | `cancelled`.

## Cancellation reason codes

String tokens returned (or thrown) by `cancelOrder` when an order cannot be cancelled:
- `too_late` — more than 24 hours have elapsed since `placedAt`.
- `already_shipped` — order `status` is `'shipped'`.
- `already_cancelled` — order `status` is `'cancelled'`.

## `decideCancellation(order, now)`

The pure core function that encapsulates all cancellation business rules. Takes an order object and the current time as a plain number (`now`); returns `{ ok: false, reason }` for refusals or `{ ok: true, order }` with the mutated-copy cancelled order to persist. No I/O, no clock access, no mutation of input. Extracted in run `4d8f91a3` from the previously tangled `cancelOrder` shell.
