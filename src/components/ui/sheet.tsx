"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Gaveta lateral/inferior (drawer) baseada no Dialog do Radix. */
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

const sheetVariants = cva("fixed z-50 flex flex-col gap-4 bg-superficie shadow-xl", {
  variants: {
    side: {
      right: "inset-y-0 right-0 h-full w-[88%] max-w-sm border-l border-borda",
      left: "inset-y-0 left-0 h-full w-[88%] max-w-sm border-r border-borda",
      bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t border-borda pb-safe",
      top: "inset-x-0 top-0 border-b border-borda",
    },
  },
  defaultVariants: { side: "right" },
});

function SheetContent({
  className,
  children,
  side,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & VariantProps<typeof sheetVariants>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-preto/60" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className="absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-lg text-texto-secundario hover:bg-fundo hover:text-texto"
          aria-label="Fechar"
        >
          <X className="size-5" aria-hidden />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-5 pr-14 pb-0", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />;
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn("text-sm text-texto-secundario", className)}
      {...props}
    />
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
