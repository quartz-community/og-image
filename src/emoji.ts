export type EmojiMap = {
  codePointToName: Record<string, string>;
  nameToBase64: Record<string, string>;
};

let emojimap: EmojiMap | undefined = undefined;
/**
 * The emoji image for a grapheme's code points (`1f600`, `2764-fe0f`), or
 * `undefined` when the map has none: the text then renders in the fonts. The
 * code is looked up as written, then without its variation selector, then with
 * the emoji one (U+FE0F), as the map lists some either way. A
 * text-presentation selector (U+FE0E, as in Obsidian's footnote back-link
 * `↩︎`) gets the emoji image too: the image fonts rarely have the character,
 * and neither has the selector.
 */
export function emojiFrom(map: EmojiMap, code: string): string | undefined {
  const upper = code.toUpperCase();
  const bare = upper.replace(/-FE0[EF]/g, "");
  for (const key of new Set([upper, bare, `${bare}-FE0F`])) {
    const name = map.codePointToName[key];
    const b64 = name ? map.nameToBase64[name] : undefined;
    if (b64) return b64;
  }
  return undefined;
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
