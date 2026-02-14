# @quartz-community/og-image

Generates Open Graph social preview images for each page using Satori and Sharp.

## Installation

```bash
npx quartz plugin add github:quartz-community/og-image
```

## Usage

```ts
// quartz.config.ts
import * as ExternalPlugin from "./.quartz/plugins";

const config: QuartzConfig = {
  plugins: {
    emitters: [ExternalPlugin.CustomOgImages()],
  },
};
```

## Configuration

| Option               | Type                          | Default                     | Description                                                  |
| -------------------- | ----------------------------- | --------------------------- | ------------------------------------------------------------ |
| `colorScheme`        | `"lightMode" \| "darkMode"`   | `"lightMode"`               | The color scheme to use for the generated images.            |
| `width`              | `number`                      | `1200`                      | The width of the generated images.                           |
| `height`             | `number`                      | `630`                       | The height of the generated images.                          |
| `excludeRoot`        | `boolean`                     | `false`                     | Whether to exclude the root page from image generation.      |
| `defaultTitle`       | `string`                      | `"Untitled"`                | The default title to use if a page has no title.             |
| `defaultDescription` | `string`                      | `"No description provided"` | The default description to use if a page has no description. |
| `readingTimeText`    | `(minutes: number) => string` | `undefined`                 | A function to format the reading time text.                  |
| `imageStructure`     | `function`                    | `undefined`                 | A function to define the structure of the generated image.   |

## Documentation

See the [Quartz documentation](https://quartz.jzhao.xyz/) for more information.

## License

MIT
