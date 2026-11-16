import { describe, expect, it } from "vitest";
import { ehModoLocal } from "./modo";

describe("modo local", () => {
  it("só 'true' liga o modo local", () => {
    expect(ehModoLocal("true")).toBe(true);
    expect(ehModoLocal(" TRUE ")).toBe(true);
    expect(ehModoLocal("false")).toBe(false);
    expect(ehModoLocal("1")).toBe(false);
    expect(ehModoLocal("")).toBe(false);
    expect(ehModoLocal(undefined)).toBe(false);
  });
});
