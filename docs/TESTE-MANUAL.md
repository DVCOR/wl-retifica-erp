# Roteiro de teste manual (primeiro ambiente com Supabase real)

Use 4 usuários, um por perfil (dono, balcão, técnico, financeiro), e teste em **PC (1440px), tablet (834px) e celular (390px)**. Anote o que falhar com print, perfil e tela.

## 1. Acesso
- [ ] Login com senha e com link mágico; logout.
- [ ] Dono convida balcão, técnico e financeiro; cada um aceita e cai na empresa certa.
- [ ] Cada perfil vê só os itens de menu do seu papel (menu lateral no PC, barra inferior no celular).

## 2. Cadastros (balcão/dono)
- [ ] Criar cliente lojista (CNPJ) e cliente final (CPF); CPF/CNPJ inválido é recusado.
- [ ] Busca de clientes com e sem acento; filtro lojista/final.
- [ ] Cadastrar motor ligado a um cliente; buscar por placa e código.
- [ ] Catálogo: criar serviço, peça, tabela de preço (com preço específico) e kit. Técnico não vê preços.

## 3. Nova OS (tablet, balcão)
- [ ] Nova OS → cliente lojista → motor → placa do cliente do lojista → prazo.
- [ ] Checklist: marcar 2 itens como Danificado/Ausente, um grupo N/A, quantidade em válvulas.
- [ ] 3 fotos com a câmera (testar também com o Wi-Fi desligado e religado: a fila reenvia).
- [ ] Assinatura → OS vai para **Recebido**. Recarregar a página no meio do wizard não perde o rascunho.
- [ ] Baixar comprovante PDF, imprimir etiqueta QR, enviar no WhatsApp.
- [ ] Após recebido, ninguém altera o checklist direto; o dono usa "Corrigir item" com motivo.

## 4. Análise e orçamento
- [ ] Técnico (bancada) lê o QR da etiqueta e abre a OS.
- [ ] Técnico registra medições (uma fora da tolerância) e sugere item de orçamento — sem ver preços.
- [ ] Balcão monta o orçamento (item, kit, desconto acima do limite bloqueia; dono aprova o desconto).
- [ ] Enviar orçamento: link no WhatsApp e PDF (com e sem laudo).
- [ ] Abrir o link no celular **sem login**, aprovar com nome. Tentar aprovar de novo: deve recusar.
- [ ] Criar nova versão do orçamento: a anterior fica "substituída".

## 5. Execução e entrega
- [ ] Quadro: arrastar cartões entre colunas; transição inválida volta e mostra o que falta. Abrir o quadro em 2 aparelhos: muda nos dois (tempo real).
- [ ] Técnico inicia/pausa serviço (cronômetro), marca itens concluídos, "Aguardando peça", "Marcar como pronta".
- [ ] Entregar com assinatura de retirada; garantia calculada.
- [ ] Abrir OS de garantia a partir da OS entregue.

## 6. Ficha, busca e painel
- [ ] Ficha do cliente mostra todas as OS e o resumo; histórico por motor/placa junta OS de lojistas diferentes.
- [ ] Busca global (Ctrl+K / ícone no celular) acha cliente, placa e nº da OS.
- [ ] Início de cada perfil; painel do dono com números coerentes com o quadro.

## 7. Segurança (com 2 empresas)
- [ ] Usuário da empresa A não acessa URLs de OS/cliente da empresa B (404).
- [ ] Técnico não vê preço em nenhuma tela, PDF, busca ou painel.
