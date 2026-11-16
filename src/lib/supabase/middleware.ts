import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/env";
import { COOKIE_EMPRESA, ehRotaPublica, slugDaRota } from "@/lib/auth/rotas";

/**
 * Renova a sessão do Supabase a cada requisição (usado pelo src/proxy.ts),
 * manda para /login quem não está logado numa rota protegida e lembra a
 * última empresa acessada no cookie `wl_empresa`.
 */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });
  const caminho = request.nextUrl.pathname;

  if (!supabaseConfigurado) {
    return response;
  }

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar) {
        for (const { name, value } of cookiesParaGravar) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesParaGravar)
          response.cookies.set(name, value, options);
      },
    },
  });

  // Não coloque código entre createServerClient e getClaims().
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);

  if (!logado && !ehRotaPublica(caminho)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search =
      caminho === "/" ? "" : `?proximo=${encodeURIComponent(caminho + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }

  const slug = slugDaRota(caminho);
  if (logado && slug && request.cookies.get(COOKIE_EMPRESA)?.value !== slug) {
    response.cookies.set(COOKIE_EMPRESA, slug, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
    });
  }

  return response;
}
