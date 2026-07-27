import path from "node:path";
import fs from "node:fs/promises";
import type { Readable } from "node:stream";
import { styleText } from "node:util";
import satori, { type FontWeight, type SatoriOptions } from "satori";
import sharp from "sharp";
import readingTime from "reading-time";
import type {
  QuartzEmitterPlugin,
  BuildCtx,
  FilePath,
  FullSlug,
  GlobalConfiguration,
  QuartzPluginData,
} from "@quartz-community/types";
import { joinSegments } from "@quartz-community/types";
import { unescapeHTML } from "@quartz-community/utils";
import { getDate } from "@quartz-community/utils/sort";
import type { JSX } from "preact";
import { type ThemeKey } from "@quartz-community/types";
import { getIconCode } from "@quartz-community/utils/emoji";
import { type FontSpecification, type Theme, getFontSpecificationName } from "./theme.js";
import { loadEmoji } from "./emoji.js";

const QUARTZ = "quartz";

type Frontmatter = {
  title?: string;
  description?: string;
  socialDescription?: string;
  socialImage?: string;
  tags?: string[];
} & Record<string, unknown>;

/**
 * Page data passed to user-provided `imageStructure` callbacks.
 *
 * This is deliberately narrower than `@quartz-community/types`'
 * `QuartzPluginData`: it documents exactly which fields the og-image
 * emitter promises to populate before invoking `imageStructure`. The
 * extra `text?` field is synthesised by this plugin from the page's
 * rendered content prior to the callback.
 *
 * Do NOT replace this with `QuartzPluginData`: doing so would advertise
 * fields (e.g. `htmlAst`) that this emitter does not pass through.
 */
export type SocialImageFileData = {
  slug?: FullSlug;
  frontmatter?: Frontmatter;
  description?: string;
  text?: string;
  filePath?: string;
  dates?: Record<string, Date>;
};

const defaultHeaderWeight = [700];
const defaultBodyWeight = [400];

const write = async (args: {
  ctx: BuildCtx;
  content: string | Buffer | Readable;
  slug: FullSlug;
  ext: string;
}): Promise<FilePath> => {
  const pathToPage = joinSegments(args.ctx.argv.output, args.slug + args.ext) as FilePath;
  const dir = path.dirname(pathToPage);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(pathToPage, args.content);
  return pathToPage;
};

function getFileExtension(path: string): string | undefined {
  return path.match(/\.([^./?#]+)(?:[?#]|$)/)?.[1];
}

function isAbsoluteURL(url: string): boolean {
  return /^https?:\/\//.test(url);
}

function formatDate(d: Date, locale: string = "en-US"): string {
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export async function getSatoriFonts(headerFont: FontSpecification, bodyFont: FontSpecification) {
  const headerWeights: FontWeight[] = (
    typeof headerFont === "string"
      ? defaultHeaderWeight
      : (headerFont.weights ?? defaultHeaderWeight)
  ) as FontWeight[];
  const bodyWeights: FontWeight[] = (
    typeof bodyFont === "string" ? defaultBodyWeight : (bodyFont.weights ?? defaultBodyWeight)
  ) as FontWeight[];

  const headerFontName = typeof headerFont === "string" ? headerFont : headerFont.name;
  const bodyFontName = typeof bodyFont === "string" ? bodyFont : bodyFont.name;

  const headerFontPromises = headerWeights.map(async (weight) => {
    const data = await fetchTtf(headerFontName, weight);
    if (!data) return null;
    return {
      name: headerFontName,
      data,
      weight,
      style: "normal" as const,
    };
  });

  const bodyFontPromises = bodyWeights.map(async (weight) => {
    const data = await fetchTtf(bodyFontName, weight);
    if (!data) return null;
    return {
      name: bodyFontName,
      data,
      weight,
      style: "normal" as const,
    };
  });

  const [headerFonts, bodyFonts] = await Promise.all([
    Promise.all(headerFontPromises),
    Promise.all(bodyFontPromises),
  ]);

  const fonts: SatoriOptions["fonts"] = [
    ...headerFonts.filter((font): font is NonNullable<typeof font> => font !== null),
    ...bodyFonts.filter((font): font is NonNullable<typeof font> => font !== null),
  ];

  if (fonts.length > 0) {
    return fonts;
  }

  console.log(
    styleText(
      "yellow",
      `\nWarning: Could not fetch any Google Fonts. Attempting to use a system font as fallback for OG image generation.`,
    ),
  );

  const [regularFont, boldFont] = await Promise.all([loadSystemFont(false), loadSystemFont(true)]);

  const systemFonts: SatoriOptions["fonts"] = [];

  if (regularFont) {
    systemFonts.push({
      name: headerFontName,
      data: regularFont.data,
      weight: 400,
      style: "normal" as const,
    });
    systemFonts.push({
      name: bodyFontName,
      data: regularFont.data,
      weight: 400,
      style: "normal" as const,
    });
  }

  if (boldFont) {
    systemFonts.push({
      name: headerFontName,
      data: boldFont.data,
      weight: 700,
      style: "normal" as const,
    });
  }

  if (systemFonts.length > 0) {
    const fontName = regularFont?.name ?? boldFont?.name;
    console.log(
      styleText(
        "yellow",
        `Warning: Using system font "${fontName}" as fallback. OG images may look different than intended.`,
      ),
    );
  }

  return systemFonts;
}

export async function fetchTtf(
  rawFontName: string,
  weight: FontWeight,
): Promise<Buffer | undefined> {
  const fontName = rawFontName.replaceAll(" ", "+");
  const cacheKey = `${fontName}-${weight}`;
  const cacheDir = path.join(QUARTZ, ".quartz-cache", "fonts");
  const cachePath = path.join(cacheDir, cacheKey);

  try {
    await fs.access(cachePath);
    return fs.readFile(cachePath);
  } catch {
    /* file not cached, will fetch below */
  }

  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${fontName}:wght@${weight}`;
    const cssResponse = await fetch(cssUrl);
    if (!cssResponse.ok) {
      console.log(
        styleText(
          "yellow",
          `\nWarning: Google Fonts returned HTTP ${cssResponse.status} for ${rawFontName} (weight ${weight})`,
        ),
      );
      return;
    }
    const css = await cssResponse.text();

    const urlRegex = /url\((https:\/\/fonts.gstatic.com\/s\/.*?.ttf)\)/g;
    const match = urlRegex.exec(css);

    if (!match) {
      console.log(
        styleText(
          "yellow",
          `\nWarning: Could not extract font URL for ${rawFontName} (weight ${weight}) from Google Fonts CSS`,
        ),
      );
      return;
    }

    const fontUrl = match[1];
    if (!fontUrl) {
      return;
    }

    const fontResponse = await fetch(fontUrl);
    if (!fontResponse.ok) {
      console.log(
        styleText(
          "yellow",
          `\nWarning: Failed to download font file for ${rawFontName} (weight ${weight}): HTTP ${fontResponse.status}`,
        ),
      );
      return;
    }

    const fontData = Buffer.from(await fontResponse.arrayBuffer());
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(cachePath, fontData);

    return fontData;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(
      styleText(
        "yellow",
        `\nWarning: Failed to fetch font "${rawFontName}" (weight ${weight}) from Google Fonts: ${message}`,
      ),
    );
    return;
  }
}

/**
 * Well-known system font paths per platform. Each entry is a list of
 * candidate TTF files that are commonly available. The first file found
 * on disk is used.
 */
const SYSTEM_FONT_CANDIDATES: Record<string, string[]> = {
  darwin: [
    // San Francisco (macOS 10.15+)
    "/System/Library/Fonts/SFNS.ttf",
    // Helvetica Neue
    "/System/Library/Fonts/HelveticaNeue.ttc",
    // Helvetica
    "/System/Library/Fonts/Helvetica.ttc",
    // Arial
    "/Library/Fonts/Arial.ttf",
    // Fallback: guaranteed present on every macOS
    "/System/Library/Fonts/Supplemental/Arial.ttf",
  ],
  linux: [
    // DejaVu Sans — ubiquitous on most distros
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    // Liberation Sans (Red Hat / Fedora)
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/liberation-sans/LiberationSans-Regular.ttf",
    // Noto Sans
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    "/usr/share/fonts/noto/NotoSans-Regular.ttf",
    // FreeSans
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
  ],
  win32: [
    "C:\\Windows\\Fonts\\arial.ttf",
    "C:\\Windows\\Fonts\\segoeui.ttf",
    "C:\\Windows\\Fonts\\calibri.ttf",
    "C:\\Windows\\Fonts\\verdana.ttf",
  ],
};

const SYSTEM_FONT_CANDIDATES_BOLD: Record<string, string[]> = {
  darwin: [
    "/System/Library/Fonts/SFNS.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
  ],
  linux: [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/liberation-sans/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    "/usr/share/fonts/noto/NotoSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
  ],
  win32: [
    "C:\\Windows\\Fonts\\arialbd.ttf",
    "C:\\Windows\\Fonts\\segoeuib.ttf",
    "C:\\Windows\\Fonts\\calibrib.ttf",
    "C:\\Windows\\Fonts\\verdanab.ttf",
  ],
};

/**
 * Attempt to load a system font from well-known OS font directories.
 * Returns the font data and the display name of the font found, or
 * undefined if no system font could be located.
 */
async function loadSystemFont(bold: boolean): Promise<{ data: Buffer; name: string } | undefined> {
  const candidates = bold
    ? (SYSTEM_FONT_CANDIDATES_BOLD[process.platform] ?? [])
    : (SYSTEM_FONT_CANDIDATES[process.platform] ?? []);

  for (const fontPath of candidates) {
    try {
      const data = await fs.readFile(fontPath);
      const name = path.basename(fontPath, path.extname(fontPath));
      return { data, name };
    } catch {
      // file not present, try next candidate
    }
  }

  return undefined;
}

export type SocialImageOptions = {
  colorScheme: ThemeKey;
  height: number;
  width: number;
  excludeRoot: boolean;
  defaultTitle?: string;
  defaultDescription?: string;
  readingTimeText?: (minutes: number) => string;
  imageStructure: (
    options: ImageOptions & {
      userOpts: UserOpts;
      iconBase64?: string;
    },
  ) => JSX.Element;
};

export type UserOpts = Omit<SocialImageOptions, "imageStructure">;

export type ImageOptions = {
  title: string;
  description: string;
  fonts: SatoriOptions["fonts"];
  cfg: GlobalConfiguration;
  fileData: SocialImageFileData;
};

export const defaultImage: SocialImageOptions["imageStructure"] = ({
  cfg,
  userOpts,
  title,
  description,
  fileData,
  iconBase64,
}) => {
  const { colorScheme } = userOpts;
  const theme = cfg.theme as Theme;
  const fontBreakPoint = 32;
  const useSmallerFont = title.length > fontBreakPoint;

  const rawDate = getDate(fileData as QuartzPluginData);
  const date = rawDate ? formatDate(rawDate, cfg.locale) : null;

  const { minutes } = readingTime(fileData.text ?? "");
  const readingTimeText = (userOpts.readingTimeText ?? ((time) => `${time} min read`))(
    Math.ceil(minutes),
  );

  const tags = fileData.frontmatter?.tags ?? [];
  const bodyFont = getFontSpecificationName(theme.typography.body);
  const headerFont = getFontSpecificationName(theme.typography.header);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: theme.colors[colorScheme].light,
        padding: "2.5rem",
        fontFamily: bodyFont,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "0.5rem",
        }}
      >
        {iconBase64 && (
          <img
            src={iconBase64}
            alt=""
            width={56}
            height={56}
            style={{
              borderRadius: "50%",
            }}
          />
        )}
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: theme.colors[colorScheme].gray,
            fontFamily: bodyFont,
          }}
        >
          {cfg.baseUrl}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: useSmallerFont ? 64 : 72,
            fontFamily: headerFont,
            fontWeight: 700,
            color: theme.colors[colorScheme].dark,
            lineHeight: 1.2,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </h1>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          fontSize: 36,
          color: theme.colors[colorScheme].darkgray,
          lineHeight: 1.4,
        }}
      >
        <p
          style={{
            margin: 0,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 5,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {description}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "2rem",
          paddingTop: "2rem",
          borderTop: `1px solid ${theme.colors[colorScheme].lightgray}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2rem",
            color: theme.colors[colorScheme].gray,
            fontSize: 28,
          }}
        >
          {date && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <svg
                style={{ marginRight: "0.5rem" }}
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                role="img"
                aria-label="Date"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {date}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg
              style={{ marginRight: "0.5rem" }}
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              role="img"
              aria-label="Reading time"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            {readingTimeText}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            maxWidth: "60%",
          }}
        >
          {tags.slice(0, 3).map((tag) => (
            <div
              style={{
                display: "flex",
                padding: "0.5rem 1rem",
                backgroundColor: theme.colors[colorScheme].highlight,
                color: theme.colors[colorScheme].secondary,
                borderRadius: "10px",
                fontSize: 24,
              }}
            >
              #{tag}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const defaultOptions: SocialImageOptions = {
  colorScheme: "lightMode",
  width: 1200,
  height: 630,
  imageStructure: defaultImage,
  excludeRoot: false,
  defaultTitle: "Untitled",
  defaultDescription: "No description provided",
  readingTimeText: (minutes) => `${minutes} min read`,
};

async function generateSocialImage(
  { cfg, description, fonts, title, fileData }: ImageOptions,
  userOpts: SocialImageOptions,
): Promise<Readable> {
  const { width, height } = userOpts;
  const iconPath = joinSegments(QUARTZ, "static", "icon.png");
  let iconBase64: string | undefined = undefined;

  try {
    const iconData = await fs.readFile(iconPath);
    iconBase64 = `data:image/png;base64,${iconData.toString("base64")}`;
  } catch {
    console.warn(styleText("yellow", `Warning: Could not find icon at ${iconPath}`));
  }

  const imageComponent = userOpts.imageStructure({
    cfg,
    userOpts,
    title,
    description,
    fonts,
    fileData,
    iconBase64,
  });

  const svg = await satori(imageComponent as Parameters<typeof satori>[0], {
    width,
    height,
    fonts,
    loadAdditionalAsset: async (languageCode: string, segment: string) => {
      if (languageCode === "emoji") {
        return await loadEmoji(getIconCode(segment));
      }

      return languageCode;
    },
  });

  return sharp(Buffer.from(svg)).webp({ quality: 40 });
}

async function processOgImage(
  ctx: BuildCtx,
  fileData: QuartzPluginData,
  fonts: SatoriOptions["fonts"],
  fullOptions: SocialImageOptions,
) {
  const cfg = ctx.cfg.configuration;
  const slug = fileData.slug!;
  const titleSuffix = cfg.pageTitleSuffix ?? "";
  const frontmatter = fileData.frontmatter;
  const title = (frontmatter?.title ?? fullOptions.defaultTitle ?? "") + titleSuffix;
  const description =
    frontmatter?.socialDescription ??
    frontmatter?.description ??
    unescapeHTML(fileData.description?.trim() ?? fullOptions.defaultDescription ?? "");

  const stream = await generateSocialImage(
    {
      title,
      description,
      fonts,
      cfg,
      fileData,
    },
    fullOptions,
  );

  return write({
    ctx,
    content: stream,
    slug: `${slug}-og-image` as FullSlug,
    ext: ".webp",
  });
}

export const CustomOgImagesEmitterName = "CustomOgImages";
export const CustomOgImages: QuartzEmitterPlugin<Partial<SocialImageOptions>> = (userOpts) => {
  const fullOptions = { ...defaultOptions, ...userOpts };

  return {
    name: CustomOgImagesEmitterName,
    getQuartzComponents() {
      return [];
    },
    async *emit(ctx, content, _resources) {
      const cfg = ctx.cfg.configuration;
      const theme = cfg.theme as Theme;
      const headerFont = theme.typography.header;
      const bodyFont = theme.typography.body;
      const fonts = await getSatoriFonts(headerFont, bodyFont);

      if (fonts.length === 0) {
        console.log(
          styleText(
            "yellow",
            `\nWarning: Skipping OG image generation — no fonts available (Google Fonts unreachable and no system fonts found). ` +
              `To suppress this warning, disable the plugin in your config:\n` +
              `  - source: "@quartz-community/og-image"\n` +
              `    enabled: false`,
          ),
        );
        return;
      }

      for (const [_tree, vfile] of content) {
        const data = vfile.data as QuartzPluginData;
        if (data.frontmatter?.socialImage !== undefined) continue;
        yield processOgImage(ctx, data, fonts, fullOptions);
      }
    },
    async *partialEmit(ctx, _content, _resources, changeEvents) {
      const cfg = ctx.cfg.configuration;
      const theme = cfg.theme as Theme;
      const headerFont = theme.typography.header;
      const bodyFont = theme.typography.body;
      const fonts = await getSatoriFonts(headerFont, bodyFont);

      if (fonts.length === 0) {
        return;
      }

      for (const changeEvent of changeEvents) {
        if (!changeEvent.file) continue;
        const data = changeEvent.file.data as QuartzPluginData;
        if (data.frontmatter?.socialImage !== undefined) continue;
        if (changeEvent.type === "add" || changeEvent.type === "change") {
          yield processOgImage(ctx, data, fonts, fullOptions);
        }
      }
    },
    externalResources: (ctx) => {
      if (!ctx.cfg.configuration.baseUrl) {
        return {};
      }

      const baseUrl = ctx.cfg.configuration.baseUrl;
      return {
        additionalHead: [
          (pageData: QuartzPluginData) => {
            const isRealFile = pageData.filePath !== undefined;
            let userDefinedOgImagePath = pageData.frontmatter?.socialImage;

            if (userDefinedOgImagePath) {
              userDefinedOgImagePath = isAbsoluteURL(userDefinedOgImagePath)
                ? userDefinedOgImagePath
                : `https://${baseUrl}/static/${userDefinedOgImagePath}`;
            }

            const generatedOgImagePath = isRealFile
              ? `https://${baseUrl}/${pageData.slug!}-og-image.webp`
              : undefined;
            const defaultOgImagePath = `https://${baseUrl}/static/og-image.png`;
            const ogImagePath =
              userDefinedOgImagePath ?? generatedOgImagePath ?? defaultOgImagePath;
            const ogImageMimeType = `image/${getFileExtension(ogImagePath) ?? "png"}`;
            return (
              <>
                {!userDefinedOgImagePath && (
                  <>
                    <meta property="og:image:width" content={fullOptions.width.toString()} />
                    <meta property="og:image:height" content={fullOptions.height.toString()} />
                  </>
                )}
                <meta property="og:image" content={ogImagePath} />
                <meta property="og:image:url" content={ogImagePath} />
                <meta name="twitter:image" content={ogImagePath} />
                <meta property="og:image:type" content={ogImageMimeType} />
              </>
            );
          },
        ],
      };
    },
  };
};
