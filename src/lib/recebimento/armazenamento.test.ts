import { describe, expect, it } from "vitest";
import { caminhoPertenceAOs, montarCaminhoAnexo } from "./armazenamento";

const EMP = "e0000000-0000-4000-8000-000000000001";
const OS = "0a000000-0000-4000-8000-000000000002";

describe("caminhos do Storage", () => {
  it("monta {empresa}/{os}/prefixo-id.ext", () => {
    expect(montarCaminhoAnexo(EMP, OS, { id: "abc", extensao: "jpg", prefixo: "geral" })).toBe(
      `${EMP}/${OS}/geral-abc.jpg`,
    );
    expect(montarCaminhoAnexo(EMP, OS, { id: "abc", extensao: "png" })).toBe(
      `${EMP}/${OS}/abc.png`,
    );
  });

  it("só aceita caminhos dentro da própria empresa/OS", () => {
    expect(caminhoPertenceAOs(`${EMP}/${OS}/geral-1.jpg`, EMP, OS)).toBe(true);
    expect(caminhoPertenceAOs(`outra/${OS}/geral-1.jpg`, EMP, OS)).toBe(false);
    expect(caminhoPertenceAOs(`${EMP}/${OS}/../x.jpg`, EMP, OS)).toBe(false);
    expect(caminhoPertenceAOs(`${EMP}/${OS}/sub/x.jpg`, EMP, OS)).toBe(false);
  });
});
