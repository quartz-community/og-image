---
"@quartz-community/og-image": patch
---

Generate social images concurrently instead of one at a time. The emitter yielded a single
promise per page, so each image was awaited before the next one started; a bounded pool now
lets satori's main-thread work overlap sharp's native encoding. Also reads the icon once per
build rather than once per page, hands `write` a buffer instead of a stream, and memoizes the
per-write `mkdir`.
