import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, Calendar, HelpCircle, DollarSign, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
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

export const HistoricalTotalsModal: React.FC<HistoricalTotalsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialYear = '2025'
}) => {
  const { canEdit } = useAuth();
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);
  const [fiscalYearStart, setFiscalYearStart] = useState<string>('12');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allHistoricalTotals, setAllHistoricalTotals] = useState<Record<string, Record<string, MonthData>>>({});
  
  // Data for the current selected year: { "12": { income, expense }, "1": ..., "11": ... }
  const [monthsData, setMonthsData] = useState<Record<string, MonthData>>({});

  const isFiscalDec = fiscalYearStart === '12';

  // Defines the 12 months sequence according to fiscal year
  const fiscalMonths = useMemo(() => {
    if (isFiscalDec) {
      const prevYear = Number(selectedYear) - 1;
      return [
        { key: '12', name: `Dezembro/${prevYear}`, label: `Dezembro (${prevYear})` },
        { key: '1',  name: `Janeiro/${selectedYear}`, label: `Janeiro (${selectedYear})` },
        { key: '2',  name: `Fevereiro`, label: `Fevereiro` },
        { key: '3',  name: `Março`, label: `Março` },
        { key: '4',  name: `Abril`, label: `Abril` },
        { key: '5',  name: `Maio`, label: `Maio` },
        { key: '6',  name: `Junho`, label: `Junho` },
        { key: '7',  name: `Julho`, label: `Julho` },
        { key: '8',  name: `Agosto`, label: `Agosto` },
        { key: '9',  name: `Setembro`, label: `Setembro` },
        { key: '10', name: `Outubro`, label: `Outubro` },
        { key: '11', name: `Novembro`, label: `Novembro` },
      ];
    }
    // Default calendar year (Jan..Dez)
    return [
      { key: '1', name: 'Janeiro', label: 'Janeiro' },
      { key: '2', name: 'Fevereiro', label: 'Fevereiro' },
      { key: '3', name: 'Março', label: 'Março' },
      { key: '4', name: 'Abril', label: 'Abril' },
      { key: '5', name: 'Maio', label: 'Maio' },
      { key: '6', name: 'Junho', label: 'Junho' },
      { key: '7', name: 'Julho', label: 'Julho' },
      { key: '8', name: 'Agosto', label: 'Agosto' },
      { key: '9', name: 'Setembro', label: 'Setembro' },
      { key: '10', name: 'Outubro', label: 'Outubro' },
      { key: '11', name: 'Novembro', label: 'Novembro' },
      { key: '12', name: 'Dezembro', label: 'Dezembro' },
    ];
  }, [isFiscalDec, selectedYear]);

  useEffect(() => {
    if (isOpen) {
      if (initialYear) setSelectedYear(initialYear);
      loadHistoricalData();
    }
  }, [isOpen, initialYear]);

  useEffect(() => {
    // When year changes, load that year's data from memory
    const yearTotals = allHistoricalTotals[selectedYear] || {};
    const prevYearKey = (Number(selectedYear) - 1).toString();
    const updated: Record<string, MonthData> = {};
    fiscalMonths.forEach(m => {
      let inc = yearTotals[m.key]?.income ?? '';
      let exp = yearTotals[m.key]?.expense ?? '';

      // Fallback para Dezembro: se estiver vazio no selectedYear, verificar no ano anterior
      if (m.key === '12' && (!inc || inc === 0) && (!exp || exp === 0) && isFiscalDec) {
        if (allHistoricalTotals[prevYearKey]?.['12']) {
          inc = allHistoricalTotals[prevYearKey]['12'].income ?? '';
          exp = allHistoricalTotals[prevYearKey]['12'].expense ?? '';
        }
      }

      updated[m.key] = {
        income: (inc === 0 || inc === '0') ? '' : inc,
        expense: (exp === 0 || exp === '0') ? '' : exp
      };
    });
    setMonthsData(updated);
  }, [selectedYear, allHistoricalTotals, fiscalMonths, isFiscalDec]);

  const loadHistoricalData = async () => {
    setLoading(true);
    try {
      const settings = await apiService.getSettings();
      setFiscalYearStart(settings?.fiscal_year_start || '12');

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
      const prevYearKey = (Number(selectedYear) - 1).toString();
      const updated: Record<string, MonthData> = {};
      fiscalMonths.forEach(m => {
        let inc = yearTotals[m.key]?.income ?? '';
        let exp = yearTotals[m.key]?.expense ?? '';

        // Fallback para Dezembro: se estiver vazio no selectedYear, verificar no ano anterior
        if (m.key === '12' && (!inc || inc === 0) && (!exp || exp === 0) && isFiscalDec) {
          if (parsedTotals[prevYearKey]?.['12']) {
            inc = parsedTotals[prevYearKey]['12'].income ?? '';
            exp = parsedTotals[prevYearKey]['12'].expense ?? '';
          }
        }

        updated[m.key] = {
          income: (inc === 0 || inc === '0') ? '' : inc,
          expense: (exp === 0 || exp === '0') ? '' : exp
        };
      });
      setMonthsData(updated);
    } catch (error: any) {
      toast.error('Erro ao carregar dados históricos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (monthKey: string, field: 'income' | 'expense', value: string) => {
    setMonthsData(prev => ({
      ...prev,
      [monthKey]: {
        ...prev[monthKey],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast.error('Perfil de conferente possui permissão apenas de visualização.');
      return;
    }
    setSaving(true);
    try {
      const cleanedYearData: Record<string, { income: number; expense: number }> = {};
      fiscalMonths.forEach(m => {
        const item = monthsData[m.key] || { income: 0, expense: 0 };
        cleanedYearData[m.key] = {
          income: parseAmount(item.income),
          expense: parseAmount(item.expense)
        };
      });

      const prevYearKey = (Number(selectedYear) - 1).toString();
      const updatedTotals: Record<string, Record<string, MonthData>> = {
        ...allHistoricalTotals,
        [selectedYear]: cleanedYearData as any,
        ...(isFiscalDec ? {
          [prevYearKey]: {
            ...(allHistoricalTotals[prevYearKey] || {}),
            '12': cleanedYearData['12'] as any
          }
        } : {})
      };

      await apiService.updateSettings({
        historical_totals: JSON.stringify(updatedTotals)
      });

      setAllHistoricalTotals(updatedTotals);
      toast.success(`Totais históricos do Exercício Fiscal ${selectedYear} salvos com sucesso!`, {
        description: isFiscalDec 
          ? `Período: Dezembro/${Number(selectedYear)-1} a Novembro/${selectedYear}` 
          : 'Valores salvos no sistema.'
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
                Totais do Exercício Fiscal
              </h3>
              <p className="text-xs text-zinc-500">
                {isFiscalDec 
                  ? `Ano Fiscal da Igreja: Dezembro/${Number(selectedYear)-1} a Novembro/${selectedYear} (12 meses)`
                  : `Informe os totais mensais de anos anteriores para comparativos.`}
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
                Exercício Fiscal:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-sm font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>Exercício {y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-700">
              <HelpCircle size={15} />
              <span>
                {isFiscalDec 
                  ? `Inicia em 01/Dez/${Number(selectedYear)-1} e encerra em 30/Nov/${selectedYear}.`
                  : 'Informe os totais consolidados de cada mês.'}
              </span>
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
                    <th className="px-4 py-3">Mês do Exercício</th>
                    <th className="px-4 py-3">Total Entradas (R$)</th>
                    <th className="px-4 py-3">Total Saídas (R$)</th>
                    <th className="px-4 py-3 text-right">Saldo do Mês</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {fiscalMonths.map((m) => {
                    const mData = monthsData[m.key] || { income: '', expense: '' };
                    const incVal = parseAmount(mData.income);
                    const expVal = parseAmount(mData.expense);
                    const balVal = incVal - expVal;

                    return (
                      <tr key={m.key} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-zinc-800">
                          {m.name}
                        </td>
                        <td className="px-4 py-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-semibold">R$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={mData.income}
                              readOnly={!canEdit}
                              disabled={!canEdit}
                              onChange={(e) => canEdit && handleInputChange(m.key, 'income', e.target.value)}
                              className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm font-medium text-emerald-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-zinc-50 disabled:cursor-not-allowed"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-rose-500 font-semibold">R$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={mData.expense}
                              readOnly={!canEdit}
                              disabled={!canEdit}
                              onChange={(e) => canEdit && handleInputChange(m.key, 'expense', e.target.value)}
                              className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm font-medium text-rose-700 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:bg-zinc-50 disabled:cursor-not-allowed"
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
                    <td className="px-4 py-3 uppercase tracking-wider text-zinc-700">
                      Total Exercício Fiscal ({selectedYear})
                    </td>
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
            {!canEdit ? (
              <span className="text-zinc-500 font-medium flex items-center gap-1.5 bg-zinc-100 px-2.5 py-1 rounded-lg">
                <ShieldAlert size={14} className="text-zinc-400" /> Perfil Conferente: Apenas Visualização
              </span>
            ) : totalIncome > 0 || totalExpense > 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 size={14} /> Total do ano fiscal pronto para salvar
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
              {canEdit ? 'Cancelar' : 'Fechar'}
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar Totais de {selectedYear}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
