import { describe, expect, it } from "vitest";
import { formatarDuracao, somarMs } from "./cronometro";

describe("cronômetro", () => {
  it("formata", () => {
    expect(formatarDuracao(42 * 60_000 + 15_000)).toBe("00:42:15");
    expect(formatarDuracao(3_725_000)).toBe("01:02:05");
    expect(formatarDuracao(-5)).toBe("00:00:00");
  });
  it("soma abertos até agora", () => {
    const agora = Date.parse("2026-11-16T10:00:00Z");
    expect(
      somarMs(
        [
          { inicio: "2026-11-16T08:00:00Z", fim: "2026-11-16T09:00:00Z" },
          { inicio: "2026-11-16T09:30:00Z", fim: null },
        ],
        agora,
      ),
    ).toBe(90 * 60_000);
  });
});
