import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileCheck, Shield, Upload, Download, AlertCircle, 
  CheckCircle2, Clock, History, FileText, Loader2,
  Calendar, CreditCard, TrendingUp, TrendingDown, RefreshCw
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, cn, parseAmount, getMonthFilterRange } from '../lib/utils';
import { MonthlyClosure, Transaction } from '../types';
import { toast } from 'sonner';

export const AuditConferencial: React.FC = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedAccount, setSelectedAccount] = useState<'Corrente' | 'Poupança'>('Corrente');
  
  // Local state for the current closure being edited
  const [bankBalance, setBankBalance] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [statementUrl, setStatementUrl] = useState('');

  // Queries
  const { data: closures = [], isLoading: isLoadingClosures } = useQuery({
    queryKey: ['closures', profile?.organization_id],
    queryFn: () => apiService.getMonthlyClosures(profile?.organization_id),
  });

  const { data: transactions = [], isLoading: isLoadingTrans } = useQuery({
    queryKey: ['transactions'],
    queryFn: apiService.getTransactions,
  });

  // Find the closure for the current selection
  const currentClosure = closures.find(c => 
    c.month === selectedMonth && 
    c.year === selectedYear && 
    c.account === selectedAccount
  );

  // Sync local state when closure changes
  useEffect(() => {
    if (currentClosure) {
      setBankBalance(currentClosure.bank_balance.toString());
      setNotes(currentClosure.notes || '');
      setStatementUrl(currentClosure.statement_url || '');
    } else {
      setBankBalance('');
      setNotes('');
      setStatementUrl('');
    }
  }, [currentClosure, selectedMonth, selectedYear, selectedAccount]);

  // Calculate System Balance for the selection
  const { startOfMonthStr, endOfMonthStr } = getMonthFilterRange(selectedYear, selectedMonth);
  
  const filteredTransactions = transactions.filter(t => 
    t.date >= startOfMonthStr && 
    t.date <= endOfMonthStr && 
    t.account === selectedAccount
  );

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + parseAmount(t.amount), 0);
  
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + parseAmount(t.amount), 0);
  
  const systemBalance = totalIncome - totalExpense;
  const currentBankBalanceNum = parseFloat(bankBalance) || 0;
  const difference = systemBalance - currentBankBalanceNum;

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: any) => apiService.saveMonthlyClosure(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closures'] });
      toast.success('Fechamento salvo com sucesso!');
    },
    onError: () => toast.error('Erro ao salvar fechamento.')
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await apiService.uploadFile(file);
      setStatementUrl(response.url);
      toast.success('Extrato enviado!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = (status: 'pending' | 'conferido' = 'pending') => {
    if (!bankBalance) {
      toast.error('Informe o saldo do extrato bancário.');
      return;
    }

    saveMutation.mutate({
      ...currentClosure,
      year: selectedYear,
      month: selectedMonth,
      account: selectedAccount,
      bank_balance: currentBankBalanceNum,
      statement_url: statementUrl,
      notes,
      status: status,
      organization_id: profile?.organization_id,
      reviewed_by: status === 'conferido' ? profile?.id : currentClosure?.reviewed_by
    });
  };

  const isLocked = currentClosure?.status === 'conferido';
  const canEditEntries = (profile?.role === 'admin' || profile?.role === 'treasurer') && (!isLocked || profile?.role === 'admin');
  const canAudit = profile?.role === 'admin' || profile?.role === 'auditor';
  
  // Specific check to separate entry-launching from auditing
  const isAuditorOnly = profile?.role === 'auditor' && profile?.role !== 'admin';
  const disableEntries = isLocked || isAuditorOnly;

  if (isLoadingClosures || isLoadingTrans) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-indigo-600 p-3 shadow-lg shadow-indigo-200">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-zinc-900">Conferência & Auditoria</h2>
            <p className="text-zinc-500">Validação mensal e conciliação bancária.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-all focus:ring-4 focus:ring-indigo-500/10"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-all focus:ring-4 focus:ring-indigo-500/10"
          >
            {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Reconciliation Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="premium-card overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50/50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-bold text-zinc-900">Conciliação Mensal</h3>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedAccount('Corrente')}
                    className={cn(
                      "rounded-lg px-3 py-1 text-xs font-bold transition-all",
                      selectedAccount === 'Corrente' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white text-zinc-400 border border-zinc-200"
                    )}
                  >
                    Corrente
                  </button>
                  <button 
                    onClick={() => setSelectedAccount('Poupança')}
                    className={cn(
                      "rounded-lg px-3 py-1 text-xs font-bold transition-all",
                      selectedAccount === 'Poupança' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white text-zinc-400 border border-zinc-200"
                    )}
                  >
                    Poupança
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid gap-8 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Saldo no Sistema</label>
                  <p className="text-2xl font-black text-zinc-900">{formatCurrency(systemBalance)}</p>
                  <div className="mt-2 flex gap-4 text-[10px] font-bold uppercase">
                    <span className="text-emerald-600">+{formatCurrency(totalIncome)}</span>
                    <span className="text-rose-600">-{formatCurrency(totalExpense)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Saldo no Extrato</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">R$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0,00"
                      value={bankBalance}
                      onChange={(e) => setBankBalance(e.target.value)}
                      disabled={disableEntries}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-3 text-xl font-bold text-zinc-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Diferença</label>
                  <p className={cn(
                    "text-2xl font-black",
                    Math.abs(difference) < 0.01 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {formatCurrency(difference)}
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    {Math.abs(difference) < 0.01 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-500" />
                    )}
                    <span className="text-[10px] font-medium text-zinc-500">
                      {Math.abs(difference) < 0.01 ? 'Valores conferem' : 'Inconsistência detectada'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Upload & Notes */}
              <div className="mt-10 grid gap-8 sm:grid-cols-2">
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Extrato Bancário (Anexo)</label>
                  {statementUrl ? (
                    <div className="group relative flex items-center justify-between rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 p-4 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-bold text-emerald-700">Extrato Carregado</span>
                      </div>
                      <div className="flex gap-2">
                        <a 
                          href={statementUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="rounded-lg bg-white p-2 text-emerald-600 shadow-sm hover:bg-emerald-50"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {!isLocked && (
                          <button 
                            onClick={() => setStatementUrl('')}
                            disabled={disableEntries}
                            className="rounded-lg bg-white p-2 text-rose-600 shadow-sm hover:bg-rose-50 disabled:opacity-30"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <label className={cn(
                      "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 p-8 transition-all hover:bg-zinc-50",
                      disableEntries && "opacity-50 cursor-not-allowed"
                    )}>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={handleFileUpload} 
                        disabled={disableEntries || isUploading}
                        accept="application/pdf,image/*"
                      />
                      {isUploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                      ) : (
                        <>
                          <Upload className="mb-2 h-8 w-8 text-zinc-400" />
                          <span className="text-xs font-bold text-zinc-500">Clique para enviar o extrato</span>
                          <span className="mt-1 text-[10px] text-zinc-400 text-center">PDF ou Imagem (Máx 5MB)</span>
                        </>
                      )}
                    </label>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Observações da Conferência</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isLocked}
                    rows={4}
                    placeholder="Notas sobre divergências ou avisos para o conselho..."
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-10 flex items-center justify-between border-t border-zinc-100 pt-8">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider",
                    currentClosure?.status === 'conferido' 
                      ? "bg-emerald-500 text-white" 
                      : "bg-amber-100 text-amber-700"
                  )}>
                    {currentClosure?.status === 'conferido' ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Mês Conferido
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4" />
                        Pendente de Conferência
                      </>
                    )}
                  </div>
                  {currentClosure?.status === 'conferido' && (
                    <span className="text-[10px] text-zinc-400 italic">
                      Finalizado por {closures.find(c => c.id === currentClosure.id)?.reviewed_by || 'Administrador'}
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleSave('pending')}
                    disabled={(disableEntries && !canAudit) || saveMutation.isPending}
                    className="rounded-xl border border-zinc-200 bg-white px-6 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Salvar Rascunho
                  </button>
                  {canAudit && (
                    <button 
                      onClick={() => handleSave(currentClosure?.status === 'conferido' ? 'pending' : 'conferido')}
                      disabled={saveMutation.isPending}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all shadow-lg hover:translate-y-[-1px]",
                        currentClosure?.status === 'conferido' 
                          ? "bg-rose-600 shadow-rose-100 hover:bg-rose-700" 
                          : "bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700"
                      )}
                    >
                      {currentClosure?.status === 'conferido' ? 'Destravar Período' : 'Confirmar Conferência'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Recent Activity & Calendar */}
        <div className="space-y-6">
          <div className="premium-card p-6">
            <h4 className="mb-4 flex items-center gap-3 text-sm font-bold text-zinc-900 border-b border-zinc-50 pb-3">
              <Calendar className="h-4 w-4 text-indigo-600" />
              Períodos Encerrados
            </h4>
            <div className="space-y-3">
              {closures.filter(c => c.status === 'conferido').slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between rounded-xl bg-zinc-50 p-3">
                  <div>
                    <p className="text-xs font-bold text-zinc-900">
                      {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][c.month]} {c.year}
                    </p>
                    <p className="text-[10px] text-zinc-500">{c.account}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600">{formatCurrency(c.bank_balance)}</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
              ))}
              {closures.filter(c => c.status === 'conferido').length === 0 && (
                <p className="py-4 text-center text-xs text-zinc-400 italic">Nenhum fechamento realizado.</p>
              )}
            </div>
          </div>

          <div className="premium-card p-6 bg-indigo-900 text-white">
            <h4 className="mb-4 flex items-center gap-3 text-sm font-bold border-b border-indigo-800 pb-3">
              <History className="h-4 w-4" />
              Logs de Segurança
            </h4>
            <div className="space-y-4">
              <div className="text-[10px] space-y-2 opacity-80">
                <p>• Alterações em períodos conferidos requerem nível Admin.</p>
                <p>• Todos os uploads são criptografados e versionados.</p>
                <p>• O extrato bancário é obrigatório para o selo "Conferido".</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
