---
name: functional-core-imperative-shell
description: Refactor code toward "functional core, imperative shell" - lift the pure decision and calculation logic out of I/O-laden functions so business rules become pure and unit-testable, and side effects move to a thin orchestrating shell. Use when a project's architecture stance is functional-core / imperative-shell.
---

# Functional core, imperative shell

Move decisions and calculations into pure functions; keep I/O (files, DB, HTTP,
console, time, randomness, env) at the edges. Each pass, take one function that
tangles the two and split it: a pure core that takes values in and returns
values out, and a shell that gathers the inputs, calls the core, and performs
the effects.

Work within the scope your task gives you - the whole codebase, or only the
code changed in the current working tree, as instructed. Land one clean
extraction per pass, keep the suite green, then stop.

## What "good" looks like

- Business rules are pure: same inputs, same outputs, no reads/writes/network/
  clock/random inside.
- I/O lives in a thin shell that orchestrates: gather, call the core, act on the
  result.
- A function either decides or acts, never both. Predicates and calculations
  receive their inputs as arguments; they never fetch them.
- The core is testable with plain values, no mocks.

Effects at the edges are fine - do not try to purify genuinely effectful glue.

## Process

### 1. Find the tangles (within scope)

Read the code in scope and look for functions that mix a decision or
calculation with an effect:

- arithmetic or rules interleaved with `readFile` / DB / HTTP / `console.log`;
- a predicate (`isEligible…`, `canCancel…`) that reads its own thresholds or
  config off disk instead of taking them as arguments;
- a handler that validates, computes, persists, and notifies in one body.

Skip functions that are *only* effects (a `saveOrder`, a `notify`) - those are
the shell and belong as they are.

### 2. Pick one

Rank by how much pure logic is trapped and how much more testable it becomes
once freed; prefer the one whose extracted core is exercised by the most callers
or tests. Take a single function this pass.

### 3. Extract the pure core

- Identify the inputs the logic actually needs and make them explicit
  parameters (pass the config *value*, not the path).
- Move the pure computation into a new function with no I/O. Return a plain
  value (or a description of the effects to perform); never perform the effect
  inside the core.
- See [RECIPES.md](RECIPES.md) for the common extraction shapes.

### 4. Rewire the shell

- The original function (or its caller) becomes the shell: it does the reads,
  calls the pure core, then performs the writes/notifications with the result.
- Keep the shell thin - it should read like "gather, call core, act".

### 5. Verify and stop

- Write (or move) a unit test that exercises the new pure core with plain
  values - proof it needs no I/O.
- Run the project's test suite and leave it green. If you can't, back the change
  out rather than leaving it red.
- Report what you extracted, the shell that remains, and the next tangle you'd
  take. Then stop - the loop decides whether another pass runs.
