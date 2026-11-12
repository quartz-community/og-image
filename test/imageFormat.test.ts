import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import { OG_IMAGE_FORMATS, ogImageMimeType, ogImageOutput } from "../src/emitter";

describe("ogImageOutput", () => {
  it("returns the webp entry for webp, undefined, and unknown formats", () => {
    const webp = OG_IMAGE_FORMATS.webp;
    expect(ogImageOutput("webp")).toEqual(webp);
    expect(ogImageOutput(undefined)).toEqual(webp);
    expect(ogImageOutput("png")).toEqual(webp);
    expect(ogImageOutput("")).toEqual(webp);
  });

  it("returns the jpeg entry for jpeg", () => {
    expect(ogImageOutput("jpeg")).toEqual(OG_IMAGE_FORMATS.jpeg);
    expect(ogImageOutput("jpeg").ext).toBe(".jpg");
    expect(ogImageOutput("jpeg").mime).toBe("image/jpeg");
  });
});

describe("ogImageMimeType", () => {
  it("maps generated extensions from the registry", () => {
    expect(ogImageMimeType("notes/page-og-image.webp")).toBe("image/webp");
    expect(ogImageMimeType("notes/page-og-image.jpg")).toBe("image/jpeg");
  });

  it("maps the jpeg alias extension", () => {
    expect(ogImageMimeType("static/cover.jpeg")).toBe("image/jpeg");
  });

  it("falls back to image/<ext> for unknown extensions", () => {
    expect(ogImageMimeType("static/og-image.png")).toBe("image/png");
  });
});

describe("imageFormat optionSchema", () => {
  it("lists the same keys as OG_IMAGE_FORMATS", () => {
    const schemaValues = packageJson.quartz.optionSchema.imageFormat.values;
    expect(schemaValues).toEqual(Object.keys(OG_IMAGE_FORMATS));
  });
});
