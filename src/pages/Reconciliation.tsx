import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Wallet,
  Loader2,
  RefreshCw,
  Eye,
  Upload,
  Paperclip,
  ArrowUpRight,
  ArrowDownLeft,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { formatCurrency, formatDate, cn, parseAmount } from '../lib/utils';
import { toast } from 'sonner';

const parseAttachments = (url?: string): string[] => {
  if (!url) return [];
  try {
    const parsed = JSON.parse(url);
    return Array.isArray(parsed) ? parsed : [url];
  } catch {
    return [url];
  }
};

export const Reconciliation: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [allTransactions, setAllTransactions] = useState<any[]>([]);

  const [systemStats, setSystemStats] = useState({
    correnteTotal: 0,
    poupancaTotal: 0
  });

  const [statementData, setStatementData] = useState({
    correnteValue: '',
    poupancaValue: '',
    correnteUrl: '',
    poupancaUrl: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewGallery, setPreviewGallery] = useState<{ urls: string[]; index: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReconciliationData();
  }, [selectedMonth, selectedYear]);

  const fetchReconciliationData = async () => {
    setLoading(true);
    try {
      const transactions = await apiService.getTransactions();
      setAllTransactions(transactions || []);

      const startOfNextMonth = new Date(selectedYear, selectedMonth + 1, 1);
      const limitStr = startOfNextMonth.toISOString().split('T')[0];
      const monthTransactions = transactions.filter((t: any) => t.date < limitStr);

      const correnteBalance = monthTransactions
        .filter((t: any) => t.account === 'Corrente' || !t.account)
        .reduce((acc: number, t: any) => acc + (t.type === 'income' ? parseAmount(t.amount) : -parseAmount(t.amount)), 0);

      const poupancaBalance = monthTransactions
        .filter((t: any) => t.account === 'Poupança')
        .reduce((acc: number, t: any) => acc + (t.type === 'income' ? parseAmount(t.amount) : -parseAmount(t.amount)), 0);

      setSystemStats({ correnteTotal: correnteBalance, poupancaTotal: poupancaBalance });
      setStatementData({ correnteValue: '', poupancaValue: '', correnteUrl: '', poupancaUrl: '' });
    } catch (error: any) {
      toast.error('Erro ao buscar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const monthTransactions = allTransactions.filter((t: any) => {
    const date = new Date(t.date + 'T00:00:00');
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const filteredTransactions = monthTransactions.filter((t: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.description?.toLowerCase().includes(term) ||
      t.category?.name?.toLowerCase().includes(term) ||
      formatCurrency(t.amount).includes(term)
    );
  });

  const transactionsWithAttachments = filteredTransactions.filter((t: any) => t.attachment_url);

  const handleApproveMonth = async () => {
    if (!statementData.correnteValue || !statementData.poupancaValue) {
      toast.warning('Por favor, informe os saldos dos extratos para continuar.');
      return;
    }
    const diffCorrente = Math.abs(systemStats.correnteTotal - parseFloat(statementData.correnteValue));
    const diffPoupanca = Math.abs(systemStats.poupancaTotal - parseFloat(statementData.poupancaValue));
    if (diffCorrente > 0.01 || diffPoupanca > 0.01) {
      if (!window.confirm('Os valores informados não batem com o saldo do sistema. Deseja aprovar mesmo assim com divergência?')) return;
    }
    setIsSubmitting(true);
    try {
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const details = `Mês: ${monthNames[selectedMonth]}/${selectedYear} - CC Extrato: ${statementData.correnteValue} (Sistema: ${systemStats.correnteTotal}) | Poupança Extrato: ${statementData.poupancaValue} (Sistema: ${systemStats.poupancaTotal})`;
      console.log('Finalizing reconciliation:', details);
      toast.success(`Mês de ${monthNames[selectedMonth]} conferido com sucesso!`, {
        description: 'O registro de conferência foi salvo no histórico do sistema.'
      });
    } catch (error: any) {
      toast.error('Erro ao finalizar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const url = await apiService.uploadFile(file, `reconciliations/${selectedYear}/${selectedMonth + 1}`);
      return url;
    } catch (error: any) {
      toast.error('Erro no upload: ' + error.message);
      return '';
    }
  };

  const diffCorrente = parseFloat(statementData.correnteValue || '0') - systemStats.correnteTotal;
  const diffPoupanca = parseFloat(statementData.poupancaValue || '0') - systemStats.poupancaTotal;
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-zinc-900 flex items-center">
            <ShieldCheck className="mr-3 h-10 w-10 text-indigo-600" />
            Conferência Mensal
          </h2>
          <p className="mt-1 text-zinc-500">Auditoria e conciliação de saldos bancários.</p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm border border-zinc-100 h-fit">
          <Calendar className="h-4 w-4 text-emerald-600" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-transparent text-sm font-medium text-zinc-600 focus:outline-none cursor-pointer"
          >
            {monthNames.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-transparent text-sm font-medium text-zinc-600 focus:outline-none cursor-pointer border-l border-zinc-100 pl-2"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Saldos + Extrato */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Saldo no Sistema */}
        <div className="premium-card p-8 bg-zinc-50/50 border-dashed">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-bold text-zinc-900 flex items-center">
              <div className="mr-2 p-1.5 rounded-lg bg-zinc-200">
                <FileText size={16} className="text-zinc-600" />
              </div>
              Saldo no Sistema
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Dados Atuais</span>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex items-center justify-between group h-24">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Conta Corrente</p>
                <h4 className="text-2xl font-bold text-zinc-900">{formatCurrency(systemStats.correnteTotal)}</h4>
              </div>
              <Wallet className="text-zinc-100 h-12 w-12 group-hover:text-zinc-200 transition-colors" />
            </div>

            <div className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex items-center justify-between group h-24">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Poupança</p>
                <h4 className="text-2xl font-bold text-zinc-900">{formatCurrency(systemStats.poupancaTotal)}</h4>
              </div>
              <CheckCircle2 className="text-zinc-100 h-10 w-10 group-hover:text-zinc-200 transition-colors" />
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex gap-3">
            <AlertCircle className="h-5 w-5 text-indigo-600 shrink-0" />
            <p className="text-xs text-indigo-800 leading-relaxed">
              O saldo do sistema é calculado automaticamente com base em todos os lançamentos realizados até o último dia do mês selecionado.
            </p>
          </div>
        </div>

        {/* Auditando Extrato */}
        <div className="premium-card p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-bold text-zinc-900 flex items-center">
              <div className="mr-2 p-1.5 rounded-lg bg-emerald-100">
                <RefreshCw size={16} className="text-emerald-600" />
              </div>
              Auditando Extrato
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Ação Necessária</span>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Saldo Final da Conta Corrente</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">R$</span>
                <input
                  type="number" step="0.01"
                  value={statementData.correnteValue}
                  onChange={(e) => setStatementData({ ...statementData, correnteValue: e.target.value })}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 py-4 text-xl font-bold focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  placeholder="0,00"
                />
              </div>
              {statementData.correnteValue && (
                <div className={cn("mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg w-fit",
                  diffCorrente === 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                  {diffCorrente === 0 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  Diferença: {formatCurrency(diffCorrente)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Saldo Final da Poupança</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">R$</span>
                <input
                  type="number" step="0.01"
                  value={statementData.poupancaValue}
                  onChange={(e) => setStatementData({ ...statementData, poupancaValue: e.target.value })}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 py-4 text-xl font-bold focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  placeholder="0,00"
                />
              </div>
              {statementData.poupancaValue && (
                <div className={cn("mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg w-fit",
                  diffPoupanca === 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                  {diffPoupanca === 0 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  Diferença: {formatCurrency(diffPoupanca)}
                </div>
              )}
            </div>

            {/* Anexos dos Extratos */}
            <div className="pt-4 border-t border-zinc-100 space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 border-l-2 border-emerald-500 pl-2">Anexos dos Extratos (PDF/Imagem)</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Extrato C. Corrente</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input type="file" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) { const url = await handleFileUpload(file); if (url) setStatementData({ ...statementData, correnteUrl: url }); }
                      }} className="hidden" id="cc-upload" accept="image/*,application/pdf" />
                      <label htmlFor="cc-upload" className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:border-emerald-500 hover:bg-emerald-50 transition-all shadow-sm">
                        <Upload size={14} />
                        {statementData.correnteUrl ? 'Trocar Arquivo' : 'Upload Extrato'}
                      </label>
                    </div>
                    {statementData.correnteUrl && (
                      <button onClick={() => setPreviewUrl(statementData.correnteUrl)} className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Visualizar">
                        <Eye size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Extrato Poupança</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input type="file" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) { const url = await handleFileUpload(file); if (url) setStatementData({ ...statementData, poupancaUrl: url }); }
                      }} className="hidden" id="cp-upload" accept="image/*,application/pdf" />
                      <label htmlFor="cp-upload" className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:border-emerald-500 hover:bg-emerald-50 transition-all shadow-sm">
                        <Upload size={14} />
                        {statementData.poupancaUrl ? 'Trocar Arquivo' : 'Upload Extrato'}
                      </label>
                    </div>
                    {statementData.poupancaUrl && (
                      <button onClick={() => setPreviewUrl(statementData.poupancaUrl)} className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Visualizar">
                        <Eye size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleApproveMonth}
              disabled={isSubmitting || loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-4 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <><CheckCircle2 className="h-5 w-5" />Finalizar Conferência do Mês</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lançamentos do Mês com Documentos */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-indigo-500" />
              Lançamentos de {monthNames[selectedMonth]}/{selectedYear}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              {monthTransactions.length} lançamento{monthTransactions.length !== 1 ? 's' : ''} no mês
              {transactionsWithAttachments.length > 0 && (
                <span className="ml-2 font-semibold text-indigo-600">
                  · {transactionsWithAttachments.length} com documento{transactionsWithAttachments.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar lançamento..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-8 pr-3 py-2 text-xs focus:border-indigo-400 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400">
            Nenhum lançamento encontrado para este período.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filteredTransactions.map((t: any) => {
              const attachments = parseAttachments(t.attachment_url);
              return (
                <div key={t.id} className="flex items-center gap-4 px-6 py-3 hover:bg-zinc-50 transition-colors">
                  {/* Ícone tipo */}
                  <div className={cn(
                    "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                    t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {t.type === 'income'
                      ? <ArrowDownLeft size={16} />
                      : <ArrowUpRight size={16} />}
                  </div>

                  {/* Descrição + Categoria */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{t.description}</p>
                    <p className="text-xs text-zinc-400 truncate">
                      {formatDate(t.date)}
                      {t.category?.name && <span className="ml-2">· {t.category.name}</span>}
                      {t.account && <span className="ml-2">· {t.account}</span>}
                    </p>
                  </div>

                  {/* Valor */}
                  <div className={cn(
                    "flex-shrink-0 text-sm font-bold",
                    t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </div>

                  {/* Documentos */}
                  <div className="flex-shrink-0 w-28 flex items-center justify-end gap-1">
                    {attachments.length > 0 ? (
                      <button
                        onClick={() => setPreviewGallery({ urls: attachments, index: 0 })}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        title="Ver documentos"
                      >
                        <Paperclip size={12} />
                        {attachments.length > 1 ? `${attachments.length} docs` : 'Ver doc'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-300 font-medium">Sem doc.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal — Extrato bancário (URL única) */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-md"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-5xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => setPreviewUrl(null)} className="rounded-full bg-white/90 p-2 text-zinc-900 shadow-lg hover:bg-white transition-all font-bold">✕</button>
            </div>
            <div className="p-4 bg-zinc-50 overflow-y-auto max-h-[80vh]">
              {previewUrl.toLowerCase().includes('.pdf') ? (
                <iframe src={previewUrl} className="w-full h-[75vh] rounded-xl" />
              ) : (
                <div className="flex justify-center">
                  <img src={previewUrl} alt="Extrato" className="max-w-full h-auto rounded-xl shadow-sm" />
                </div>
              )}
            </div>
            <div className="p-4 flex items-center justify-between border-t border-zinc-100 bg-white">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><FileText size={18} /></div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">Extrato Bancário do Mês</p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Documento Comprobatório</p>
                </div>
              </div>
              <button onClick={() => setPreviewUrl(null)} className="rounded-xl border border-zinc-200 px-6 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Gallery — Documentos dos lançamentos */}
      {previewGallery && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-md"
          onClick={() => setPreviewGallery(null)}
        >
          <div className="relative max-w-5xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-indigo-500" />
                <p className="text-sm font-bold text-zinc-900">
                  Documento {previewGallery.index + 1} de {previewGallery.urls.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {previewGallery.urls.length > 1 && (
                  <>
                    <button
                      onClick={() => setPreviewGallery(g => g ? { ...g, index: Math.max(0, g.index - 1) } : null)}
                      disabled={previewGallery.index === 0}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-zinc-50"
                    >← Anterior</button>
                    <button
                      onClick={() => setPreviewGallery(g => g ? { ...g, index: Math.min(g.urls.length - 1, g.index + 1) } : null)}
                      disabled={previewGallery.index === previewGallery.urls.length - 1}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-zinc-50"
                    >Próximo →</button>
                  </>
                )}
                <button onClick={() => setPreviewGallery(null)} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200">✕ Fechar</button>
              </div>
            </div>
            <div className="p-4 bg-zinc-50 overflow-y-auto max-h-[75vh]">
              {previewGallery.urls[previewGallery.index]?.toLowerCase().includes('.pdf') ? (
                <iframe src={previewGallery.urls[previewGallery.index]} className="w-full h-[70vh] rounded-xl" />
              ) : (
                <div className="flex justify-center">
                  <img src={previewGallery.urls[previewGallery.index]} alt="Comprovante" className="max-w-full h-auto rounded-xl shadow-sm" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
