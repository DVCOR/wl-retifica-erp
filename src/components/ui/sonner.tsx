"use client";

import { Toaster as Sonner, toast, type ToasterProps } from "sonner";

/** Toasts (feedback imediato). Use `toast.success("...")`, `toast.error("...")`. */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      richColors
      closeButton
      toastOptions={{ classNames: { toast: "font-sans text-[15px]" } }}
      {...props}
    />
  );
}

export { Toaster, toast };
