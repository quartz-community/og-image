import { describe, expect, it } from "vitest";
import { mapPool } from "../src/emitter";

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const value of gen) out.push(value);
  return out;
}

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("mapPool", () => {
  it("yields a result for every input", async () => {
    const results = await collect(mapPool([1, 2, 3, 4, 5], 2, async (n) => n * 2));
    expect(results.sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10]);
  });

  it("handles an empty input", async () => {
    expect(await collect(mapPool([], 4, async (n) => n))).toEqual([]);
  });

  it("never exceeds the concurrency limit", async () => {
    let running = 0;
    let peak = 0;
    await collect(
      mapPool(
        Array.from({ length: 20 }, (_, i) => i),
        3,
        async (n) => {
          running += 1;
          peak = Math.max(peak, running);
          await tick(1);
          running -= 1;
          return n;
        },
      ),
    );
    expect(peak).toBe(3);
  });

  it("propagates the error from a failing task", async () => {
    await expect(
      collect(
        mapPool([1, 2, 3], 2, async (n) => {
          if (n === 2) throw new Error("boom");
          return n;
        }),
      ),
    ).rejects.toThrow("boom");
  });

  it("does not orphan rejections from tasks still in flight when one fails", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);

    try {
      await expect(
        collect(
          mapPool([0, 1, 2, 3], 4, async (n) => {
            if (n === 0) throw new Error("first");
            await tick(5);
            throw new Error(`late ${n}`);
          }),
        ),
      ).rejects.toThrow("first");

      // give the still-pending tasks time to reject after we've bailed out
      await tick(40);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }

    expect(unhandled).toEqual([]);
  });
});
