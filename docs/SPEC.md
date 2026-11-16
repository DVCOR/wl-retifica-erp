# ERP Retífica — Especificação do Produto

> Documento-base para desenvolvimento com Claude Code.
> Coloque este arquivo em `docs/SPEC.md` no repositório e referencie-o no `CLAUDE.md` (modelo de `CLAUDE.md` no item 15).
> Mapa visual: https://claude.ai/artifact/DQgDH6nufUMbR1kDdXGcTB

---

## 1. Visão do produto

SaaS **multi-retífica** de gestão e emissão de Ordens de Serviço para retíficas de motores (motor completo). O objetivo principal do proprietário é:

1. **Gerir os clientes** — separando **lojistas** (mecânicos/oficinas) de **clientes finais** — e
2. **Ver o histórico de todos os serviços** feitos para cada cliente e para cada motor.

O sistema deve ser **intuitivo**, rápido no balcão e utilizável em **tablet na bancada**. A experiência do usuário é requisito, não acabamento.

### Cliente piloto
- **WL Retífica de Motores** — "Especialista em Cabeçotes"
- Endereço: R. Dr. Mathias José de Barros Ponikwar, 254 — Jardim Campo Belo
- Identidade visual: logo "WL" cromado/vermelho com cabeçote, sobre fundo preto. Paleta do app: preto `#0E0E10` (topo), vermelho `#C8102E` (ações e destaque), cinzas neutros. A logo é configurável por empresa (multi-retífica). **Pedir o arquivo original da logo (vetor/PNG em alta)**: a versão atual é uma foto da placa.
- Telas de referência: https://claude.ai/artifact/AUVvuctHtcBAnNDby1ThU8

### Dispositivos (obrigatório)
O app tem que funcionar bem em **PC, tablet e smartphone**: layout responsivo, PWA instalável, navegação inferior no celular, menu lateral no desktop, alvos de toque ≥ 48px.

**Fora do escopo agora:** módulo fiscal (NF-e/NFS-e). Entra na Fase 4, mas o modelo de dados já deve deixar espaço para ele.

---

## 2. Glossário

| Termo | Significado |
|---|---|
| Empresa / Retífica | O cliente pagante do SaaS (tenant). Todos os dados pertencem a uma empresa. |
| Lojista | Cliente PJ ou PF que é mecânico/oficina e traz motores dos clientes dele. Preço com desconto, pagamento faturado. |
| Cliente final | Dono do veículo que vem direto à retífica. |
| Cliente do lojista | Dono do carro atendido pelo mecânico. Fica registrado na OS (nome/placa), sem ser cliente da retífica. |
| OS | Ordem de Serviço. Uma OS = um motor (ou conjunto) recebido. |
| Checklist de recebimento | Conferência do estado e dos componentes na entrada, com fotos e assinatura. |
| Laudo | Medições e constatações técnicas feitas após a desmontagem. |
| Apontamento | Registro de qual técnico executou qual serviço e quanto tempo levou. |

---

## 3. Usuários e permissões

Quatro papéis por empresa. Um usuário pode pertencer a mais de uma empresa (com papel diferente em cada uma).

| Ação | Dono | Balcão | Técnico | Financeiro |
|---|:-:|:-:|:-:|:-:|
| Cadastrar/editar clientes | ✅ | ✅ | ❌ | ✅ (só dados financeiros) |
| Abrir OS + checklist de recebimento | ✅ | ✅ | ❌ | ❌ |
| Registrar medições/laudo | ✅ | ❌ | ✅ | ❌ |
| Montar/enviar orçamento | ✅ | ✅ | sugere itens | ❌ |
| Dar desconto acima do limite | ✅ | ❌ (pede aprovação) | ❌ | ❌ |
| Mudar status na bancada | ✅ | ✅ | ✅ (só OS atribuídas) | ❌ |
| Apontar serviços executados | ✅ | ❌ | ✅ | ❌ |
| Entregar OS | ✅ | ✅ | ❌ | ✅ |
| Financeiro (Fase 2) | ✅ | receber no balcão | ❌ | ✅ |
| Catálogo de serviços / tabelas de preço | ✅ | ver | ver (sem preço) | ver |
| Relatórios e dashboard | ✅ | operacionais | os próprios | financeiros |
| Usuários e configurações | ✅ | ❌ | ❌ | ❌ |

- **Técnico não vê preços** por padrão (configurável pelo dono).
- Todas as permissões são aplicadas **no banco (RLS)**, não só na interface.

---

## 4. Clientes: lojista × cliente final

| | Lojista (mecânico) | Cliente final |
|---|---|---|
| Preço | Tabela de preço com desconto | Tabela balcão |
| Pagamento | Faturado: fechamento quinzenal ou mensal, boleto, limite de crédito | À vista, Pix, cartão |
| Aprovação do orçamento | Rápida, por WhatsApp ou link | Orçamento explicado + laudo/fotos |
| Dado extra na OS | Nome/placa/telefone do **cliente do lojista** (opcional) | Veículo próprio |
| Relatórios | Volume, ticket médio, inadimplência | Recorrência, garantia |

**Ficha do cliente** (tela-chave do produto): dados, tipo, tabela de preço, limite e saldo em aberto, motores vinculados e **linha do tempo de todas as OS**, com filtro por status, período e motor.

**Busca de histórico por motor/placa**: precisa achar todas as OS de um motor (código + nº de série) ou de uma placa, mesmo que tenham vindo por lojistas diferentes. Isso é essencial para garantia.

---

## 5. Fluxo da OS

```
1 Recebimento → 2 Desmontagem e medição → 3 Orçamento → 4 Aprovação → 5 Execução → 6 Pronto → 7 Entregue
                                                         ↘ Reprovado → devolvido     ↕ Aguardando peça
```

### Estados (`os_status`)

| Status | Quem move | Regras |
|---|---|---|
| `recebido` | Balcão | Exige checklist concluído + ao menos 3 fotos gerais + assinatura do cliente |
| `em_analise` | Técnico | Desmontagem e medições |
| `orcamento_enviado` | Balcão | Exige orçamento com ≥ 1 item; gera link público |
| `aprovado` | Cliente (link) ou Balcão (registra aprovação verbal/WhatsApp) | Grava versão aprovada, quem aprovou, canal, data/hora |
| `reprovado` | Cliente/Balcão | Pode cobrar taxa de desmontagem/análise (configurável) |
| `em_execucao` | Técnico | |
| `aguardando_peca` | Técnico/Balcão | Pode ir e voltar de `em_execucao` |
| `pronto` | Técnico | Notifica o cliente |
| `entregue` | Balcão/Financeiro | Assinatura de retirada; inicia prazo de garantia |
| `cancelado` | Dono | Exige motivo |

- Toda mudança vai para `os_status_historico` (de, para, quem, quando, motivo).
- O orçamento tem **versões**. Revisões depois da desmontagem criam uma nova versão, e só uma versão fica `aprovada`.
- **OS de garantia**: nasce vinculada à OS de origem (`os_origem_id`), com orçamento zerado por padrão.
- **Prazo prometido** por OS; atrasos aparecem em vermelho no quadro.
- Número da OS sequencial **por empresa** (ex.: 2026-000123).

---

## 6. Checklist de recebimento — motor completo

### Estrutura

- **Templates configuráveis** por empresa (o sistema traz um template padrão copiado para cada nova empresa).
- Template → grupos → itens. Cada item tem: descrição, se exige quantidade, quantidade padrão.
- Na OS, os itens são **copiados (snapshot)** do template, para que mudanças futuras no template não alterem OS antigas.
- Status por item: `ok` · `danificado` · `ausente` · `na`, mais quantidade, observação e fotos.
- **Tudo começa como `ok`**: o usuário toca só no que for diferente.
- O usuário pode marcar um grupo inteiro como `na` (ex.: o motor veio sem cabeçote).

### Template padrão

**Identificação**
- Marca, modelo, código do motor, nº de série/gravação
- Combustível (gasolina, etanol, flex, diesel, GNV), nº de cilindros, cilindrada
- Veio montado ou desmontado? Limpo ou sujo?

**Cabeçote — estrutura**
- Corpo do cabeçote
- Face do cabeçote
- Rosca das velas de ignição
- Rosca dos prisioneiros
- Sinais de trinca/superaquecimento, sedes de válvula

**Cabeçote — componentes internos e móveis**
- Eixo de comando de válvulas
- Válvulas de admissão (qtd) e escape (qtd)
- Molas de válvula (qtd)
- Pratos das molas e travas das válvulas
- Retentores de válvula
- Tuchos de válvula (hidráulico/mecânico)
- Balancins e eixos de balancins

**Cabeçote — acessórios e periféricos acoplados**
- Prisioneiros do cabeçote ou dos coletores
- Velas de ignição (qtd)
- Carcaça ou tampa da válvula termostática
- Sensor de temperatura da água
- Tampas de óleo ou galerias de lubrificação

**Bloco**
- Bloco do motor
- Cilindros/camisas
- Capas de mancal
- Selos e bujões
- Galerias de óleo e água
- Prisioneiros do bloco

**Conjunto móvel**
- Virabrequim
- Bielas (qtd)
- Pistões (qtd), anéis, pinos
- Bronzinas de mancal e de biela

**Distribuição**
- Correia ou corrente, tensor
- Engrenagens/polias do comando e do virabrequim
- Tampa frontal

**Periféricos**
- Cárter, bomba de óleo, pescador
- Bomba d'água
- Volante/platô
- Coletores de admissão e escape
- Suportes, juntas, junta do cabeçote, parafusos do cabeçote
- Diesel: bicos injetores, velas aquecedoras

### Fechamento do recebimento
1. Fotos gerais obrigatórias (mín. 3).
2. Resumo das divergências (só os itens ≠ `ok`) mostrado ao cliente.
3. Assinatura do cliente na tela (canvas), com nome e documento.
4. Gera o **comprovante de recebimento** em PDF (nº da OS, divergências, fotos em miniatura, termos), envia por WhatsApp e permite imprimir.
5. Gera a **etiqueta com QR code** (nº da OS + cliente) para colar na peça. Ler o QR abre a OS.

---

## 7. Laudo técnico e medições

- Lista de medições por componente com valor medido, unidade e faixa especificada (mín./máx.). O sistema marca **conforme/não conforme** automaticamente.
- Exemplos: empenamento da face do cabeçote (mm), folga de guia de válvula, ovalização/conicidade dos cilindros, diâmetro dos colos do virabrequim, teste de trinca/estanqueidade (aprovado/reprovado).
- Fotos por medição.
- O técnico pode **sugerir itens de orçamento** a partir de medições não conformes (ex.: "retificar face"). O balcão revisa e envia.
- O laudo sai no PDF do orçamento, se o balcão quiser.

---

## 8. Orçamento

- Itens de dois tipos: **serviço** (do catálogo) e **peça**.
- Preço sugerido pela **tabela de preço do cliente**. O preço pode ser por unidade, por cilindro ou por válvula, e é multiplicado automaticamente conforme o motor.
- **Kits de serviço** (ex.: "Retífica completa de cabeçote 8v") inserem vários itens de uma vez.
- Desconto por item ou no total. Acima do limite do papel, o desconto exige aprovação do dono.
- Validade do orçamento (padrão de 7 dias, configurável).
- Envio por **link público** (sem login) + mensagem pronta para o WhatsApp (`wa.me` com texto preenchido — sem API paga no MVP).
- Página pública: resumo, itens, fotos/laudo, botões **Aprovar** / **Reprovar** (pede nome) e status atual da OS.

---

## 9. Módulos e fases

### Fase 1 — MVP
- Autenticação, empresas (tenant), convites de usuários, 4 papéis
- Clientes (lojista/final), ficha com histórico
- Motores/veículos
- Catálogo de serviços, cadastro básico de peças (sem estoque), tabelas de preço, kits
- OS completa: recebimento com checklist, fotos e assinatura → medições → orçamento versionado → aprovação por link → execução com apontamento → pronto → entrega
- Quadro (kanban) de OS por status
- PDFs: comprovante de recebimento, orçamento/laudo, comprovante de entrega
- Etiqueta com QR
- Busca global
- Garantia: prazo, OS de retorno vinculada
- Dashboard simples: OS por status, atrasadas, entregues no mês, valor aprovado no mês

### Fase 2 — Financeiro
- Contas a receber (por OS ou por fatura de fechamento)
- **Fechamento do lojista**: agrupa as OS entregues no período em uma fatura e gera os títulos
- Limite de crédito com bloqueio/alerta ao abrir OS
- Contas a pagar, caixa, formas de pagamento
- Inadimplência por lojista

### Fase 3 — Expansão
- Estoque de peças (entrada, baixa pela OS, mínimo)
- Integração com a API do WhatsApp (envio automático)
- Portal do lojista (login próprio: OS em andamento, histórico, faturas)
- Relatórios avançados (produtividade por técnico, ranking de lojistas, serviços mais vendidos, taxa de retorno em garantia)
- Templates de checklist adicionais (só cabeçote, só virabrequim, etc.)

### Fase 4 — Fiscal
- NF-e (peças) e NFS-e (serviço), e NFC-e se houver balcão de varejo
- Via **API de emissão terceirizada** (Focus NFe, PlugNotas, NFE.io, Nuvem Fiscal) — não integrar direto com SEFAZ/prefeituras
- Considerar a reforma tributária (campos IBS/CBS, NFS-e padrão nacional). Validar com o contador.
- Deixar desde já, no cadastro de empresa e de clientes, os campos fiscais (CNPJ/CPF, IE, IM, endereço completo com código IBGE, regime tributário).

---

## 10. Experiência do usuário (requisitos)

1. **Tela inicial por papel**: balcão → "Nova OS" + fila do dia; técnico → "Minha bancada" (OS atribuídas); financeiro → a receber/vencidos; dono → painel.
2. **Checklist em ~2 minutos**: itens já `ok`, toques grandes, câmera abre direto no item, grupo inteiro marcável.
3. **Uma busca para tudo** (atalho `/` ou `Ctrl+K`): nome, telefone, documento, placa, código/série do motor, nº da OS; leitor de QR no celular/tablet.
4. **Quadro visual das OS**: colunas por status, arrastar para avançar (validando as regras), atraso em vermelho, filtro por técnico.
5. **Modo bancada (tablet)**: alvos de toque ≥ 48px, pouco texto, alto contraste, uso com luva. Tolerante a internet instável: fotos entram numa fila de upload com retentativa.
6. **Menos digitação**: autocompletar marca/modelo, reaproveitar motor e cliente, kits de serviço, preço automático.
7. **Cliente sem login**: link da OS no WhatsApp para acompanhar e aprovar.
8. **Desfazer e confirmações claras**: ações destrutivas pedem confirmação; mudanças de status mostram "Desfazer" por alguns segundos.
9. Feedback imediato (toasts), estados vazios que ensinam o próximo passo, skeletons no carregamento.
10. **Responsivo**: desktop no balcão/escritório, tablet na bancada, celular para o dono. PWA instalável.
11. Português do Brasil em tudo; moeda BRL; datas `dd/mm/aaaa`; máscaras de CPF/CNPJ/telefone/placa (Mercosul e antiga).
12. Acessibilidade: contraste AA, navegação por teclado no desktop.

**Validar antes de codar:** prototipar as telas de Nova OS, Checklist, Quadro e Bancada e testar com o balcão e com um técnico reais.

---

## 11. Stack e arquitetura

| Camada | Escolha |
|---|---|
| Frontend + backend | **Next.js** (App Router, Server Components, Server Actions), **TypeScript** estrito |
| UI | **Tailwind CSS** + **shadcn/ui**; ícones lucide; tema claro/escuro |
| Formulários/validação | react-hook-form + **zod** (schemas compartilhados cliente/servidor) |
| Dados no cliente | TanStack Query onde houver interatividade (quadro, bancada) |
| Banco | **Supabase Postgres** com **RLS** em todas as tabelas |
| Auth | Supabase Auth (e-mail + senha, magic link; convites por e-mail) |
| Arquivos | Supabase Storage (bucket privado `os-anexos`, caminho `{empresa_id}/{os_id}/...`) com URLs assinadas |
| Realtime | Supabase Realtime para o quadro de OS |
| PDF | `@react-pdf/renderer` gerado no servidor |
| QR | `qrcode` (geração) + leitura via câmera (`@zxing/browser` ou similar) |
| Assinatura | canvas (`signature_pad`) salvo como PNG no Storage |
| Hospedagem | **Vercel** (preview por PR, produção na `main`) |
| Testes | Vitest (unidade), Playwright (fluxos E2E), testes de RLS em SQL (pgTAP ou scripts) |
| Qualidade | ESLint, Prettier, `tsc --noEmit` no CI |

### Multi-tenant
- Toda tabela de negócio tem `empresa_id uuid not null`.
- Tabela `membros (empresa_id, user_id, papel)` define acesso.
- Função `auth_empresas()` / `tem_papel(empresa_id, papeis[])` (`security definer`, `stable`) usada nas políticas RLS.
- Empresa ativa escolhida na sessão (cookie) e validada no servidor.
- **Nunca** usar a service role no cliente. A página pública da OS usa uma rota server-side que busca por `token_publico` (uuid aleatório, revogável) e devolve só os campos necessários.

### Estrutura sugerida
```
src/
  app/
    (auth)/login, convite
    (app)/[empresa]/
      inicio/            # tela por papel
      os/                # quadro, nova, [id]
      bancada/           # modo tablet do técnico
      clientes/          # lista, [id] (ficha + histórico)
      motores/
      catalogo/          # serviços, peças, tabelas, kits
      configuracoes/     # empresa, usuários, templates de checklist
    os-publica/[token]/  # aprovação pelo cliente
  components/ (ui/, os/, checklist/, clientes/ ...)
  lib/ (supabase/, auth/, permissoes.ts, pdf/, validacoes/)
supabase/
  migrations/
  seed.sql              # template padrão de checklist, catálogo exemplo
  tests/                # testes de RLS
```

---

## 12. Modelo de dados (Fase 1, com ganchos para as Fases 2 e 4)

> Convenções: `id uuid default gen_random_uuid()`, `created_at`/`updated_at timestamptz`, `empresa_id` em tudo, nomes em português sem acento, `snake_case`. Valores monetários em `numeric(12,2)`. Enums do Postgres para status.

```sql
-- Tenant e acesso
empresas(id, nome_fantasia, razao_social, cnpj, ie, im, regime_tributario, endereco jsonb,
         telefone, email, logo_path, config jsonb, created_at)
membros(id, empresa_id, user_id -> auth.users, nome, papel papel_enum('dono','balcao','tecnico','financeiro'),
        limite_desconto_pct, ativo, created_at)  -- unique(empresa_id, user_id)
convites(id, empresa_id, email, papel, token, expira_em, aceito_em)

-- Clientes e motores
clientes(id, empresa_id, tipo cliente_tipo('lojista','final'), nome, nome_fantasia, documento, ie,
         telefone_whatsapp, email, endereco jsonb, tabela_preco_id, limite_credito,
         condicao_pagamento, dia_fechamento, observacoes, ativo)
motores(id, empresa_id, cliente_id null, marca, modelo, codigo_motor, numero_serie,
        combustivel, cilindros, cilindrada, valvulas_por_cilindro, veiculo_placa, veiculo_modelo, veiculo_ano)

-- Catálogo e preços
servicos(id, empresa_id, codigo, nome, categoria, unidade unidade_enum('un','cilindro','valvula','hora'),
         preco_base, tempo_padrao_min, ativo)
pecas(id, empresa_id, codigo, descricao, marca, unidade, custo, preco_venda, ativo
      /* Fase 3: estoque_atual, estoque_minimo */ /* Fase 4: ncm, cfop, cest */)
tabelas_preco(id, empresa_id, nome, desconto_padrao_pct, padrao_para cliente_tipo null)
tabela_preco_itens(id, tabela_preco_id, servico_id null, peca_id null, preco)
kits(id, empresa_id, nome, descricao) ; kit_itens(id, kit_id, servico_id null, peca_id null, quantidade)

-- Checklist
checklist_templates(id, empresa_id, nome, tipo_conjunto, ativo)
checklist_template_itens(id, template_id, grupo, descricao, ordem, exige_quantidade, quantidade_padrao)

-- OS
os_sequencias(empresa_id, ano, ultimo_numero)            -- numeração por empresa (função atômica)
os(id, empresa_id, numero, cliente_id, motor_id,
   cliente_final_nome, cliente_final_placa, cliente_final_telefone,   -- cliente do lojista
   status os_status, prazo_prometido, recebido_por -> membros, tecnico_id -> membros,
   os_origem_id null -> os (garantia), garantia_dias, garantia_ate,
   token_publico uuid unique, orcamento_aprovado_id null,
   valor_total, observacoes, created_at, entregue_em)
os_status_historico(id, os_id, status_de, status_para, membro_id, motivo, created_at)
os_checklist_itens(id, os_id, template_item_id null, grupo, descricao, ordem,
                   status checklist_status('ok','danificado','ausente','na'), quantidade, observacao)
os_anexos(id, empresa_id, os_id, checklist_item_id null, medicao_id null,
          etapa anexo_etapa('recebimento','analise','execucao','entrega'), storage_path, criado_por)
os_assinaturas(id, os_id, tipo assinatura_tipo('recebimento','aprovacao','entrega'),
               nome, documento, imagem_path null, ip, user_agent, created_at)
os_medicoes(id, os_id, componente, descricao, valor, unidade, minimo, maximo, conforme, membro_id)

-- Orçamento
orcamentos(id, os_id, versao, status orcamento_status('rascunho','enviado','aprovado','reprovado','substituido'),
           subtotal, desconto, total, validade, enviado_em, respondido_em,
           respondido_por_nome, canal canal_enum('link','whatsapp','presencial','telefone'), observacoes)
orcamento_itens(id, orcamento_id, tipo item_tipo('servico','peca'), servico_id null, peca_id null,
                descricao, quantidade, preco_unitario, desconto, total, sugerido_por_medicao_id null)

-- Execução
apontamentos(id, os_id, orcamento_item_id null, membro_id, inicio, fim, minutos, observacao)

-- Auditoria
auditoria(id, empresa_id, membro_id, tabela, registro_id, acao, dados_antes jsonb, dados_depois jsonb, created_at)

-- Fase 2 (não criar ainda; reservar nomes)
-- titulos_receber, faturas_fechamento, fatura_os, titulos_pagar, caixa_movimentos, formas_pagamento
-- Fase 4
-- documentos_fiscais(id, empresa_id, os_id, tipo('nfe','nfse','nfce'), status, chave, xml_path, pdf_path, provedor_ref)
```

**Índices importantes:** `clientes(empresa_id, nome)` com trigram para busca; `motores(empresa_id, codigo_motor, numero_serie)`; `motores(empresa_id, veiculo_placa)`; `os(empresa_id, status)`; `os(empresa_id, cliente_id, created_at desc)`; `os(token_publico)`.

**Busca global:** view ou função `buscar(empresa_id, termo)` unindo clientes, motores, placas e OS, com `pg_trgm` + `unaccent`.

---

## 13. Telas do MVP

1. Login / aceitar convite / escolher empresa
2. Início por papel
3. **Nova OS (wizard)**: cliente (buscar ou criar rápido) → motor (buscar ou criar) → cliente do lojista (se lojista) → checklist → fotos → assinatura → comprovante + etiqueta
4. **Quadro de OS** (kanban + lista com filtros)
5. **Detalhe da OS**: abas Resumo · Checklist · Laudo · Orçamento · Execução · Anexos · Histórico
6. **Bancada** (tablet): minhas OS, medições, apontar serviço (iniciar/parar), mudar status, fotos
7. Editor de orçamento (com kits e preço automático) + envio
8. Página pública da OS (aprovar/reprovar)
9. Clientes: lista + **ficha com histórico**
10. Motores: lista + histórico por motor
11. Catálogo: serviços, peças, tabelas de preço, kits
12. Configurações: empresa, usuários/papéis, templates de checklist, textos padrão (termos de garantia, validade)

---

## 14. Critérios de aceite do MVP

- [ ] Um usuário de uma empresa **nunca** vê dados de outra (testes de RLS automatizados).
- [ ] Técnico não vê preços quando a configuração está desligada.
- [ ] O balcão abre uma OS completa (cliente existente, checklist sem divergências, 3 fotos, assinatura) em **menos de 3 minutos** no tablet.
- [ ] A OS só vai para `recebido` com checklist, fotos e assinatura.
- [ ] O cliente aprova pelo link sem login, e o sistema grava versão, nome, IP e data.
- [ ] Nova versão de orçamento marca a anterior como `substituido`.
- [ ] A ficha do cliente mostra todas as OS com filtro, e a busca por placa/série encontra OS vindas de lojistas diferentes.
- [ ] Comprovantes em PDF e etiqueta QR funcionam, e ler o QR abre a OS.
- [ ] O quadro atualiza em tempo real entre dois dispositivos.
- [ ] Toda mudança de status fica no histórico.
- [ ] Lighthouse mobile ≥ 90 em acessibilidade e boas práticas nas telas principais.

---

## 15. Como trabalhar com Claude Code neste projeto

### `CLAUDE.md` sugerido (raiz do repositório)
```markdown
# ERP Retífica
Leia docs/SPEC.md antes de qualquer tarefa. Ele é a fonte de verdade do produto.

## Regras
- TypeScript estrito; nada de `any`. Validação com zod em toda entrada.
- Toda tabela nova: `empresa_id`, RLS habilitado e políticas + teste de RLS em supabase/tests.
- Mudanças de banco só por migration em supabase/migrations (nunca editar migration já aplicada).
- Nunca usar service role no cliente. Segredos só em variáveis de ambiente.
- UI em pt-BR; componentes shadcn/ui; alvos de toque ≥ 48px nas telas de bancada.
- Antes de concluir: `pnpm lint && pnpm typecheck && pnpm test`.
- Commits pequenos, mensagem em português no imperativo.

## Comandos
- pnpm dev | pnpm build | pnpm test | pnpm test:e2e
- supabase start | supabase db reset | supabase gen types typescript --local > src/lib/supabase/types.ts
```

### Ferramentas recomendadas no Claude Code
- MCP do **Supabase** (migrations, SQL, logs, advisors de segurança) e MCP da **Vercel** (deploys e logs).
- Skills do Supabase: `npx skills add supabase/agent-skills` (boas práticas de Postgres/RLS).
- Supabase CLI local para desenvolver e testar migrations antes de aplicar no remoto.

### Ordem de implementação sugerida
1. Scaffold (Next.js, Tailwind, shadcn, lint, CI na Vercel) + Supabase local
2. Migrations de tenant/acesso + RLS + testes de RLS
3. Auth, convites, seleção de empresa, layout e navegação por papel
4. Clientes e motores (CRUD + ficha)
5. Catálogo, tabelas de preço, kits
6. OS: wizard de recebimento (checklist, fotos, assinatura, PDF, QR)
7. Quadro de OS + realtime
8. Medições/laudo + bancada
9. Orçamento versionado + página pública
10. Execução/apontamentos + entrega + garantia
11. Busca global + dashboard
12. Testes E2E dos fluxos principais, ajustes de UX com usuários reais

### Modelo recomendado
| Etapa | Modelo | Por quê |
|---|---|---|
| Arquitetura, schema, **RLS multi-tenant**, revisão de segurança, bugs difíceis | **Claude Opus 5.5** | Erros aqui custam caro (vazamento entre retíficas); é o padrão recomendado pela Anthropic para agentic coding |
| Implementação do dia a dia: telas, CRUDs, componentes, testes | **Claude Sonnet 5.5** | Metade do preço do Opus, rápido e muito bom em tarefas bem especificadas |
| Tarefas mecânicas (renomear, gerar seeds, textos) | Sonnet 5.5 (ou Haiku 5.5) | Custo mínimo |
| Fable 5.2 | Não necessário | O dobro do custo do Opus; só se o Opus em effort alto não resolver |

---

## 17. Modo local (offline)

**Mudança de requisito:** o sistema roda num computador da oficina, **sem internet**, acessado só pela rede local (PC, tablet e celulares da equipe no Wi-Fi da oficina). Só a WL usa; ninguém acessa de fora, nem o cliente por link. Flag `NEXT_PUBLIC_MODO_LOCAL=true` (padrão do produto; flag desligada = nuvem, que continua funcionando). A instalação (Docker) está em `deploy/local/`.

Decisões:
- **Sem link público.** A rota `/os-publica/[token]` responde 404; somem "link para o cliente", "revogar link" e o link nas mensagens. O caminho principal é **Baixar PDF** (orçamento e comprovante) e o balcão enviar pelo WhatsApp do **próprio celular** (4G), usando o texto pronto sem link do sistema, e **registrar a aprovação** (presencial/telefone/WhatsApp) no orçamento.
- **Sem e-mail.** O login é só e-mail/login + senha (some a aba "Receber link"); "Esqueci minha senha" diz "Peça ao dono para redefinir sua senha". Não existe convite por e-mail (`/convite/*` dá 404).
- **Usuários criados pelo dono** em Configurações, Usuários (`/[empresa]/configuracoes/usuarios`, ação `usuarios.gerenciar`, só dono): criar usuário (nome, e-mail **ou só um login** como `balcao1`, que vira o e-mail interno `balcao1@wl.local`, senha inicial e papel), redefinir senha, mudar papel, ativar/desativar. Usa a API admin do GoTrue (service role, só no servidor); o vínculo à empresa é a função `adicionar_membro` (exige dono). O dono não se desativa nem deixa de ser dono sendo o último; o banco também garante pelo menos um dono ativo.
- **Nada externo em runtime:** fontes, ícones, imagens, scripts e fontes/logo dos PDFs são locais; a única saída é o link `wa.me` aberto no celular do balcão.
- **URL interna do Supabase:** o servidor usa `SUPABASE_URL_INTERNA` (ex.: `http://kong:8000`) quando definida; o navegador usa `NEXT_PUBLIC_SUPABASE_URL`. O nome do cookie de sessão é fixado a partir da URL pública, e URLs assinadas do Storage são reescritas para a URL pública.
- **PWA leve:** o manifest usa só caminhos relativos e funciona em qualquer origem; sem service worker. Câmera do navegador (leitor de QR) e "instalar o app" exigem HTTPS ou `localhost`; a captura de foto por `<input capture>` funciona em HTTP.
- **Mensagens de erro de login** distinguem servidor fora do ar ("Não foi possível falar com o servidor da oficina") de senha errada (também na nuvem).

---

## 16. Questões em aberto (validar com o proprietário)

1. Cobra taxa de análise/desmontagem quando o orçamento é reprovado? Valor fixo ou por tipo de motor?
2. Prazo de garantia padrão e o que ela cobre (texto do termo)?
3. Lojista tem uma tabela única ou tabelas por lojista?
4. Periodicidade do fechamento (quinzenal/mensal) e a forma de cobrança (boleto de qual banco? Pix?)
5. Lista real de serviços e preços atuais para o seed do catálogo.
6. Medições padrão que a bancada já anota hoje (e as tolerâncias usadas).
7. Logotipo, nome do produto e cores.
8. Modelo de cobrança do SaaS (plano por empresa/usuário). Necessário para a Fase "SaaS" de billing.
