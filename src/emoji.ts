export type EmojiMap = {
  codePointToName: Record<string, string>;
  nameToBase64: Record<string, string>;
};

/**
 * A code sequence's lookup key: upper case, every code point zero-padded to four hex
 * digits, and without variation selectors (U+FE0E, U+FE0F). The map writes code points
 * padded (`00A9`) and puts the emoji selector where Unicode does, in the middle of
 * keycaps (`0023-FE0F-20E3`) and ZWJ sequences (`1F3F3-FE0F-200D-1F308`), while a
 * grapheme's code (`getIconCode`) is unpadded and keeps only the selectors the text has.
 * No two map entries differ by their selectors alone, so comparing without them is exact.
 */
function normalizedKey(code: string): string {
  return code
    .split("-")
    .filter((part) => part !== "")
    .map((part) => part.toUpperCase().padStart(4, "0"))
    .filter((part) => part !== "FE0E" && part !== "FE0F")
    .join("-");
}

const indexes = new WeakMap<EmojiMap, Map<string, string>>();

function indexFor(map: EmojiMap): Map<string, string> {
  let index = indexes.get(map);
  if (!index) {
    index = new Map();
    for (const [key, name] of Object.entries(map.codePointToName)) {
      const normalized = normalizedKey(key);
      if (!index.has(normalized)) index.set(normalized, name);
    }
    indexes.set(map, index);
  }
  return index;
}

let emojimap: EmojiMap | undefined = undefined;
/**
 * The emoji image for a grapheme's code points (`1f600`, `2764-fe0f`, `23-20e3`), or
 * `undefined` when the map has none: the text then renders in the fonts. The code is
 * looked up as written, then by its normalized key (see `normalizedKey`), so the
 * presence or position of variation selectors and the zero padding don't matter:
 * `#⃣` and `#️⃣`, `©` and `©️`, `🏳‍🌈` and `🏳️‍🌈` all find their image. A
 * text-presentation selector (U+FE0E, as in Obsidian's footnote back-link `↩︎`) gets the
 * emoji image too: the image fonts rarely have the character, and neither has the
 * selector.
 */
export function emojiFrom(map: EmojiMap, code: string): string | undefined {
  const name = map.codePointToName[code.toUpperCase()] ?? indexFor(map).get(normalizedKey(code));
  return name ? map.nameToBase64[name] : undefined;
}

export async function loadEmoji(code: string): Promise<string | undefined> {
  if (!emojimap) {
    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const mapPath = path.join("quartz", "util", "emojimap.json");
    const data = JSON.parse(await fs.readFile(mapPath, "utf-8"));
    emojimap = data;
  }

  return emojiFrom(emojimap!, code);
}
