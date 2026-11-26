# Changelog

## 1.1.3

### Patch Changes

- 849b7df: Bundles utils 1.3.1, whose `unescapeHTML` decodes entities once: a note mentioning `&lt;br&gt;` no longer shows `<br>` in its social image. Keycap emoji (`1️⃣`, `#️⃣`, `*️⃣`), `©️`, `®️` and ZWJ sequences written without an inner U+FE0F (`🏳‍🌈`) now render as emoji instead of empty boxes.

## 1.1.2

### Patch Changes

- f331a9c: An emoji or symbol the emoji map lists only in another form no longer fails the build: a code is looked up as written, then without its variation selector, then with the emoji one. A text-presentation character such as Obsidian's footnote back-link `↩︎` (U+21A9 U+FE0E) draws as its emoji, and a code the map lacks is left to the fonts. Before, any page whose description reached a `↩︎` stopped the build with "codepoint 21a9-fe0e not found in map".

## 1.1.1

### Patch Changes

- a290d27: Bundles `@quartz-community/utils` 1.1.0: a short wikilink to an Obsidian folder note (`[[Topic]]` for `Topic/Topic.md`) reaches the folder page, and anchors to headings use the same slug as heading ids. `github-slugger` is no longer a dependency of this plugin.

## 1.1.0

### Minor Changes

- 5352988: Add a `useGeneratedDescription` option (default `true`). Set it to `false` to show `defaultDescription` on pages without a frontmatter description, instead of the excerpt the description plugin generates (jackyzha0/quartz#2470). An empty generated description now also falls back to `defaultDescription`.

## 1.0.0

### Major Changes

- Stable 1.0 release. All `@quartz-community/*` dependencies now use `^1.0.0` ranges.

  Pre-1.0 caret ranges pinned the minor version (`^0.2.1` means `>=0.2.1 <0.3.0`), so
  published fixes to shared packages could never be resolved by dependents. Moving the
  ecosystem to 1.0 makes caret ranges behave conventionally.

## 0.1.2

### Patch Changes

- ab7b8e9: Fix build crash when Google Fonts is unreachable (fetch failed). Added error handling to font fetching, system font fallback for macOS/Linux/Windows, and graceful skip when no fonts are available.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial Quartz community plugin template.
