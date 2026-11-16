/** "YYYY-MM-DD" no fuso local do aparelho (não usa UTC, para não virar o dia). */
export function dataLocalIso(data: Date): string {
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${a}-${m}-${d}`;
}

export function somarDias(base: Date, dias: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias);
  return dataLocalIso(d);
}
