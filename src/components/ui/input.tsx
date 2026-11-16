import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-lg border border-input bg-superficie px-3 text-[15px] text-texto transition-colors placeholder:text-texto-secundario/70 focus-visible:border-primaria focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primaria/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-perigo",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
