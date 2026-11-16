# Operação com múltiplos agentes

O **chefe da operação** (agente coordenador) distribui o trabalho, integra as branches e é o único que faz merge na `main`.

## Fluxo
1. **Etapa 1 — Base** (1 agente, sequencial): scaffold, tema, componentes base, **schema completo da Fase 1** com RLS e testes, auth, empresa ativa, layout e navegação por papel.
2. **Rodada 1** (em paralelo, cada um no seu worktree/branch):
   - `feat/clientes` — clientes, motores, ficha com histórico
   - `feat/catalogo` — serviços, peças, tabelas de preço, kits
   - `feat/recebimento` — wizard Nova OS: checklist, fotos, assinatura, comprovante PDF, etiqueta QR
3. **Rodada 2** (em paralelo):
   - `feat/orcamento` — editor de orçamento versionado, medições/laudo, página pública de aprovação
   - `feat/quadro` — quadro de OS (kanban + realtime), bancada do técnico, apontamentos, entrega/garantia
   - `feat/busca-dashboard` — busca global, tela inicial por papel, dashboard
4. **Revisão** (agente revisor independente): segurança multi-tenant, permissões por papel, testes, build.

## Regras de convivência
- **Dono do banco:** o agente da Etapa 1 cria o schema da Fase 1 inteiro. Nas rodadas, nenhum agente cria migration: se precisar mudar o banco, descreve a mudança no relatório final e o chefe aplica.
- Cada agente mexe **só** nas pastas do seu módulo:
  - rotas: `src/app/(app)/[empresa]/<modulo>/`
  - componentes: `src/components/<modulo>/`
  - dados/ações: `src/lib/data/<modulo>.ts`, `src/lib/validacoes/<modulo>.ts`
- Código compartilhado (`src/components/ui`, `src/components/app`, `src/lib/supabase`, `src/lib/auth`) só muda com aviso no relatório final; prefira adicionar arquivos novos a editar os existentes.
- Rótulos de menu e rotas já existem no layout da base; o módulo só preenche a página.
- Ao terminar: tudo verde (`lint`, `typecheck`, `test`, `test:db`, `build`), commit na sua branch, relatório curto com o que fez, o que ficou pendente e qualquer mudança em código compartilhado.
