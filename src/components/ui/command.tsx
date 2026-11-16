"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-xl bg-superficie text-texto",
        className,
      )}
      {...props}
    />
  );
}

function CommandDialog({
  titulo = "Busca global",
  descricao = "Busque cliente, placa, motor ou nº da OS",
  children,
  ...props
}: React.ComponentProps<typeof Dialog> & { titulo?: string; descricao?: string }) {
  return (
    <Dialog {...props}>
      <DialogContent
        className="top-[12%] translate-y-0 overflow-hidden p-0 sm:max-w-xl"
        mostrarFechar={false}
      >
        <DialogTitle className="sr-only">{titulo}</DialogTitle>
        <DialogDescription className="sr-only">{descricao}</DialogDescription>
        <Command shouldFilter={false}>{children}</Command>
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex h-14 items-center gap-3 border-b border-borda px-4">
      <Search className="size-5 shrink-0 text-texto-secundario" aria-hidden />
      <CommandPrimitive.Input
        className={cn(
          "h-full w-full bg-transparent text-base outline-none placeholder:text-texto-secundario/70",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      className={cn("max-h-[60dvh] overflow-y-auto p-2", className)}
      {...props}
    />
  );
}

function CommandEmpty(props: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      className="px-4 py-8 text-center text-[15px] text-texto-secundario"
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn(
        "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-texto-secundario [&_[cmdk-group-heading]]:uppercase",
        className,
      )}
      {...props}
    />
  );
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "flex min-h-12 cursor-default items-center gap-3 rounded-lg px-3 text-[15px] outline-none select-none data-[selected=true]:bg-fundo [&_svg]:size-[18px] [&_svg]:text-texto-secundario",
        className,
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
};
