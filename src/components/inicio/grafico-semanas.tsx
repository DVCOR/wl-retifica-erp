import type { PontoSemana } from "@/lib/inicio/agregacoes";

/**
 * Barras agrupadas (abertas × entregues) por semana, em SVG puro. Valores
 * visíveis sobre as barras e tabela equivalente para leitores de tela.
 */
export function GraficoSemanas({ pontos }: { pontos: PontoSemana[] }) {
  const L = 560;
  const A = 220;
  const margem = { t: 22, b: 30 };
  const alturaUtil = A - margem.t - margem.b;
  const max = Math.max(1, ...pontos.flatMap((p) => [p.abertas, p.entregues]));
  const larguraGrupo = L / pontos.length;
  const larguraBarra = Math.min(22, larguraGrupo / 2 - 4);
  const y = (v: number) => margem.t + alturaUtil - (v / max) * alturaUtil;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${L} ${A}`}
        className="h-auto w-full"
        role="img"
        aria-label="Gráfico de barras: OS abertas e entregues por semana, últimas 8 semanas. Os valores estão na tabela a seguir."
      >
        <line
          x1={0}
          x2={L}
          y1={margem.t + alturaUtil}
          y2={margem.t + alturaUtil}
          className="stroke-borda-forte"
        />
        {pontos.map((p, i) => {
          const cx = i * larguraGrupo + larguraGrupo / 2;
          const barras = [
            { v: p.abertas, x: cx - larguraBarra - 1, classe: "fill-primaria" },
            { v: p.entregues, x: cx + 1, classe: "fill-neutro" },
          ];
          return (
            <g key={p.inicio}>
              {barras.map((b, j) => (
                <g key={j}>
                  <rect
                    x={b.x}
                    y={y(b.v)}
                    width={larguraBarra}
                    height={Math.max(0, margem.t + alturaUtil - y(b.v))}
                    rx={3}
                    className={b.classe}
                  />
                  <text
                    x={b.x + larguraBarra / 2}
                    y={y(b.v) - 5}
                    textAnchor="middle"
                    className="fill-texto text-[12px] font-semibold"
                  >
                    {b.v}
                  </text>
                </g>
              ))}
              <text
                x={cx}
                y={A - 9}
                textAnchor="middle"
                className="fill-texto-secundario text-[11px]"
              >
                {p.rotulo}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-sm text-texto-secundario">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-primaria" aria-hidden /> OS abertas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-neutro" aria-hidden /> OS entregues
        </span>
        <span>Semanas começam na segunda-feira.</span>
      </figcaption>
      <table className="sr-only">
        <caption>OS abertas e entregues por semana</caption>
        <thead>
          <tr>
            <th scope="col">Semana de</th>
            <th scope="col">Abertas</th>
            <th scope="col">Entregues</th>
          </tr>
        </thead>
        <tbody>
          {pontos.map((p) => (
            <tr key={p.inicio}>
              <th scope="row">{p.rotulo}</th>
              <td>{p.abertas}</td>
              <td>{p.entregues}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
