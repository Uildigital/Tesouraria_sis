import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  FileCheck,
  Loader2,
  ChevronDown,
  X,
  Check
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn, parseAmount } from '../lib/utils';
import { Transaction, Category } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Reports: React.FC = () => {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [month]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [year, monthNum] = month.split('-').map(Number);
      const startOfMonth = `${month}-01`;
      const lastDay = new Date(year, monthNum, 0).getDate();
      const endOfMonth = `${month}-${String(lastDay).padStart(2, '0')}`;

      const [transData, catData] = await Promise.all([
        apiService.getTransactions(),
        apiService.getCategories()
      ]);
      
      const filtered = transData
        .filter(t => {
          return t.date >= startOfMonth && t.date <= endOfMonth;
        })
        .sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
          
          if (dateA !== dateB) {
            return dateA - dateB; // Reports are usually ascending
          }
          
          // For same day, preserve entry order (Ascending within the day)
          const createA = new Date(a.created_at || 0).getTime();
          const createB = new Date(b.created_at || 0).getTime();
          return createA - createB;
        });

      setTransactions(filtered || []);
      setCategories(catData || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get all descendants of a category
  const getDescendantIds = (catId: string, allCats: Category[]): string[] => {
    const children = allCats.filter(c => c.parent_id === catId);
    let ids = children.map(c => c.id);
    children.forEach(child => {
      ids = [...ids, ...getDescendantIds(child.id, allCats)];
    });
    return ids;
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesAccount = accountFilter === 'all' || (t.account || 'Corrente') === accountFilter;

    let matchesCategory = true;
    if (selectedCategoryIds.length > 0) {
      const effectiveIds = new Set<string>();
      selectedCategoryIds.forEach(id => {
        effectiveIds.add(id);
        getDescendantIds(id, categories).forEach(childId => effectiveIds.add(childId));
      });
      matchesCategory = effectiveIds.has(t.category_id);
    }

    return matchesType && matchesAccount && matchesCategory;
  });

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const renderCategoryOptions = (parentId: string | null = null, level = 0) => {
    return categories
      .filter(c => c.parent_id === (parentId || undefined) || (!parentId && !c.parent_id))
      .map(cat => (
        <React.Fragment key={cat.id}>
          <button
            onClick={() => toggleCategory(cat.id)}
            className={cn(
              "flex w-full items-center px-4 py-2 text-sm transition-colors hover:bg-zinc-50",
              selectedCategoryIds.includes(cat.id) ? "bg-emerald-50 text-emerald-700 font-bold" : "text-zinc-600"
            )}
            style={{ paddingLeft: `${(level * 1.5) + 1}rem` }}
          >
            <div className={cn(
              "mr-2 flex h-4 w-4 items-center justify-center rounded border transition-all",
              selectedCategoryIds.includes(cat.id) ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 bg-white"
            )}>
              {selectedCategoryIds.includes(cat.id) && <Check size={12} strokeWidth={4} />}
            </div>
            {cat.name}
          </button>
          {renderCategoryOptions(cat.id, level + 1)}
        </React.Fragment>
      ));
  };

  const generatePDF = () => {
    if (filteredTransactions.length === 0) return;
    setIsExporting(true);

    try {
      const doc = new jsPDF();
      const [year, monthNum] = month.split('-').map(Number);
      const formattedMonth = format(new Date(year, monthNum - 1, 1), 'MMMM yyyy', { locale: ptBR });

      // Header
      doc.setFontSize(22);
      doc.setTextColor(26, 34, 56); // Premium Navy
      doc.text('Igreja', 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Balancete Financeiro - ${formattedMonth}`, 14, 30);
      if (accountFilter !== 'all') {
        doc.setFontSize(10);
        doc.text(`Conta: ${accountFilter}`, 14, 36);
        doc.line(14, 38, 196, 38);
      } else {
        doc.line(14, 35, 196, 35);
      }

      // Summary
      const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0);
      const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0);
      const balance = income - expenses;

      doc.setFontSize(10);
      doc.text(`Total de Entradas: ${formatCurrency(income)}`, 14, 45);
      doc.text(`Total de Saídas: ${formatCurrency(expenses)}`, 14, 50);
      doc.setFont('helvetica', 'bold');
      doc.text(`Saldo do Período: ${formatCurrency(balance)}`, 14, 55);
      doc.setFont('helvetica', 'normal');

      // Table
      const tableData = filteredTransactions.map(t => [
        formatDate(t.date),
        t.description,
        t.account || 'Corrente',
        t.category?.name || '-',
        t.type === 'income' ? 'Entrada' : 'Saída',
        formatCurrency(t.amount)
      ]);

      autoTable(doc, {
        startY: accountFilter !== 'all' ? 70 : 65,
        head: [['Data', 'Descrição', 'Conta', 'Categoria', 'Tipo', 'Valor']],
        body: tableData,
        headStyles: { fillColor: [26, 34, 56], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        margin: { top: 65 },
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Gerado por ChurchFinance em ${new Date().toLocaleString()}`, 14, 285);
        doc.text(`Página ${i} de ${pageCount}`, 180, 285);
      }

      doc.save(`Balancete_${month}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0);
  const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0);

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-zinc-900">Relatórios</h2>
          <p className="mt-1 text-zinc-500">Análise detalhada e transparência financeira.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all"
          >
            <Printer className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          <button 
            onClick={generatePDF}
            disabled={isExporting || filteredTransactions.length === 0}
            className="flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      <div className="premium-card p-8">
        <div className="mb-10 flex flex-col gap-8 border-b border-zinc-100 pb-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="rounded-2xl bg-indigo-50 p-4">
                <FileText className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold text-zinc-900">Balancete Mensal</h3>
                <p className="text-sm text-zinc-500">Relatório consolidado de movimentações.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Mês de Referência</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="month" 
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full sm:w-auto rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2.5 text-sm font-medium focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Filtrar por Tipo</label>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
              >
                <option value="all">Todos os Tipos</option>
                <option value="income">Entradas</option>
                <option value="expense">Saídas</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Filtrar por Conta</label>
              <select 
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value as any)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
              >
                <option value="all">Todas as Contas</option>
                <option value="Corrente">Conta Corrente</option>
                <option value="Poupança">Poupança</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Filtrar por Categorias (Pai/Filho)</label>
              <div className="relative">
                <button
                  onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                >
                  <span className="truncate">
                    {selectedCategoryIds.length === 0 
                      ? "Todas as Categorias" 
                      : `${selectedCategoryIds.length} selecionada(s)`}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isCategoryMenuOpen && "rotate-180")} />
                </button>

                {isCategoryMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsCategoryMenuOpen(false)} 
                    />
                    <div className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-zinc-100 bg-white py-2 shadow-xl animate-in fade-in zoom-in duration-200">
                      <div className="sticky top-0 z-10 bg-white px-4 pb-2 border-b border-zinc-50 mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Categorias</span>
                        {selectedCategoryIds.length > 0 && (
                          <button 
                            onClick={() => setSelectedCategoryIds([])}
                            className="text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:text-rose-600"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                      {renderCategoryOptions()}
                    </div>
                  </>
                )}
              </div>
              {selectedCategoryIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedCategoryIds.map(id => {
                    const cat = categories.find(c => c.id === id);
                    return (
                      <span key={id} className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        {cat?.name}
                        <button onClick={() => toggleCategory(id)} className="ml-1 hover:text-rose-500">
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          <div className="rounded-2xl bg-emerald-50/50 p-4 sm:p-6 border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Entradas</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-emerald-700 truncate">{formatCurrency(income)}</p>
          </div>
          <div className="rounded-2xl bg-rose-50/50 p-4 sm:p-6 border border-rose-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-rose-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-700">Saídas</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-rose-700 truncate">{formatCurrency(expenses)}</p>
          </div>
          <div className="rounded-2xl bg-indigo-50/50 p-4 sm:p-6 border border-indigo-100 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="h-4 w-4 text-indigo-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">Saldo</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-indigo-700 truncate">{formatCurrency(income - expenses)}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Conta</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-medium">
                      Nenhum lançamento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 text-zinc-600 font-medium">{formatDate(t.date)}</td>
                      <td className="px-6 py-4 font-bold text-zinc-900">{t.description}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                          t.account === 'Poupança' ? "bg-indigo-50 text-indigo-700" : "bg-zinc-100 text-zinc-700"
                        )}>
                          {t.account || 'Corrente'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-bold text-zinc-600">
                          {t.category?.name}
                        </span>
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right font-bold",
                        t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
