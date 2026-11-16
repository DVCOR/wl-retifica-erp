import Image from "next/image";

/** Layout das telas sem login (login, convite): fundo preto com a marca. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-preto px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-3">
        <Image
          src="/brand/wl-logo.png"
          alt="WL Retífica de Motores"
          width={900}
          height={457}
          priority
          className="h-auto w-64 sm:w-72"
        />
      </div>
      <div className="w-full max-w-md rounded-2xl border-t-[3px] border-primaria bg-superficie p-6 shadow-2xl sm:p-8">
        {children}
      </div>
    </div>
  );
}
