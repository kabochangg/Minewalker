import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("UTF-8文字コード", () => {
  it("ソース、テスト、スクリプトに不正文字や既知の文字化けがない", () => {
    const output = execFileSync(
      process.execPath,
      ["scripts/verify-encoding.mjs"],
      { encoding: "utf8" },
    );
    expect(output).toContain("PASS");
  });
});
