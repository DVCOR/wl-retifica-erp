"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Command as CommandPrimitive } from "cmdk";
import { Boxes, History, Loader2, Plus, Search, UserPlus, Users, FileText, X } from "lucide-react";
import { CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { itensDoPapel } from "@/components/app/nav-itens";
import { useEmpresa, usePermissao } from "@/lib/auth/empresa-context";
import {
  adicionarUltimaBusca,
  agruparResultados,
  gravarUltimasBuscas,
  hrefResultado,
  lerUltimasBuscas,
  type ResultadoBusca,
  type TipoResultado,
} from "@/lib/busca/busca";
import { buscarAction } from "./actions";

const ICONE: Record<TipoResultado, React.ComponentType<{ "aria-hidden"?: boolean }>> = {
  cliente: Users,
  motor: Boxes,
  os: FileText,
};
const ATRASO_MS = 250;

/** Diálogo da busca global: tela cheia no celular, caixa central a partir de sm. */
export function BuscaDialogo({
  aberto,
  aoMudar,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent
        mostrarFechar={false}
        className="top-0 left-0 grid h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 p-0 sm:top-[10%] sm:left-1/2 sm:h-auto sm:max-h-[80dvh] sm:max-w-xl sm:-translate-x-1/2 sm:rounded-xl sm:border"
      >
        <DialogTitle className="sr-only">Busca global</DialogTitle>
        <DialogDescription className="sr-only">
          Busque cliente, placa, motor ou nº da OS. Use as setas para navegar e Enter para abrir.
        </DialogDescription>
        <ConteudoBusca aoMudar={aoMudar} />
      </DialogContent>
    </Dialog>
  );
}

type Resposta = { termo: string; itens: ResultadoBusca[]; erro: string | null };

/** Montado só com o diálogo aberto: o estado (termo, resultados) zera ao fechar. */
function ConteudoBusca({ aoMudar }: { aoMudar: (aberto: boolean) => void }) {
  const router = useRouter();
  const { empresa, membro } = useEmpresa();
  const { pode } = usePermissao();
  const chave = `wl:ultimas-buscas:${empresa.id}:${membro.id}`;

  const [termo, setTermo] = React.useState("");
  const [resposta, setResposta] = React.useState<Resposta | null>(null);
  const [ultimas] = React.useState<string[]>(() => lerUltimasBuscas(chave));

  const termoLimpo = termo.trim();
  const buscando = termoLimpo.length >= 2;
  const atual = buscando && resposta?.termo === termoLimpo ? resposta : null;
  const carregando = buscando && !atual;
  const erro = atual?.erro ?? null;
  const resultados = atual?.itens ?? [];

  React.useEffect(() => {
    if (!buscando) return;
    let cancelado = false; // descarta resposta de busca antiga
    const t = setTimeout(async () => {
      const r = await buscarAction({ slug: empresa.slug, termo: termoLimpo });
      if (cancelado) return;
      setResposta({
        termo: termoLimpo,
        itens: r.ok ? r.dados : [],
        erro: r.ok ? null : r.erro,
      });
    }, ATRASO_MS);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [termoLimpo, buscando, empresa.slug]);

  const ir = (href: string, lembrar?: string) => {
    if (lembrar) {
      const novas = adicionarUltimaBusca(lerUltimasBuscas(chave), lembrar);
      gravarUltimasBuscas(chave, novas);
    }
    aoMudar(false);
    router.push(href);
  };

  const tiposPermitidos: TipoResultado[] = [
    ...(pode("clientes.ver") ? (["cliente"] as const) : []),
    ...(pode("motores.ver") ? (["motor"] as const) : []),
    ...(pode("os.ver_quadro") || pode("bancada.acessar") ? (["os"] as const) : []),
  ];
  const grupos = agruparResultados(resultados, tiposPermitidos);
  const acoes = [
    pode("os.abrir") && { rotulo: "Nova OS", href: `/${empresa.slug}/os/nova`, icone: Plus },
    pode("clientes.cadastrar") && {
      rotulo: "Novo cliente",
      href: `/${empresa.slug}/clientes`,
      icone: UserPlus,
    },
  ].filter((a): a is { rotulo: string; href: string; icone: typeof Plus } => !!a);
  const filtroAcoes = termoLimpo.toLowerCase();
  const acoesVisiveis = buscando
    ? acoes.filter((a) => a.rotulo.toLowerCase().includes(filtroAcoes))
    : acoes;
  const irPara = buscando
    ? []
    : itensDoPapel(membro.papel).filter((i) => i.rotulo.toLowerCase().includes(filtroAcoes));
  const vazio =
    buscando && !carregando && !erro && grupos.length === 0 && acoesVisiveis.length === 0;

  return (
    <>
      <CommandPrimitive
        shouldFilter={false}
        label="Busca global"
        className="flex h-full min-h-0 flex-col bg-superficie text-texto"
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-borda px-4 sm:h-14">
          {carregando ? (
            <Loader2 className="size-5 shrink-0 animate-spin text-texto-secundario" aria-hidden />
          ) : (
            <Search className="size-5 shrink-0 text-texto-secundario" aria-hidden />
          )}
          <CommandPrimitive.Input
            autoFocus
            value={termo}
            onValueChange={setTermo}
            placeholder="Buscar cliente, placa, motor ou nº da OS"
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-texto-secundario/70"
          />
          <DialogPrimitive.Close
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-texto-secundario hover:bg-fundo hover:text-texto"
            aria-label="Fechar busca"
          >
            <X className="size-5" aria-hidden />
          </DialogPrimitive.Close>
        </div>

        <CommandList className="max-h-none min-h-0 flex-1 sm:max-h-[60dvh]">
          <div aria-live="polite" className="sr-only">
            {buscando && !carregando ? `${resultados.length} resultados` : ""}
          </div>
          {erro && <p className="px-4 py-6 text-center text-[15px] text-perigo">{erro}</p>}
          {vazio && <CommandEmpty>Nada encontrado para &ldquo;{termoLimpo}&rdquo;.</CommandEmpty>}

          {grupos.map((g) => {
            const Icone = ICONE[g.tipo];
            return (
              <CommandGroup key={g.tipo} heading={g.rotulo}>
                {g.itens.map((r) => (
                  <CommandItem
                    key={`${r.tipo}-${r.id}`}
                    value={`${r.tipo}-${r.id}`}
                    onSelect={() => ir(hrefResultado(empresa.slug, r), termoLimpo)}
                    className="py-2"
                  >
                    <Icone aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.titulo}</span>
                      {r.subtitulo && (
                        <span className="block truncate text-sm text-texto-secundario">
                          {r.subtitulo}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}

          {acoesVisiveis.length > 0 && (
            <CommandGroup heading="Ações">
              {acoesVisiveis.map((a) => (
                <CommandItem key={a.href} value={`acao-${a.rotulo}`} onSelect={() => ir(a.href)}>
                  <a.icone aria-hidden />
                  {a.rotulo}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!buscando && ultimas.length > 0 && (
            <CommandGroup heading="Últimas buscas">
              {ultimas.map((u) => (
                <CommandItem key={u} value={`ultima-${u}`} onSelect={() => setTermo(u)}>
                  <History aria-hidden />
                  {u}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {irPara.length > 0 && (
            <CommandGroup heading="Ir para">
              {irPara.map((i) => (
                <CommandItem
                  key={i.rota}
                  value={`ir-${i.rota}`}
                  onSelect={() => ir(`/${empresa.slug}/${i.rota}`)}
                >
                  <i.icone aria-hidden />
                  {i.rotulo}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {!buscando && (
            <p className="px-3 pt-2 pb-3 text-xs text-texto-secundario">
              Digite ao menos 2 letras. Dica: busque por nome, telefone, CPF/CNPJ, placa, série ou
              nº da OS.
            </p>
          )}
        </CommandList>
      </CommandPrimitive>
    </>
  );
}
