import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  FileCheck,
  Loader2
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Transaction } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Reports: React.FC = () => {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [month]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const startOfMonth = `${month}-01`;
      const endOfMonth = new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth() + 1, 0).toISOString().split('T')[0];

      const data = await apiService.getTransactions();
      
      const filtered = data
        .filter(t => {
          return t.date >= startOfMonth && t.date <= endOfMonth;
        })
        .sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
          const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
          return dateA.getTime() - dateB.getTime(); // Ascending for reports
        });

      setTransactions(filtered || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (transactions.length === 0) return;
    setIsExporting(true);

    try {
      const doc = new jsPDF();
      const formattedMonth = format(new Date(month + '-01'), 'MMMM yyyy', { locale: ptBR });

      // Header
      doc.setFontSize(22);
      doc.setTextColor(26, 34, 56); // Premium Navy
      doc.text('Igreja', 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Balancete Financeiro - ${formattedMonth}`, 14, 30);
      
      doc.setDrawColor(212, 175, 55); // Gold
      doc.setLineWidth(0.5);
      doc.line(14, 35, 196, 35);

      // Summary
      const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const balance = income - expenses;

      doc.setFontSize(10);
      doc.text(`Total de Entradas: ${formatCurrency(income)}`, 14, 45);
      doc.text(`Total de Saídas: ${formatCurrency(expenses)}`, 14, 50);
      doc.setFont('helvetica', 'bold');
      doc.text(`Saldo do Período: ${formatCurrency(balance)}`, 14, 55);
      doc.setFont('helvetica', 'normal');

      // Table
      const tableData = transactions.map(t => [
        formatDate(t.date),
        t.description,
        t.category?.name || '-',
        t.type === 'income' ? 'Entrada' : 'Saída',
        formatCurrency(t.amount)
      ]);

      (doc as any).autoTable({
        startY: 65,
        head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
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

  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

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
            disabled={isExporting || transactions.length === 0}
            className="flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      <div className="premium-card p-8">
        <div className="mb-10 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-8">
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

        <div className="grid gap-6 sm:grid-cols-3 mb-10">
          <div className="rounded-2xl bg-emerald-50/50 p-6 border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Total Entradas</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(income)}</p>
          </div>
          <div className="rounded-2xl bg-rose-50/50 p-6 border border-rose-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-rose-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-700">Total Saídas</span>
            </div>
            <p className="text-2xl font-bold text-rose-700">{formatCurrency(expenses)}</p>
          </div>
          <div className="rounded-2xl bg-indigo-50/50 p-6 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="h-4 w-4 text-indigo-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">Saldo Líquido</span>
            </div>
            <p className="text-2xl font-bold text-indigo-700">{formatCurrency(income - expenses)}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 font-medium">
                      Nenhum lançamento encontrado para este período.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 text-zinc-600 font-medium">{formatDate(t.date)}</td>
                      <td className="px-6 py-4 font-bold text-zinc-900">{t.description}</td>
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
