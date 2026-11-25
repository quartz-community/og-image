import { describe, expect, it } from "vitest";

import { emojiFrom, type EmojiMap } from "../src/emoji.js";

const map: EmojiMap = {
  codePointToName: { "1F600": "grinning", "2764-FE0F": "heart", "21A9": "leftwards" },
  nameToBase64: { grinning: "g64", heart: "h64", leftwards: "l64" },
};

describe("emojiFrom", () => {
  it("finds an emoji as written, without or with the emoji selector", () => {
    expect(emojiFrom(map, "1f600")).toBe("g64");
    expect(emojiFrom(map, "1f600-fe0f")).toBe("g64");
    expect(emojiFrom(map, "2764")).toBe("h64");
    expect(emojiFrom(map, "2764-fe0f")).toBe("h64");
  });

  it("draws a text-presentation character as its emoji", () => {
    // Obsidian's footnote back-link, `↩︎`.
    expect(emojiFrom(map, "21a9-fe0e")).toBe("l64");
  });

  it("leaves codes the map lacks to the fonts", () => {
    expect(emojiFrom(map, "1f9ff")).toBeUndefined();
    expect(emojiFrom(map, "2190-fe0e")).toBeUndefined();
  });
});
