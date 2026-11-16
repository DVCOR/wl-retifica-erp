import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { BUCKET_ANEXOS } from "@/lib/recebimento/armazenamento";
import type { Database } from "@/lib/supabase/types";

/**
 * Página pública da OS. Sem sessão: usa um cliente ANON (só executa
 * os_publica / responder_orcamento_publico). A service role é usada apenas
 * para assinar as URLs das fotos devolvidas por os_publica_fotos(token).
 */

export type OsPublica = {
  empresa: {
    nome_fantasia: string;
    telefone: string | null;
    email: string | null;
    endereco: Record<string, string | undefined> | null;
    logo_path: string | null;
    termos_garantia: string | null;
  };
  os: {
    numero: string;
    status: Database["public"]["Enums"]["os_status"];
    created_at: string;
    prazo_prometido: string | null;
    entregue_em: string | null;
    garantia_ate: string | null;
    cliente_nome: string;
    cliente_final_placa: string | null;
    motor: {
      marca: string | null;
      modelo: string | null;
      codigo_motor: string | null;
      cilindros: number | null;
      cilindrada: string | null;
      combustivel: string | null;
      veiculo_placa: string | null;
    } | null;
  };
  orcamento: {
    versao: number;
    status: "enviado" | "aprovado" | "reprovado";
    subtotal: number;
    desconto: number;
    total: number;
    validade: string | null;
    vencido: boolean;
    enviado_em: string | null;
    respondido_em: string | null;
    respondido_por_nome: string | null;
    observacoes: string | null;
    itens: {
      tipo: "servico" | "peca";
      descricao: string;
      quantidade: number;
      preco_unitario: number;
      desconto: number;
      total: number;
    }[];
  } | null;
  medicoes: {
    componente: string;
    descricao: string;
    valor: number | null;
    valor_texto: string | null;
    unidade: string | null;
    minimo: number | null;
    maximo: number | null;
    conforme: boolean | null;
  }[];
  qtd_fotos: number;
  historico: { status: Database["public"]["Enums"]["os_status"]; em: string }[];
};

export function clienteAnonimo() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function tokenValido(token: string): boolean {
  return z.string().uuid().safeParse(token).success;
}

export async function obterOsPublica(token: string): Promise<OsPublica | null> {
  if (!tokenValido(token)) return null;
  const { data, error } = await clienteAnonimo().rpc("os_publica", { p_token: token });
  if (error || !data) return null;
  return data as unknown as OsPublica;
}

export type FotoPublica = { url: string; legenda: string | null };

/** Fotos do recebimento/análise com URL assinada (1 h), geradas só no servidor. */
export async function obterFotosPublicas(token: string, limite = 12): Promise<FotoPublica[]> {
  if (!tokenValido(token)) return [];
  try {
    const admin = criarClienteAdmin();
    const { data } = await admin.rpc("os_publica_fotos", { p_token: token });
    // fotos da análise (o que encontramos) vêm primeiro
    const fotos = [...(data ?? [])]
      .sort((a, b) => Number(b.etapa === "analise") - Number(a.etapa === "analise"))
      .slice(0, limite);
    if (fotos.length === 0) return [];
    const { data: urls } = await admin.storage.from(BUCKET_ANEXOS).createSignedUrls(
      fotos.map((f) => f.storage_path),
      3600,
    );
    const mapa = new Map<string, string>();
    for (const u of urls ?? []) if (u.path && u.signedUrl) mapa.set(u.path, u.signedUrl);
    return fotos.flatMap((f) => {
      const url = mapa.get(f.storage_path);
      return url ? [{ url, legenda: f.legenda || null }] : [];
    });
  } catch {
    return [];
  }
}
