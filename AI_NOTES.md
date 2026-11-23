# Histórico de Alterações (AI Notes - Antigravity)

Este documento registra as implementações recentes para que as próximas sessões da IA tenham contexto sobre como e por que algumas funcionalidades foram feitas no sistema.

## Modificações Recentes na Página de Conferência (Reconciliation.tsx)

### 1. Persistência de Dados dos Extratos (Bug Fix)
- **Problema Anterior:** Os extratos (Conta Corrente e Poupança) e seus saldos finais preenchidos pelo Administrador/Tesoureiro durante a "Conferência" não estavam sendo gravados no banco de dados. Eles existiam apenas temporariamente na memória do navegador.
- **Solução:** O sistema agora salva as URLs dos uploads e os valores diretamente na tabela `settings` do Supabase, utilizando a chave `reconciliations_data` (como uma string JSON indexada por `Ano-Mês`, ex: `2026-6`).

### 2. Controle de Permissões (Conferente)
- O perfil de **Conferente** (Apenas Leitura / Viewer) agora encontra os campos de valor bloqueados (`readOnly={!canEdit}`).
- O botão de upload de arquivo foi ocultado para o Conferente, exibindo apenas "Sem Arquivo" ou o ícone de Olho (visualizar) caso o admin já tenha feito o upload.

### 3. Salvamento Automático
- O Administrador não precisa mais clicar obrigatoriamente no botão "Finalizar Conferência do Mês" para que os extratos fiquem disponíveis para o Conferente.
- A função `saveStatementData` foi criada em `Reconciliation.tsx`. Ela é acionada automaticamente sempre que o Admin faz um upload (`handleFileUpload`) ou altera o saldo e sai do campo de input (`onBlur`).

### 4. Correção de Crash no Backend Vercel (api/index.ts)
- **Problema:** Quando testado em produção, o sistema acusava salvamento automático (toast verde), mas os dados não gravavam no banco.
- **Causa:** O endpoint `/api/settings` da Vercel (`api/index.ts`) tentava forçar o preenchimento de uma coluna `updated_at` na tabela `settings`. Como essa coluna não existia no banco, o Supabase retornava erro 500 silenciosamente.
- **Solução:** O campo `updated_at` foi removido do payload de `upsert` em `api/index.ts`.

### 5. Correção de Cache Agressivo (Vercel / Navegador)
- **Problema:** Mesmo com os dados salvos no banco, o Conferente não conseguia visualizar porque a requisição de busca ficava travada em cache.
- **Solução:** Foram inseridas instruções anti-cache (`cache: 'no-store'` e adição de Timestamp `?t=${Date.now()}`) no `apiService.ts` (`getSettings`), e foi adicionado um header de `Cache-Control` explícito no `api/index.ts` do backend para garantir que as buscas do Supabase sejam sempre em tempo real.

## Modificações no Módulo de Relatórios (Reports.tsx)

### Filtro de Ano Todo e Balancete Anual
- **Funcionalidade:** Adicionado seletor de período para alternar entre "Mensal" e "Ano Todo".
- **Visão Anual:**
  - Exibição de totais anuais de entradas, saídas e saldo, com cálculo de média mensal.
  - Grade com resumo consolidado mês a mês (12 meses) com atalho para abrir o mês diretamente.
  - Detalhamento de movimentação por conta (Corrente e Poupança) no ano.
  - Gráfico visual das principais despesas do ano por categoria.
  - Tabela completa de lançamentos filtrados para o ano selecionado.
  - Exportação em PDF atualizada para gerar o Balancete Financeiro Anual consolidado.


## Comparativo Anual (YoY) e Carga de Totais Históricos (2025)

### 1. Novo Componente: HistoricalTotalsModal (src/components/HistoricalTotalsModal.tsx)
- Modal acessível pelo botão "Lançar Totais Históricos" no modo Comparativo.
- Permite selecionar qualquer ano anterior (ex: 2025) e preencher os totais consolidados de Entradas e Saídas dos 12 meses (Janeiro a Dezembro).
- Salva no Supabase (`settings.historical_totals`) de forma persistente.

### 2. Aba/Modo Comparativo no Módulo de Relatórios (src/pages/Reports.tsx)
- Adicionado seletor de modo com 3 opções: `[ Mensal ] [ Ano Todo ] [ Comparativo ]`.
- Seleção de Ano Base (ex: 2026) vs Ano Comparado (ex: 2025).
- Lógica inteligente híbrida:
  - Se o ano possui lançamentos detalhados no banco, utiliza as transações reais.
  - Se o ano não possui lançamentos (ex: 2025), utiliza automaticamente os totais históricos preenchidos no modal.
  - Para anos futuros (2027 em diante), a comparação com o ano anterior torna-se 100% automática a partir dos registros existentes.
- Exibição de:
  - KPI Cards com percentual de variação e crescimento (+% ou -%).
  - Gráfico comparativo de barras lado a lado (Recharts).
  - Tabela comparativa mês a mês com variações de entradas, saídas e saldos.
  - Exportação em PDF dedicada para o relatório comparativo.
