const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });
const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

export function formatarMoeda(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return brl.format(Number(valor));
}

/** "2026-11-15" ou ISO -> "15/11/2026". Datas sem hora são tratadas como data local. */
export function formatarData(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-");
    return `${d}/${m}/${a}`;
  }
  return data.format(new Date(valor));
}

export function formatarDataHora(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  return dataHora.format(new Date(valor));
}

/** "2026-000123" -> "OS 2026-000123". */
export function formatarNumeroOs(numero: string): string {
  return `OS ${numero}`;
}

export function formatarDocumento(doc: string | null | undefined): string {
  if (!doc) return "—";
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
}

export function formatarTelefone(tel: string | null | undefined): string {
  if (!tel) return "—";
  const d = tel.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return tel;
}

/** Placa Mercosul (ABC1D23) ou antiga (ABC-1234). */
export function formatarPlaca(placa: string | null | undefined): string {
  if (!placa) return "—";
  const p = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^[A-Z]{3}\d{4}$/.test(p)) return `${p.slice(0, 3)}-${p.slice(3)}`;
  return p;
}
