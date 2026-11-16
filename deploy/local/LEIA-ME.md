# WL Retífica ERP — instalação na oficina (sem internet)

O sistema roda **num computador da oficina** (o "servidor"). Tablets, celulares e outros PCs usam o sistema pelo navegador, pela **rede Wi-Fi/cabo da oficina**. Não precisa de internet no dia a dia.

> Precisa de internet **só na instalação e nas atualizações** — ou nem isso, se alguém trouxer o "pacote" num pendrive (veja a seção 10).

---

## 1. O que você precisa

**Computador servidor** (fica ligado durante o expediente):

| | Mínimo | Recomendado |
|---|---|---|
| Tipo | PC comum ou mini PC | Mini PC (ex.: Intel N100/i3/i5, Ryzen) |
| Memória | 8 GB | 16 GB |
| Disco | SSD 256 GB | SSD 512 GB |
| Sistema | Windows 10/11 **Pro** ou Ubuntu 22.04/24.04 | — |
| Rede | Cabo de rede no roteador (melhor que Wi-Fi) | — |

- Um **nobreak** pequeno evita que a queda de energia corrompa dados.
- O computador precisa de **IP fixo** na rede (seção 3).
- No Windows, instale o **Docker Desktop** (precisa da "virtualização" ligada na BIOS e do WSL 2; o instalador do Docker ajuda). No Ubuntu, instale o **Docker Engine** e o plugin **docker compose**.
- Um **pendrive ou HD externo** para a cópia semanal dos backups.

**Aparelhos dos funcionários**: qualquer tablet/celular/PC com navegador atualizado (Chrome, Safari, Edge) conectado à mesma rede.

---

## 2. Pasta do sistema

Copie a pasta do sistema (o repositório inteiro) para o servidor, por exemplo:

- Windows: `C:\WL-Retifica\`
- Ubuntu: `/opt/wl-retifica/`

Tudo da instalação fica em `deploy/local/` dentro dessa pasta. Os scripts ficam em:

- Windows: `deploy\local\scripts\windows\` (clique duas vezes nos arquivos **.bat**)
- Ubuntu: `deploy/local/scripts/linux/` (rode no terminal, ex.: `sudo ./instalar.sh`)

---

## 3. IP fixo do servidor

Os aparelhos encontram o servidor pelo número de IP (ex.: `192.168.0.10`). Esse número **não pode mudar**.

Jeito mais fácil: no **roteador**, procure "DHCP estático", "Reserva de IP" ou "IP fixo por MAC" e reserve um IP para o servidor. (Se não souber, peça para quem instalou a internet/rede.)

Para ver o IP atual:
- Windows: abra o **Prompt de Comando** e digite `ipconfig` (linha "Endereço IPv4").
- Ubuntu: `hostname -I`.

---

## 4. Instalar (uma vez)

1. Ligue o servidor **com internet** (ou com o pendrive do pacote — seção 10).
2. Windows: abra o **Docker Desktop** e espere ficar "Engine running" (verde).
   Em *Settings > General*, marque **"Start Docker Desktop when you sign in"**.
3. Rode o instalador:
   - Windows: botão direito em `instalar.bat` → **Executar como administrador** (assim ele já libera o Firewall e instala o certificado neste PC).
   - Ubuntu: `sudo deploy/local/scripts/linux/instalar.sh`
4. Ele pergunta:
   - **IP fixo deste computador** — confira que é o IP reservado na seção 3 e tecle Enter.
   - **Nome do endereço** — deixe `wl.local` (Enter).
5. Espere (na primeira vez demora de 5 a 20 minutos: baixa e monta tudo).
6. Ele pergunta se quer **criar o usuário DONO**: responda `S` e informe:
   - **login** do dono (ex.: `wagner`), **nome** e **senha** (mínimo 8 caracteres).
   - O script cria a empresa **WL Retífica de Motores** com o endereço R. Dr. Mathias José de Barros Ponikwar, 254 — Jardim Campo Belo, o checklist padrão e o catálogo de exemplo.
7. No fim aparecem os endereços do sistema, por exemplo:
   ```
   https://wl.local
   https://192.168.0.10
   Certificado para os aparelhos: http://192.168.0.10/certificado
   ```

Firewall (se os tablets não abrirem): no Windows, *Painel de Controle > Firewall do Windows Defender > Configurações avançadas > Regras de Entrada > Nova regra > Porta > TCP 80, 443 > Permitir > marque "Particular"*. A rede da oficina deve estar como **Rede privada** (*Configurações > Rede > propriedades da conexão*).

---

## 5. Instalar o certificado nos aparelhos (uma vez por aparelho)

O sistema usa **HTTPS** (cadeado) — a câmera para ler QR Code e o "instalar como app" só funcionam assim. Como não há internet, o certificado é da própria oficina, e **cada aparelho precisa confiar nele uma vez**. Sem isso, o navegador mostra "Sua conexão não é particular".

Endereço do certificado (troque pelo IP do servidor): **`http://192.168.0.10/certificado`** (é `http`, sem o "s").

### Android
1. No Chrome do tablet, abra `http://IP-DO-SERVIDOR/certificado`. Ele baixa `wl-retifica-certificado.crt`.
2. Abra **Configurações > Segurança (ou Segurança e privacidade) > Mais configurações de segurança > Criptografia e credenciais > Instalar um certificado > Certificado de CA**.
   (Em alguns aparelhos: *Configurações > Biometria e segurança > Outras configurações de segurança > Instalar do armazenamento*.)
3. Toque em **"Instalar mesmo assim"**, confirme com o PIN/senha da tela e escolha o arquivo baixado (pasta *Downloads*).
4. Feche e abra o Chrome de novo e acesse `https://IP-DO-SERVIDOR`.

### iPhone / iPad
1. No **Safari** (tem que ser o Safari), abra `http://IP-DO-SERVIDOR/certificado` → **Permitir** baixar o perfil.
2. **Ajustes > Perfil Transferido** (aparece no topo) **> Instalar**, digite o código do aparelho e **Instalar** de novo.
3. **Ajustes > Geral > Sobre > Ajustes de Confiança de Certificados** → ligue a chave do certificado **"Caddy Local Authority"** → **Continuar**.

### Windows (outros PCs da oficina)
1. Abra `http://IP-DO-SERVIDOR/certificado` no navegador e salve o arquivo.
2. Clique duas vezes no arquivo → **Instalar Certificado** → **Máquina Local** → **Colocar todos os certificados no repositório a seguir** → **Procurar** → **Autoridades de Certificação Raiz Confiáveis** → OK → Avançar → Concluir.
   (Ou, num Prompt de Comando como administrador: `certutil -addstore -f ROOT wl-retifica-certificado.crt`.)
3. Feche e abra o navegador.

No **próprio servidor** Windows o `instalar.bat` como administrador já faz isso (arquivo em `deploy\local\certificado\`).

> O certificado vale por 10 anos. Se o servidor for reinstalado do zero (sem restaurar os volumes do Docker), um certificado novo é criado e os aparelhos precisam instalar de novo.

---

## 6. Acessar dos tablets e celulares

- Abra **`https://wl.local`** — ou, se esse nome não abrir no aparelho, **`https://IP-DO-SERVIDOR`** (ex.: `https://192.168.0.10`).
- Entre com o **login** e a **senha** que o dono criou.
- Para ficar como app: no Chrome, menu **⋮ > Instalar app / Adicionar à tela inicial**; no Safari, **Compartilhar > Adicionar à Tela de Início**.

**Sobre o nome `wl.local`:** ele só funciona se a rede souber que `wl.local` é o servidor. Opções:
1. **Roteador** com DNS local (alguns têm "DNS estático"/"Host names"): aponte `wl.local` para o IP do servidor.
2. Nos PCs Windows: edite (como administrador) `C:\Windows\System32\drivers\etc\hosts` e acrescente a linha `192.168.0.10  wl.local`.
3. Se nada disso der (Android costuma não resolver `.local`): **use o IP em todos os aparelhos** (`https://192.168.0.10`). O sistema funciona normalmente pelo IP: login, fotos e tempo real seguem o endereço que o aparelho abriu. Só a etiqueta QR usa o endereço "oficial"; se quiser que ela aponte para o IP, rode `trocar-endereco` informando o IP também como nome (ex.: Linux: `trocar-endereco.sh --ip 192.168.0.10 --host 192.168.0.10`).

---

## 7. Usuários

- O **primeiro dono** é criado na instalação (ou depois, rodando `criar-dono`).
- Os demais (balcão, técnico, financeiro) o **dono cria dentro do sistema**: *Configurações > Usuários*. Ninguém consegue se cadastrar sozinho.
- Esqueceu a senha? O dono troca em *Configurações > Usuários*. Se o próprio dono esquecer, rode `criar-dono` com um **login novo** — a empresa já existe, então chame o suporte para ligar esse novo usuário como dono.

---

## 8. Backup (cópia de segurança)

**Automático:** todo dia, a partir do meio-dia (configurável em `BACKUP_HORA` no `.env`), o sistema salva uma cópia em `deploy/local/backups/AAAA-MM-DD_HHMM/` com:
- `banco.dump` — todos os dados (clientes, OS, orçamentos, usuários…);
- `arquivos.tar.gz` — fotos, assinaturas e PDFs;
- `env.txt` — as senhas da instalação (**guarde com cuidado**).

Os backups com mais de **30 dias** são apagados sozinhos (`BACKUP_DIAS`). Se o PC estiver desligado ao meio-dia, o backup sai assim que ele for ligado (depois desse horário).

**Backup agora:** rode `backup-agora` (por exemplo, antes de mexer em algo).

**Cópia semanal fora do PC (muito importante):** toda **sexta-feira**, copie a pasta mais recente de `deploy/local/backups/` para um **pendrive ou HD externo** e guarde **fora da oficina** (ou pelo menos longe do servidor). Se o disco do servidor queimar ou houver roubo/incêndio, é essa cópia que salva a empresa. Tenha 2 pendrives e alterne.

---

## 9. Restaurar um backup

Use quando dados foram apagados por engano, o banco corrompeu ou o servidor foi trocado.

1. (Servidor novo) Instale normalmente (seção 4) **sem criar o dono**. Para manter as mesmas senhas, antes de instalar copie o `env.txt` do backup para `deploy/local/.env`.
2. Copie a pasta do backup (ex.: `2026-11-14_1230`) para `deploy/local/backups/`.
3. Rode `restaurar` (Windows: `restaurar.bat`; Ubuntu: `sudo ./restaurar.sh`), escolha a pasta e digite `RESTAURAR`.
4. O script: faz um backup de segurança do estado atual → para o sistema → restaura banco e arquivos → liga de novo. O banco anterior fica guardado (`postgres_antes_...`) até alguém apagar.
5. Entre no sistema e confira as últimas OS.

> Faça um **teste de restauração** logo depois da instalação (num PC de teste, se possível). Backup que nunca foi testado não é backup.

---

## 10. Sem internet nenhuma na oficina (pacote em pendrive)

Num computador **com internet** e com Docker:
1. Copie a pasta do sistema e rode `exportar-imagens` (Windows `.bat` / Linux `.sh`). Ele gera `deploy/local/pacote/wl-imagens.tar` (alguns GB).
2. Leve a pasta inteira (com `pacote/`) para o servidor da oficina.
3. Rode `instalar` (primeira vez) ou `atualizar` — eles usam o pacote em vez de baixar.

---

## 11. Dia a dia

| Quero… | Windows (`scripts\windows\`) | Ubuntu (`scripts/linux/`) |
|---|---|---|
| Ligar o sistema | `subir.bat` | `sudo ./subir.sh` |
| Desligar o sistema | `parar.bat` | `sudo ./parar.sh` |
| Backup agora | `backup-agora.bat` | `sudo ./backup-agora.sh` |
| Restaurar backup | `restaurar.bat` | `sudo ./restaurar.sh` |
| Atualizar o sistema | `atualizar.bat` | `sudo ./atualizar.sh` |
| Criar o dono | `criar-dono.bat` | `sudo ./criar-dono.sh` |
| Mudou o IP do servidor | `trocar-endereco.bat` | `sudo ./trocar-endereco.sh --ip NOVO_IP` |

**Ligar sozinho com o computador:**
- Windows: Docker Desktop com "Start Docker Desktop when you sign in" + os serviços já reiniciam sozinhos. Como o Docker Desktop só abre depois que alguém **entra no Windows**, configure o **login automático** do usuário do servidor (tecla Windows+R → `netplwiz` → desmarque "Os usuários devem digitar um nome de usuário e senha…") ou deixe o PC sempre logado com a tela bloqueada. Desative a suspensão/hibernação (*Configurações > Sistema > Energia: "Nunca"*).
- Ubuntu: `sudo systemctl enable docker` (já é o padrão) — tudo sobe sozinho no boot.

---

## 12. Problemas comuns

**O PC desligou / acabou a luz.** Ligue de novo, entre no Windows e espere uns 3 minutos: tudo volta sozinho. Se não voltar, rode `subir`. Os dados ficam salvos; no máximo, o que estava sendo digitado na hora se perde.

**"Sua conexão não é particular".** O aparelho ainda não confia no certificado (seção 5) ou está usando um endereço diferente (`wl.local` × IP). No iPhone, confira o passo 3 (Ajustes de Confiança).

**O tablet não abre nada.** Confira se está na mesma rede Wi-Fi da oficina, se o servidor está ligado, se o IP não mudou (`ipconfig`) e o Firewall (seção 4).

**Login não funciona por IP, mas funciona por `wl.local` (ou o contrário).** Use sempre o mesmo endereço em todos os aparelhos; veja a seção 6.

**Ver o que está acontecendo** (para o suporte): na pasta `deploy/local`, `docker compose ps` e `docker compose logs --tail 200 app migracoes auth`.

**Administração avançada (suporte):** `docker compose --profile admin up -d` liga o Supabase Studio em `http://127.0.0.1:54323`, acessível **só no próprio servidor**. Desligue depois (`docker compose --profile admin stop studio meta`).

---

## 13. Atualizar o sistema

1. Rode `atualizar`. Ele faz um backup, baixa o código novo (`git pull`, se houver internet) ou usa o pacote do pendrive, monta o app e aplica as mudanças do banco (migrations) automaticamente.
2. Durante 2–5 minutos o sistema fica fora do ar: faça fora do horário de movimento.
3. Se algo der errado, restaure o backup feito no passo 1 (seção 9).

---

## Para o técnico: como funciona

- `docker-compose.yml`: Supabase self-hosted enxuto (Postgres, GoTrue, PostgREST, Realtime, Storage em disco local, Kong) + app Next.js + Caddy + serviço `migracoes` + `backup`. Studio/pg-meta no perfil `admin`; imgproxy no perfil `imagens`.
- Uma origem só: `https://WL_HOST` no Caddy. `/auth/v1`, `/rest/v1`, `/storage/v1`, `/realtime/v1`, `/graphql/v1` → Kong; o resto → app. O servidor do app (SSR/Server Actions) fala com `http://kong:8000` (`SUPABASE_URL_INTERNA`).
- A imagem do app é genérica: `WL_HOST` e `ANON_KEY` entram quando o container sobe (`app-entrypoint.sh` troca marcadores do build). Mudar IP/nome não exige rebuild.
- GoTrue: cadastro público desligado, e-mail com autoconfirmação, sem SMTP. Login `fulano` = `fulano@wl.local`.
- Migrations: `supabase/migrations/*.sql` aplicadas em ordem a cada `up`, controle em `supabase_migrations.schema_migrations`. `supabase/seed.sql` **nunca** roda aqui.
- Segredos: `deploy/local/.env` (gerado por `ferramentas/env.mjs`, fora do git). Portas abertas na rede: só 80 e 443 (Caddy).
