import { z } from "zod";
import { PAPEIS, type Papel } from "@/lib/auth/permissoes";
import { normalizarAcesso } from "@/lib/validacoes/auth";

const uuid = z.string().uuid("Identificador inválido");
const papel = z.enum(PAPEIS as [Papel, ...Papel[]], { message: "Escolha o papel" });

const senha = z
  .string()
  .min(6, "A senha tem ao menos 6 caracteres")
  .max(72, "A senha tem no máximo 72 caracteres");

/** Criar usuário (modo local): nome, e-mail ou só um login, senha inicial e papel. */
export const criarUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(80, "Nome muito longo"),
  acesso: z
    .string()
    .trim()
    .min(1, "Informe o e-mail ou um login")
    .transform((v, ctx) => {
      const email = normalizarAcesso(v);
      if (!email) {
        ctx.addIssue({
          code: "custom",
          message: v.includes("@")
            ? "Informe um e-mail válido"
            : "Login: 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado",
        });
        return z.NEVER;
      }
      return email;
    }),
  senha,
  papel,
});
export type CriarUsuarioEntrada = z.input<typeof criarUsuarioSchema>;

export const redefinirSenhaSchema = z.object({ membro_id: uuid, senha });
export type RedefinirSenhaEntrada = z.input<typeof redefinirSenhaSchema>;

export const mudarPapelSchema = z.object({ membro_id: uuid, papel });
export const alterarAtivoSchema = z.object({ membro_id: uuid, ativo: z.boolean() });

/**
 * Regras de proteção do dono (a última palavra é do banco, que também barra
 * ficar sem dono ativo). Devolve a mensagem de erro ou null se pode.
 */
export function validarAlteracaoMembro(args: {
  alvoId: string;
  euId: string;
  papelAtualAlvo: Papel;
  alvoAtivo: boolean;
  novoPapel?: Papel;
  novoAtivo?: boolean;
  /** Donos ativos na empresa (incluindo o alvo, se for dono ativo). */
  donosAtivos: number;
}): string | null {
  const { alvoId, euId, papelAtualAlvo, alvoAtivo, novoPapel, novoAtivo, donosAtivos } = args;
  const ehEu = alvoId === euId;
  if (ehEu && novoAtivo === false) return "Você não pode desativar o seu próprio usuário.";
  const deixaDeSerDonoAtivo =
    papelAtualAlvo === "dono" &&
    alvoAtivo &&
    ((novoPapel !== undefined && novoPapel !== "dono") || novoAtivo === false);
  if (deixaDeSerDonoAtivo && donosAtivos <= 1) {
    return ehEu
      ? "Você é o último dono: promova outra pessoa a dono antes de mudar o seu papel."
      : "A empresa precisa de ao menos um dono ativo.";
  }
  return null;
}
