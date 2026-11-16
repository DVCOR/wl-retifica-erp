// Gera e ajusta deploy/local/.env (segredos + endereço da oficina).
// Só usa módulos do Node (roda no container node:22 pelos scripts).
//
//   node env.mjs gerar    --arquivo ../.env --ip 192.168.0.10 [--host wl.local] [--forcar]
//   node env.mjs endereco --arquivo ../.env --ip 192.168.0.20 [--host wl.local]
//   node env.mjs mostrar  --arquivo ../.env          (endereços, sem segredos)
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [comando, ...resto] = process.argv.slice(2);
const opcoes = {};
for (let i = 0; i < resto.length; i++) {
  const chave = resto[i];
  if (!chave.startsWith("--")) continue;
  const proximo = resto[i + 1];
  if (proximo === undefined || proximo.startsWith("--")) {
    opcoes[chave.slice(2)] = true;
  } else {
    opcoes[chave.slice(2)] = proximo;
    i++;
  }
}

const arquivo = opcoes.arquivo || ".env";

function falhar(msg) {
  console.error(`ERRO: ${msg}`);
  process.exit(1);
}

const hex = (bytes) => randomBytes(bytes).toString("hex");
const b64url = (buf) => Buffer.from(buf).toString("base64url");

function jwt(payload, segredo) {
  const cabecalho = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const corpo = b64url(JSON.stringify(payload));
  const assinatura = createHmac("sha256", segredo).update(`${cabecalho}.${corpo}`).digest("base64url");
  return `${cabecalho}.${corpo}.${assinatura}`;
}

const ipValido = (ip) =>
  typeof ip === "string" &&
  /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(ip) &&
  ip.split(".").every((p) => Number(p) <= 255);

const hostValido = (h) =>
  typeof h === "string" && (ipValido(h) || /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(h));

function enderecos(host, ip) {
  return [...new Set([host, ip, "localhost"].filter(Boolean))].join(", ");
}

function lerEnv(caminho) {
  const linhas = readFileSync(caminho, "utf8").split(/\r?\n/);
  const valores = {};
  for (const linha of linhas) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(linha);
    if (m) valores[m[1]] = m[2];
  }
  return { linhas, valores };
}

function gravarValores(caminho, novos) {
  const { linhas } = lerEnv(caminho);
  const faltando = new Set(Object.keys(novos));
  const saida = linhas.map((linha) => {
    const m = /^([A-Z0-9_]+)=/.exec(linha);
    if (m && m[1] in novos) {
      faltando.delete(m[1]);
      return `${m[1]}=${novos[m[1]]}`;
    }
    return linha;
  });
  for (const chave of faltando) saida.push(`${chave}=${novos[chave]}`);
  writeFileSync(caminho, saida.join("\n"));
}

function validarEndereco() {
  const ip = opcoes.ip;
  const host = opcoes.host && opcoes.host !== true ? String(opcoes.host).toLowerCase() : "wl.local";
  if (!ipValido(ip)) falhar(`IP inválido: ${ip ?? "(vazio)"}. Ex.: --ip 192.168.0.10`);
  if (!hostValido(host)) falhar(`Nome inválido: ${host}`);
  return { ip, host };
}

if (comando === "gerar") {
  if (existsSync(arquivo) && !opcoes.forcar) {
    console.log(`${arquivo} já existe: mantendo os segredos atuais (use --forcar para recriar).`);
    process.exit(0);
  }
  const { ip, host } = validarEndereco();
  const segredoJwt = hex(32);
  const agora = Math.floor(Date.now() / 1000);
  const validade = agora + 20 * 365 * 24 * 60 * 60; // 20 anos
  const anon = jwt({ role: "anon", iss: "supabase", iat: agora, exp: validade }, segredoJwt);
  const servico = jwt({ role: "service_role", iss: "supabase", iat: agora, exp: validade }, segredoJwt);

  const conteudo = `# =============================================================================
# WL Retífica ERP — configuração da instalação local. GERADO por env.mjs em
# ${new Date().toISOString()}. NÃO COMPARTILHE: contém senhas.
# Faça uma cópia deste arquivo junto com os backups (o backup diário já copia).
# =============================================================================

# Endereço da oficina. Os aparelhos abrem https://WL_HOST.
# WL_IP = IP fixo deste computador na rede. Para trocar, use o script
# trocar-endereco (ele atualiza as três linhas).
WL_HOST=${host}
WL_IP=${ip}
WL_ENDERECOS=${enderecos(host, ip)}

# Banco (senha do usuário postgres e dos usuários internos do Supabase)
POSTGRES_PASSWORD=${hex(24)}

# Chaves do Supabase (JWT HS256 assinados com JWT_SECRET)
JWT_SECRET=${segredoJwt}
JWT_EXPIRY=3600
ANON_KEY=${anon}
SERVICE_ROLE_KEY=${servico}

# Segredos internos
SECRET_KEY_BASE=${randomBytes(48).toString("base64url")}
REALTIME_DB_ENC_KEY=${hex(8)}
PG_META_CRYPTO_KEY=${hex(24)}

# Backup automático: a partir desta hora (0-23), 1 por dia; guarda N dias.
BACKUP_HORA=12
BACKUP_DIAS=30
`;
  writeFileSync(arquivo, conteudo, { mode: 0o600 });
  console.log(`Criado ${arquivo} (endereço https://${host}, IP ${ip}).`);
} else if (comando === "endereco") {
  if (!existsSync(arquivo)) falhar(`${arquivo} não existe. Rode o instalar primeiro.`);
  const { ip, host } = validarEndereco();
  gravarValores(arquivo, { WL_HOST: host, WL_IP: ip, WL_ENDERECOS: enderecos(host, ip) });
  console.log(`Endereço atualizado: https://${host} (IP ${ip}).`);
} else if (comando === "mostrar") {
  if (!existsSync(arquivo)) falhar(`${arquivo} não existe.`);
  const { valores } = lerEnv(arquivo);
  console.log(`WL_HOST=${valores.WL_HOST ?? ""}`);
  console.log(`WL_IP=${valores.WL_IP ?? ""}`);
} else {
  console.log("Uso: node env.mjs gerar|endereco|mostrar --arquivo <.env> --ip <IP> [--host <nome>] [--forcar]");
  process.exit(comando ? 1 : 0);
}
