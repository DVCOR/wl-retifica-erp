import { describe, expect, it } from "vitest";
import {
  descricaoMotor,
  mascararPlaca,
  motorSchema,
  normalizarPlaca,
  validarPlaca,
} from "./motores";

describe("placa", () => {
  it("normaliza e valida antiga e Mercosul", () => {
    expect(normalizarPlaca("abc-1234")).toBe("ABC1234");
    expect(validarPlaca("ABC-1234")).toBe(true);
    expect(validarPlaca("abc1d23")).toBe(true);
    expect(validarPlaca("AB1234")).toBe(false);
    expect(validarPlaca("ABCD123")).toBe(false);
  });
  it("máscara", () => {
    expect(mascararPlaca("abc1234")).toBe("ABC-1234");
    expect(mascararPlaca("abc1d23")).toBe("ABC1D23");
    expect(mascararPlaca("abc")).toBe("ABC");
    expect(mascararPlaca("abc12345678")).toBe("ABC-1234");
  });
});

describe("motorSchema", () => {
  it("exige alguma identificação e normaliza placa", () => {
    expect(motorSchema.safeParse({}).success).toBe(false);
    const r = motorSchema.parse({ marca: "VW", veiculo_placa: "abc-1d23", cilindros: "4" });
    expect(r.veiculo_placa).toBe("ABC1D23");
    expect(r.cilindros).toBe(4);
    expect(r.combustivel).toBeNull();
  });
  it("valida faixas e placa", () => {
    expect(motorSchema.safeParse({ marca: "VW", cilindros: "20" }).success).toBe(false);
    expect(motorSchema.safeParse({ marca: "VW", veiculo_placa: "123" }).success).toBe(false);
    expect(motorSchema.safeParse({ marca: "VW", combustivel: "agua" }).success).toBe(false);
  });
});

describe("descricaoMotor", () => {
  it("junta marca, modelo e código", () => {
    expect(descricaoMotor({ marca: "VW", modelo: "EA111", codigo_motor: "CFZ" })).toBe(
      "VW EA111 CFZ",
    );
    expect(descricaoMotor({})).toBe("Motor sem identificação");
  });
});
