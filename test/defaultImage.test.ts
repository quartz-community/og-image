import { describe, expect, it } from "vitest";
import type { FullSlug, GlobalConfiguration } from "@quartz-community/types";
import { defaultImage, type SocialImageFileData, type UserOpts } from "../src/emitter";
import type { Theme } from "../src/theme";

type VNode = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

function all(node: unknown, test: (v: VNode) => boolean, out: VNode[] = []): VNode[] {
  if (Array.isArray(node)) node.forEach((n) => all(n, test, out));
  else if (node && typeof node === "object" && "props" in node) {
    const v = node as VNode;
    if (test(v)) out.push(v);
    all(v.props.children, test, out);
  }
  return out;
}

function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return textOf((node as VNode).props.children);
}

const palette = {
  light: "#fff",
  lightgray: "#eee",
  gray: "#888",
  darkgray: "#444",
  dark: "#111",
  secondary: "#284b63",
  tertiary: "#84a59d",
  highlight: "#ffd",
  textHighlight: "#ff0",
};
const theme = {
  typography: { header: "Header Font", body: "Body Font", code: "Code" },
  colors: { lightMode: palette, darkMode: { ...palette, dark: "#eee", light: "#000" } },
} as unknown as Theme;
const cfg = {
  locale: "en-US",
  baseUrl: "example.com",
  theme,
} as unknown as GlobalConfiguration;
const userOpts: UserOpts = {
  colorScheme: "lightMode",
  width: 1200,
  height: 630,
  excludeRoot: false,
};

const image = (
  fileData: SocialImageFileData,
  {
    title = "Title",
    iconBase64,
    opts = userOpts,
  }: { title?: string; iconBase64?: string; opts?: UserOpts } = {},
) =>
  defaultImage({
    cfg,
    userOpts: opts,
    title,
    description: "About it",
    fonts: [],
    fileData,
    iconBase64,
  });

const h1 = (tree: unknown) => all(tree, (v) => v.type === "h1")[0]!;

describe("the default social image", () => {
  it("shows the title, smaller when it is long", () => {
    const short = h1(image({}, { title: "x".repeat(32) }));
    expect(textOf(short)).toBe("x".repeat(32));
    expect(short.props.style).toMatchObject({
      fontSize: 72,
      color: "#111",
      fontFamily: "Header Font",
    });
    expect(
      (h1(image({}, { title: "x".repeat(33) })).props.style as { fontSize: number }).fontSize,
    ).toBe(64);
  });

  it("takes its colours from the colorScheme", () => {
    const dark = h1(image({}, { opts: { ...userOpts, colorScheme: "darkMode" } }));
    expect((dark.props.style as { color: string }).color).toBe("#eee");
  });

  it("shows the page's date, its reading time and at most three tags", () => {
    const tree = image({
      slug: "a" as FullSlug,
      frontmatter: { title: "A", tags: ["one", "two", "three", "four"] },
      text: "word ".repeat(450),
      dates: { created: new Date("2024-03-05T12:00:00Z") },
      defaultDateType: "created",
    } as SocialImageFileData);
    const text = textOf(tree);
    expect(text).toContain("Mar 05, 2024");
    expect(text).toContain("3 min read");
    expect(text).toContain("#one#two#three");
    expect(text).not.toContain("#four");
    expect(text).toContain("example.com");
    expect(text).toContain("About it");
  });

  it("leaves out the date when the page has none, and words the reading time as configured", () => {
    const tree = image(
      { text: "a b c" },
      {
        opts: { ...userOpts, readingTimeText: (m) => `${m} Minuten` },
      },
    );
    expect(all(tree, (v) => v.props["aria-label"] === "Date")).toEqual([]);
    expect(textOf(tree)).toContain("1 Minuten");
  });

  it("shows the site's icon when there is one", () => {
    expect(all(image({}), (v) => v.type === "img")).toEqual([]);
    const [img] = all(
      image({}, { iconBase64: "data:image/png;base64,AA==" }),
      (v) => v.type === "img",
    );
    expect(img!.props.src).toBe("data:image/png;base64,AA==");
  });
});
