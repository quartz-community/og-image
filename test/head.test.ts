import { describe, expect, it } from "vitest";
import type { BuildCtx, QuartzPluginData } from "@quartz-community/types";
import { CustomOgImages, userSocialImage } from "../src/emitter";

type VNode = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

/** The meta tags' `property`/`name` → `content`, in order. */
function metas(node: unknown, out: Array<[string, string]> = []): Array<[string, string]> {
  if (Array.isArray(node)) node.forEach((n) => metas(n, out));
  else if (node && typeof node === "object" && "props" in node) {
    const v = node as VNode;
    if (v.type === "meta") {
      out.push([String(v.props.property ?? v.props.name), String(v.props.content)]);
    }
    metas(v.props.children, out);
  }
  return out;
}

const head = (pageData: Partial<QuartzPluginData>, baseUrl = "example.com/site") => {
  const ctx = { cfg: { configuration: { baseUrl } } } as unknown as BuildCtx;
  const resources = CustomOgImages({ width: 1000, height: 500 }).externalResources!(ctx);
  const additionalHead = (resources as { additionalHead: Array<(p: unknown) => unknown> })
    .additionalHead;
  return metas(additionalHead[0]!(pageData));
};

describe("social image meta tags", () => {
  it("point a page at its generated image, with its size", () => {
    expect(head({ slug: "notes/a" as never, filePath: "content/notes/a.md" as never })).toEqual([
      ["og:image:width", "1000"],
      ["og:image:height", "500"],
      ["og:image", "https://example.com/site/notes/a-og-image.webp"],
      ["og:image:url", "https://example.com/site/notes/a-og-image.webp"],
      ["twitter:image", "https://example.com/site/notes/a-og-image.webp"],
      ["og:image:type", "image/webp"],
    ]);
  });

  it("point a page without a file (no image generated) at the site's default image", () => {
    expect(head({ slug: "tags/x" as never })).toContainEqual([
      "og:image",
      "https://example.com/site/static/og-image.png",
    ]);
    expect(head({ slug: "tags/x" as never })).toContainEqual(["og:image:type", "image/png"]);
  });

  it("use the frontmatter's socialImage, from static/ or as a URL, without a size", () => {
    const own = (socialImage: string) =>
      head({
        slug: "a" as never,
        filePath: "content/a.md" as never,
        frontmatter: { title: "A", socialImage },
      });
    expect(own("covers/a.png")).toEqual([
      ["og:image", "https://example.com/site/static/covers/a.png"],
      ["og:image:url", "https://example.com/site/static/covers/a.png"],
      ["twitter:image", "https://example.com/site/static/covers/a.png"],
      ["og:image:type", "image/png"],
    ]);
    expect(own("https://cdn.example/x.webp?v=2")).toContainEqual([
      "og:image",
      "https://cdn.example/x.webp?v=2",
    ]);
    // the type from the path, not the query
    expect(own("https://cdn.example/x.webp?v=2")).toContainEqual(["og:image:type", "image/webp"]);
    expect(own("http://cdn.example/x.gif")).toContainEqual([
      "og:image",
      "http://cdn.example/x.gif",
    ]);
  });

  it("are left out without a baseUrl", () => {
    const ctx = { cfg: { configuration: {} } } as unknown as BuildCtx;
    expect(CustomOgImages({}).externalResources!(ctx)).toEqual({});
  });

  // og:image:type used to be `image/` + the file extension, so a `.jpg` social image was announced
  // as `image/jpg` and an `.svg` one as `image/svg`, which are not media types.
  it("announce the media type of a .jpg or .svg social image", () => {
    const type = (socialImage: string) =>
      head({ slug: "a" as never, frontmatter: { title: "A", socialImage } }).find(
        ([k]) => k === "og:image:type",
      )?.[1];
    expect(type("a.jpg")).toBe("image/jpeg");
    expect(type("a.JPEG")).toBe("image/jpeg");
    expect(type("a.svg")).toBe("image/svg+xml");
    expect(type("https://cdn.example/a.gif?x=1")).toBe("image/gif");
    expect(type("a.avif")).toBe("image/avif");
    expect(type("a.png")).toBe("image/png");
  });

  // an empty `socialImage:` (null) used to skip generating the page's image while its meta tags
  // pointed at the generated image (a broken link)
  it("treat an empty socialImage as none: the generated image, which is then emitted", () => {
    for (const socialImage of [null, "", "  "]) {
      const page = {
        slug: "a" as never,
        filePath: "content/a.md" as never,
        frontmatter: { title: "A", socialImage } as never,
      };
      expect(head(page)).toContainEqual(["og:image", "https://example.com/site/a-og-image.webp"]);
      expect(userSocialImage(page.frontmatter)).toBeUndefined();
    }
    expect(userSocialImage({ socialImage: "cover.png" })).toBe("cover.png");
    expect(userSocialImage(undefined)).toBeUndefined();
  });
});
