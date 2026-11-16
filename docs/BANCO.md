# Banco de dados (Fase 1)

Migrations em `supabase/migrations/` (nunca editar uma já aplicada; criar nova). Testes em `supabase/tests/` (`pnpm test:db`). Tipos: `pnpm test:db && pnpm db:types` → `src/lib/supabase/types.ts` (num banco de teste próprio: `TEST_DB=wl_test_x pnpm test:db && TEST_DB=wl_test_x pnpm db:types`). O gerador marca as colunas devolvidas por RPC como não anuláveis: trate-as como anuláveis ao mapear.

## Tabelas

| Grupo | Tabelas |
|---|---|
| Tenant e acesso | `empresas` (com `slug` usado na URL e `config` jsonb), `membros` (papel por empresa, `limite_desconto_pct`), `convites` |
| Clientes | `clientes` (lojista/final; documento/telefone só dígitos), `motores` (placa normalizada sem hífen) |
| Catálogo | `servicos`, `pecas`, `tabelas_preco` (`padrao_para` lojista/final), `tabela_preco_itens`, `kits`, `kit_itens` |
| Checklist | `checklist_templates`, `checklist_template_itens`; modelo global `modelo_checklist_itens`, `modelo_servicos` |
| OS | `os_sequencias`, `os`, `os_status_historico`, `os_checklist_itens` (snapshot), `os_medicoes`, `os_anexos`, `os_assinaturas` |
| Orçamento | `orcamentos` (versões), `orcamento_itens` |
| Execução/auditoria | `apontamentos` (`minutos` calculado), `auditoria` (`motivo` nas correções do checklist) |

Integridade multi-tenant: toda tabela filha tem `empresa_id` e as FKs são **compostas** `(id, empresa_id)`, então é impossível apontar para registro de outra empresa.

Diferenças em relação ao SPEC item 12 (decisões):
- `os_status` ganhou `em_recebimento` (rascunho enquanto o wizard não termina; o link público ignora OS nesse estado). `recebido` exige `checklist_concluido_em` + 3 fotos gerais + assinatura `recebimento`.
- `os.valor_total` **não existe**: o valor é `orcamentos.total` da versão `os.orcamento_aprovado_id` (assim o técnico não vê preço pela OS).
- `empresas.slug`, `os.checklist_concluido_em`, `os.eh_garantia`, `os.motivo_cancelamento`, `orcamentos.desconto_aprovado_por/respondido_ip`, `orcamento_itens.sugerido_por`, `orcamento_itens.concluido_em/concluido_por` (serviço concluído na execução), `os_medicoes.valor_texto` foram acrescentados.
- O template padrão e o catálogo de exemplo estão na migration `*_dados_padrao.sql` (tabelas `modelo_*`), não só no `seed.sql`, para existirem em produção. `seed.sql` cria a empresa piloto `wl-retifica` + 4 usuários (`dono|balcao|tecnico|financeiro@wl.local`, senha `wl123456`) e chama `inicializar_empresa()`.

## Funções (RPC)

| Função | Quem | O que faz |
|---|---|---|
| `empresas_do_usuario()`, `tem_papel(empresa, papeis[])`, `papel_na_empresa(empresa)`, `membro_atual(empresa)`, `pode_ver_precos(empresa)` | RLS | security definer, stable, `search_path=''` |
| `criar_empresa(nome, slug, nome_usuario)` | logado | cria empresa, vira dono, chama `inicializar_empresa` |
| `inicializar_empresa(empresa)` | dono/service | copia modelo (checklist, serviços, 2 tabelas de preço, 1 kit); idempotente |
| `convite_info(token)` | anon | dados mínimos do convite |
| `aceitar_convite(token, nome?)` | logado com o e-mail do convite | cria/reativa membro; devolve o slug |
| `proximo_numero_os(empresa)` | dono/balcão | `2026-000123`, atômico por empresa/ano (`os_sequencias`, fuso America/Sao_Paulo) |
| `criar_os(empresa, cliente, motor?, template?, prazo?, cliente_final_*, os_origem?, tecnico?, obs?)` | dono/balcão (security invoker) | cria OS em `em_recebimento` e faz o **snapshot** dos itens do template (padrão da empresa se omitido; tudo `ok`) |
| `alterar_status_os(os, status, motivo?)` | conforme papel | valida transição, papel, técnico atribuído e pré-condições; grava histórico. Única forma de mudar status |
| `os_pendencias_para_status(os, status)` | membro | texto do que falta para o status (ou null) |
| `os_transicao_permitida(de, para)`, `os_papeis_para_status(para)` | todos | regras (espelhadas em `src/lib/auth/permissoes.ts`) |
| `regenerar_token_publico(os)` | dono/balcão | revoga o link público |
| `preco_sugerido(empresa, cliente, servico, peca?)` | quem vê preço | preço unitário pela tabela do cliente (item da tabela → senão base × (1 − desconto da tabela)) |
| `quantidade_sugerida(servico, motor)` | membro | 1, nº de cilindros ou nº de válvulas conforme `unidade` |
| `adicionar_kit_orcamento(orcamento, kit)` | dono/balcão | insere os itens do kit |
| `enviar_orcamento(orcamento)` | dono/balcão | exige ≥1 item e desconto dentro do limite do papel (ou `desconto_aprovado_por` = dono); move a OS para `orcamento_enviado` |
| `responder_orcamento(orcamento, aprovar, nome, canal)` | dono/balcão | aprovação verbal/WhatsApp/telefone |
| `os_publica(token)` | anon | JSON só com o necessário (empresa, OS, motor, orçamento vigente, medições, histórico, `qtd_fotos`); sem documento/telefone/ids |
| `os_publica_fotos(token)` | **service_role** | `storage_path, etapa, legenda, medicao_id` das fotos (recebimento/análise) para o servidor gerar URLs assinadas |
| `responder_orcamento_publico(token, aprovar, nome, ip?, user_agent?)` | anon | aprova/reprova pelo link (valida validade), grava nome/IP/canal `link`, assinatura `aprovacao` e status da OS |
| `buscar(empresa, termo, limite?)` | membro (invoker) | busca global: clientes (trigram/unaccent, documento, telefone), motores (código, série, placa), OS (número, placa do cliente do lojista) |
| `listar_clientes(empresa, termo?, tipo?, ativo?, limite?, offset?)` | membro (invoker) | lista paginada; busca sem acento por nome/fantasia (trecho ou trigram), documento/telefone (dígitos ≥ 3), placa de motores do cliente e de OS; devolve `os_em_andamento` e `total` (window) em cada linha; mais relevantes primeiro |
| `listar_motores(empresa, termo?, cliente?, limite?, offset?)` | membro (invoker) | lista paginada; busca sem acento por marca/modelo/código/série/veículo/nome do cliente e trecho de placa/série; sem termo e com `cliente` → só os do cliente; com termo → os do cliente primeiro; devolve `cliente_nome` e `total` |
| `resumo_cliente(cliente)` | membro (invoker) | `os_em_andamento`, `os_12_meses`, `em_aberto` (soma dos orçamentos aprovados de OS aprovada/em execução/aguardando peça/pronta; null se não vê preço), `motores_em_garantia` (ignora OS `em_recebimento`) |
| `salvar_kit(kit?, dados jsonb, itens jsonb)` | dono (invoker) | cria (`kit` null, `dados.empresa_id`) ou atualiza o kit e **substitui** os itens numa transação; `itens = [{tipo, id, quantidade}]`, ordem = posição; devolve o id |
| `salvar_precos_tabela(tabela, precos jsonb)` | dono (invoker) | `precos = [{tipo, id, preco}]`: upsert; `preco` null remove o preço específico; tudo ou nada; devolve quantos mudaram |
| `definir_tabela_padrao(tabela, tipo)` | dono (invoker) | a tabela vira a padrão do tipo de cliente e a anterior deixa de ser, atomicamente (`tipo` null tira o padrão); recusa tabela inativa |
| `corrigir_checklist_os(item, motivo, status?, quantidade?, observacao?)` | dono (invoker) | única forma de alterar item do checklist depois do recebimento; grava em `auditoria` com `motivo` |
| `marcar_item_concluido(item, concluido)` | técnico/dono/balcão (definer) | marca/desmarca `concluido_em/concluido_por` de item do orçamento **aprovado**, só com a OS `em_execucao`/`aguardando_peca`; única forma de gravar essas colunas (não mexe em preço) |
| `orcamento_rascunho_para_sugestao(os)` | técnico/dono/balcão (definer) | devolve o rascunho vigente ou cria a versão seguinte em rascunho (OS fora de `em_recebimento/pronto/entregue/cancelado`); recusa se a última versão está `enviado`/`aprovado` |

Triggers: `updated_at`; normalização (documento, telefone, placa); número/token/padrões da OS; bloqueio de update direto de `status`, `numero`, `token_publico`, `orcamento_aprovado_id`, `entregue_em`, `garantia_ate`; histórico de status (insert/update, com membro e motivo); **desconto revogado:** mudar `orcamentos.desconto` ou o `desconto` de algum item (insert/update/delete) zera `orcamentos.desconto_aprovado_por` se quem mudou não é dono; versão automática do orçamento (nova versão marca as anteriores como `substituido`); itens só em orçamento `rascunho`, preço sugerido quando `preco_unitario` é null, total do item e do orçamento; conformidade da medição; financeiro só altera colunas financeiras do cliente; sempre ≥1 dono ativo; auditoria genérica (insert/update/delete) nas tabelas principais. Entrega a partir de `pronto` calcula `garantia_ate`. **Checklist travado:** depois que a OS sai de `em_recebimento`, insert/update/delete em `os_checklist_itens` é recusado para todos; só `corrigir_checklist_os` (dono, motivo obrigatório via `app.motivo_checklist`) passa, e cada mudança vai para `auditoria` com o motivo. Índices trigram em `motores.veiculo_placa` e `os.cliente_final_placa` para busca por trecho de placa.

## RLS (estratégia)

- **Todas** as tabelas têm RLS. Leitura: `empresa_id in (select empresas_do_usuario())`. Escrita: `tem_papel(empresa_id, ...)` conforme SPEC item 3:
  - clientes: insert dono/balcão; update dono/balcão/financeiro (trigger restringe o financeiro a `tabela_preco_id, limite_credito, condicao_pagamento, dia_fechamento`); delete dono.
  - motores, OS, checklist da OS: dono/balcão. Medições: dono/técnico. Fotos: dono/balcão/técnico (apaga: dono/balcão ou o autor). Assinaturas: imutáveis; recebimento dono/balcão, entrega dono/balcão/financeiro.
  - orçamento: dono/balcão; técnico só **insere** item (trigger zera preço/desconto dele e grava `sugerido_por`).
  - apontamentos: dono, ou técnico para si mesmo.
  - catálogo, kits, templates, membros, convites, empresa, auditoria (leitura): dono.
  - `empresas`/`membros` não têm insert por RLS: só via `criar_empresa`/`aceitar_convite`.
  - `os_sequencias`: sem política (só a função).
- **Status** de OS/orçamento só por funções `security definer` (que checam papel); triggers barram update direto.
- **Preço × técnico (estratégia escolhida):** as tabelas com coluna de preço (`servicos`, `pecas`, `tabelas_preco`, `tabela_preco_itens`, `orcamentos`, `orcamento_itens`) só são legíveis quando `pode_ver_precos(empresa_id)` (todos menos técnico, ou técnico se `empresas.config->>'tecnico_ve_precos' = 'true'`). O técnico usa as views **`v_servicos_catalogo`**, **`v_pecas_catalogo`** e **`v_orcamento_itens_sem_preco`** (com `concluido_em/concluido_por`), que não têm colunas de preço e filtram por `empresas_do_usuario()` (rodam com o dono da view, `security_barrier`; o advisor do Supabase vai apontá-las como “security definer view” — é intencional). `preco_sugerido()` devolve null para quem não vê preço. Não usamos privilégio por coluna porque o papel é por empresa.
- `anon` não tem acesso a nenhuma tabela; só executa `os_publica`, `responder_orcamento_publico` e `convite_info`. Execução de funções é por lista explícita (`revoke ... from public, anon`).
- Storage (`*_storage.sql`, só no Supabase real): bucket privado `os-anexos`, caminho `{empresa_id}/{os_id}/arquivo`; leitura por membros, upload dono/balcão/técnico, remoção dono/balcão. Bucket público `empresa-logos` (`{empresa_id}/...`, escrita do dono). `os_anexos.storage_path` tem check de prefixo `{empresa_id}/{os_id}/`.
- Realtime: `os`, `os_status_historico`, `apontamentos` e `orcamentos` na publicação `supabase_realtime` (se existir); a RLS vale para os eventos.

## Testes (`pnpm test:db`)

`scripts/test-db.sh` recria `wl_test`, aplica `00_shim_supabase.sql` (papéis `anon/authenticated/service_role`, `auth.users`, `auth.uid()` via `request.jwt.claims`, grants padrão do Supabase), migrations (pula `*_storage.sql` sem schema `storage`), `seed.sql`, `01_helpers.sql` e roda cada `NN_*.sql` numa transação com rollback. Helpers: `tests.cenario()` (empresas `alfa`/`beta` com um usuário por papel), `tests.logar(email)`, `tests.anonimo()`, `tests.ok(cond, msg)`, `tests.erro(sql, msg, trecho)`, `tests.linhas(sql)`, `tests.contar(sql)`, `tests.receber_os(os)`.

Cobertura: isolamento entre empresas em todas as tabelas/views, matriz de papéis, técnico sem preço, numeração e snapshot, link público/orçamento/entrega, convites, criação de empresa e busca; `50_banco_*`: catálogo atômico, checklist travado, listagens/resumo do cliente; `51_banco2_*`: item concluído, rascunho para sugestão, desconto revogado, fotos públicas com medição.
