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

describe("emojiFrom with the map's key format", () => {
  // Keys as in Quartz's emojimap.json: zero-padded, the emoji selector inside keycaps
  // and ZWJ sequences.
  const quartzMap: EmojiMap = {
    codePointToName: {
      "00A9": "copyright",
      "00AE": "registered",
      "0023-FE0F-20E3": "hash",
      "002A-FE0F-20E3": "asterisk",
      "0031-FE0F-20E3": "one",
      "1F3F3": "white-flag",
      "1F3F3-FE0F-200D-1F308": "rainbow-flag",
      "2764-FE0F-200D-1F525": "heart-on-fire",
    },
    nameToBase64: {
      copyright: "c64",
      registered: "r64",
      hash: "hash64",
      asterisk: "ast64",
      one: "one64",
      "white-flag": "wf64",
      "rainbow-flag": "rf64",
      "heart-on-fire": "hof64",
    },
  };
  // getIconCode's output for each grapheme.
  const codeOf = (s: string) =>
    Array.from(s)
      .map((c) => c.codePointAt(0)!.toString(16))
      .join("-");

  it("finds code points below U+1000 (zero-padded keys)", () => {
    expect(emojiFrom(quartzMap, codeOf("©️"))).toBe("c64");
    expect(emojiFrom(quartzMap, codeOf("©"))).toBe("c64");
    expect(emojiFrom(quartzMap, codeOf("®️"))).toBe("r64");
  });

  it("finds keycaps with or without the inner emoji selector", () => {
    expect(codeOf("1️⃣")).toBe("31-fe0f-20e3");
    expect(emojiFrom(quartzMap, codeOf("1️⃣"))).toBe("one64");
    expect(emojiFrom(quartzMap, codeOf("#️⃣"))).toBe("hash64");
    expect(emojiFrom(quartzMap, codeOf("#⃣"))).toBe("hash64");
    expect(emojiFrom(quartzMap, codeOf("*️⃣"))).toBe("ast64");
  });

  it("finds ZWJ sequences missing an inner emoji selector", () => {
    expect(emojiFrom(quartzMap, codeOf("🏳️‍🌈"))).toBe("rf64");
    expect(emojiFrom(quartzMap, codeOf("🏳‍🌈"))).toBe("rf64");
    expect(emojiFrom(quartzMap, codeOf("❤‍🔥"))).toBe("hof64");
    expect(emojiFrom(quartzMap, codeOf("🏳"))).toBe("wf64");
  });

  it("does not match a digit or a sequence prefix on its own", () => {
    expect(emojiFrom(quartzMap, codeOf("1"))).toBeUndefined();
    expect(emojiFrom(quartzMap, codeOf("🌈"))).toBeUndefined();
  });
});
