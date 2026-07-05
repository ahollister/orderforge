# 1. Order-cancellation decision is a pure core

Date: 2025

## Status

Accepted

## Context

The project's architecture stance is *functional core, imperative shell*:
decisions and calculations should be pure functions with no I/O, and side
effects (file reads/writes, notifications, clock) belong in a thin
orchestrating shell.

`cancelOrder(orderId)` in `src/orders.js` was originally written the
straightforward way: it loaded the order, applied the cancellation rules
(status checks plus a 24-hour window computed from `Date.now()`), built the
updated order with `new Date()`, persisted it, and sent a notification — all in
one body. The decision was entangled with I/O and the clock, so exercising the
rules required seeding storage on disk.

## Decision

Split the cancellation logic into two functions:

- `decideCancellation(order, nowMs)` — the **functional core**. Pure: takes an
  order value and the current time in milliseconds, returns either
  `{ ok: false, reason }` or `{ ok: true, order }` with the cancelled order
  (status + `cancelledAt` stamped from `nowMs`). No reads, writes, clock, or
  mutation of its input.
- `cancelOrder(orderId)` — the **imperative shell**. Loads the order, calls
  `decideCancellation` with `Date.now()`, and on approval persists via
  `updateOrder` and notifies via `notifyOrderCancelled`.

The core is unit-tested with plain values and no mocks; the shell keeps its
existing storage-backed tests.

## Consequences

- Cancellation rules are now verifiable without touching disk or the wall
  clock; time-dependent cases (the 24-hour window) are tested by passing an
  explicit `nowMs`.
- `cancelOrder` reads as "gather, call core, act", matching the stance.
- Remaining tangles in this area (`processOrder` reads `coupons.json` and
  stamps `placedAt` inline; `computeTotal` and `isEligibleForFreeShip` read
  their config off disk) are candidates for future passes but were left
  untouched to keep this change scoped to the task's new code.
