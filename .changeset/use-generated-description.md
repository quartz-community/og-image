---
"@quartz-community/og-image": minor
---

Add a `useGeneratedDescription` option (default `true`). Set it to `false` to show `defaultDescription` on pages without a frontmatter description, instead of the excerpt the description plugin generates (jackyzha0/quartz#2470). An empty generated description now also falls back to `defaultDescription`.
