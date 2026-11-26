---
"@quartz-community/og-image": patch
---

Bundles utils 1.3.1, whose `unescapeHTML` decodes entities once: a note mentioning `&lt;br&gt;` no longer shows `<br>` in its social image. Keycap emoji (`1️⃣`, `#️⃣`, `*️⃣`), `©️`, `®️` and ZWJ sequences written without an inner U+FE0F (`🏳‍🌈`) now render as emoji instead of empty boxes.
