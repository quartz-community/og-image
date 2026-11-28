import { describe, expect, it } from "vitest";
import type { BuildCtx, QuartzPluginData } from "@quartz-community/types";
import { CustomOgImages, resolveContentImage } from "../src/emitter";

type VNode = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

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

const files = [
  "notes/a.md",
  "notes/cover.png",
  "notes/img/inline.webp",
  "Attachments/Cover Image.png",
  "Attachments/cover.png",
  "deep/nested/folder/cover.png",
  "other.md",
];

describe("resolveContentImage", () => {
  it("resolves a wikilink, with or without !, alt text or a heading", () => {
    expect(resolveContentImage("[[Cover Image.png]]", "other.md", files)).toBe(
      "Attachments/Cover Image.png",
    );
    expect(resolveContentImage("![[Cover Image.png|alt]]", "other.md", files)).toBe(
      "Attachments/Cover Image.png",
    );
    expect(resolveContentImage("[[Attachments/cover.png]]", "notes/a.md", files)).toBe(
      "Attachments/cover.png",
    );
  });

  it("resolves a path from the content folder, with or without a leading slash", () => {
    expect(resolveContentImage("Attachments/cover.png", "notes/a.md", files)).toBe(
      "Attachments/cover.png",
    );
    expect(resolveContentImage("/Attachments/cover.png", "notes/a.md", files)).toBe(
      "Attachments/cover.png",
    );
    expect(resolveContentImage("Attachments/Cover%20Image.png", "notes/a.md", files)).toBe(
      "Attachments/Cover Image.png",
    );
  });

  it("resolves a path relative to the note", () => {
    expect(resolveContentImage("./cover.png", "notes/a.md", files)).toBe("notes/cover.png");
    expect(resolveContentImage("img/inline.webp", "notes/a.md", files)).toBe(
      "notes/img/inline.webp",
    );
    expect(resolveContentImage("../Attachments/cover.png", "notes/a.md", files)).toBe(
      "Attachments/cover.png",
    );
  });

  it("finds a bare file name in the note's folder first, then on the shortest path", () => {
    expect(resolveContentImage("cover.png", "notes/a.md", files)).toBe("notes/cover.png");
    expect(resolveContentImage("[[cover.png]]", "other.md", files)).toBe("notes/cover.png");
    expect(
      resolveContentImage("[[cover.png]]", "other.md", ["b/long/cover.png", "a/cover.png"]),
    ).toBe("a/cover.png");
  });

  it("leaves values that name no content file to static/", () => {
    expect(resolveContentImage("covers/a.png", "notes/a.md", files)).toBeUndefined();
    expect(resolveContentImage("missing.png", "notes/a.md", files)).toBeUndefined();
    expect(resolveContentImage("../../outside.png", "notes/a.md", files)).toBeUndefined();
    expect(resolveContentImage("cover.png", "notes/a.md", undefined)).toBeUndefined();
  });
});

describe("social image meta tags for a content image", () => {
  const ogImage = (socialImage: string, relativePath = "notes/a.md") => {
    const ctx = {
      cfg: { configuration: { baseUrl: "example.com/site" } },
      allFiles: files,
    } as unknown as BuildCtx;
    const resources = CustomOgImages({}).externalResources!(ctx) as {
      additionalHead: Array<(p: Partial<QuartzPluginData>) => unknown>;
    };
    const tags = metas(
      resources.additionalHead[0]!({
        slug: "notes/a" as never,
        filePath: `content/${relativePath}` as never,
        relativePath: relativePath as never,
        frontmatter: { title: "A", socialImage },
      }),
    );
    return tags.find(([key]) => key === "og:image")?.[1];
  };

  it("points at the image Quartz copies from the content folder (its slugged path)", () => {
    expect(ogImage("[[Cover Image.png]]")).toBe(
      "https://example.com/site/attachments/cover-image.png",
    );
    expect(ogImage("./cover.png")).toBe("https://example.com/site/notes/cover.png");
  });

  it("still points a value that names no content file into static/", () => {
    expect(ogImage("covers/a.png")).toBe("https://example.com/site/static/covers/a.png");
  });
});
