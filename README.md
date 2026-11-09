# @quartz-community/og-image

Generates Open Graph social preview images for each page using Satori and Sharp.

## Installation

```bash
npx quartz plugin add @quartz-community/og-image
```

## Usage

This plugin is already enabled in the default `quartz.config.yaml`:

```yaml title="quartz.config.yaml"
plugins:
  - source: "@quartz-community/og-image"
    enabled: true
    options:
      colorScheme: lightMode
      width: 1200
      height: 630
      defaultTitle: Untitled
      defaultDescription: No description provided
      useGeneratedDescription: true
```

`baseUrl` must be set in `configuration`: the image meta tags need absolute URLs and are not emitted without it. Each page gets an image at `<slug>-og-image.webp`; pages with a `socialImage` in their frontmatter are skipped.

The options that take functions (`imageStructure`, `readingTimeText`) need a TypeScript override:

```ts title="quartz.ts (override)"
import * as ExternalPlugin from "./.quartz/plugins";
import { myImage } from "./socialImage";

// Must be placed before loadQuartzConfig()
ExternalPlugin.CustomOgImages({
  imageStructure: myImage, // omit to keep the built-in design
  readingTimeText: (minutes) => `${minutes} min read`,
});
```

`imageStructure` receives a single object: `{ cfg, userOpts, title, description, fonts, fileData, iconBase64 }`.

## Configuration

| Option                    | Type                          | Default                     | Description                                                                                                                                 |
| ------------------------- | ----------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `colorScheme`             | `"lightMode" \| "darkMode"`   | `"lightMode"`               | The color scheme to use for the generated images.                                                                                           |
| `width`                   | `number`                      | `1200`                      | The width of the generated images.                                                                                                          |
| `height`                  | `number`                      | `630`                       | The height of the generated images.                                                                                                         |
| `defaultTitle`            | `string`                      | `"Untitled"`                | The title to use if a page has no title.                                                                                                    |
| `defaultDescription`      | `string`                      | `"No description provided"` | The description to use if a page has no description.                                                                                        |
| `useGeneratedDescription` | `boolean`                     | `true`                      | Use the generated description (the description plugin's excerpt) when the frontmatter has none. `false` shows `defaultDescription` instead. |
| `readingTimeText`         | `(minutes: number) => string` | `` `${minutes} min read` `` | Formats the reading time shown by the built-in design (TS override only).                                                                   |
| `imageStructure`          | `function`                    | built-in design             | A component that defines the structure of the generated image (TS override only).                                                           |

The description on an image is, in order: the frontmatter's `socialDescription`, its `description`, the generated description (unless `useGeneratedDescription` is `false`), and finally `defaultDescription`.

`excludeRoot` is accepted but currently has no effect.

## Documentation

See the [Quartz documentation](https://quartz.jzhao.xyz/plugins/CustomOgImages) for more information.

## License

MIT
