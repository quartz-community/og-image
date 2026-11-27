import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadAdditionalAsset } from "../src/emitter.js";

// loadEmoji reads Quartz's map from `quartz/util/emojimap.json` in the working directory.
const grinning = "data:image/png;base64,iVBORw0KGgo=";
const emojimap = {
  codePointToName: { "1F600": "grinning face", "2764-FE0F": "red heart" },
  nameToBase64: { "grinning face": grinning, "red heart": "data:image/png;base64,aGVhcnQ=" },
};

let site: string;
let cwd: string;

beforeAll(async () => {
  cwd = process.cwd();
  site = await mkdtemp(join(tmpdir(), "og-image-emoji-"));
  await mkdir(join(site, "quartz", "util"), { recursive: true });
  await writeFile(join(site, "quartz", "util", "emojimap.json"), JSON.stringify(emojimap));
  process.chdir(site);
});

afterAll(async () => {
  process.chdir(cwd);
  await rm(site, { recursive: true, force: true });
});

describe("loadAdditionalAsset", () => {
  it("returns an emoji's image from Quartz's emoji map", async () => {
    expect(await loadAdditionalAsset("emoji", "😀")).toBe(grinning);
    expect(await loadAdditionalAsset("emoji", "❤️")).toBe("data:image/png;base64,aGVhcnQ=");
  });

  it("returns no asset for an emoji the map lacks, so the fonts draw it", async () => {
    expect(await loadAdditionalAsset("emoji", "🧿")).toEqual([]);
  });

  it("passes other language codes through", async () => {
    expect(await loadAdditionalAsset("ja-JP", "日本")).toBe("ja-JP");
  });
});
