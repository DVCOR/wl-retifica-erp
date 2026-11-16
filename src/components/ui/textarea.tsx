import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-input bg-superficie px-3 py-2.5 text-[15px] text-texto placeholder:text-texto-secundario/70 focus-visible:border-primaria focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primaria/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-perigo",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
