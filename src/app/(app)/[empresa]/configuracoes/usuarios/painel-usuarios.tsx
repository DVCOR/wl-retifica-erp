"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, Plus, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormErro,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { PAPEIS, ROTULO_PAPEL, type Papel } from "@/lib/auth/permissoes";
import {
  criarUsuarioSchema,
  redefinirSenhaSchema,
  type CriarUsuarioEntrada,
} from "@/lib/validacoes/usuarios";
import {
  alterarAtivoAction,
  criarUsuarioAction,
  mudarPapelAction,
  redefinirSenhaAction,
} from "./actions";

type Linha = { id: string; nome: string; acesso: string; papel: Papel; ativo: boolean };

const selectClasse =
  "h-11 w-full rounded-lg border border-input bg-superficie px-3 text-[15px] disabled:opacity-50";

export function PainelUsuarios({
  slug,
  local,
  meuId,
  membros,
}: {
  slug: string;
  local: boolean;
  meuId: string;
  membros: Linha[];
}) {
  const [criando, setCriando] = React.useState(false);
  const [redefinindo, setRedefinindo] = React.useState<Linha | null>(null);
  const [pendente, executar] = React.useTransition();

  function alterar(fn: () => Promise<{ ok: boolean; erro?: string }>, sucesso: string) {
    executar(async () => {
      const r = await fn();
      if (r.ok) toast.success(sucesso);
      else toast.error(r.erro ?? "Não foi possível concluir.");
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {local ? (
        <div className="flex justify-end">
          <Button type="button" size="lg" onClick={() => setCriando(true)}>
            <Plus aria-hidden /> Criar usuário
          </Button>
        </div>
      ) : (
        <p className="bg-superficie-2 rounded-lg px-4 py-3 text-[15px] text-texto-secundario">
          Convites por e-mail chegam em breve. Por enquanto, aqui você muda papéis e ativa ou
          desativa pessoas.
        </p>
      )}

      <ul className="divide-y divide-borda rounded-xl border border-borda bg-superficie">
        {membros.map((m) => {
          const sou = m.id === meuId;
          return (
            <li key={m.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[16px] font-semibold">
                  {m.nome}
                  {sou && <span className="text-sm font-normal text-texto-secundario">(você)</span>}
                  {!m.ativo && <Badge variant="contorno">Desativado</Badge>}
                </p>
                {m.acesso && (
                  <p className="truncate text-sm text-texto-secundario">Login: {m.acesso}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  aria-label={`Papel de ${m.nome}`}
                  className={`${selectClasse} sm:w-40`}
                  value={m.papel}
                  disabled={pendente}
                  onChange={(e) =>
                    alterar(
                      () => mudarPapelAction(slug, { membro_id: m.id, papel: e.target.value }),
                      "Papel atualizado.",
                    )
                  }
                >
                  {PAPEIS.map((p) => (
                    <option key={p} value={p}>
                      {ROTULO_PAPEL[p]}
                    </option>
                  ))}
                </select>
                {local && (
                  <Button type="button" variant="secondary" onClick={() => setRedefinindo(m)}>
                    <KeyRound aria-hidden /> Redefinir senha
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pendente || (sou && m.ativo)}
                  title={
                    sou && m.ativo ? "Você não pode desativar o seu próprio usuário" : undefined
                  }
                  onClick={() =>
                    alterar(
                      () => alterarAtivoAction(slug, { membro_id: m.id, ativo: !m.ativo }),
                      m.ativo ? "Usuário desativado." : "Usuário reativado.",
                    )
                  }
                >
                  {m.ativo ? <UserX aria-hidden /> : <UserCheck aria-hidden />}
                  {m.ativo ? "Desativar" : "Reativar"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {local && (
        <CriarUsuarioDialog slug={slug} aberto={criando} onFechar={() => setCriando(false)} />
      )}
      {local && (
        <RedefinirSenhaDialog
          slug={slug}
          alvo={redefinindo}
          onFechar={() => setRedefinindo(null)}
        />
      )}
    </div>
  );
}

function CriarUsuarioDialog({
  slug,
  aberto,
  onFechar,
}: {
  slug: string;
  aberto: boolean;
  onFechar: () => void;
}) {
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, startTransition] = React.useTransition();
  const form = useForm<CriarUsuarioEntrada>({
    resolver: zodResolver(criarUsuarioSchema),
    defaultValues: { nome: "", acesso: "", senha: "", papel: "balcao" },
  });

  const onSubmit = (dados: CriarUsuarioEntrada) =>
    startTransition(async () => {
      setErro(null);
      const r = await criarUsuarioAction(slug, dados);
      if (r.ok) {
        toast.success("Usuário criado. Passe o login e a senha para a pessoa.");
        form.reset();
        onFechar();
      } else {
        setErro(r.erro);
      }
    });

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar usuário</DialogTitle>
          <DialogDescription>
            Pode ser um e-mail ou só um login, como balcao1. A pessoa entra com esse login e a senha
            inicial.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acesso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail ou login</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="senha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha inicial</FormLabel>
                  <FormControl>
                    <Input type="text" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="papel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Papel</FormLabel>
                  <FormControl>
                    <select className={selectClasse} {...field}>
                      {PAPEIS.map((p) => (
                        <option key={p} value={p}>
                          {ROTULO_PAPEL[p]}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormErro mensagem={erro} />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onFechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pendente}>
                {pendente && <Loader2 className="animate-spin" aria-hidden />}
                Criar usuário
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RedefinirSenhaDialog({
  slug,
  alvo,
  onFechar,
}: {
  slug: string;
  alvo: Linha | null;
  onFechar: () => void;
}) {
  const [senha, setSenha] = React.useState("");
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, startTransition] = React.useTransition();

  function confirmar() {
    if (!alvo) return;
    const dados = redefinirSenhaSchema.safeParse({ membro_id: alvo.id, senha });
    if (!dados.success) {
      setErro(dados.error.issues[0]?.message ?? "Senha inválida");
      return;
    }
    startTransition(async () => {
      setErro(null);
      const r = await redefinirSenhaAction(slug, dados.data);
      if (r.ok) {
        toast.success("Senha redefinida. Passe a nova senha para a pessoa.");
        setSenha("");
        onFechar();
      } else setErro(r.erro);
    });
  }

  return (
    <Dialog open={alvo !== null} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir senha de {alvo?.nome}</DialogTitle>
          <DialogDescription>A senha antiga deixa de valer na hora.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <label htmlFor="nova-senha" className="text-sm font-medium">
            Nova senha
          </label>
          <Input
            id="nova-senha"
            type="text"
            autoComplete="off"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <FormErro mensagem={erro} />
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="button" disabled={pendente} onClick={confirmar}>
            {pendente && <Loader2 className="animate-spin" aria-hidden />}
            Redefinir senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
