import { describe, expect, it } from "vitest";
import { dataLocalIso, somarDias } from "./datas";

describe("datas", () => {
  it("formata no fuso local sem virar o dia", () => {
    expect(dataLocalIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
  it("soma dias atravessando mês e ano", () => {
    expect(somarDias(new Date(2026, 11, 30), 3)).toBe("2027-01-02");
    expect(somarDias(new Date(2026, 1, 27), 3)).toBe("2026-03-02");
  });
});
