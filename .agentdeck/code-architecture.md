---
refactorSkill: functional-core-imperative-shell
---

# Functional core, imperative shell

Keep decision-making and calculation pure; push side effects to the edges. The
"functional core" computes results from its inputs with no I/O. The "imperative
shell" does the reading, writing, and calling: it gathers inputs, hands them to
the core, and acts on what the core returns.

- Business logic lives in pure functions: same inputs, same outputs, with no
  reads, writes, network, clock, randomness, or env access inside them.
- All I/O (files, DB, HTTP, console, time) lives in a thin shell that
  orchestrates: gather inputs, call the core, perform effects with the result.
- A function either decides or acts, never both. Predicates and calculations
  take what they need as arguments; they never fetch it themselves.
- The core is testable with plain values and no mocks. If exercising a rule
  needs a file, a server, or stdout capture, that rule is in the wrong layer.
- Effects at the edges are expected and fine - that is what the shell is for.
  Do not push purity into genuinely effectful glue code.
