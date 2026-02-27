import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, cn } from '../lib/utils';

export const Reports: React.FC = () => {
  const { organization } = useAuth();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    if (organization) {
      generateReport();
    }
  }, [organization, month]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const startOfMonth = `${month}-01`;
      const endOfMonth = new Date(new Date(startOfMonth).getFullYear(), new Date(startOfMonth).getMonth() + 1, 0).toISOString().slice(0, 10);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*, categories(*)')
        .eq('organization_id', organization?.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (transactions) {
        const grouped = transactions.reduce((acc: any, t: any) => {
          const catName = t.categories?.name || 'Sem Categoria';
          if (!acc[t.type]) acc[t.type] = {};
          if (!acc[t.type][catName]) acc[t.type][catName] = 0;
          acc[t.type][catName] += t.amount;
          return acc;
        }, { income: {}, expense: {} });

        const totalIncome = Object.values(grouped.income).reduce((a: any, b: any) => a + b, 0) as number;
        const totalExpense = Object.values(grouped.expense).reduce((a: any, b: any) => a + b, 0) as number;

        setReportData({
          grouped,
          totalIncome,
          totalExpense,
          net: totalIncome - totalExpense
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Relatórios</h2>
          <p className="text-zinc-500">Gere balancetes e relatórios financeiros.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">
            <Printer className="mr-2 h-5 w-5" />
            Imprimir
          </button>
          <button className="flex items-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            <Download className="mr-2 h-5 w-5" />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-8 flex items-center justify-between border-b border-zinc-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-zinc-100 p-3">
              <FileText className="h-6 w-6 text-zinc-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Balancete Mensal</h3>
              <p className="text-sm text-zinc-500">Período: {month}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-zinc-700">Mês de Referência:</label>
            <input 
              type="month" 
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          </div>
        ) : reportData ? (
          <div className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Total Entradas</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900">{formatCurrency(reportData.totalIncome)}</p>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Total Saídas</p>
                <p className="mt-1 text-2xl font-bold text-red-900">{formatCurrency(reportData.totalExpense)}</p>
              </div>
              <div className={cn("rounded-xl p-4", reportData.net >= 0 ? "bg-blue-50" : "bg-amber-50")}>
                <p className={cn("text-xs font-semibold uppercase tracking-wider", reportData.net >= 0 ? "text-blue-700" : "text-amber-700")}>Saldo do Período</p>
                <p className={cn("mt-1 text-2xl font-bold", reportData.net >= 0 ? "text-blue-900" : "text-amber-900")}>{formatCurrency(reportData.net)}</p>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h4 className="mb-4 flex items-center text-sm font-bold uppercase tracking-wider text-emerald-700">
                  <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500"></span>
                  Receitas por Categoria
                </h4>
                <div className="space-y-2">
                  {Object.entries(reportData.grouped.income).map(([cat, val]: any) => (
                    <div key={cat} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3">
                      <span className="text-sm font-medium text-zinc-700">{cat}</span>
                      <span className="text-sm font-bold text-zinc-900">{formatCurrency(val)}</span>
                    </div>
                  ))}
                  {Object.keys(reportData.grouped.income).length === 0 && <p className="text-sm text-zinc-400 italic">Nenhuma receita no período.</p>}
                </div>
              </div>

              <div>
                <h4 className="mb-4 flex items-center text-sm font-bold uppercase tracking-wider text-red-700">
                  <span className="mr-2 h-2 w-2 rounded-full bg-red-500"></span>
                  Despesas por Categoria
                </h4>
                <div className="space-y-2">
                  {Object.entries(reportData.grouped.expense).map(([cat, val]: any) => (
                    <div key={cat} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3">
                      <span className="text-sm font-medium text-zinc-700">{cat}</span>
                      <span className="text-sm font-bold text-zinc-900">{formatCurrency(val)}</span>
                    </div>
                  ))}
                  {Object.keys(reportData.grouped.expense).length === 0 && <p className="text-sm text-zinc-400 italic">Nenhuma despesa no período.</p>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-zinc-500">Selecione um mês para gerar o relatório.</p>
        )}
      </div>
    </div>
  );
};
