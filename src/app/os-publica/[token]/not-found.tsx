import Image from "next/image";

export default function LinkInvalido() {
  return (
    <div className="min-h-dvh bg-fundo">
      <header className="flex h-16 items-center border-b-[3px] border-primaria bg-preto px-4">
        <Image src="/brand/wl-marca.png" alt="WL Retífica" width={600} height={221} className="h-10 w-auto rounded-md" />
      </header>
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-texto">Link não encontrado</h1>
        <p className="mt-3 text-[15px] text-texto-secundario">
          Este link de acompanhamento não existe ou foi substituído por um novo. Peça à retífica
          que reenvie o link da sua OS.
        </p>
      </main>
    </div>
  );
}
