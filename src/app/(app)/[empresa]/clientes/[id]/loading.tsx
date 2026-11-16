import { Skeleton } from "@/components/ui/skeleton";

export default function Carregando() {
  return (
    <div aria-busy aria-label="Carregando cliente" className="grid gap-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
