---
"@quartz-community/og-image": patch
---

An emoji or symbol the emoji map lists only in another form no longer fails the build: a code is looked up as written, then without its variation selector, then with the emoji one. A text-presentation character such as Obsidian's footnote back-link `↩︎` (U+21A9 U+FE0E) draws as its emoji, and a code the map lacks is left to the fonts. Before, any page whose description reached a `↩︎` stopped the build with "codepoint 21a9-fe0e not found in map".
