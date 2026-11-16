/**
 * Fila de upload com retentativa (SPEC 10.5: tolerante a internet instável).
 * Lógica pura: o envio real, o relógio e o agendador são injetados, então
 * dá para testar sem rede nem timers reais. Compatível com useSyncExternalStore.
 */

export type EstadoUpload = "na_fila" | "enviando" | "aguardando_retentativa" | "falhou" | "enviado";

export type TarefaUpload<M = unknown> = {
  id: string;
  arquivo: Blob;
  meta: M;
  estado: EstadoUpload;
  /** Tentativas já feitas (inclui a em andamento). */
  tentativas: number;
  erro: string | null;
};

export type OpcoesFila<M> = {
  /** Faz o envio completo da tarefa (Storage + registro). Deve lançar em caso de falha. */
  enviar: (tarefa: TarefaUpload<M>) => Promise<void>;
  /** Uploads simultâneos (padrão 2: rede de oficina). */
  concorrencia?: number;
  /** Depois disso a tarefa fica `falhou` até o usuário tocar em tentar de novo (padrão 5). */
  maxTentativas?: number;
  /** Espera antes da retentativa n (1 = depois da primeira falha). Padrão: 2s, 4s, 8s... até 30s. */
  atrasoMs?: (tentativa: number) => number;
  agendar?: (fn: () => void, ms: number) => unknown;
  cancelarAgendamento?: (handle: unknown) => void;
};

export function atrasoExponencial(tentativa: number): number {
  return Math.min(2000 * 2 ** (tentativa - 1), 30000);
}

function mensagemDoErro(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return "Falha no envio";
}

export class FilaUpload<M = unknown> {
  private tarefas: TarefaUpload<M>[] = [];
  private snapshot: readonly TarefaUpload<M>[] = [];
  private ouvintes = new Set<() => void>();
  private timers = new Map<string, unknown>();
  private emAndamento = 0;

  private readonly enviar: OpcoesFila<M>["enviar"];
  private readonly concorrencia: number;
  private readonly maxTentativas: number;
  private readonly atrasoMs: (tentativa: number) => number;
  private readonly agendar: (fn: () => void, ms: number) => unknown;
  private readonly cancelarAgendamento: (handle: unknown) => void;

  constructor(opcoes: OpcoesFila<M>) {
    this.enviar = opcoes.enviar;
    this.concorrencia = Math.max(1, opcoes.concorrencia ?? 2);
    this.maxTentativas = Math.max(1, opcoes.maxTentativas ?? 5);
    this.atrasoMs = opcoes.atrasoMs ?? atrasoExponencial;
    this.agendar = opcoes.agendar ?? ((fn, ms) => setTimeout(fn, ms));
    this.cancelarAgendamento =
      opcoes.cancelarAgendamento ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  }

  /** Estado atual (referência estável entre mudanças). */
  obterEstado = (): readonly TarefaUpload<M>[] => this.snapshot;

  assinar = (ouvinte: () => void): (() => void) => {
    this.ouvintes.add(ouvinte);
    return () => {
      this.ouvintes.delete(ouvinte);
    };
  };

  adicionar(id: string, arquivo: Blob, meta: M): void {
    if (this.tarefas.some((t) => t.id === id)) return;
    this.tarefas.push({ id, arquivo, meta, estado: "na_fila", tentativas: 0, erro: null });
    this.publicar();
    this.processar();
  }

  /** Tentar de novo agora (botão por foto ou ao voltar a conexão). */
  retentar(id: string): void {
    const t = this.tarefas.find((x) => x.id === id);
    if (!t || (t.estado !== "falhou" && t.estado !== "aguardando_retentativa")) return;
    this.limparTimer(id);
    if (t.estado === "falhou") t.tentativas = 0;
    t.estado = "na_fila";
    this.publicar();
    this.processar();
  }

  retentarTodas(): void {
    for (const t of [...this.tarefas]) this.retentar(t.id);
  }

  remover(id: string): void {
    this.limparTimer(id);
    const antes = this.tarefas.length;
    this.tarefas = this.tarefas.filter((t) => t.id !== id);
    if (this.tarefas.length !== antes) this.publicar();
  }

  /** Quantas ainda não foram enviadas (para bloquear o avanço do wizard). */
  pendentes(): number {
    return this.tarefas.filter((t) => t.estado !== "enviado").length;
  }

  destruir(): void {
    for (const id of [...this.timers.keys()]) this.limparTimer(id);
    this.ouvintes.clear();
  }

  private limparTimer(id: string) {
    const h = this.timers.get(id);
    if (h !== undefined) {
      this.cancelarAgendamento(h);
      this.timers.delete(id);
    }
  }

  private publicar() {
    this.snapshot = this.tarefas.map((t) => ({ ...t }));
    for (const o of [...this.ouvintes]) o();
  }

  private processar() {
    while (this.emAndamento < this.concorrencia) {
      const proxima = this.tarefas.find((t) => t.estado === "na_fila");
      if (!proxima) return;
      this.iniciar(proxima);
    }
  }

  private iniciar(tarefa: TarefaUpload<M>) {
    this.emAndamento++;
    tarefa.estado = "enviando";
    tarefa.tentativas++;
    tarefa.erro = null;
    this.publicar();

    void (async () => {
      try {
        await this.enviar({ ...tarefa });
        tarefa.estado = "enviado";
        tarefa.erro = null;
      } catch (e) {
        tarefa.erro = mensagemDoErro(e);
        if (tarefa.tentativas >= this.maxTentativas) {
          tarefa.estado = "falhou";
        } else {
          tarefa.estado = "aguardando_retentativa";
          const id = tarefa.id;
          this.timers.set(
            id,
            this.agendar(() => {
              this.timers.delete(id);
              if (tarefa.estado === "aguardando_retentativa") {
                tarefa.estado = "na_fila";
                this.publicar();
                this.processar();
              }
            }, this.atrasoMs(tarefa.tentativas)),
          );
        }
      } finally {
        this.emAndamento--;
        // tarefa pode ter sido removida durante o envio
        this.publicar();
        this.processar();
      }
    })();
  }
}
