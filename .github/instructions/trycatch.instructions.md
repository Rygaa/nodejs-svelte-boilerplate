---
applyTo: "**/*.svelte"
---

Avoid generating any form of error handling in Svelte files.

- Do not use `try { ... } catch { ... }`.
- Do not use `.catch(...)` after promises.
- Always write direct `await` calls without wrapping them in error handling.
