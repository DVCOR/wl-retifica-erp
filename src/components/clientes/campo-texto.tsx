"use client";

import * as React from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type Props<T extends FieldValues> = Omit<
  React.ComponentProps<"input">,
  "name" | "value" | "onChange" | "defaultValue"
> & {
  control: Control<T>;
  name: FieldPath<T>;
  rotulo: string;
  /** Aplica máscara ao digitar (ex.: telefone, CEP, placa). */
  mascara?: (valor: string) => string;
  ajuda?: string;
};

/** Campo de texto ligado ao react-hook-form, com rótulo, mensagem de erro e máscara opcional. */
export function CampoTexto<T extends FieldValues>({
  control,
  name,
  rotulo,
  mascara,
  ajuda,
  className,
  ...resto
}: Props<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{rotulo}</FormLabel>
          <FormControl>
            <Input
              {...resto}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={(field.value as string | undefined) ?? ""}
              onChange={(e) => field.onChange(mascara ? mascara(e.target.value) : e.target.value)}
            />
          </FormControl>
          {ajuda && <FormDescription>{ajuda}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
