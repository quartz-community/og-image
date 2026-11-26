import { describe, expect, it } from "vitest";
import { resolveDescription } from "../src/emitter";

const defaults = { defaultDescription: "Fallback", useGeneratedDescription: true };

describe("resolveDescription (jackyzha0/quartz#2470)", () => {
  it("prefers socialDescription, then the frontmatter description", () => {
    expect(
      resolveDescription(
        { frontmatter: { socialDescription: "Social", description: "Own" }, description: "Gen" },
        defaults,
      ),
    ).toBe("Social");
    expect(
      resolveDescription({ frontmatter: { description: "Own" }, description: "Gen" }, defaults),
    ).toBe("Own");
  });

  it("uses the generated description by default, else defaultDescription", () => {
    expect(resolveDescription({ frontmatter: {}, description: " Gen &amp; more " }, defaults)).toBe(
      "Gen & more",
    );
    expect(resolveDescription({ frontmatter: {} }, defaults)).toBe("Fallback");
    expect(resolveDescription({ frontmatter: {}, description: "  " }, defaults)).toBe("Fallback");
  });

  it("skips the generated description with useGeneratedDescription: false", () => {
    const opts = { ...defaults, useGeneratedDescription: false };
    expect(resolveDescription({ frontmatter: {}, description: "Gen" }, opts)).toBe("Fallback");
    expect(
      resolveDescription({ frontmatter: { description: "Own" }, description: "Gen" }, opts),
    ).toBe("Own");
  });

  it("decodes the generated description's entities exactly once", () => {
    // A note mentioning `&lt;br&gt;` (and `<br>`): the description is HTML-escaped once.
    expect(
      resolveDescription(
        {
          frontmatter: {},
          description: "Write &amp;lt;br&amp;gt; for &lt;br&gt;, &amp;amp; for &amp;",
        },
        defaults,
      ),
    ).toBe("Write &lt;br&gt; for <br>, &amp; for &");
  });
});
