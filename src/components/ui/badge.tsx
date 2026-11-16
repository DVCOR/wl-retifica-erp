import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutro: "bg-neutro-suave text-neutro",
        primaria: "bg-primaria-suave text-primaria-hover",
        sucesso: "bg-sucesso-suave text-sucesso",
        alerta: "bg-alerta-suave text-alerta",
        perigo: "bg-perigo-suave text-perigo",
        info: "bg-info-suave text-info",
        roxo: "bg-roxo-suave text-roxo",
        escuro: "bg-preto text-white",
        contorno: "border border-borda-forte text-texto-secundario",
      },
    },
    defaultVariants: { variant: "neutro" },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants, type BadgeProps };
