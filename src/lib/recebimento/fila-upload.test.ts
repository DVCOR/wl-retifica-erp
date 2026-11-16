import { describe, expect, it, vi } from "vitest";
import { atrasoExponencial, FilaUpload, type TarefaUpload } from "./fila-upload";

/** Agendador manual: guarda os timers e deixa o teste dispará-los. */
function agendadorManual() {
  const timers: { fn: () => void; ms: number; ativo: boolean }[] = [];
  return {
    timers,
    agendar: (fn: () => void, ms: number) => {
      const t = { fn, ms, ativo: true };
      timers.push(t);
      return t;
    },
    cancelarAgendamento: (h: unknown) => {
      (h as { ativo: boolean }).ativo = false;
    },
    disparar() {
      const pendentes = timers.filter((t) => t.ativo);
      for (const t of pendentes) {
        t.ativo = false;
        t.fn();
      }
    },
  };
}

const esperar = () => new Promise((r) => setTimeout(r, 0));
const blob = () => new Blob(["x"]);

describe("FilaUpload", () => {
  it("envia e marca como enviado", async () => {
    const enviar = vi.fn(async () => {});
    const fila = new FilaUpload<string>({ enviar });
    fila.adicionar("a", blob(), "meta-a");
    await esperar();
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(fila.obterEstado()[0]).toMatchObject({ id: "a", estado: "enviado", tentativas: 1 });
    expect(fila.pendentes()).toBe(0);
  });

  it("respeita a concorrência", async () => {
    let simultaneos = 0;
    let maximo = 0;
    const fila = new FilaUpload({
      concorrencia: 2,
      enviar: async () => {
        simultaneos++;
        maximo = Math.max(maximo, simultaneos);
        await esperar();
        simultaneos--;
      },
    });
    for (const id of ["a", "b", "c", "d", "e"]) fila.adicionar(id, blob(), null);
    await new Promise((r) => setTimeout(r, 20));
    expect(maximo).toBe(2);
    expect(fila.obterEstado().every((t) => t.estado === "enviado")).toBe(true);
  });

  it("tenta de novo depois da falha de rede e conclui", async () => {
    const ag = agendadorManual();
    let chamadas = 0;
    const fila = new FilaUpload({
      ...ag,
      enviar: async () => {
        chamadas++;
        if (chamadas < 3) throw new Error("Sem rede");
      },
    });
    fila.adicionar("a", blob(), null);
    await esperar();
    expect(fila.obterEstado()[0]).toMatchObject({
      estado: "aguardando_retentativa",
      erro: "Sem rede",
      tentativas: 1,
    });
    expect(ag.timers[0].ms).toBe(atrasoExponencial(1));

    ag.disparar();
    await esperar();
    expect(fila.obterEstado()[0]).toMatchObject({
      estado: "aguardando_retentativa",
      tentativas: 2,
    });

    ag.disparar();
    await esperar();
    expect(fila.obterEstado()[0]).toMatchObject({ estado: "enviado", tentativas: 3, erro: null });
  });

  it("depois do máximo de tentativas fica 'falhou' e só volta com retentar()", async () => {
    const ag = agendadorManual();
    let falhar = true;
    const fila = new FilaUpload({
      ...ag,
      maxTentativas: 2,
      enviar: async () => {
        if (falhar) throw new Error("Timeout");
      },
    });
    fila.adicionar("a", blob(), null);
    await esperar();
    ag.disparar();
    await esperar();
    expect(fila.obterEstado()[0]).toMatchObject({ estado: "falhou", tentativas: 2 });
    expect(fila.pendentes()).toBe(1);

    falhar = false;
    fila.retentar("a");
    await esperar();
    expect(fila.obterEstado()[0]).toMatchObject({ estado: "enviado", tentativas: 1 });
  });

  it("retentar durante a espera cancela o timer e envia na hora", async () => {
    const ag = agendadorManual();
    let chamadas = 0;
    const fila = new FilaUpload({
      ...ag,
      enviar: async () => {
        chamadas++;
        if (chamadas === 1) throw new Error("Sem rede");
      },
    });
    fila.adicionar("a", blob(), null);
    await esperar();
    fila.retentarTodas(); // ex.: evento "online"
    await esperar();
    expect(fila.obterEstado()[0].estado).toBe("enviado");
    expect(ag.timers[0].ativo).toBe(false);
  });

  it("remover tira da fila e cancela a retentativa", async () => {
    const ag = agendadorManual();
    const fila = new FilaUpload({
      ...ag,
      enviar: async () => {
        throw new Error("Sem rede");
      },
    });
    fila.adicionar("a", blob(), null);
    await esperar();
    fila.remover("a");
    expect(fila.obterEstado()).toHaveLength(0);
    expect(ag.timers[0].ativo).toBe(false);
  });

  it("ignora id repetido e notifica ouvintes com snapshot estável", async () => {
    const fila = new FilaUpload({ enviar: async () => {} });
    const ouvinte = vi.fn();
    const cancelar = fila.assinar(ouvinte);
    fila.adicionar("a", blob(), null);
    fila.adicionar("a", blob(), null);
    await esperar();
    expect(fila.obterEstado()).toHaveLength(1);
    expect(ouvinte).toHaveBeenCalled();
    const s1 = fila.obterEstado();
    expect(fila.obterEstado()).toBe(s1);
    cancelar();
    const antes = ouvinte.mock.calls.length;
    fila.adicionar("b", blob(), null);
    expect(ouvinte.mock.calls.length).toBe(antes);
  });

  it("passa a tarefa (com meta e arquivo) para o enviador", async () => {
    const vistas: TarefaUpload<{ caminho: string }>[] = [];
    const fila = new FilaUpload<{ caminho: string }>({
      enviar: async (t) => {
        vistas.push(t);
      },
    });
    const arquivo = blob();
    fila.adicionar("a", arquivo, { caminho: "e/o/a.jpg" });
    await esperar();
    expect(vistas[0].meta.caminho).toBe("e/o/a.jpg");
    expect(vistas[0].arquivo).toBe(arquivo);
  });
});

describe("atrasoExponencial", () => {
  it("dobra e limita em 30s", () => {
    expect([1, 2, 3, 4, 5, 6].map(atrasoExponencial)).toEqual([
      2000, 4000, 8000, 16000, 30000, 30000,
    ]);
  });
});
