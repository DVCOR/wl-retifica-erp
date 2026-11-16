import { criarClienteNavegador } from "@/lib/supabase/client";
import { BUCKET_ANEXOS, type ArmazenamentoArquivos } from "./armazenamento";

/** Implementação no navegador (sessão do usuário; RLS do Storage vale). */
export function criarArmazenamentoSupabase(): ArmazenamentoArquivos {
  const supabase = criarClienteNavegador();
  return {
    async enviar(caminho, arquivo, tipo) {
      const { error } = await supabase.storage
        .from(BUCKET_ANEXOS)
        .upload(caminho, arquivo, { contentType: tipo, upsert: false, cacheControl: "3600" });
      if (!error) return;
      const status = "statusCode" in error ? String(error.statusCode) : "";
      if (status === "409" || /already exists|Duplicate/i.test(error.message)) return;
      throw new Error(error.message || "Falha no envio do arquivo");
    },
  };
}
