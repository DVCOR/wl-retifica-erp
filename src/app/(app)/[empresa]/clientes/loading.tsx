import { Skeleton } from "@/components/ui/skeleton";

export default function Carregando() {
  return (
    <div aria-busy aria-label="Carregando clientes" className="grid gap-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-11 w-full" />
      <div className="grid gap-2.5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
