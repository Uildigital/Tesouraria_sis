import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar, HelpCircle, DollarSign, CheckCircle2 } from 'lucide-react';
import { apiService } from '../services/apiService';
import { formatCurrency, parseAmount, cn } from '../lib/utils';
import { toast } from 'sonner';

interface HistoricalTotalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialYear?: string;
}

interface MonthData {
  income: string | number;
  expense: string | number;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const HistoricalTotalsModal: React.FC<HistoricalTotalsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialYear = '2025'
}) => {
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allHistoricalTotals, setAllHistoricalTotals] = useState<Record<string, Record<string, MonthData>>>({});
  
  // Data for the current selected year: { "1": { income: 0, expense: 0 }, ... }
  const [monthsData, setMonthsData] = useState<Record<string, MonthData>>(() => {
    const initial: Record<string, MonthData> = {};
    for (let i = 1; i <= 12; i++) {
      initial[i.toString()] = { income: '', expense: '' };
    }
    return initial;
  });

  useEffect(() => {
    if (isOpen) {
      loadHistoricalData();
    }
  }, [isOpen]);

  useEffect(() => {
    // When year changes, load that year's data from memory
    const yearTotals = allHistoricalTotals[selectedYear] || {};
    const updated: Record<string, MonthData> = {};
    for (let i = 1; i <= 12; i++) {
      const mStr = i.toString();
      updated[mStr] = {
        income: yearTotals[mStr]?.income ?? '',
        expense: yearTotals[mStr]?.expense ?? ''
      };
    }
    setMonthsData(updated);
  }, [selectedYear, allHistoricalTotals]);

  const loadHistoricalData = async () => {
    setLoading(true);
    try {
      const settings = await apiService.getSettings();
      let parsedTotals: Record<string, Record<string, MonthData>> = {};
      if (settings?.historical_totals) {
        try {
          parsedTotals = typeof settings.historical_totals === 'string'
            ? JSON.parse(settings.historical_totals)
            : settings.historical_totals;
        } catch (e) {
          console.error('Error parsing historical_totals:', e);
        }
      }
      setAllHistoricalTotals(parsedTotals);

      const yearTotals = parsedTotals[selectedYear] || {};
      const updated: Record<string, MonthData> = {};
      for (let i = 1; i <= 12; i++) {
        const mStr = i.toString();
        updated[mStr] = {
          income: yearTotals[mStr]?.income ?? '',
          expense: yearTotals[mStr]?.expense ?? ''
        };
      }
      setMonthsData(updated);
    } catch (error: any) {
      toast.error('Erro ao carregar dados históricos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (monthNum: number, field: 'income' | 'expense', value: string) => {
    setMonthsData(prev => ({
      ...prev,
      [monthNum.toString()]: {
        ...prev[monthNum.toString()],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Clean up values as numbers
      const cleanedYearData: Record<string, { income: number; expense: number }> = {};
      for (let i = 1; i <= 12; i++) {
        const mStr = i.toString();
        const m = monthsData[mStr] || { income: 0, expense: 0 };
        cleanedYearData[mStr] = {
          income: parseAmount(m.income),
          expense: parseAmount(m.expense)
        };
      }

      const updatedTotals = {
        ...allHistoricalTotals,
        [selectedYear]: cleanedYearData
      };

      await apiService.updateSettings({
        historical_totals: JSON.stringify(updatedTotals)
      });

      setAllHistoricalTotals(updatedTotals);
      toast.success(`Totais históricos de ${selectedYear} salvos com sucesso!`, {
        description: 'Os valores já estão disponíveis para o Comparativo Anual.'
      });
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error('Erro ao salvar totais históricos: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Calculate annual summary
  const totalIncome: number = Object.values(monthsData).reduce<number>(
    (acc, m) => acc + parseAmount((m as MonthData).income),
    0
  );
  const totalExpense: number = Object.values(monthsData).reduce<number>(
    (acc, m) => acc + parseAmount((m as MonthData).expense),
    0
  );
  const totalBalance: number = totalIncome - totalExpense;

  const currentYearNum = new Date().getFullYear();
  const yearOptions = [
    (currentYearNum + 1).toString(),
    currentYearNum.toString(),
    (currentYearNum - 1).toString(),
    (currentYearNum - 2).toString(),
    (currentYearNum - 3).toString(),
    (currentYearNum - 4).toString(),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-zinc-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-600">
              <Calendar size={22} />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-zinc-900">
                Totais Históricos Anuais
              </h3>
              <p className="text-xs text-zinc-500">
                Informe os totais mensais de anos anteriores (ex: 2025) para comparativo com anos atuais.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Seletor de Ano e Ajuda */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 p-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Ano de Referência:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-sm font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>Ano {y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-700">
              <HelpCircle size={15} />
              <span>Digite apenas os totais consolidados. O sistema calcula o saldo automaticamente.</span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
              <p className="mt-2 text-sm text-zinc-500">Carregando dados históricos...</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-100/70 text-[10px] font-bold uppercase tracking-wider text-zinc-600 border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-3">Mês</th>
                    <th className="px-4 py-3">Total Entradas (R$)</th>
                    <th className="px-4 py-3">Total Saídas (R$)</th>
                    <th className="px-4 py-3 text-right">Saldo do Mês</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {MONTH_NAMES.map((monthName, idx) => {
                    const mNum = idx + 1;
                    const mData = monthsData[mNum.toString()] || { income: '', expense: '' };
                    const incVal = parseAmount(mData.income);
                    const expVal = parseAmount(mData.expense);
                    const balVal = incVal - expVal;

                    return (
                      <tr key={mNum} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-zinc-800">
                          {monthName}
                        </td>
                        <td className="px-4 py-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-semibold">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={mData.income}
                              onChange={(e) => handleInputChange(mNum, 'income', e.target.value)}
                              className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm font-medium text-emerald-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-rose-500 font-semibold">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={mData.expense}
                              onChange={(e) => handleInputChange(mNum, 'expense', e.target.value)}
                              className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm font-medium text-rose-700 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                            />
                          </div>
                        </td>
                        <td className={cn(
                          "px-4 py-2.5 text-right font-bold text-sm",
                          balVal >= 0 ? "text-indigo-700" : "text-rose-600"
                        )}>
                          {formatCurrency(balVal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-zinc-50 font-bold border-t-2 border-zinc-200 text-xs">
                  <tr>
                    <td className="px-4 py-3 uppercase tracking-wider text-zinc-700">Total Anual ({selectedYear})</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold text-sm">{formatCurrency(totalIncome)}</td>
                    <td className="px-4 py-3 text-rose-700 font-bold text-sm">{formatCurrency(totalExpense)}</td>
                    <td className={cn(
                      "px-4 py-3 text-right font-bold text-sm",
                      totalBalance >= 0 ? "text-indigo-700" : "text-rose-600"
                    )}>
                      {formatCurrency(totalBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4 bg-zinc-50/50">
          <div className="text-xs text-zinc-500">
            {totalIncome > 0 || totalExpense > 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 size={14} /> Total anual pronto para salvar
              </span>
            ) : (
              <span>Preencha os valores mensais e clique em salvar</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar Totais de {selectedYear}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
