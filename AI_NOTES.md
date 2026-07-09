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
