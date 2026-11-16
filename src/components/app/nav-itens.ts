import {
  Boxes,
  ClipboardList,
  Cog,
  House,
  KanbanSquare,
  type LucideIcon,
  Users,
  Wrench,
} from "lucide-react";
import type { Papel } from "@/lib/auth/permissoes";

export type ItemNav = {
  /** segmento depois de /[empresa]/ */
  rota: string;
  rotulo: string;
  /** rótulo curto (barra inferior do celular) */
  curto: string;
  icone: LucideIcon;
  papeis: readonly Papel[];
  /** ordem na barra inferior do celular (menor = mais à esquerda/visível) */
  ordemCelular: number;
};

/**
 * Menu principal por papel. Os módulos das rodadas só preenchem as páginas;
 * não mexem aqui sem avisar.
 */
export const ITENS_NAV: readonly ItemNav[] = [
  {
    rota: "inicio",
    rotulo: "Início",
    curto: "Início",
    icone: House,
    papeis: ["dono", "balcao", "tecnico", "financeiro"],
    ordemCelular: 1,
  },
  {
    rota: "os",
    rotulo: "Quadro de OS",
    curto: "OS",
    icone: KanbanSquare,
    papeis: ["dono", "balcao", "financeiro"],
    ordemCelular: 2,
  },
  {
    rota: "bancada",
    rotulo: "Minha bancada",
    curto: "Bancada",
    icone: Wrench,
    papeis: ["dono", "tecnico"],
    ordemCelular: 3.5,
  },
  {
    rota: "clientes",
    rotulo: "Clientes",
    curto: "Clientes",
    icone: Users,
    papeis: ["dono", "balcao", "financeiro"],
    ordemCelular: 3,
  },
  {
    rota: "motores",
    rotulo: "Motores",
    curto: "Motores",
    icone: Boxes,
    papeis: ["dono", "balcao", "tecnico"],
    ordemCelular: 4,
  },
  {
    rota: "catalogo",
    rotulo: "Catálogo e preços",
    curto: "Catálogo",
    icone: ClipboardList,
    papeis: ["dono", "balcao", "tecnico", "financeiro"],
    ordemCelular: 5,
  },
  {
    rota: "configuracoes",
    rotulo: "Configurações",
    curto: "Config.",
    icone: Cog,
    papeis: ["dono"],
    ordemCelular: 6,
  },
];

export function itensDoPapel(papel: Papel): ItemNav[] {
  return ITENS_NAV.filter((i) => i.papeis.includes(papel));
}

/** Itens na ordem da barra inferior do celular. */
export function itensCelular(papel: Papel): ItemNav[] {
  return itensDoPapel(papel).sort((a, b) => a.ordemCelular - b.ordemCelular);
}

/** O item está ativo para o caminho atual? (/wl/os/123 ativa "os") */
export function itemAtivo(caminho: string, slug: string, rota: string): boolean {
  const base = `/${slug}/${rota}`;
  return caminho === base || caminho.startsWith(base + "/");
}
