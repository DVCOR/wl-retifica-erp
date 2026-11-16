"use client";

import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Slot } from "radix-ui";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Helpers de formulário (react-hook-form + zod), no padrão shadcn:
 *
 * const form = useForm<Dados>({ resolver: zodResolver(schema) });
 * <Form {...form}>
 *   <form onSubmit={form.handleSubmit(onSubmit)}>
 *     <FormField control={form.control} name="nome" render={({ field }) => (
 *       <FormItem>
 *         <FormLabel>Nome</FormLabel>
 *         <FormControl><Input {...field} /></FormControl>
 *         <FormMessage />
 *       </FormItem>
 *     )} />
 */
const Form = FormProvider;

type FormFieldContextValue = { name: string };
const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);
const FormItemContext = React.createContext<{ id: string } | null>(null);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext?.name });
  if (!fieldContext || !itemContext) {
    throw new Error("useFormField deve ser usado dentro de <FormField> e <FormItem>");
  }
  const fieldState = getFieldState(fieldContext.name, formState);
  const id = itemContext.id;
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-campo`,
    formDescriptionId: `${id}-descricao`,
    formMessageId: `${id}-mensagem`,
    ...fieldState,
  };
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn("grid gap-1.5", className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      data-error={!!error}
      className={cn("data-[error=true]:text-perigo", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

function FormControl(props: React.ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return (
    <Slot.Root
      id={formItemId}
      aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
      aria-invalid={!!error}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();
  return (
    <p
      id={formDescriptionId}
      className={cn("text-sm text-texto-secundario", className)}
      {...props}
    />
  );
}

function FormMessage({ className, children, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message ?? "") : children;
  if (!body) return null;
  return (
    <p
      id={formMessageId}
      role="alert"
      className={cn("text-sm font-medium text-perigo", className)}
      {...props}
    >
      {body}
    </p>
  );
}

/** Mensagem de erro geral do formulário (ex.: retorno da Server Action). */
function FormErro({ mensagem }: { mensagem?: string | null }) {
  if (!mensagem) return null;
  return (
    <p
      role="alert"
      className="rounded-lg bg-perigo-suave px-3 py-2.5 text-sm font-medium text-perigo"
    >
      {mensagem}
    </p>
  );
}

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormErro,
  useFormField,
};
