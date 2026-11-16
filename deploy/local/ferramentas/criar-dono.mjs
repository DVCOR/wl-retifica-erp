// Cria o primeiro usuário DONO e a empresa WL Retífica de Motores.
// Roda no container `ferramentas` (rede interna do Docker, fala com o Kong):
//   docker compose run --rm ferramentas node criar-dono.mjs
// Pergunta login, nome e senha (ou use WL_DONO_LOGIN, WL_DONO_NOME,
// WL_DONO_SENHA). Pode rodar de novo: o que já existe é reaproveitado.
// No modo local o app entra só com "login": por baixo ele vira login@wl.local
// (mesma regra do app; os demais usuários o dono cria em Configurações > Usuários).
//
// 1. cria o usuário pela API admin do GoTrue (service role), já confirmado;
// 2. entra com e-mail/senha e chama criar_empresa(nome, slug, nome_do_dono)
//    como esse usuário (ele vira dono; checklist e catálogo padrão são copiados);
// 3. grava o endereço da empresa.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const URL_BASE = process.env.SUPABASE_URL_INTERNA || "http://kong:8000";
const ANON = process.env.ANON_KEY;
const SERVICO = process.env.SERVICE_ROLE_KEY;

const EMPRESA_NOME = process.env.WL_EMPRESA_NOME || "WL Retífica de Motores";
const EMPRESA_SLUG = process.env.WL_EMPRESA_SLUG || "wl-retifica";
const ENDERECO = {
  logradouro: "R. Dr. Mathias José de Barros Ponikwar",
  numero: "254",
  bairro: "Jardim Campo Belo",
  cidade: process.env.WL_EMPRESA_CIDADE || "",
  uf: process.env.WL_EMPRESA_UF || "SP",
  cep: process.env.WL_EMPRESA_CEP || "",
};

function falhar(msg) {
  console.error(`\nERRO: ${msg}`);
  process.exit(1);
}

if (!ANON || !SERVICO) falhar("ANON_KEY/SERVICE_ROLE_KEY não definidos (deploy/local/.env).");

async function chamar(caminho, { metodo = "GET", token, corpo, cabecalhos = {} } = {}) {
  const resposta = await fetch(`${URL_BASE}${caminho}`, {
    method: metodo,
    headers: {
      apikey: token === SERVICO ? SERVICO : ANON,
      Authorization: `Bearer ${token ?? ANON}`,
      "Content-Type": "application/json",
      ...cabecalhos,
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = texto;
  }
  return { ok: resposta.ok, status: resposta.status, dados };
}

async function aguardarServicos() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${URL_BASE}/auth/v1/health`, { headers: { apikey: ANON } });
      if (r.ok) return;
    } catch {
      // ainda subindo
    }
    await new Promise((ok) => setTimeout(ok, 2000));
  }
  falhar("o Supabase não respondeu em 2 minutos. Rode o script subir e tente de novo.");
}

async function perguntar() {
  let login = process.env.WL_DONO_LOGIN;
  let nome = process.env.WL_DONO_NOME;
  let senha = process.env.WL_DONO_SENHA;
  if (login && nome && senha) return { login, nome, senha };

  const rl = createInterface({ input: stdin, output: stdout });
  console.log("\n=== Criar o usuário DONO da WL Retífica ===\n");
  login ||= (await rl.question("Login do dono (sem espaços) [dono]: ")).trim() || "dono";
  nome ||= (await rl.question("Nome do dono (aparece no sistema): ")).trim();
  while (!senha) {
    const s1 = await rl.question("Senha (mínimo 8 caracteres; vai aparecer na tela): ");
    if (s1.length < 8) {
      console.log("  Senha curta demais.");
      continue;
    }
    const s2 = await rl.question("Repita a senha: ");
    if (s1 !== s2) {
      console.log("  As senhas não conferem.");
      continue;
    }
    senha = s1;
  }
  rl.close();
  return { login, nome: nome || "Dono", senha };
}

async function main() {
  await aguardarServicos();
  const { login, nome, senha } = await perguntar();
  const loginNorm = login.trim().toLowerCase();
  if (!/^[a-z0-9._-]+(@[a-z0-9.-]+)?$/.test(loginNorm)) {
    falhar(`login inválido: "${login}". Use letras, números, ponto, hífen ou _.`);
  }
  const emailNorm = loginNorm.includes("@") ? loginNorm : `${loginNorm}@wl.local`;

  // 1. usuário
  const criado = await chamar("/auth/v1/admin/users", {
    metodo: "POST",
    token: SERVICO,
    corpo: { email: emailNorm, password: senha, email_confirm: true, user_metadata: { nome } },
  });
  if (criado.ok) {
    console.log(`✓ usuário ${emailNorm} criado`);
  } else if (criado.status === 422 || /already/i.test(JSON.stringify(criado.dados))) {
    console.log(`• usuário ${emailNorm} já existe: vou entrar com a senha informada`);
  } else {
    falhar(`não consegui criar o usuário (${criado.status}): ${JSON.stringify(criado.dados)}`);
  }

  // 2. login como o dono
  const entrada = await chamar("/auth/v1/token?grant_type=password", {
    metodo: "POST",
    corpo: { email: emailNorm, password: senha },
  });
  if (!entrada.ok) falhar(`login falhou (${entrada.status}). Senha errada para um usuário que já existia?`);
  const tokenDono = entrada.dados.access_token;

  // 3. empresa
  const existente = await chamar(
    `/rest/v1/empresas?slug=eq.${encodeURIComponent(EMPRESA_SLUG)}&select=id,nome_fantasia`,
    { token: SERVICO },
  );
  let empresaId;
  if (existente.ok && Array.isArray(existente.dados) && existente.dados.length > 0) {
    empresaId = existente.dados[0].id;
    console.log(`• empresa "${existente.dados[0].nome_fantasia}" (${EMPRESA_SLUG}) já existe`);
  } else {
    const empresa = await chamar("/rest/v1/rpc/criar_empresa", {
      metodo: "POST",
      token: tokenDono,
      corpo: { p_nome_fantasia: EMPRESA_NOME, p_slug: EMPRESA_SLUG, p_nome_usuario: nome },
    });
    if (!empresa.ok) falhar(`criar_empresa falhou (${empresa.status}): ${JSON.stringify(empresa.dados)}`);
    empresaId = empresa.dados.id;
    console.log(`✓ empresa "${EMPRESA_NOME}" criada (${EMPRESA_SLUG}); ${nome} é o dono`);
  }

  // 4. endereço (como o dono: a RLS deixa o dono alterar a própria empresa)
  const end = await chamar(`/rest/v1/empresas?id=eq.${empresaId}`, {
    metodo: "PATCH",
    token: tokenDono,
    corpo: { endereco: ENDERECO },
    cabecalhos: { Prefer: "return=minimal" },
  });
  if (end.ok) {
    console.log("✓ endereço gravado");
  } else {
    console.log(`! não consegui gravar o endereço (${end.status}); ajuste depois pelo sistema`);
  }

  const host = process.env.WL_HOST || "wl.local";
  console.log(`\nPronto! Abra https://${host}/login e entre com o login "${loginNorm.split("@")[0]}".`);
}

main().catch((erro) => falhar(erro instanceof Error ? erro.message : String(erro)));
