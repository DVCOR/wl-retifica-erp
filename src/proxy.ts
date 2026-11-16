import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/middleware";

// Next 16: "proxy" é o novo nome do middleware.
export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
