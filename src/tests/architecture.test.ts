import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("domain architecture", () => {
  it("componentsとpure systemsがPhaserへ依存しない", () => {
    const files = [
      ...globSync("src/game/components/*.ts"),
      ...globSync("src/game/systems/*.ts"),
    ];
    const violations = files.filter((file) =>
      /from\s+["']phaser["']/.test(readFileSync(file, "utf8")),
    );
    expect(violations).toEqual([]);
  });
});
