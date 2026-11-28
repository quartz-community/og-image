---
"@quartz-community/og-image": minor
---

A social image set in the frontmatter (`socialImage`, or Obsidian's `image` / `cover`) can now be an image in the content folder: a wikilink (`[[cover.png]]`), a path from the content folder, a path relative to the note, or a bare file name. Before, every value that was not a URL was read as a path in `quartz/static/`, so Obsidian-style values pointed at images that do not exist. Values that name no content file still point into `quartz/static/`.
