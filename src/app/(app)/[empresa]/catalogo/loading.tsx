import { Skeleton } from "@/components/ui/skeleton";

export default function Carregando() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Carregando catálogo">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
