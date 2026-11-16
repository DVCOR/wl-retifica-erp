import type { Database } from "@/lib/supabase/types";

export type ClienteResumo = {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  tipo: Database["public"]["Enums"]["cliente_tipo"];
  telefone_whatsapp: string | null;
  documento: string | null;
};

export type MotorResumo = {
  id: string;
  marca: string | null;
  modelo: string | null;
  codigo_motor: string | null;
  numero_serie: string | null;
  combustivel: Database["public"]["Enums"]["combustivel"] | null;
  cilindros: number | null;
  veiculo_placa: string | null;
};
