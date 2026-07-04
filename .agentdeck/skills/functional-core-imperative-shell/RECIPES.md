# Extraction recipes

Common shapes when splitting a tangled function into a pure core + a thin shell.
Assumes the stance in your `<code_architecture>` context.

## Config read inside a calculation

**Before:** the function reads a rate/threshold off disk mid-calculation.
**After:** the shell reads the config; the core takes the value as a parameter.

    // shell
    const { rate } = loadTaxConfig();
    const totals = computeTotals(order, rate);   // pure

## Logging interleaved with logic

**Before:** `console.log` calls sprinkled through a loop that also computes.
**After:** the core returns the data (and, if the log lines matter, a list of
"events" to emit); the shell logs.

## Predicate that fetches its own inputs

**Before:** `isEligibleForFreeShip(order)` reads `shipping.json` itself.
**After:** `isEligibleForFreeShip(order, thresholdCents)` is a pure predicate;
the shell supplies the threshold.

## Handler that validates + computes + persists + notifies

**Before:** one `processX` body does everything.
**After:** a pure `decideX(input, config)` returns the resulting entity (or a
"commands" object describing what to save and whom to notify); the shell runs
the effects. Prefer returning validation errors as values over throwing in the
middle of effects.

## Rules of thumb

- Pass values, not paths or clients, into the core.
- The core returns data or a description of effects - it never performs them.
- Don't purify the shell itself: a `saveOrder` / `notify` is meant to be
  effectful and should stay that way.
