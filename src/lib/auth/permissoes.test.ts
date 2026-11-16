import { describe, expect, it } from "vitest";
import {
  ACOES,
  PAPEIS,
  PAPEIS_POR_STATUS,
  TRANSICOES_OS,
  pode,
  podeMoverOs,
  podeVerPrecos,
  type Acao,
  type Papel,
} from "./permissoes";

describe("pode()", () => {
  const casos: [Papel, Acao, boolean][] = [
    // Cadastrar/editar clientes
    ["dono", "clientes.editar", true],
    ["balcao", "clientes.editar", true],
    ["tecnico", "clientes.editar", false],
    ["financeiro", "clientes.editar", false],
    ["financeiro", "clientes.editar_financeiro", true],
    ["tecnico", "clientes.editar_financeiro", false],
    // Abrir OS + checklist
    ["dono", "os.abrir", true],
    ["balcao", "os.abrir", true],
    ["tecnico", "os.abrir", false],
    ["financeiro", "os.abrir", false],
    ["tecnico", "os.checklist", false],
    // Medições/laudo
    ["dono", "laudo.registrar", true],
    ["balcao", "laudo.registrar", false],
    ["tecnico", "laudo.registrar", true],
    ["financeiro", "laudo.registrar", false],
    // Orçamento
    ["balcao", "orcamento.montar", true],
    ["tecnico", "orcamento.montar", false],
    ["tecnico", "orcamento.sugerir_itens", true],
    ["financeiro", "orcamento.montar", false],
    // Desconto acima do limite
    ["dono", "orcamento.aprovar_desconto", true],
    ["balcao", "orcamento.aprovar_desconto", false],
    // Bancada
    ["tecnico", "os.mudar_status", true],
    ["financeiro", "os.mudar_status", false],
    // Apontamentos
    ["tecnico", "apontamento.registrar", true],
    ["balcao", "apontamento.registrar", false],
    // Entregar
    ["balcao", "os.entregar", true],
    ["financeiro", "os.entregar", true],
    ["tecnico", "os.entregar", false],
    // Cancelar
    ["dono", "os.cancelar", true],
    ["balcao", "os.cancelar", false],
    // Catálogo
    ["tecnico", "catalogo.ver", true],
    ["balcao", "catalogo.editar", false],
    ["dono", "catalogo.editar", true],
    // Configurações e usuários
    ["dono", "configuracoes.gerenciar", true],
    ["balcao", "configuracoes.gerenciar", false],
    ["tecnico", "usuarios.gerenciar", false],
    ["financeiro", "usuarios.gerenciar", false],
  ];

  it.each(casos)("%s / %s = %s", (papel, acao, esperado) => {
    expect(pode(papel, acao)).toBe(esperado);
  });

  it("nega tudo sem papel", () => {
    for (const acao of ACOES) {
      expect(pode(null, acao)).toBe(false);
      expect(pode(undefined, acao)).toBe(false);
    }
  });

  it("dono pode tudo", () => {
    for (const acao of ACOES) expect(pode("dono", acao)).toBe(true);
  });
});

describe("podeVerPrecos()", () => {
  it("técnico não vê preço por padrão", () => {
    expect(podeVerPrecos("tecnico", {})).toBe(false);
    expect(podeVerPrecos("tecnico", null)).toBe(false);
    expect(podeVerPrecos("tecnico", { tecnico_ve_precos: false })).toBe(false);
  });
  it("técnico vê se o dono ligar", () => {
    expect(podeVerPrecos("tecnico", { tecnico_ve_precos: true })).toBe(true);
  });
  it("demais papéis veem", () => {
    for (const p of PAPEIS.filter((p) => p !== "tecnico")) expect(podeVerPrecos(p, {})).toBe(true);
  });
});

describe("podeMoverOs()", () => {
  it("segue o fluxo da OS", () => {
    expect(podeMoverOs("balcao", "em_recebimento", "recebido")).toBe(true);
    expect(podeMoverOs("balcao", "em_recebimento", "pronto")).toBe(false);
    expect(podeMoverOs("dono", "entregue", "em_execucao")).toBe(false);
    expect(podeMoverOs("dono", "em_execucao", "aguardando_peca")).toBe(true);
    expect(podeMoverOs("dono", "aguardando_peca", "em_execucao")).toBe(true);
  });
  it("técnico só move OS atribuída", () => {
    expect(podeMoverOs("tecnico", "recebido", "em_analise")).toBe(false);
    expect(podeMoverOs("tecnico", "recebido", "em_analise", { atribuidaAoMembro: true })).toBe(
      true,
    );
    expect(
      podeMoverOs("tecnico", "em_analise", "orcamento_enviado", { atribuidaAoMembro: true }),
    ).toBe(false);
  });
  it("só o dono cancela; financeiro entrega", () => {
    expect(podeMoverOs("balcao", "recebido", "cancelado")).toBe(false);
    expect(podeMoverOs("dono", "recebido", "cancelado")).toBe(true);
    expect(podeMoverOs("financeiro", "pronto", "entregue")).toBe(true);
    expect(podeMoverOs("financeiro", "aprovado", "em_execucao")).toBe(false);
  });
  it("estados finais não têm saída e todo destino tem papéis", () => {
    expect(TRANSICOES_OS.entregue).toHaveLength(0);
    expect(TRANSICOES_OS.cancelado).toHaveLength(0);
    for (const destinos of Object.values(TRANSICOES_OS)) {
      for (const d of destinos) expect(PAPEIS_POR_STATUS[d].length).toBeGreaterThan(0);
    }
  });
});
