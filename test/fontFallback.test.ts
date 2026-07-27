import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    default: {
      ...actual,
      access: vi.fn(),
      readFile: vi.fn(),
      mkdir: vi.fn(),
      writeFile: vi.fn(),
    },
    access: vi.fn(),
    readFile: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  };
});

import fs from "node:fs/promises";
import { fetchTtf, getSatoriFonts } from "../src/emitter";

const FAKE_TTF = Buffer.from("fake-ttf-data");

const GOOGLE_FONTS_CSS = `
@font-face {
  font-family: 'Test Font';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/testfont/v1/abc123.ttf) format('truetype');
}`;

function mockFetchSuccess() {
  return vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve(GOOGLE_FONTS_CSS),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(FAKE_TTF.buffer),
    });
}

function mockFetchNetworkError() {
  return vi.fn().mockRejectedValue(new TypeError("fetch failed"));
}

function mockFetchHttpError(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: `HTTP ${status}`,
    text: () => Promise.resolve("error"),
  });
}

function mockFetchBadCss() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    text: () => Promise.resolve("body { color: red; }"),
  });
}

function mockFetchFontDownloadFails() {
  return vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve(GOOGLE_FONTS_CSS),
    })
    .mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    });
}

const originalFetch = globalThis.fetch;
const originalPlatform = process.platform;

beforeEach(() => {
  vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));
  vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
  vi.mocked(fs.mkdir).mockResolvedValue(undefined);
  vi.mocked(fs.writeFile).mockResolvedValue(undefined);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.defineProperty(process, "platform", { value: originalPlatform });
  vi.clearAllMocks();
});

describe("fetchTtf", () => {
  it("returns font data on successful Google Fonts fetch", async () => {
    globalThis.fetch = mockFetchSuccess();

    const result = await fetchTtf("Test Font", 400);

    expect(result).toBeInstanceOf(Buffer);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("caches fetched font to disk", async () => {
    globalThis.fetch = mockFetchSuccess();

    await fetchTtf("Test Font", 400);

    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it("returns undefined on network error without throwing", async () => {
    globalThis.fetch = mockFetchNetworkError();

    const result = await fetchTtf("Test Font", 400);

    expect(result).toBeUndefined();
  });

  it("returns undefined on HTTP 404 from Google Fonts CSS endpoint", async () => {
    globalThis.fetch = mockFetchHttpError(404);

    const result = await fetchTtf("Nonexistent Font", 400);

    expect(result).toBeUndefined();
  });

  it("returns undefined on HTTP 500 from Google Fonts CSS endpoint", async () => {
    globalThis.fetch = mockFetchHttpError(500);

    const result = await fetchTtf("Test Font", 700);

    expect(result).toBeUndefined();
  });

  it("returns undefined when CSS contains no font URL", async () => {
    globalThis.fetch = mockFetchBadCss();

    const result = await fetchTtf("Test Font", 400);

    expect(result).toBeUndefined();
  });

  it("returns undefined when font file download fails", async () => {
    globalThis.fetch = mockFetchFontDownloadFails();

    const result = await fetchTtf("Test Font", 400);

    expect(result).toBeUndefined();
  });

  it("returns cached font data without fetching", async () => {
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);
    vi.mocked(fs.readFile).mockResolvedValueOnce(FAKE_TTF as never);

    globalThis.fetch = vi.fn();
    const result = await fetchTtf("Cached Font", 400);

    expect(result).toEqual(FAKE_TTF);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("getSatoriFonts", () => {
  function mockGoogleFontsForTwoFonts() {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("fonts.googleapis.com")) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve(GOOGLE_FONTS_CSS),
        };
      }
      if (url.includes("fonts.gstatic.com")) {
        return {
          ok: true,
          status: 200,
          arrayBuffer: () => Promise.resolve(FAKE_TTF.buffer),
        };
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
  }

  it("returns Google Fonts when fetch succeeds", async () => {
    mockGoogleFontsForTwoFonts();

    const fonts = await getSatoriFonts("Header Font", "Body Font");

    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.some((f) => f.name === "Header Font")).toBe(true);
    expect(fonts.some((f) => f.name === "Body Font")).toBe(true);
  });

  it("falls back to system fonts when Google Fonts fails", async () => {
    globalThis.fetch = mockFetchNetworkError();
    Object.defineProperty(process, "platform", { value: "linux" });

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes("DejaVuSans-Bold")) return FAKE_TTF as never;
      if (p.includes("DejaVuSans")) return FAKE_TTF as never;
      throw new Error("ENOENT");
    });

    const fonts = await getSatoriFonts("Header Font", "Body Font");

    expect(fonts.length).toBeGreaterThan(0);
    const names = fonts.map((f) => f.name);
    expect(names).toContain("Header Font");
    expect(names).toContain("Body Font");
  });

  it("returns empty array when both Google Fonts and system fonts fail", async () => {
    globalThis.fetch = mockFetchNetworkError();
    Object.defineProperty(process, "platform", { value: "linux" });

    const fonts = await getSatoriFonts("Header Font", "Body Font");

    expect(fonts).toEqual([]);
  });

  it("registers system font under original font names for satori compatibility", async () => {
    globalThis.fetch = mockFetchNetworkError();
    Object.defineProperty(process, "platform", { value: "linux" });

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes("DejaVuSans")) return FAKE_TTF as never;
      throw new Error("ENOENT");
    });

    const fonts = await getSatoriFonts("Schibsted Grotesk", "Source Sans Pro");

    const fontNames = fonts.map((f) => f.name);
    expect(fontNames).toContain("Schibsted Grotesk");
    expect(fontNames).toContain("Source Sans Pro");
    expect(fontNames).not.toContain("DejaVuSans");
  });

  it("handles FontSpecification objects for header and body", async () => {
    mockGoogleFontsForTwoFonts();

    const fonts = await getSatoriFonts(
      { name: "Custom Header", weights: [700] },
      { name: "Custom Body", weights: [400] },
    );

    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.some((f) => f.name === "Custom Header")).toBe(true);
    expect(fonts.some((f) => f.name === "Custom Body")).toBe(true);
  });

  it("includes both regular and bold system font weights when available", async () => {
    globalThis.fetch = mockFetchNetworkError();
    Object.defineProperty(process, "platform", { value: "linux" });

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.includes("DejaVuSans")) return FAKE_TTF as never;
      throw new Error("ENOENT");
    });

    const fonts = await getSatoriFonts("Header", "Body");

    const weights = fonts.map((f) => f.weight);
    expect(weights).toContain(400);
    expect(weights).toContain(700);
  });
});
