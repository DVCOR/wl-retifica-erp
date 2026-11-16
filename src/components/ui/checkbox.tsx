"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Checkbox com área de toque de 44px (o quadrado visível tem 22px). */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative size-[22px] shrink-0 rounded-md border border-borda-forte bg-superficie transition-colors before:absolute before:-inset-[11px] before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria disabled:opacity-50 data-[state=checked]:border-primaria data-[state=checked]:bg-primaria data-[state=checked]:text-white",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="size-4" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
