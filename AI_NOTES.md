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


## Ajuste do Ano Fiscal da Igreja (Dezembro a Novembro)

### 1. Configuração do Exercício Financeiro (src/contexts/SettingsContext.tsx & src/pages/Settings.tsx)
- Adicionado campo `fiscal_year_start` com padrão `'12'` (Dezembro a Novembro - 12 meses) em **Configurações > Organização**.
- Também permite alternar para `'1'` (Ano Civil Padrão) caso necessário.

### 2. Adaptação do Módulo de Relatórios (src/pages/Reports.tsx)
- No modo **Exercício Fiscal / Ano Todo**:
  - Para o Exercício de um ano `Y` (ex: 2026), o intervalo de apuração agora é de `01/12/(Y-1)` a `30/11/Y` (ex: `01/12/2025` a `30/11/2026`).
  - A sequência de meses nos relatórios e nos gráficos inicia em **Dezembro** (do ano anterior) e segue até **Novembro** (do ano do exercício).
- No modo **Comparativo**:
  - Compara mês a mês os 12 meses do exercício fiscal (Dezembro a Novembro) entre os dois anos selecionados.
  - Exportação em PDF atualizada com cabeçalho oficial do Exercício Fiscal (01/Dez a 30/Nov).

### 3. Adaptação do Modal de Totais Históricos (src/components/HistoricalTotalsModal.tsx)
- A tabela de lançamento de totais anteriores (ex: 2025) lista os meses na ordem fiscal: `Dezembro (ano anterior)`, `Janeiro`, `Fevereiro` ... até `Novembro`.

### 4. Correção da Busca de Dezembro no Comparativo e Visão Anual (Reports.tsx & Modal)
- **Causa Raiz Identificada:** No Exercício Fiscal da Igreja (01/Dez a 30/Nov), o Exercício de 2026 inicia com Dezembro/2025 (puxado automaticamente das transações reais do sistema: R$ 33.380,89 de entradas e R$ 39.009,66 de saídas). O Exercício de 2025 inicia com Dezembro/2024 (R$ 48.809,02 de entradas e R$ 46.745,40 de saídas). Como o valor de Dezembro/2024 havia sido salvo na chave 2024/12, a busca na chave 2025/12 ficava em R$ 0,00.
- **Solução Implementada:**
  - `getFiscalTotals` em `Reports.tsx` agora possui fallback inteligente para Dezembro: busca nas transações reais, depois no histórico do ano base, depois no histórico do ano anterior (ex: 2024/12 para o exercício 2025) e depois em transações diretas.
  - Sincronização automática em `HistoricalTotalsModal`: carregar e salvar Dezembro sincroniza tanto em `selectedYear` quanto em `prevYear`.
  - `monthlySummary` em `Reports.tsx`: na visão anual consolidada de um ano sem transações reais (ex: 2025), o sistema agora puxa automaticamente os totais históricos salvos, exibindo todos os 12 meses preenchidos.

## Correção dos Cálculos de Variação Percentual e Filtro de Saldo Anterior (Reports.tsx)

### 1. Desconsideração de "Saldo Anterior" / "Saldo Inicial" dos Totais Operacionais
- **Problema:** Em `2025-11-30`, existiam 2 lançamentos no banco de dados com a descrição `"Saldo Anterior (2025)"` (totalizando R$ 5.844,44), correspondentes ao saldo inicial de abertura das contas Poupança e Corrente. O `getFiscalTotals` identificava esses registros como movimentação real de Novembro/2025, ignorando o valor histórico lançado manualmente pelo usuário (R$ 24.368,34). Isso fazia o comparativo de Novembro exibir um crescimento incorreto de `+107.9%` (comparando R$ 12.147,76 contra R$ 5.844,44) em vez da queda real de `-50.1%`.
- **Solução:** Foi adicionado o filtro `!isOpeningBalance(t)` em `getFiscalTotals` (verificando se a descrição inclui `'saldo anterior'` ou `'saldo inicial'`). Lançamentos de abertura de saldo agora são ignorados no somatório de receitas/despesas operacionais, permitindo que os totais históricos manuais tenham precedência e os cálculos reflitam apenas a movimentação real.

### 2. Tratamento Correto de Divisão por Zero na Variação Percentual
- **Problema:** Quando o ano anterior não possui valor lançado (ex: saídas de 2025 com R$ 0,00), a fórmula anterior retornava `+100.0%` em vermelho. Matematicamente, a divisão por zero é indefinida e induzia ao erro de achar que as despesas haviam dobrado.
- **Solução:** Quando o valor do ano comparado for `0` (zero) e o ano base for maior que zero, a função agora retorna `null` e renderiza `-` (traço neutro) indicando ausência de base comparativa, em vez de `+100.0%`.
- **Fórmula Padrão Utilizada:**
  $$\text{Variação \%} = \frac{\text{Ano Base} - \text{Ano Anterior}}{\text{Ano Anterior}} \times 100$$
- **Aplicação Completa:** A regra foi padronizada nos Cards de KPI, na Tabela Comparativa mês a mês, no Rodapé de Totais Gerais e na Exportação de PDF.

### 3. Proteção contra Base Assimétrica de Comparação no Total Anual (Reports.tsx)
- **Problema:** Quando o exercício atual (2026) possui movimentação de saídas nos 12 meses (R$ 336.217,05), mas o exercício comparado (2025) possui meses zerados/incompletos (apenas Dezembro com R$ 46.745,40), a fórmula do total geral comparava 12 meses contra 1 mês, gerando uma variação absurda de `+619.3%` no Card de Saídas e no Rodapé.
- **Solução:** Implementadas as verificações `hasIncompleteComparativeExpense` e `hasIncompleteComparativeIncome`. Se o ano atual possuir valores em meses onde o ano comparado ainda está zerado, a variação total do ano retorna `null` e exibe `-` (traço neutro) em vez de um percentual distorcido, aguardando o preenchimento de todos os meses pelo usuário.
- **Melhorias no Modal de Totais Históricos (HistoricalTotalsModal.tsx):**
  - Inputs alterados para `type="text" inputMode="decimal"`, facilitando a digitação de valores monetários com vírgula ou ponto sem bloqueio do navegador.
  - Valores zerados não ficam mais travados com o número `0` dentro do campo, permitindo visualização limpa do placeholder `0,00` e digitação direta.

### 4. Colunas de Diferença Numérica (R$) no Comparativo Anual
- **Funcionalidade:** Atendendo à solicitação do usuário, além das variações percentuais (`Var. %`), o relatório comparativo agora exibe as diferenças em valores monetários nominais (R$):
  - **Entradas:** `Dif. Entr.` (`Ano Base - Ano Comparado`, verde para superávit/aumento, vermelho para redução).
  - **Saídas:** `Dif. Saíd.` (`Ano Base - Ano Comparado`, vermelho para aumento de despesa, verde para economia).
  - **Saldo:** `Dif. Saldo` (`Saldo Base - Saldo Comparado`).
- **Locais Atualizados:**
  - **Cards de Indicadores (KPI):** Exibição da diferença nominal (R$) ao lado do percentual.
  - **Tabela Mês a Mês:** Colunas dedicadas para `Dif. Entr.`, `Var. %`, `Dif. Saíd.`, `Var. %` e `Dif. Saldo`.
  - **Rodapé de Totais Gerais:** Consolidação das diferenças monetárias do exercício completo.
  - **Exportação em PDF:** Tabela gerada em orientação Paisagem (Landscape) para acomodar com clareza todas as colunas nominais e percentuais.
