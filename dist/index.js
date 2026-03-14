import path from 'path';
import fs from 'fs/promises';
import { styleText } from 'util';
import satori from 'satori';
import sharp from 'sharp';
import readingTime from 'reading-time';
import { joinSegments } from '@quartz-community/types';
import { unescapeHTML } from '@quartz-community/utils';
import { jsxs, Fragment, jsx } from 'preact/jsx-runtime';

// src/emitter.tsx

// src/theme.ts
function getFontSpecificationName(spec) {
  if (typeof spec === "string") {
    return spec;
  }
  return spec.name;
}

// src/emoji.ts
var U200D = String.fromCharCode(8205);
var UFE0Fg = /\uFE0F/g;
function getIconCode(char) {
  return toCodePoint(char.indexOf(U200D) < 0 ? char.replace(UFE0Fg, "") : char);
}
function toCodePoint(unicodeSurrogates) {
  const r = [];
  let c = 0, p = 0, i = 0;
  while (i < unicodeSurrogates.length) {
    c = unicodeSurrogates.charCodeAt(i++);
    if (p) {
      r.push((65536 + (p - 55296 << 10) + (c - 56320)).toString(16));
      p = 0;
    } else if (55296 <= c && c <= 56319) {
      p = c;
    } else {
      r.push(c.toString(16));
    }
  }
  return r.join("-");
}
var emojimap = void 0;
async function loadEmoji(code) {
  if (!emojimap) {
    const path2 = await import('path');
    const fs2 = await import('fs/promises');
    const mapPath = path2.join("quartz", "util", "emojimap.json");
    const data = JSON.parse(await fs2.readFile(mapPath, "utf-8"));
    emojimap = data;
  }
  const name = emojimap.codePointToName[`${code.toUpperCase()}`];
  if (!name) throw new Error(`codepoint ${code} not found in map`);
  const b64 = emojimap.nameToBase64[name];
  if (!b64) throw new Error(`name ${name} not found in map`);
  return b64;
}
var QUARTZ = "quartz";
var defaultHeaderWeight = [700];
var defaultBodyWeight = [400];
var write = async (args) => {
  const pathToPage = joinSegments(args.ctx.argv.output, args.slug + args.ext);
  const dir = path.dirname(pathToPage);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(pathToPage, args.content);
  return pathToPage;
};
function getFileExtension(path2) {
  return path2.match(/\.([^./?#]+)(?:[?#]|$)/)?.[1];
}
function isAbsoluteURL(url) {
  return /^https?:\/\//.test(url);
}
function getDate(cfg, data) {
  return data.dates?.[cfg.defaultDateType ?? "modified"];
}
function formatDate(d, locale = "en-US") {
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}
async function getSatoriFonts(headerFont, bodyFont) {
  const headerWeights = typeof headerFont === "string" ? defaultHeaderWeight : headerFont.weights ?? defaultHeaderWeight;
  const bodyWeights = typeof bodyFont === "string" ? defaultBodyWeight : bodyFont.weights ?? defaultBodyWeight;
  const headerFontName = typeof headerFont === "string" ? headerFont : headerFont.name;
  const bodyFontName = typeof bodyFont === "string" ? bodyFont : bodyFont.name;
  const headerFontPromises = headerWeights.map(async (weight) => {
    const data = await fetchTtf(headerFontName, weight);
    if (!data) return null;
    return {
      name: headerFontName,
      data,
      weight,
      style: "normal"
    };
  });
  const bodyFontPromises = bodyWeights.map(async (weight) => {
    const data = await fetchTtf(bodyFontName, weight);
    if (!data) return null;
    return {
      name: bodyFontName,
      data,
      weight,
      style: "normal"
    };
  });
  const [headerFonts, bodyFonts] = await Promise.all([
    Promise.all(headerFontPromises),
    Promise.all(bodyFontPromises)
  ]);
  const fonts = [
    ...headerFonts.filter((font) => font !== null),
    ...bodyFonts.filter((font) => font !== null)
  ];
  return fonts;
}
async function fetchTtf(rawFontName, weight) {
  const fontName = rawFontName.replaceAll(" ", "+");
  const cacheKey = `${fontName}-${weight}`;
  const cacheDir = path.join(QUARTZ, ".quartz-cache", "fonts");
  const cachePath = path.join(cacheDir, cacheKey);
  try {
    await fs.access(cachePath);
    return fs.readFile(cachePath);
  } catch {
  }
  const cssResponse = await fetch(
    `https://fonts.googleapis.com/css2?family=${fontName}:wght@${weight}`
  );
  const css = await cssResponse.text();
  const urlRegex = /url\((https:\/\/fonts.gstatic.com\/s\/.*?.ttf)\)/g;
  const match = urlRegex.exec(css);
  if (!match) {
    console.log(
      styleText(
        "yellow",
        `
Warning: Failed to fetch font ${rawFontName} with weight ${weight}, got ${cssResponse.statusText}`
      )
    );
    return;
  }
  const fontUrl = match[1];
  if (!fontUrl) {
    return;
  }
  const fontResponse = await fetch(fontUrl);
  const fontData = Buffer.from(await fontResponse.arrayBuffer());
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(cachePath, fontData);
  return fontData;
}
var defaultImage = ({
  cfg,
  userOpts,
  title,
  description,
  fileData,
  iconBase64
}) => {
  const { colorScheme } = userOpts;
  const theme = cfg.theme;
  const fontBreakPoint = 32;
  const useSmallerFont = title.length > fontBreakPoint;
  const rawDate = getDate(cfg, fileData);
  const date = rawDate ? formatDate(rawDate, cfg.locale) : null;
  const { minutes } = readingTime(fileData.text ?? "");
  const readingTimeText = (userOpts.readingTimeText ?? ((time) => `${time} min read`))(
    Math.ceil(minutes)
  );
  const tags = fileData.frontmatter?.tags ?? [];
  const bodyFont = getFontSpecificationName(theme.typography.body);
  const headerFont = getFontSpecificationName(theme.typography.header);
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: theme.colors[colorScheme].light,
        padding: "2.5rem",
        fontFamily: bodyFont
      },
      children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "0.5rem"
            },
            children: [
              iconBase64 && /* @__PURE__ */ jsx(
                "img",
                {
                  src: iconBase64,
                  alt: "",
                  width: 56,
                  height: 56,
                  style: {
                    borderRadius: "50%"
                  }
                }
              ),
              /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    display: "flex",
                    fontSize: 32,
                    color: theme.colors[colorScheme].gray,
                    fontFamily: bodyFont
                  },
                  children: cfg.baseUrl
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              display: "flex",
              marginTop: "1rem",
              marginBottom: "1.5rem"
            },
            children: /* @__PURE__ */ jsx(
              "h1",
              {
                style: {
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
                  textOverflow: "ellipsis"
                },
                children: title
              }
            )
          }
        ),
        /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              display: "flex",
              flex: 1,
              fontSize: 36,
              color: theme.colors[colorScheme].darkgray,
              lineHeight: 1.4
            },
            children: /* @__PURE__ */ jsx(
              "p",
              {
                style: {
                  margin: 0,
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 5,
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                },
                children: description
              }
            )
          }
        ),
        /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "2rem",
              paddingTop: "2rem",
              borderTop: `1px solid ${theme.colors[colorScheme].lightgray}`
            },
            children: [
              /* @__PURE__ */ jsxs(
                "div",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "2rem",
                    color: theme.colors[colorScheme].gray,
                    fontSize: 28
                  },
                  children: [
                    date && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center" }, children: [
                      /* @__PURE__ */ jsxs(
                        "svg",
                        {
                          style: { marginRight: "0.5rem" },
                          width: "28",
                          height: "28",
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: "currentColor",
                          role: "img",
                          "aria-label": "Date",
                          children: [
                            /* @__PURE__ */ jsx("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }),
                            /* @__PURE__ */ jsx("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
                            /* @__PURE__ */ jsx("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
                            /* @__PURE__ */ jsx("line", { x1: "3", y1: "10", x2: "21", y2: "10" })
                          ]
                        }
                      ),
                      date
                    ] }),
                    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center" }, children: [
                      /* @__PURE__ */ jsxs(
                        "svg",
                        {
                          style: { marginRight: "0.5rem" },
                          width: "28",
                          height: "28",
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: "currentColor",
                          role: "img",
                          "aria-label": "Reading time",
                          children: [
                            /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "10" }),
                            /* @__PURE__ */ jsx("polyline", { points: "12 6 12 12 16 14" })
                          ]
                        }
                      ),
                      readingTimeText
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                    maxWidth: "60%"
                  },
                  children: tags.slice(0, 3).map((tag) => /* @__PURE__ */ jsxs(
                    "div",
                    {
                      style: {
                        display: "flex",
                        padding: "0.5rem 1rem",
                        backgroundColor: theme.colors[colorScheme].highlight,
                        color: theme.colors[colorScheme].secondary,
                        borderRadius: "10px",
                        fontSize: 24
                      },
                      children: [
                        "#",
                        tag
                      ]
                    }
                  ))
                }
              )
            ]
          }
        )
      ]
    }
  );
};
var defaultOptions = {
  colorScheme: "lightMode",
  width: 1200,
  height: 630,
  imageStructure: defaultImage,
  excludeRoot: false,
  defaultTitle: "Untitled",
  defaultDescription: "No description provided",
  readingTimeText: (minutes) => `${minutes} min read`
};
async function generateSocialImage({ cfg, description, fonts, title, fileData }, userOpts) {
  const { width, height } = userOpts;
  const iconPath = joinSegments(QUARTZ, "static", "icon.png");
  let iconBase64 = void 0;
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
    iconBase64
  });
  const svg = await satori(imageComponent, {
    width,
    height,
    fonts,
    loadAdditionalAsset: async (languageCode, segment) => {
      if (languageCode === "emoji") {
        return await loadEmoji(getIconCode(segment));
      }
      return languageCode;
    }
  });
  return sharp(Buffer.from(svg)).webp({ quality: 40 });
}
async function processOgImage(ctx, fileData, fonts, fullOptions) {
  const cfg = ctx.cfg.configuration;
  const slug = fileData.slug;
  const titleSuffix = cfg.pageTitleSuffix ?? "";
  const frontmatter = fileData.frontmatter;
  const title = (frontmatter?.title ?? fullOptions.defaultTitle ?? "") + titleSuffix;
  const description = frontmatter?.socialDescription ?? frontmatter?.description ?? unescapeHTML(fileData.description?.trim() ?? fullOptions.defaultDescription ?? "");
  const stream = await generateSocialImage(
    {
      title,
      description,
      fonts,
      cfg,
      fileData
    },
    fullOptions
  );
  return write({
    ctx,
    content: stream,
    slug: `${slug}-og-image`,
    ext: ".webp"
  });
}
var CustomOgImagesEmitterName = "CustomOgImages";
var CustomOgImages = (userOpts) => {
  const fullOptions = { ...defaultOptions, ...userOpts };
  return {
    name: CustomOgImagesEmitterName,
    getQuartzComponents() {
      return [];
    },
    async *emit(ctx, content, _resources) {
      const cfg = ctx.cfg.configuration;
      const theme = cfg.theme;
      const headerFont = theme.typography.header;
      const bodyFont = theme.typography.body;
      const fonts = await getSatoriFonts(headerFont, bodyFont);
      for (const [_tree, vfile] of content) {
        const data = vfile.data;
        if (data.frontmatter?.socialImage !== void 0) continue;
        yield processOgImage(ctx, data, fonts, fullOptions);
      }
    },
    async *partialEmit(ctx, _content, _resources, changeEvents) {
      const cfg = ctx.cfg.configuration;
      const theme = cfg.theme;
      const headerFont = theme.typography.header;
      const bodyFont = theme.typography.body;
      const fonts = await getSatoriFonts(headerFont, bodyFont);
      for (const changeEvent of changeEvents) {
        if (!changeEvent.file) continue;
        const data = changeEvent.file.data;
        if (data.frontmatter?.socialImage !== void 0) continue;
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
          (pageData) => {
            const isRealFile = pageData.filePath !== void 0;
            let userDefinedOgImagePath = pageData.frontmatter?.socialImage;
            if (userDefinedOgImagePath) {
              userDefinedOgImagePath = isAbsoluteURL(userDefinedOgImagePath) ? userDefinedOgImagePath : `https://${baseUrl}/static/${userDefinedOgImagePath}`;
            }
            const generatedOgImagePath = isRealFile ? `https://${baseUrl}/${pageData.slug}-og-image.webp` : void 0;
            const defaultOgImagePath = `https://${baseUrl}/static/og-image.png`;
            const ogImagePath = userDefinedOgImagePath ?? generatedOgImagePath ?? defaultOgImagePath;
            const ogImageMimeType = `image/${getFileExtension(ogImagePath) ?? "png"}`;
            return /* @__PURE__ */ jsxs(Fragment, { children: [
              !userDefinedOgImagePath && /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx("meta", { property: "og:image:width", content: fullOptions.width.toString() }),
                /* @__PURE__ */ jsx("meta", { property: "og:image:height", content: fullOptions.height.toString() })
              ] }),
              /* @__PURE__ */ jsx("meta", { property: "og:image", content: ogImagePath }),
              /* @__PURE__ */ jsx("meta", { property: "og:image:url", content: ogImagePath }),
              /* @__PURE__ */ jsx("meta", { name: "twitter:image", content: ogImagePath }),
              /* @__PURE__ */ jsx("meta", { property: "og:image:type", content: ogImageMimeType })
            ] });
          }
        ]
      };
    }
  };
};

export { CustomOgImages, CustomOgImagesEmitterName };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map