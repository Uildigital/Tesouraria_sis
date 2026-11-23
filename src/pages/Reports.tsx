import React, { useState, useEffect, useMemo } from 'react';
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
  Check,
  ArrowRight,
  Wallet,
  PieChart,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Edit3,
  BarChart3,
  CheckCircle2,
  HelpCircle,
  Clock,
  Trash2,
  Plus,
  Coins,
  Info,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency, formatDate, cn, parseAmount } from '../lib/utils';
import { Transaction, Category } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HistoricalTotalsModal } from '../components/HistoricalTotalsModal';

export interface DeductionItem {
  id: string;
  description: string;
  income: number;
  expense: number;
}

export const Reports: React.FC = () => {
  const { canEdit, profile } = useAuth();
  const { settings } = useSettings();
  const currentYearStr = new Date().getFullYear().toString();
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const [periodMode, setPeriodMode] = useState<'month' | 'year' | 'compare'>('month');
  const [month, setMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [compareYear, setCompareYear] = useState((Number(currentYearStr) - 1).toString());
  const [fiscalYearStart, setFiscalYearStart] = useState(settings.fiscal_year_start || '12');

  const isFiscalDec = fiscalYearStart === '12';

  const [availableYears, setAvailableYears] = useState<string[]>([
    (Number(currentYearStr) + 1).toString(),
    currentYearStr,
    (Number(currentYearStr) - 1).toString(),
    (Number(currentYearStr) - 2).toString(),
    (Number(currentYearStr) - 3).toString(),
    (Number(currentYearStr) - 4).toString(),
  ]);

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [historicalTotals, setHistoricalTotals] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState(false);

  // Deduções / Recursos de Terceiros e Repasses (Não Operacionais)
  const [deductions, setDeductions] = useState<Record<string, DeductionItem[]>>({});
  const [activeDeductionYear, setActiveDeductionYear] = useState<string>(currentYearStr);
  const [deductionDesc, setDeductionDesc] = useState('');
  const [deductionIncome, setDeductionIncome] = useState('');
  const [deductionExpense, setDeductionExpense] = useState('');
  const [isSavingDeduction, setIsSavingDeduction] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [month, selectedYear, compareYear, periodMode]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [transData, catData, settingsData] = await Promise.all([
        apiService.getTransactions(),
        apiService.getCategories(),
        apiService.getSettings()
      ]);

      const activeFiscalStart = settingsData?.fiscal_year_start || '12';
      setFiscalYearStart(activeFiscalStart);
      const decFiscal = activeFiscalStart === '12';

      let startDate = '';
      let endDate = '';

      if (periodMode === 'year' || periodMode === 'compare') {
        if (decFiscal) {
          // Exercício Fiscal: 01 de Dezembro (ano anterior) até 30 de Novembro (ano atual)
          startDate = `${Number(selectedYear) - 1}-12-01`;
          endDate = `${selectedYear}-11-30`;
        } else {
          // Ano Civil tradicional
          startDate = `${selectedYear}-01-01`;
          endDate = `${selectedYear}-12-31`;
        }
      } else {
        const [yearNum, monthNum] = month.split('-').map(Number);
        startDate = `${month}-01`;
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
      }

      setAllTransactions(transData || []);

      // Load historical totals from settings
      if (settingsData?.historical_totals) {
        try {
          const parsed = typeof settingsData.historical_totals === 'string'
            ? JSON.parse(settingsData.historical_totals)
            : settingsData.historical_totals;
          setHistoricalTotals(parsed || {});
        } catch (e) {
          console.error('Error parsing historical_totals:', e);
        }
      }

      // Load comparative deductions from settings
      if (settingsData?.comparative_deductions) {
        try {
          const parsed = typeof settingsData.comparative_deductions === 'string'
            ? JSON.parse(settingsData.comparative_deductions)
            : settingsData.comparative_deductions;
          setDeductions(parsed || {});
        } catch (e) {
          console.error('Error parsing comparative_deductions:', e);
        }
      }

      // Update available years from transactions data & historical totals
      if (transData && transData.length > 0) {
        const yearsSet = new Set<string>(availableYears);
        transData.forEach(t => {
          if (t.date && t.date.length >= 4) {
            const y = t.date.slice(0, 4);
            if (!isNaN(Number(y))) yearsSet.add(y);
          }
        });
        setAvailableYears(Array.from(yearsSet).sort((a, b) => Number(b) - Number(a)));
      }

      const filtered = (transData || [])
        .filter(t => {
          return t.date >= startDate && t.date <= endDate;
        })
        .sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();

          if (dateA !== dateB) {
            return dateA - dateB;
          }

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

  // Mantém o ano ativo da dedução sincronizado com o ano selecionado
  useEffect(() => {
    setActiveDeductionYear(selectedYear);
  }, [selectedYear]);

  // Manipuladores de Adicionar e Excluir Deduções de Terceiros (Repasses Não Operacionais)
  const handleAddDeduction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEdit) {
      toast.error('Perfil de conferente possui permissão apenas de visualização.');
      return;
    }
    if (!deductionDesc.trim()) {
      toast.error('Informe a descrição ou motivo do repasse');
      return;
    }

    const incVal = parseAmount(deductionIncome);
    const expVal = parseAmount(deductionExpense);

    if (incVal === 0 && expVal === 0) {
      toast.error('Informe ao menos um valor de entrada ou de saída a abater');
      return;
    }

    const targetYear = activeDeductionYear || selectedYear;
    const newItem: DeductionItem = {
      id: Date.now().toString(),
      description: deductionDesc.trim(),
      income: incVal,
      expense: expVal
    };

    const currentYearItems = deductions[targetYear] || [];
    const updatedYearItems = [...currentYearItems, newItem];
    const newDeductions = {
      ...deductions,
      [targetYear]: updatedYearItems
    };

    setDeductions(newDeductions);
    setDeductionDesc('');
    setDeductionIncome('');
    setDeductionExpense('');

    setIsSavingDeduction(true);
    try {
      await apiService.updateSettings({
        comparative_deductions: JSON.stringify(newDeductions)
      });
      toast.success(`Dedução salva com sucesso para o exercício de ${targetYear}!`);
    } catch (err) {
      console.error('Erro ao salvar dedução:', err);
      toast.error('Não foi possível salvar a dedução');
    } finally {
      setIsSavingDeduction(false);
    }
  };

  const handleDeleteDeduction = async (year: string, id: string) => {
    if (!canEdit) {
      toast.error('Perfil de conferente possui permissão apenas de visualização.');
      return;
    }
    const updatedYearItems = (deductions[year] || []).filter(item => item.id !== id);
    const newDeductions = {
      ...deductions,
      [year]: updatedYearItems
    };

    setDeductions(newDeductions);

    try {
      await apiService.updateSettings({
        comparative_deductions: JSON.stringify(newDeductions)
      });
      toast.success('Dedução excluída com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir dedução:', err);
      toast.error('Não foi possível excluir a dedução');
    }
  };

  // Importação automática de transações categorizadas como "Ofertas Destino Específico"
  const handleAutoImportDeductions = async (targetYear: string) => {
    if (!canEdit) {
      toast.error('Perfil de conferente possui permissão apenas de visualização.');
      return;
    }
    setIsSavingDeduction(true);
    try {
      let startDate = '';
      let endDate = '';
      if (isFiscalDec) {
        startDate = `${Number(targetYear) - 1}-12-01`;
        endDate = `${targetYear}-11-30`;
      } else {
        startDate = `${targetYear}-01-01`;
        endDate = `${targetYear}-12-31`;
      }

      const isDestinationCat = (catId?: string) => {
        if (!catId) return false;
        const cat = categories.find(c => c.id === catId);
        if (!cat) return false;
        const name = (cat.name || '').toLowerCase();
        return name.includes('destino específico') || name.includes('destino especifico') || name.includes('destino');
      };

      const matchingTrans = allTransactions.filter(t => {
        if (!t.date || t.date < startDate || t.date > endDate) return false;
        return isDestinationCat(t.category_id);
      });

      if (matchingTrans.length === 0) {
        toast.info(`Nenhuma transação encontrada na categoria "Ofertas Destino Específico" no exercício de ${targetYear}.`);
        setIsSavingDeduction(false);
        return;
      }

      const groupMap = new Map<string, { income: number; expense: number }>();
      matchingTrans.forEach(t => {
        const desc = (t.description || 'Oferta Destino Específico').trim();
        const current = groupMap.get(desc) || { income: 0, expense: 0 };
        const val = parseAmount(t.amount);
        if (t.type === 'income') {
          current.income += val;
        } else if (t.type === 'expense') {
          current.expense += val;
        }
        groupMap.set(desc, current);
      });

      const newItems: DeductionItem[] = Array.from(groupMap.entries()).map(([desc, values], idx) => ({
        id: `auto-dest-${targetYear}-${idx}-${Date.now()}`,
        description: desc,
        income: Number(values.income.toFixed(2)),
        expense: Number(values.expense.toFixed(2))
      }));

      const newDeductions = {
        ...deductions,
        [targetYear]: newItems
      };

      setDeductions(newDeductions);
      await apiService.updateSettings({
        comparative_deductions: JSON.stringify(newDeductions)
      });

      const totalInc = newItems.reduce((acc, i) => acc + i.income, 0);
      const totalExp = newItems.reduce((acc, i) => acc + i.expense, 0);
      toast.success(
        `${newItems.length} repasses importados de ${matchingTrans.length} transações no exercício de ${targetYear}! (Entradas: ${formatCurrency(totalInc)} | Saídas: ${formatCurrency(totalExp)})`
      );
    } catch (err) {
      console.error('Erro na importação automática:', err);
      toast.error('Erro ao importar repasses automaticamente');
    } finally {
      setIsSavingDeduction(false);
    }
  };

  // Transações de Destino Específico detectadas para o ano ativo
  const detectedDestinationTransInfo = useMemo(() => {
    if (periodMode !== 'compare') return null;
    const year = activeDeductionYear;
    let startDate = '';
    let endDate = '';
    if (isFiscalDec) {
      startDate = `${Number(year) - 1}-12-01`;
      endDate = `${year}-11-30`;
    } else {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    const matching = allTransactions.filter(t => {
      if (!t.date || t.date < startDate || t.date > endDate) return false;
      const cat = categories.find(c => c.id === t.category_id);
      if (!cat) return false;
      const name = (cat.name || '').toLowerCase();
      return name.includes('destino específico') || name.includes('destino especifico') || name.includes('destino');
    });

    if (matching.length === 0) return null;

    const totalIncome = matching.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0);
    const totalExpense = matching.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0);

    return {
      count: matching.length,
      income: totalIncome,
      expense: totalExpense
    };
  }, [allTransactions, categories, activeDeductionYear, isFiscalDec, periodMode]);

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

  // Monthly breakdown for annual view (follows fiscal year)
  const monthlySummary = useMemo(() => {
    if (periodMode !== 'year') return [];

    let monthsList: Array<{ prefix: string; name: string; shortName: string; histKey: string }> = [];

    if (isFiscalDec) {
      const prevYear = Number(selectedYear) - 1;
      monthsList = [
        { prefix: `${prevYear}-12`, name: `Dezembro/${prevYear}`, shortName: 'Dez', histKey: '12' },
        { prefix: `${selectedYear}-01`, name: `Janeiro/${selectedYear}`, shortName: 'Jan', histKey: '1' },
        { prefix: `${selectedYear}-02`, name: 'Fevereiro', shortName: 'Fev', histKey: '2' },
        { prefix: `${selectedYear}-03`, name: 'Março', shortName: 'Mar', histKey: '3' },
        { prefix: `${selectedYear}-04`, name: 'Abril', shortName: 'Abr', histKey: '4' },
        { prefix: `${selectedYear}-05`, name: 'Maio', shortName: 'Mai', histKey: '5' },
        { prefix: `${selectedYear}-06`, name: 'Junho', shortName: 'Jun', histKey: '6' },
        { prefix: `${selectedYear}-07`, name: 'Julho', shortName: 'Jul', histKey: '7' },
        { prefix: `${selectedYear}-08`, name: 'Agosto', shortName: 'Ago', histKey: '8' },
        { prefix: `${selectedYear}-09`, name: 'Setembro', shortName: 'Set', histKey: '9' },
        { prefix: `${selectedYear}-10`, name: 'Outubro', shortName: 'Out', histKey: '10' },
        { prefix: `${selectedYear}-11`, name: 'Novembro', shortName: 'Nov', histKey: '11' },
      ];
    } else {
      const calNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      monthsList = calNames.map((name, i) => ({
        prefix: `${selectedYear}-${String(i + 1).padStart(2, '0')}`,
        name,
        shortName: name.slice(0, 3),
        histKey: (i + 1).toString()
      }));
    }

    return monthsList.map((m, index) => {
      const monthTrans = filteredTransactions.filter(t => t.date && t.date.startsWith(m.prefix));
      let mIncome = monthTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0);
      let mExpenses = monthTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0);
      let isHist = false;

      // Se não houver transações reais no mês, buscar nos totais históricos salvos
      if (monthTrans.length === 0) {
        const histYear = historicalTotals[selectedYear] || {};
        let hInc = parseAmount(histYear[m.histKey]?.income);
        let hExp = parseAmount(histYear[m.histKey]?.expense);

        // Fallback para Dezembro no exercício fiscal
        if (m.histKey === '12' && hInc === 0 && hExp === 0 && isFiscalDec) {
          const prevYearKey = (Number(selectedYear) - 1).toString();
          const prevTotals = historicalTotals[prevYearKey]?.['12'];
          if (prevTotals) {
            hInc = parseAmount(prevTotals.income);
            hExp = parseAmount(prevTotals.expense);
          }
        }

        if (hInc > 0 || hExp > 0) {
          mIncome = hInc;
          mExpenses = hExp;
          isHist = true;
        }
      }

      const mBalance = mIncome - mExpenses;

      return {
        monthIndex: index + 1,
        monthStr: m.prefix,
        name: m.name,
        shortName: m.shortName,
        count: monthTrans.length,
        income: mIncome,
        expenses: mExpenses,
        balance: mBalance,
        isHistorical: isHist
      };
    });
  }, [periodMode, selectedYear, filteredTransactions, isFiscalDec, historicalTotals]);

  const rawIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0);
  const rawExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0);

  // Se for visão anual e não houver transações (ex: ano anterior baseado em histórico), somar do monthlySummary
  const income = (periodMode === 'year' && rawIncome === 0 && monthlySummary.length > 0)
    ? monthlySummary.reduce((acc, m) => acc + m.income, 0)
    : rawIncome;
  const expenses = (periodMode === 'year' && rawExpenses === 0 && monthlySummary.length > 0)
    ? monthlySummary.reduce((acc, m) => acc + m.expenses, 0)
    : rawExpenses;
  const balance = income - expenses;

  // Accounts summary
  const accountSummary = useMemo(() => {
    const correnteTrans = filteredTransactions.filter(t => (t.account || 'Corrente') === 'Corrente');
    const poupancaTrans = filteredTransactions.filter(t => t.account === 'Poupança');

    const cIncome = correnteTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0);
    const cExpenses = correnteTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0);

    const pIncome = poupancaTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0);
    const pExpenses = poupancaTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0);

    return {
      corrente: { income: cIncome, expenses: cExpenses, balance: cIncome - cExpenses, count: correnteTrans.length },
      poupanca: { income: pIncome, expenses: pExpenses, balance: pIncome - pExpenses, count: poupancaTrans.length }
    };
  }, [filteredTransactions]);

  // Top categories for annual overview
  const topCategories = useMemo(() => {
    const expenseMap = new Map<string, number>();
    const incomeMap = new Map<string, number>();

    filteredTransactions.forEach(t => {
      const name = t.category?.name || 'Sem categoria';
      const val = parseAmount(t.amount);
      if (t.type === 'expense') {
        expenseMap.set(name, (expenseMap.get(name) || 0) + val);
      } else {
        incomeMap.set(name, (incomeMap.get(name) || 0) + val);
      }
    });

    const topExpenses = Array.from(expenseMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const topIncomes = Array.from(incomeMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { topExpenses, topIncomes };
  }, [filteredTransactions]);

  // ==========================================
  // COMPARATIVO ANUAL (YEAR-OVER-YEAR FISCAL)
  // ==========================================
  const comparativeData = useMemo(() => {
    if (periodMode !== 'compare') return null;

    const y1 = selectedYear; // Base, ex: 2026
    const y2 = compareYear;  // Comparado, ex: 2025

    // Helper to get month totals considering fiscal year prefixes
    const getFiscalTotals = (yearStr: string, histKey: string, monthPrefix: string) => {
      // 1. Procurar nas transações reais pelo prefixo (ignorando saldo anterior/abertura)
      const isOpeningBalance = (t: Transaction) => {
        const desc = (t.description || '').toLowerCase();
        return desc.includes('saldo anterior') || desc.includes('saldo inicial');
      };

      const monthTrans = allTransactions
        .filter(t => !isOpeningBalance(t))
        .filter(t => t.date && t.date.startsWith(monthPrefix));

      const filteredByAccount = monthTrans.filter(t => {
        return accountFilter === 'all' || (t.account || 'Corrente') === accountFilter;
      });

      if (filteredByAccount.length > 0) {
        const inc = filteredByAccount.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0);
        const exp = filteredByAccount.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0);
        return { income: inc, expense: exp, fromHistorical: false, count: filteredByAccount.length };
      }

      // 2. Se não houver transações reais, buscar nos Totais Históricos salvos
      const histYear = historicalTotals[yearStr] || {};
      const histMonth = histYear[histKey] || { income: 0, expense: 0 };
      let histInc = parseAmount(histMonth.income);
      let histExp = parseAmount(histMonth.expense);

      // Fallback para Dezembro (histKey === '12'): se estiver zerado no ano do exercício,
      // verificar se foi salvo no ano anterior (ex: 2024['12'] para o exercício 2025)
      if (histKey === '12' && histInc === 0 && histExp === 0 && isFiscalDec) {
        const prevYearKey = (Number(yearStr) - 1).toString();
        const prevYearTotals = historicalTotals[prevYearKey]?.['12'];
        if (prevYearTotals) {
          const pInc = parseAmount(prevYearTotals.income);
          const pExp = parseAmount(prevYearTotals.expense);
          if (pInc > 0 || pExp > 0) {
            histInc = pInc;
            histExp = pExp;
          }
        }
      }

      // Fallback de transações reais diretas para Dezembro:
      // se ainda estiver zerado e houver transações reais em `${yearStr}-12`
      if (histKey === '12' && histInc === 0 && histExp === 0) {
        const directTrans = allTransactions
          .filter(t => !isOpeningBalance(t))
          .filter(t => t.date && t.date.startsWith(`${yearStr}-12`));
        const filteredDirect = directTrans.filter(t => {
          return accountFilter === 'all' || (t.account || 'Corrente') === accountFilter;
        });
        if (filteredDirect.length > 0) {
          const inc = filteredDirect.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0);
          const exp = filteredDirect.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0);
          return { income: inc, expense: exp, fromHistorical: false, count: filteredDirect.length };
        }
      }

      return {
        income: histInc,
        expense: histExp,
        fromHistorical: (histInc > 0 || histExp > 0),
        count: 0
      };
    };

    let comparativeMonths: Array<{ name: string; shortName: string; histKey: string; getPrefix: (y: string) => string }> = [];

    if (isFiscalDec) {
      comparativeMonths = [
        { name: 'Dezembro (Início do Exercício)', shortName: 'Dez', histKey: '12', getPrefix: (y) => `${Number(y) - 1}-12` },
        { name: 'Janeiro', shortName: 'Jan', histKey: '1', getPrefix: (y) => `${y}-01` },
        { name: 'Fevereiro', shortName: 'Fev', histKey: '2', getPrefix: (y) => `${y}-02` },
        { name: 'Março', shortName: 'Mar', histKey: '3', getPrefix: (y) => `${y}-03` },
        { name: 'Abril', shortName: 'Abr', histKey: '4', getPrefix: (y) => `${y}-04` },
        { name: 'Maio', shortName: 'Mai', histKey: '5', getPrefix: (y) => `${y}-05` },
        { name: 'Junho', shortName: 'Jun', histKey: '6', getPrefix: (y) => `${y}-06` },
        { name: 'Julho', shortName: 'Jul', histKey: '7', getPrefix: (y) => `${y}-07` },
        { name: 'Agosto', shortName: 'Ago', histKey: '8', getPrefix: (y) => `${y}-08` },
        { name: 'Setembro', shortName: 'Set', histKey: '9', getPrefix: (y) => `${y}-09` },
        { name: 'Outubro', shortName: 'Out', histKey: '10', getPrefix: (y) => `${y}-10` },
        { name: 'Novembro', shortName: 'Nov', histKey: '11', getPrefix: (y) => `${y}-11` },
      ];
    } else {
      const calNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      comparativeMonths = calNames.map((name, i) => {
        const mKey = (i + 1).toString();
        return {
          name,
          shortName: name.slice(0, 3),
          histKey: mKey,
          getPrefix: (y) => `${y}-${String(i + 1).padStart(2, '0')}`
        };
      });
    }

    const rows = comparativeMonths.map((m, index) => {
      const dataY1 = getFiscalTotals(y1, m.histKey, m.getPrefix(y1));
      const dataY2 = getFiscalTotals(y2, m.histKey, m.getPrefix(y2));

      const balY1 = dataY1.income - dataY1.expense;
      const balY2 = dataY2.income - dataY2.expense;

      const incomeDiff = dataY1.income - dataY2.income;
      const incomeGrowth = dataY2.income > 0
        ? ((dataY1.income - dataY2.income) / dataY2.income) * 100
        : (dataY1.income === 0 ? 0 : null);

      const expenseDiff = dataY1.expense - dataY2.expense;
      const expenseGrowth = dataY2.expense > 0
        ? ((dataY1.expense - dataY2.expense) / dataY2.expense) * 100
        : (dataY1.expense === 0 ? 0 : null);

      const balanceDiff = balY1 - balY2;

      return {
        monthIdx: index + 1,
        name: m.name,
        shortName: m.shortName,
        // Ano Base (ex: 2026)
        y1Income: dataY1.income,
        y1Expense: dataY1.expense,
        y1Balance: balY1,
        y1IsHistorical: dataY1.fromHistorical,
        // Ano Comparado (ex: 2025)
        y2Income: dataY2.income,
        y2Expense: dataY2.expense,
        y2Balance: balY2,
        y2IsHistorical: dataY2.fromHistorical,
        // Diferenças e Variações
        incomeDiff,
        incomeGrowth,
        expenseDiff,
        expenseGrowth,
        balanceDiff
      };
    });

    const totalY1Income = rows.reduce((acc, r) => acc + r.y1Income, 0);
    const totalY1Expense = rows.reduce((acc, r) => acc + r.y1Expense, 0);
    const totalY1Balance = totalY1Income - totalY1Expense;

    const totalY2Income = rows.reduce((acc, r) => acc + r.y2Income, 0);
    const totalY2Expense = rows.reduce((acc, r) => acc + r.y2Expense, 0);
    const totalY2Balance = totalY2Income - totalY2Expense;

    // Se o ano comparado estiver com dados incompletos (meses zerados enquanto o ano atual possui movimentação),
    // a apuração percentual do total anual não deve comparar períodos assimétricos (ex: 12 meses contra 1 mês)
    const hasIncompleteComparativeIncome = rows.some(r => r.y1Income > 0 && r.y2Income === 0);
    const hasIncompleteComparativeExpense = rows.some(r => r.y1Expense > 0 && r.y2Expense === 0);

    const totalIncomeGrowth = (!hasIncompleteComparativeIncome && totalY2Income > 0)
      ? ((totalY1Income - totalY2Income) / totalY2Income) * 100
      : (totalY1Income === 0 ? 0 : null);

    const totalExpenseGrowth = (!hasIncompleteComparativeExpense && totalY2Expense > 0)
      ? ((totalY1Expense - totalY2Expense) / totalY2Expense) * 100
      : (totalY1Expense === 0 ? 0 : null);

    const totalIncomeDiff = totalY1Income - totalY2Income;
    const totalExpenseDiff = totalY1Expense - totalY2Expense;
    const totalBalanceDiff = totalY1Balance - totalY2Balance;

    // Deduções de terceiros / repasses não operacionais (ex: ofertas recebidas do exterior e repassadas a missionários)
    const y1DeductionList = deductions[y1] || [];
    const y2DeductionList = deductions[y2] || [];

    const y1DeductionIncome = y1DeductionList.reduce((acc, d) => acc + (d.income || 0), 0);
    const y1DeductionExpense = y1DeductionList.reduce((acc, d) => acc + (d.expense || 0), 0);
    const y1DeductionBalance = y1DeductionIncome - y1DeductionExpense;

    const y2DeductionIncome = y2DeductionList.reduce((acc, d) => acc + (d.income || 0), 0);
    const y2DeductionExpense = y2DeductionList.reduce((acc, d) => acc + (d.expense || 0), 0);
    const y2DeductionBalance = y2DeductionIncome - y2DeductionExpense;

    const deductionIncomeDiff = y1DeductionIncome - y2DeductionIncome;
    const deductionExpenseDiff = y1DeductionExpense - y2DeductionExpense;
    const deductionBalanceDiff = y1DeductionBalance - y2DeductionBalance;

    // Valores Consolidados (Recursos Próprios da Igreja)
    const consolidatedY1Income = totalY1Income - y1DeductionIncome;
    const consolidatedY1Expense = totalY1Expense - y1DeductionExpense;
    const consolidatedY1Balance = consolidatedY1Income - consolidatedY1Expense;

    const consolidatedY2Income = totalY2Income - y2DeductionIncome;
    const consolidatedY2Expense = totalY2Expense - y2DeductionExpense;
    const consolidatedY2Balance = consolidatedY2Income - consolidatedY2Expense;

    const consolidatedIncomeDiff = consolidatedY1Income - consolidatedY2Income;
    const consolidatedExpenseDiff = consolidatedY1Expense - consolidatedY2Expense;
    const consolidatedBalanceDiff = consolidatedY1Balance - consolidatedY2Balance;

    const consolidatedIncomeGrowth = (!hasIncompleteComparativeIncome && consolidatedY2Income > 0)
      ? ((consolidatedY1Income - consolidatedY2Income) / consolidatedY2Income) * 100
      : (consolidatedY1Income === 0 ? 0 : null);

    const consolidatedExpenseGrowth = (!hasIncompleteComparativeExpense && consolidatedY2Expense > 0)
      ? ((consolidatedY1Expense - consolidatedY2Expense) / consolidatedY2Expense) * 100
      : (consolidatedY1Expense === 0 ? 0 : null);

    const hasAnyDeductions = (y1DeductionIncome > 0 || y1DeductionExpense > 0 || y2DeductionIncome > 0 || y2DeductionExpense > 0);

    // Chart dataset
    const chartData = rows.map(r => ({
      name: r.shortName,
      [`Entradas ${y2}`]: r.y2Income,
      [`Entradas ${y1}`]: r.y1Income,
      [`Saídas ${y2}`]: r.y2Expense,
      [`Saídas ${y1}`]: r.y1Expense,
    }));

    return {
      y1,
      y2,
      rows,
      chartData,
      totalY1Income,
      totalY1Expense,
      totalY1Balance,
      totalY2Income,
      totalY2Expense,
      totalY2Balance,
      totalIncomeGrowth,
      totalExpenseGrowth,
      totalIncomeDiff,
      totalExpenseDiff,
      totalBalanceDiff,
      // Deduções e Repasses
      y1DeductionList,
      y2DeductionList,
      y1DeductionIncome,
      y1DeductionExpense,
      y1DeductionBalance,
      y2DeductionIncome,
      y2DeductionExpense,
      y2DeductionBalance,
      deductionIncomeDiff,
      deductionExpenseDiff,
      deductionBalanceDiff,
      // Totais Líquidos Consolidados
      consolidatedY1Income,
      consolidatedY1Expense,
      consolidatedY1Balance,
      consolidatedY2Income,
      consolidatedY2Expense,
      consolidatedY2Balance,
      consolidatedIncomeDiff,
      consolidatedExpenseDiff,
      consolidatedBalanceDiff,
      consolidatedIncomeGrowth,
      consolidatedExpenseGrowth,
      hasAnyDeductions
    };
  }, [periodMode, selectedYear, compareYear, allTransactions, historicalTotals, deductions, accountFilter, isFiscalDec]);

  const generatePDF = () => {
    setIsExporting(true);

    try {
      const doc = new jsPDF();

      // MODO COMPARATIVO
      if (periodMode === 'compare' && comparativeData) {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(22);
        doc.setTextColor(26, 34, 56);
        doc.text('Igreja', 14, 20);

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(
          isFiscalDec
            ? `Relatório Comparativo de Exercício Fiscal (${selectedYear} vs ${compareYear})`
            : `Relatório Comparativo Anual - ${selectedYear} vs ${compareYear}`,
          14, 27
        );
        doc.setFontSize(9);
        doc.setTextColor(130, 130, 130);
        doc.text(
          isFiscalDec ? 'Período de Apuração: 01 de Dezembro a 30 de Novembro (12 meses)' : 'Período de Apuração: 01 de Janeiro a 31 de Dezembro',
          14, 32
        );
        doc.line(14, 35, 283, 35);

        // Summary Lines
        const fmtGrowth = (val: number | null) => val === null ? '-' : `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
        const fmtDiff = (val: number) => `${val > 0 ? '+' : ''}${formatCurrency(val)}`;

        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.text(`Total Entradas: ${selectedYear}: ${formatCurrency(comparativeData.totalY1Income)} | ${compareYear}: ${formatCurrency(comparativeData.totalY2Income)} | Dif: ${fmtDiff(comparativeData.totalIncomeDiff)} (${fmtGrowth(comparativeData.totalIncomeGrowth)})`, 14, 42);
        doc.text(`Total Saídas: ${selectedYear}: ${formatCurrency(comparativeData.totalY1Expense)} | ${compareYear}: ${formatCurrency(comparativeData.totalY2Expense)} | Dif: ${fmtDiff(comparativeData.totalExpenseDiff)} (${fmtGrowth(comparativeData.totalExpenseGrowth)})`, 14, 47);
        doc.setFont('helvetica', 'bold');
        doc.text(`Saldo Acumulado: ${selectedYear}: ${formatCurrency(comparativeData.totalY1Balance)} | ${compareYear}: ${formatCurrency(comparativeData.totalY2Balance)} | Dif: ${fmtDiff(comparativeData.totalBalanceDiff)}`, 14, 52);

        if (comparativeData.hasAnyDeductions) {
          doc.setFontSize(8.5);
          doc.setTextColor(67, 56, 202);
          doc.text(`(=) Líquido Consolidado da Igreja: Entradas ${selectedYear}: ${formatCurrency(comparativeData.consolidatedY1Income)} | Saídas ${selectedYear}: ${formatCurrency(comparativeData.consolidatedY1Expense)} | Saldo: ${formatCurrency(comparativeData.consolidatedY1Balance)}`, 14, 57);
        }
        doc.setFont('helvetica', 'normal');

        const compRows = comparativeData.rows.map(r => [
          r.name,
          formatCurrency(r.y2Income),
          formatCurrency(r.y1Income),
          fmtDiff(r.incomeDiff),
          fmtGrowth(r.incomeGrowth),
          formatCurrency(r.y2Expense),
          formatCurrency(r.y1Expense),
          fmtDiff(r.expenseDiff),
          fmtGrowth(r.expenseGrowth),
          formatCurrency(r.y2Balance),
          formatCurrency(r.y1Balance),
          fmtDiff(r.balanceDiff)
        ]);

        // Add summary row (Movimentação Geral)
        compRows.push([
          comparativeData.hasAnyDeductions ? 'TOTAL GERAL (BRUTO)' : 'TOTAL DO EXERCÍCIO',
          formatCurrency(comparativeData.totalY2Income),
          formatCurrency(comparativeData.totalY1Income),
          fmtDiff(comparativeData.totalIncomeDiff),
          fmtGrowth(comparativeData.totalIncomeGrowth),
          formatCurrency(comparativeData.totalY2Expense),
          formatCurrency(comparativeData.totalY1Expense),
          fmtDiff(comparativeData.totalExpenseDiff),
          fmtGrowth(comparativeData.totalExpenseGrowth),
          formatCurrency(comparativeData.totalY2Balance),
          formatCurrency(comparativeData.totalY1Balance),
          fmtDiff(comparativeData.totalBalanceDiff)
        ]);

        // Se houver deduções / repasses de terceiros, adicionar linhas de dedução e total consolidado
        if (comparativeData.hasAnyDeductions) {
          compRows.push([
            '(-) DEDUÇÕES (TERCEIROS)',
            comparativeData.y2DeductionIncome > 0 ? `-${formatCurrency(comparativeData.y2DeductionIncome)}` : 'R$ 0,00',
            comparativeData.y1DeductionIncome > 0 ? `-${formatCurrency(comparativeData.y1DeductionIncome)}` : 'R$ 0,00',
            fmtDiff(comparativeData.deductionIncomeDiff),
            '-',
            comparativeData.y2DeductionExpense > 0 ? `-${formatCurrency(comparativeData.y2DeductionExpense)}` : 'R$ 0,00',
            comparativeData.y1DeductionExpense > 0 ? `-${formatCurrency(comparativeData.y1DeductionExpense)}` : 'R$ 0,00',
            fmtDiff(comparativeData.deductionExpenseDiff),
            '-',
            formatCurrency(comparativeData.y2DeductionBalance),
            formatCurrency(comparativeData.y1DeductionBalance),
            fmtDiff(comparativeData.deductionBalanceDiff)
          ]);

          compRows.push([
            '(=) TOTAL CONSOLIDADO (IGREJA)',
            formatCurrency(comparativeData.consolidatedY2Income),
            formatCurrency(comparativeData.consolidatedY1Income),
            fmtDiff(comparativeData.consolidatedIncomeDiff),
            fmtGrowth(comparativeData.consolidatedIncomeGrowth),
            formatCurrency(comparativeData.consolidatedY2Expense),
            formatCurrency(comparativeData.consolidatedY1Expense),
            fmtDiff(comparativeData.consolidatedExpenseDiff),
            fmtGrowth(comparativeData.consolidatedExpenseGrowth),
            formatCurrency(comparativeData.consolidatedY2Balance),
            formatCurrency(comparativeData.consolidatedY1Balance),
            fmtDiff(comparativeData.consolidatedBalanceDiff)
          ]);
        }

        autoTable(doc, {
          startY: comparativeData.hasAnyDeductions ? 62 : 57,
          head: [[
            'Mês',
            `Entr. ${compareYear}`,
            `Entr. ${selectedYear}`,
            'Dif. Entr.',
            'Var. %',
            `Saíd. ${compareYear}`,
            `Saíd. ${selectedYear}`,
            'Dif. Saíd.',
            'Var. %',
            `Saldo ${compareYear}`,
            `Saldo ${selectedYear}`,
            'Dif. Saldo'
          ]],
          body: compRows,
          headStyles: { fillColor: [26, 34, 56], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [248, 249, 250] },
          styles: { fontSize: 7, halign: 'center' },
          columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'center' },
            5: { halign: 'right' },
            6: { halign: 'right' },
            7: { halign: 'right' },
            8: { halign: 'center' },
            9: { halign: 'right' },
            10: { halign: 'right' },
            11: { halign: 'right' }
          }
        });

        // Detalhamento dos Itens de Dedução / Repasses Não Operacionais no PDF
        if (comparativeData.hasAnyDeductions) {
          const finalY = (doc as any).lastAutoTable?.finalY || 140;
          let breakdownY = finalY + 8;
          if (breakdownY > 155) {
            doc.addPage();
            breakdownY = 20;
          }

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(26, 34, 56);
          doc.text('Detalhamento de Deduções / Repasses (Recursos de Terceiros Não Operacionais)', 14, breakdownY);

          const deductionTableRows: any[] = [];

          (comparativeData.y1DeductionList || []).forEach(item => {
            const diff = item.income - item.expense;
            deductionTableRows.push([
              `Exercício ${selectedYear}`,
              item.description,
              formatCurrency(item.income),
              formatCurrency(item.expense),
              `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`
            ]);
          });

          (comparativeData.y2DeductionList || []).forEach(item => {
            const diff = item.income - item.expense;
            deductionTableRows.push([
              `Exercício ${compareYear}`,
              item.description,
              formatCurrency(item.income),
              formatCurrency(item.expense),
              `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`
            ]);
          });

          autoTable(doc, {
            startY: breakdownY + 3,
            head: [['Exercício', 'Descrição / Motivo do Repasse', 'Entrada Abatida (R$)', 'Saída Abatida (R$)', 'Diferença (Entr - Saíd)']],
            body: deductionTableRows,
            headStyles: { fillColor: [67, 56, 202], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [248, 249, 250] },
            styles: { fontSize: 7.5 },
            columnStyles: {
              0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 },
              1: { halign: 'left' },
              2: { halign: 'right', cellWidth: 38 },
              3: { halign: 'right', cellWidth: 38 },
              4: { halign: 'right', fontStyle: 'bold', cellWidth: 42 }
            }
          });
        }

        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(`Gerado por ChurchFinance em ${new Date().toLocaleString()}`, 14, 200);
          doc.text(`Página ${i} de ${pageCount}`, 260, 200);
        }

        doc.save(`Comparativo_Fiscal_${selectedYear}_vs_${compareYear}.pdf`);
        return;
      }

      // MODO MENSAL OU ANUAL REGULAR
      if (filteredTransactions.length === 0) return;

      let periodLabel = '';
      if (periodMode === 'year') {
        periodLabel = isFiscalDec
          ? `Exercício Fiscal de ${selectedYear} (01/12/${Number(selectedYear) - 1} a 30/11/${selectedYear})`
          : `Consolidado Anual - ${selectedYear}`;
      } else {
        const [yearNum, monthNum] = month.split('-').map(Number);
        periodLabel = format(new Date(yearNum, monthNum - 1, 1), 'MMMM yyyy', { locale: ptBR });
        periodLabel = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
      }

      // Header
      doc.setFontSize(22);
      doc.setTextColor(26, 34, 56);
      doc.text('Igreja', 14, 22);

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Balancete Financeiro - ${periodLabel}`, 14, 30);
      if (accountFilter !== 'all') {
        doc.setFontSize(10);
        doc.text(`Conta: ${accountFilter}`, 14, 36);
        doc.line(14, 38, 196, 38);
      } else {
        doc.line(14, 35, 196, 35);
      }

      // Summary
      doc.setFontSize(10);
      doc.text(`Total de Entradas: ${formatCurrency(income)}`, 14, 45);
      doc.text(`Total de Saídas: ${formatCurrency(expenses)}`, 14, 50);
      doc.setFont('helvetica', 'bold');
      doc.text(`Saldo do Período: ${formatCurrency(balance)}`, 14, 55);
      doc.setFont('helvetica', 'normal');

      let currentY = accountFilter !== 'all' ? 68 : 64;

      if (periodMode === 'year') {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 34, 56);
        doc.text(isFiscalDec ? 'Resumo Mês a Mês (Dezembro a Novembro)' : 'Resumo Mês a Mês do Ano', 14, currentY);
        doc.setFont('helvetica', 'normal');

        const monthlyRows = monthlySummary.map(m => [
          m.name,
          m.count.toString(),
          formatCurrency(m.income),
          formatCurrency(m.expenses),
          formatCurrency(m.balance)
        ]);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Mês', 'Lançamentos', 'Entradas', 'Saídas', 'Saldo']],
          body: monthlyRows,
          headStyles: { fillColor: [38, 48, 68], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [248, 249, 250] },
          margin: { top: 20 },
          styles: { fontSize: 8 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 12;

        if (currentY > 230) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 34, 56);
        doc.text(`Lançamentos Detalhados (${filteredTransactions.length})`, 14, currentY);
        doc.setFont('helvetica', 'normal');
        currentY += 4;
      }

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
        startY: currentY,
        head: [['Data', 'Descrição', 'Conta', 'Categoria', 'Tipo', 'Valor']],
        body: tableData,
        headStyles: { fillColor: [26, 34, 56], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        margin: { top: 20 },
        styles: { fontSize: 8 }
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Gerado por ChurchFinance em ${new Date().toLocaleString()}`, 14, 285);
        doc.text(`Página ${i} de ${pageCount}`, 180, 285);
      }

      const fileName = periodMode === 'year'
        ? (isFiscalDec ? `Balancete_Exercicio_Fiscal_${selectedYear}.pdf` : `Balancete_Anual_${selectedYear}.pdf`)
        : `Balancete_${month}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-zinc-900">Relatórios</h2>
          <p className="mt-1 text-zinc-500">Análise detalhada, transparência e comparativos financeiros.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all cursor-pointer shadow-2xs"
          >
            <Printer className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          <button
            onClick={generatePDF}
            disabled={isExporting || (periodMode !== 'compare' && filteredTransactions.length === 0)}
            className="flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            {isExporting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      <div className="premium-card p-8">
        {/* Filtros e Seletores Principais */}
        <div className="mb-8 flex flex-col gap-8 border-b border-zinc-100 pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="rounded-2xl bg-indigo-50 p-4">
                {periodMode === 'compare' ? (
                  <Scale className="h-8 w-8 text-indigo-600" />
                ) : (
                  <FileText className="h-8 w-8 text-indigo-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-2xl font-bold text-zinc-900">
                    {periodMode === 'compare'
                      ? `Comparativo Fiscal (${selectedYear} vs ${compareYear})`
                      : periodMode === 'year'
                        ? `Balancete do Exercício (${selectedYear})`
                        : 'Balancete Mensal'}
                  </h3>
                  {isFiscalDec && (periodMode === 'year' || periodMode === 'compare') && (
                    <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-800 tracking-wider">
                      Ano Fiscal da Igreja
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-500">
                  {periodMode === 'compare'
                    ? (isFiscalDec
                      ? `Comparação entre os exercícios de ${selectedYear} e ${compareYear} (Dezembro a Novembro).`
                      : `Acompanhamento mês a mês comparando ${selectedYear} com ${compareYear}.`)
                    : periodMode === 'year'
                      ? (isFiscalDec
                        ? `Exercício Fiscal de ${selectedYear}: 01/12/${Number(selectedYear) - 1} a 30/11/${selectedYear} (12 meses).`
                        : `Visão consolidada de todo o ano de ${selectedYear}.`)
                      : 'Relatório consolidado de movimentações do mês.'}
                </p>
              </div>
            </div>

            {/* Controle de Seleção do Período: Mensal | Ano Todo | Comparativo */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="inline-flex rounded-xl bg-zinc-100 p-1 border border-zinc-200">
                <button
                  type="button"
                  onClick={() => setPeriodMode('month')}
                  className={cn(
                    "px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    periodMode === 'month'
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900"
                  )}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodMode('year')}
                  className={cn(
                    "px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    periodMode === 'year'
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900"
                  )}
                >
                  {isFiscalDec ? 'Exercício Fiscal' : 'Ano Todo'}
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodMode('compare')}
                  className={cn(
                    "px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1",
                    periodMode === 'compare'
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900"
                  )}
                >
                  <Scale size={13} />
                  Comparativo
                </button>
              </div>

              {/* Seletor dinâmico baseado no modo */}
              {periodMode === 'month' ? (
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full sm:w-auto rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2.5 text-sm font-medium focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer"
                  />
                </div>
              ) : periodMode === 'year' ? (
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full sm:w-auto rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-8 py-2.5 text-sm font-medium focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer"
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>
                        {isFiscalDec ? `Exercício ${y} (Dez/${Number(y) - 1} a Nov/${y})` : `Ano ${y}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Modo Comparativo: Anos A e B + Botão para lançar totais históricos */
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700">
                    <span>Base:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-transparent font-bold text-zinc-900 outline-none cursor-pointer"
                    >
                      {availableYears.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-xs font-bold text-zinc-400">vs</span>

                  <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700">
                    <span>Comparar:</span>
                    <select
                      value={compareYear}
                      onChange={(e) => setCompareYear(e.target.value)}
                      className="bg-transparent font-bold text-zinc-900 outline-none cursor-pointer"
                    >
                      {availableYears.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setIsHistoricalModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
                      title="Lançar ou editar totais consolidados do ano anterior (ex: 2025)"
                    >
                      <Edit3 size={13} />
                      <span>Lançar Totais ({compareYear})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Filtros secundários: Tipo, Conta e Categoria */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Filtrar por Tipo</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                disabled={periodMode === 'compare'}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer disabled:opacity-50"
              >
                <option value="all">Todos os Tipos (Entradas e Saídas)</option>
                <option value="income">Apenas Entradas</option>
                <option value="expense">Apenas Saídas</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Filtrar por Conta</label>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value as any)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer"
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
                  type="button"
                  onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                  disabled={periodMode === 'compare'}
                  className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="truncate">
                    {periodMode === 'compare'
                      ? "Consolidado Geral (Comparativo)"
                      : selectedCategoryIds.length === 0
                        ? "Todas as Categorias"
                        : `${selectedCategoryIds.length} selecionada(s)`}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isCategoryMenuOpen && "rotate-180")} />
                </button>

                {isCategoryMenuOpen && periodMode !== 'compare' && (
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
                            type="button"
                            onClick={() => setSelectedCategoryIds([])}
                            className="text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:text-rose-600 cursor-pointer"
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
              {selectedCategoryIds.length > 0 && periodMode !== 'compare' && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedCategoryIds.map(id => {
                    const cat = categories.find(c => c.id === id);
                    return (
                      <span key={id} className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        {cat?.name}
                        <button type="button" onClick={() => toggleCategory(id)} className="ml-1 hover:text-rose-500 cursor-pointer">
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

        {/* ========================================================= */}
        {/* VISÃO 1: MODO COMPARATIVO ANUAL (YEAR OVER YEAR)          */}
        {/* ========================================================= */}
        {periodMode === 'compare' && comparativeData && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* KPI Cards Comparativos */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* 1. ENTRADAS COMPARADAS */}
              <div className="flex flex-col justify-between rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-white to-emerald-50/20 p-5 shadow-2xs hover:shadow-xs transition-all">
                <div>
                  {/* Topo do Card: Título e Diferença Principal */}
                  <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-emerald-100">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                        <TrendingUp className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                          Entradas do Exercício
                        </h4>
                        <span className="text-[10px] text-zinc-500 font-medium">
                          {selectedYear} vs {compareYear}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-xs font-bold shadow-2xs",
                          comparativeData.hasAnyDeductions
                            ? (comparativeData.consolidatedIncomeGrowth === null ? "bg-zinc-100 text-zinc-600" : comparativeData.consolidatedIncomeGrowth >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")
                            : (comparativeData.totalIncomeGrowth === null ? "bg-zinc-100 text-zinc-600" : comparativeData.totalIncomeGrowth >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")
                        )}>
                          {comparativeData.hasAnyDeductions ? (
                            <>
                              {comparativeData.consolidatedIncomeGrowth !== null && (
                                comparativeData.consolidatedIncomeGrowth >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />
                              )}
                              {comparativeData.consolidatedIncomeGrowth === null ? '-' : `${comparativeData.consolidatedIncomeGrowth >= 0 ? '+' : ''}${comparativeData.consolidatedIncomeGrowth.toFixed(1)}%`}
                            </>
                          ) : (
                            <>
                              {comparativeData.totalIncomeGrowth !== null && (
                                comparativeData.totalIncomeGrowth >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />
                              )}
                              {comparativeData.totalIncomeGrowth === null ? '-' : `${comparativeData.totalIncomeGrowth >= 0 ? '+' : ''}${comparativeData.totalIncomeGrowth.toFixed(1)}%`}
                            </>
                          )}
                        </span>
                      </div>
                      <span className="mt-1 text-[10px] font-bold text-zinc-600">
                        Dif: {comparativeData.hasAnyDeductions
                          ? `${comparativeData.consolidatedIncomeDiff >= 0 ? '+' : ''}${formatCurrency(comparativeData.consolidatedIncomeDiff)}`
                          : `${comparativeData.totalIncomeDiff >= 0 ? '+' : ''}${formatCurrency(comparativeData.totalIncomeDiff)}`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Comparativo dos Dois Anos em Sub-Cards Balanceados */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Exercício Atual (Y1) */}
                    <div className="rounded-xl bg-white p-3 border border-emerald-200/80 shadow-2xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-extrabold text-emerald-950 uppercase tracking-wide">
                          {selectedYear}
                        </span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 uppercase">
                          Atual
                        </span>
                      </div>

                      {comparativeData.hasAnyDeductions ? (
                        <div className="space-y-1.5">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 block">
                              Líquido Igreja
                            </span>
                            <p className="text-base sm:text-lg font-black text-emerald-700 leading-tight truncate">
                              {formatCurrency(comparativeData.consolidatedY1Income)}
                            </p>
                          </div>
                          <div className="pt-1.5 border-t border-zinc-100 text-[10px] space-y-0.5 text-zinc-500">
                            <div className="flex justify-between truncate">
                              <span>Bruto:</span>
                              <span className="font-semibold text-zinc-700">{formatCurrency(comparativeData.totalY1Income)}</span>
                            </div>
                            {comparativeData.y1DeductionIncome > 0 && (
                              <div className="flex justify-between text-amber-700 truncate">
                                <span>Dedução:</span>
                                <span className="font-semibold">-{formatCurrency(comparativeData.y1DeductionIncome)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                            Total Entradas
                          </span>
                          <p className="text-base sm:text-lg font-black text-emerald-700 leading-tight truncate">
                            {formatCurrency(comparativeData.totalY1Income)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Exercício Anterior (Y2) */}
                    <div className="rounded-xl bg-zinc-50/80 p-3 border border-zinc-200/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-extrabold text-zinc-700 uppercase tracking-wide">
                          {compareYear}
                        </span>
                        <span className="rounded bg-zinc-200/80 px-1.5 py-0.2 text-[9px] font-bold text-zinc-600 uppercase">
                          Anterior
                        </span>
                      </div>

                      {comparativeData.hasAnyDeductions ? (
                        <div className="space-y-1.5">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">
                              Líquido Igreja
                            </span>
                            <p className="text-base sm:text-lg font-bold text-zinc-700 leading-tight truncate">
                              {formatCurrency(comparativeData.consolidatedY2Income)}
                            </p>
                          </div>
                          <div className="pt-1.5 border-t border-zinc-200/60 text-[10px] space-y-0.5 text-zinc-500">
                            <div className="flex justify-between truncate">
                              <span>Bruto:</span>
                              <span className="font-semibold text-zinc-600">{formatCurrency(comparativeData.totalY2Income)}</span>
                            </div>
                            {comparativeData.y2DeductionIncome > 0 && (
                              <div className="flex justify-between text-amber-700 truncate">
                                <span>Dedução:</span>
                                <span className="font-semibold">-{formatCurrency(comparativeData.y2DeductionIncome)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                            Total Entradas
                          </span>
                          <p className="text-base sm:text-lg font-bold text-zinc-600 leading-tight truncate">
                            {formatCurrency(comparativeData.totalY2Income)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rodapé: Movimentação Geral (Bruta) */}
                {comparativeData.hasAnyDeductions && (
                  <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="font-medium">Movimentação Bruta:</span>
                    <span className="font-bold text-zinc-700">
                      Dif: {comparativeData.totalIncomeDiff >= 0 ? '+' : ''}{formatCurrency(comparativeData.totalIncomeDiff)}
                      {comparativeData.totalIncomeGrowth !== null && ` (${comparativeData.totalIncomeGrowth >= 0 ? '+' : ''}${comparativeData.totalIncomeGrowth.toFixed(1)}%)`}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. SAÍDAS COMPARADAS */}
              <div className="flex flex-col justify-between rounded-2xl border border-rose-200/70 bg-gradient-to-b from-white to-rose-50/20 p-5 shadow-2xs hover:shadow-xs transition-all">
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-rose-100">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700 shadow-2xs">
                        <TrendingDown className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-950">
                          Saídas do Exercício
                        </h4>
                        <span className="text-[10px] text-zinc-500 font-medium">
                          {selectedYear} vs {compareYear}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-xs font-bold shadow-2xs",
                          comparativeData.hasAnyDeductions
                            ? (comparativeData.consolidatedExpenseGrowth === null ? "bg-zinc-100 text-zinc-600" : comparativeData.consolidatedExpenseGrowth <= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")
                            : (comparativeData.totalExpenseGrowth === null ? "bg-zinc-100 text-zinc-600" : comparativeData.totalExpenseGrowth <= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")
                        )}>
                          {comparativeData.hasAnyDeductions ? (
                            <>
                              {comparativeData.consolidatedExpenseGrowth !== null && (
                                comparativeData.consolidatedExpenseGrowth <= 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />
                              )}
                              {comparativeData.consolidatedExpenseGrowth === null ? '-' : `${comparativeData.consolidatedExpenseGrowth >= 0 ? '+' : ''}${comparativeData.consolidatedExpenseGrowth.toFixed(1)}%`}
                            </>
                          ) : (
                            <>
                              {comparativeData.totalExpenseGrowth !== null && (
                                comparativeData.totalExpenseGrowth <= 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />
                              )}
                              {comparativeData.totalExpenseGrowth === null ? '-' : `${comparativeData.totalExpenseGrowth >= 0 ? '+' : ''}${comparativeData.totalExpenseGrowth.toFixed(1)}%`}
                            </>
                          )}
                        </span>
                      </div>
                      <span className="mt-1 text-[10px] font-bold text-zinc-600">
                        Dif: {comparativeData.hasAnyDeductions
                          ? `${comparativeData.consolidatedExpenseDiff >= 0 ? '+' : ''}${formatCurrency(comparativeData.consolidatedExpenseDiff)}`
                          : `${comparativeData.totalExpenseDiff >= 0 ? '+' : ''}${formatCurrency(comparativeData.totalExpenseDiff)}`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Comparativo dos Dois Anos */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Exercício Atual (Y1) */}
                    <div className="rounded-xl bg-white p-3 border border-rose-200/80 shadow-2xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-extrabold text-rose-950 uppercase tracking-wide">
                          {selectedYear}
                        </span>
                        <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-800 uppercase">
                          Atual
                        </span>
                      </div>

                      {comparativeData.hasAnyDeductions ? (
                        <div className="space-y-1.5">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 block">
                              Líquido Igreja
                            </span>
                            <p className="text-base sm:text-lg font-black text-rose-700 leading-tight truncate">
                              {formatCurrency(comparativeData.consolidatedY1Expense)}
                            </p>
                          </div>
                          <div className="pt-1.5 border-t border-zinc-100 text-[10px] space-y-0.5 text-zinc-500">
                            <div className="flex justify-between truncate">
                              <span>Bruto:</span>
                              <span className="font-semibold text-zinc-700">{formatCurrency(comparativeData.totalY1Expense)}</span>
                            </div>
                            {comparativeData.y1DeductionExpense > 0 && (
                              <div className="flex justify-between text-amber-700 truncate">
                                <span>Dedução:</span>
                                <span className="font-semibold">-{formatCurrency(comparativeData.y1DeductionExpense)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                            Total Saídas
                          </span>
                          <p className="text-base sm:text-lg font-black text-rose-700 leading-tight truncate">
                            {formatCurrency(comparativeData.totalY1Expense)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Exercício Anterior (Y2) */}
                    <div className="rounded-xl bg-zinc-50/80 p-3 border border-zinc-200/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-extrabold text-zinc-700 uppercase tracking-wide">
                          {compareYear}
                        </span>
                        <span className="rounded bg-zinc-200/80 px-1.5 py-0.2 text-[9px] font-bold text-zinc-600 uppercase">
                          Anterior
                        </span>
                      </div>

                      {comparativeData.hasAnyDeductions ? (
                        <div className="space-y-1.5">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">
                              Líquido Igreja
                            </span>
                            <p className="text-base sm:text-lg font-bold text-zinc-700 leading-tight truncate">
                              {formatCurrency(comparativeData.consolidatedY2Expense)}
                            </p>
                          </div>
                          <div className="pt-1.5 border-t border-zinc-200/60 text-[10px] space-y-0.5 text-zinc-500">
                            <div className="flex justify-between truncate">
                              <span>Bruto:</span>
                              <span className="font-semibold text-zinc-600">{formatCurrency(comparativeData.totalY2Expense)}</span>
                            </div>
                            {comparativeData.y2DeductionExpense > 0 && (
                              <div className="flex justify-between text-amber-700 truncate">
                                <span>Dedução:</span>
                                <span className="font-semibold">-{formatCurrency(comparativeData.y2DeductionExpense)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                            Total Saídas
                          </span>
                          <p className="text-base sm:text-lg font-bold text-zinc-600 leading-tight truncate">
                            {formatCurrency(comparativeData.totalY2Expense)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rodapé */}
                {comparativeData.hasAnyDeductions && (
                  <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="font-medium">Movimentação Bruta:</span>
                    <span className="font-bold text-zinc-700">
                      Dif: {comparativeData.totalExpenseDiff >= 0 ? '+' : ''}{formatCurrency(comparativeData.totalExpenseDiff)}
                      {comparativeData.totalExpenseGrowth !== null && ` (${comparativeData.totalExpenseGrowth >= 0 ? '+' : ''}${comparativeData.totalExpenseGrowth.toFixed(1)}%)`}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. SALDO COMPARADO */}
              <div className="flex flex-col justify-between rounded-2xl border border-indigo-200/70 bg-gradient-to-b from-white to-indigo-50/20 p-5 shadow-2xs hover:shadow-xs transition-all sm:col-span-2 lg:col-span-1">
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-indigo-100">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shadow-2xs">
                        <FileCheck className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                          Saldo do Exercício
                        </h4>
                        <span className="text-[10px] text-zinc-500 font-medium">
                          {selectedYear} vs {compareYear}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className={cn(
                        "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold shadow-2xs",
                        comparativeData.hasAnyDeductions
                          ? (comparativeData.consolidatedBalanceDiff >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")
                          : (comparativeData.totalBalanceDiff >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")
                      )}>
                        Dif: {comparativeData.hasAnyDeductions
                          ? `${comparativeData.consolidatedBalanceDiff >= 0 ? '+' : ''}${formatCurrency(comparativeData.consolidatedBalanceDiff)}`
                          : `${comparativeData.totalBalanceDiff >= 0 ? '+' : ''}${formatCurrency(comparativeData.totalBalanceDiff)}`
                        }
                      </span>
                      <span className="mt-1 text-[10px] font-medium text-zinc-500">
                        {comparativeData.hasAnyDeductions ? "Diferença Líquida" : "Diferença Acumulada"}
                      </span>
                    </div>
                  </div>

                  {/* Comparativo dos Dois Anos */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Exercício Atual (Y1) */}
                    <div className="rounded-xl bg-white p-3 border border-indigo-200/80 shadow-2xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wide">
                          {selectedYear}
                        </span>
                        <span className="rounded bg-indigo-100 px-1.5 py-0.2 text-[9px] font-bold text-indigo-800 uppercase">
                          Atual
                        </span>
                      </div>

                      {comparativeData.hasAnyDeductions ? (
                        <div className="space-y-1.5">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-700 block">
                              Líquido Igreja
                            </span>
                            <p className={cn(
                              "text-base sm:text-lg font-black leading-tight truncate",
                              comparativeData.consolidatedY1Balance >= 0 ? "text-indigo-700" : "text-rose-600"
                            )}>
                              {formatCurrency(comparativeData.consolidatedY1Balance)}
                            </p>
                          </div>
                          <div className="pt-1.5 border-t border-zinc-100 text-[10px] space-y-0.5 text-zinc-500">
                            <div className="flex justify-between truncate">
                              <span>Bruto:</span>
                              <span className={cn(
                                "font-semibold",
                                comparativeData.totalY1Balance >= 0 ? "text-zinc-700" : "text-rose-600"
                              )}>
                                {formatCurrency(comparativeData.totalY1Balance)}
                              </span>
                            </div>
                            <div className="flex justify-between text-amber-700 truncate">
                              <span>Saldo Repasses:</span>
                              <span className="font-semibold">
                                {comparativeData.y1DeductionBalance >= 0 ? '+' : ''}{formatCurrency(comparativeData.y1DeductionBalance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                            Saldo Acumulado
                          </span>
                          <p className={cn(
                            "text-base sm:text-lg font-black leading-tight truncate",
                            comparativeData.totalY1Balance >= 0 ? "text-indigo-700" : "text-rose-600"
                          )}>
                            {formatCurrency(comparativeData.totalY1Balance)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Exercício Anterior (Y2) */}
                    <div className="rounded-xl bg-zinc-50/80 p-3 border border-zinc-200/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-extrabold text-zinc-700 uppercase tracking-wide">
                          {compareYear}
                        </span>
                        <span className="rounded bg-zinc-200/80 px-1.5 py-0.2 text-[9px] font-bold text-zinc-600 uppercase">
                          Anterior
                        </span>
                      </div>

                      {comparativeData.hasAnyDeductions ? (
                        <div className="space-y-1.5">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">
                              Líquido Igreja
                            </span>
                            <p className={cn(
                              "text-base sm:text-lg font-bold leading-tight truncate",
                              comparativeData.consolidatedY2Balance >= 0 ? "text-zinc-700" : "text-rose-600"
                            )}>
                              {formatCurrency(comparativeData.consolidatedY2Balance)}
                            </p>
                          </div>
                          <div className="pt-1.5 border-t border-zinc-200/60 text-[10px] space-y-0.5 text-zinc-500">
                            <div className="flex justify-between truncate">
                              <span>Bruto:</span>
                              <span className={cn(
                                "font-semibold",
                                comparativeData.totalY2Balance >= 0 ? "text-zinc-600" : "text-rose-600"
                              )}>
                                {formatCurrency(comparativeData.totalY2Balance)}
                              </span>
                            </div>
                            <div className="flex justify-between text-amber-700 truncate">
                              <span>Saldo Repasses:</span>
                              <span className="font-semibold">
                                {comparativeData.y2DeductionBalance >= 0 ? '+' : ''}{formatCurrency(comparativeData.y2DeductionBalance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                            Saldo Acumulado
                          </span>
                          <p className={cn(
                            "text-base sm:text-lg font-bold leading-tight truncate",
                            comparativeData.totalY2Balance >= 0 ? "text-zinc-600" : "text-rose-600"
                          )}>
                            {formatCurrency(comparativeData.totalY2Balance)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rodapé */}
                {comparativeData.hasAnyDeductions && (
                  <div className="mt-3 pt-2.5 border-t border-indigo-100 flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="font-medium">Movimentação Bruta:</span>
                    <span className="font-bold text-zinc-700">
                      Dif: {comparativeData.totalBalanceDiff >= 0 ? '+' : ''}{formatCurrency(comparativeData.totalBalanceDiff)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico Comparativo Mês a Mês */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-2xs">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="font-display text-lg font-bold text-zinc-900">Evolução Mensal do Exercício</h4>
                  <p className="text-xs text-zinc-500">
                    {isFiscalDec
                      ? `Comparativo mês a mês de Dezembro a Novembro entre os exercícios de ${selectedYear} e ${compareYear}.`
                      : `Comparativo das movimentações entre ${selectedYear} e ${compareYear}.`}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <BarChart3 size={16} />
                  <span>Gráfico Comparativo</span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparativeData.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `R$ ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value)), '']}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                    <Bar dataKey={`Entradas ${compareYear}`} fill="#a7f3d0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={`Entradas ${selectedYear}`} fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={`Saídas ${compareYear}`} fill="#fecdd3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={`Saídas ${selectedYear}`} fill="#e11d48" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabela Comparativa Detalhada Mês a Mês */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 uppercase tracking-wider">
                    {isFiscalDec
                      ? `Detalhamento do Exercício Fiscal (${selectedYear} vs ${compareYear})`
                      : `Detalhamento Mês a Mês (${selectedYear} vs ${compareYear})`}
                  </h4>
                  <p className="text-xs text-zinc-500">
                    {isFiscalDec
                      ? `12 meses: de 01/Dez/${Number(selectedYear) - 1} a 30/Nov/${selectedYear} vs 01/Dez/${Number(compareYear) - 1} a 30/Nov/${compareYear}`
                      : 'Valores consolidados e taxa de crescimento percentual.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistoricalModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Edit3 size={13} />
                  <span>{canEdit ? `Editar valores de ${compareYear}` : `Visualizar valores de ${compareYear}`}</span>
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-zinc-100/80 text-[10px] font-bold uppercase tracking-wider text-zinc-600 border-b border-zinc-200">
                      <tr>
                        <th className="px-3 py-3.5">Mês</th>
                        <th className="px-2.5 py-3.5 text-right font-bold text-emerald-800">Entr. {compareYear}</th>
                        <th className="px-2.5 py-3.5 text-right font-bold text-emerald-900">Entr. {selectedYear}</th>
                        <th className="px-2.5 py-3.5 text-right font-bold text-emerald-800">Dif. Entr.</th>
                        <th className="px-2 py-3.5 text-center">Var. %</th>
                        <th className="px-2.5 py-3.5 text-right font-bold text-rose-800">Saíd. {compareYear}</th>
                        <th className="px-2.5 py-3.5 text-right font-bold text-rose-900">Saíd. {selectedYear}</th>
                        <th className="px-2.5 py-3.5 text-right font-bold text-rose-800">Dif. Saíd.</th>
                        <th className="px-2 py-3.5 text-center">Var. %</th>
                        <th className="px-2.5 py-3.5 text-right font-bold text-indigo-800">Saldo {compareYear}</th>
                        <th className="px-2.5 py-3.5 text-right font-bold text-indigo-900">Saldo {selectedYear}</th>
                        <th className="px-3 py-3.5 text-right font-bold text-indigo-900">Dif. Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {comparativeData.rows.map(row => (
                        <tr key={row.monthIdx} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="px-3 py-3 font-bold text-zinc-800 whitespace-nowrap">
                            {row.monthIdx === 1 && isFiscalDec ? (
                              <div className="flex flex-col">
                                <span>{row.name}</span>
                                <span className="text-[10px] font-normal text-zinc-400">
                                  Dez/{Number(compareYear) - 1} vs Dez/{Number(selectedYear) - 1}
                                </span>
                              </div>
                            ) : (
                              row.name
                            )}
                          </td>
                          <td className="px-2.5 py-3 text-right text-zinc-500 whitespace-nowrap">
                            {formatCurrency(row.y2Income)}
                          </td>
                          <td className="px-2.5 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                            {formatCurrency(row.y1Income)}
                          </td>
                          <td className={cn(
                            "px-2.5 py-3 text-right font-semibold whitespace-nowrap",
                            row.incomeDiff > 0 ? "text-emerald-700" : row.incomeDiff < 0 ? "text-rose-700" : "text-zinc-400"
                          )}>
                            {row.incomeDiff > 0 ? '+' : ''}{formatCurrency(row.incomeDiff)}
                          </td>
                          <td className="px-2 py-3 text-center whitespace-nowrap">
                            {row.incomeGrowth === null ? (
                              <span className="text-zinc-400 font-medium" title="Sem valor no ano anterior para base percentual">-</span>
                            ) : (
                              <span className={cn(
                                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                                row.incomeGrowth >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                              )}>
                                {row.incomeGrowth >= 0 ? '+' : ''}{row.incomeGrowth.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-3 text-right text-zinc-500 whitespace-nowrap">
                            {formatCurrency(row.y2Expense)}
                          </td>
                          <td className="px-2.5 py-3 text-right font-bold text-rose-700 whitespace-nowrap">
                            {formatCurrency(row.y1Expense)}
                          </td>
                          <td className={cn(
                            "px-2.5 py-3 text-right font-semibold whitespace-nowrap",
                            row.expenseDiff > 0 ? "text-rose-700" : row.expenseDiff < 0 ? "text-emerald-700" : "text-zinc-400"
                          )}>
                            {row.expenseDiff > 0 ? '+' : ''}{formatCurrency(row.expenseDiff)}
                          </td>
                          <td className="px-2 py-3 text-center whitespace-nowrap">
                            {row.expenseGrowth === null ? (
                              <span className="text-zinc-400 font-medium" title="Sem saídas no ano anterior para base percentual">-</span>
                            ) : (
                              <span className={cn(
                                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                                row.expenseGrowth <= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                              )}>
                                {row.expenseGrowth >= 0 ? '+' : ''}{row.expenseGrowth.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className={cn(
                            "px-2.5 py-3 text-right font-medium whitespace-nowrap",
                            row.y2Balance >= 0 ? "text-zinc-600" : "text-rose-600"
                          )}>
                            {formatCurrency(row.y2Balance)}
                          </td>
                          <td className={cn(
                            "px-2.5 py-3 text-right font-bold whitespace-nowrap",
                            row.y1Balance >= 0 ? "text-indigo-700" : "text-rose-600"
                          )}>
                            {formatCurrency(row.y1Balance)}
                          </td>
                          <td className={cn(
                            "px-3 py-3 text-right font-bold whitespace-nowrap",
                            row.balanceDiff > 0 ? "text-emerald-700" : row.balanceDiff < 0 ? "text-rose-600" : "text-zinc-500"
                          )}>
                            {row.balanceDiff > 0 ? '+' : ''}{formatCurrency(row.balanceDiff)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-100/90 font-bold border-t-2 border-zinc-200 text-xs">
                      {/* Linha 1: Total do Exercício (Movimentação Geral / Bruta) */}
                      <tr>
                        <td className="px-3 py-3.5 uppercase tracking-wider text-zinc-800 whitespace-nowrap">
                          {comparativeData.hasAnyDeductions ? 'TOTAL DO EXERCÍCIO (MOVIMENTAÇÃO GERAL)' : 'TOTAL DO EXERCÍCIO'}
                        </td>
                        <td className="px-2.5 py-3.5 text-right text-zinc-600 font-bold whitespace-nowrap">{formatCurrency(comparativeData.totalY2Income)}</td>
                        <td className="px-2.5 py-3.5 text-right text-emerald-800 font-bold text-sm whitespace-nowrap">{formatCurrency(comparativeData.totalY1Income)}</td>
                        <td className={cn(
                          "px-2.5 py-3.5 text-right font-bold whitespace-nowrap",
                          comparativeData.totalIncomeDiff >= 0 ? "text-emerald-800" : "text-rose-800"
                        )}>
                          {comparativeData.totalIncomeDiff >= 0 ? '+' : ''}{formatCurrency(comparativeData.totalIncomeDiff)}
                        </td>
                        <td className="px-2 py-3.5 text-center whitespace-nowrap">
                          {comparativeData.totalIncomeGrowth === null ? (
                            <span className="text-zinc-400 font-bold">-</span>
                          ) : (
                            <span className={cn(
                              "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold",
                              comparativeData.totalIncomeGrowth >= 0 ? "text-emerald-800 bg-emerald-100" : "text-rose-800 bg-rose-100"
                            )}>
                              {comparativeData.totalIncomeGrowth >= 0 ? '+' : ''}{comparativeData.totalIncomeGrowth.toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-3.5 text-right text-zinc-600 font-bold whitespace-nowrap">{formatCurrency(comparativeData.totalY2Expense)}</td>
                        <td className="px-2.5 py-3.5 text-right text-rose-800 font-bold text-sm whitespace-nowrap">{formatCurrency(comparativeData.totalY1Expense)}</td>
                        <td className={cn(
                          "px-2.5 py-3.5 text-right font-bold whitespace-nowrap",
                          comparativeData.totalExpenseDiff <= 0 ? "text-emerald-800" : "text-rose-800"
                        )}>
                          {comparativeData.totalExpenseDiff >= 0 ? '+' : ''}{formatCurrency(comparativeData.totalExpenseDiff)}
                        </td>
                        <td className="px-2 py-3.5 text-center whitespace-nowrap">
                          {comparativeData.totalExpenseGrowth === null ? (
                            <span className="text-zinc-400 font-bold">-</span>
                          ) : (
                            <span className={cn(
                              "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold",
                              comparativeData.totalExpenseGrowth <= 0 ? "text-emerald-800 bg-emerald-100" : "text-rose-800 bg-rose-100"
                            )}>
                              {comparativeData.totalExpenseGrowth >= 0 ? '+' : ''}{comparativeData.totalExpenseGrowth.toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-3.5 text-right text-zinc-600 font-bold whitespace-nowrap">{formatCurrency(comparativeData.totalY2Balance)}</td>
                        <td className={cn(
                          "px-2.5 py-3.5 text-right font-bold text-sm whitespace-nowrap",
                          comparativeData.totalY1Balance >= 0 ? "text-indigo-900" : "text-rose-700"
                        )}>
                          {formatCurrency(comparativeData.totalY1Balance)}
                        </td>
                        <td className={cn(
                          "px-3 py-3.5 text-right font-bold whitespace-nowrap",
                          comparativeData.totalBalanceDiff >= 0 ? "text-emerald-800" : "text-rose-800"
                        )}>
                          {comparativeData.totalBalanceDiff >= 0 ? '+' : ''}{formatCurrency(comparativeData.totalBalanceDiff)}
                        </td>
                      </tr>

                      {/* Linha 2: (-) Deduções / Repasses de Terceiros */}
                      {comparativeData.hasAnyDeductions && (
                        <tr className="bg-amber-50/70 text-amber-900 border-t border-amber-200">
                          <td className="px-3 py-3 font-bold uppercase tracking-wider text-amber-900 whitespace-nowrap">
                            (-) DEDUÇÕES / REPASSES (TERCEIROS)
                          </td>
                          <td className="px-2.5 py-3 text-right font-bold text-amber-800 whitespace-nowrap">
                            {comparativeData.y2DeductionIncome > 0 ? `-${formatCurrency(comparativeData.y2DeductionIncome)}` : 'R$ 0,00'}
                          </td>
                          <td className="px-2.5 py-3 text-right font-bold text-amber-900 whitespace-nowrap">
                            {comparativeData.y1DeductionIncome > 0 ? `-${formatCurrency(comparativeData.y1DeductionIncome)}` : 'R$ 0,00'}
                          </td>
                          <td className={cn(
                            "px-2.5 py-3 text-right font-bold whitespace-nowrap",
                            comparativeData.deductionIncomeDiff > 0 ? "text-amber-800" : "text-amber-900"
                          )}>
                            {comparativeData.deductionIncomeDiff >= 0 ? '+' : ''}{formatCurrency(comparativeData.deductionIncomeDiff)}
                          </td>
                          <td className="px-2 py-3 text-center text-amber-600 font-bold">-</td>
                          <td className="px-2.5 py-3 text-right font-bold text-amber-800 whitespace-nowrap">
                            {comparativeData.y2DeductionExpense > 0 ? `-${formatCurrency(comparativeData.y2DeductionExpense)}` : 'R$ 0,00'}
                          </td>
                          <td className="px-2.5 py-3 text-right font-bold text-amber-900 whitespace-nowrap">
                            {comparativeData.y1DeductionExpense > 0 ? `-${formatCurrency(comparativeData.y1DeductionExpense)}` : 'R$ 0,00'}
                          </td>
                          <td className={cn(
                            "px-2.5 py-3 text-right font-bold whitespace-nowrap",
                            comparativeData.deductionExpenseDiff > 0 ? "text-amber-800" : "text-amber-900"
                          )}>
                            {comparativeData.deductionExpenseDiff >= 0 ? '+' : ''}{formatCurrency(comparativeData.deductionExpenseDiff)}
                          </td>
                          <td className="px-2 py-3 text-center text-amber-600 font-bold">-</td>
                          <td className="px-2.5 py-3 text-right font-bold text-amber-800 whitespace-nowrap">
                            {formatCurrency(comparativeData.y2DeductionBalance)}
                          </td>
                          <td className="px-2.5 py-3 text-right font-bold text-amber-900 whitespace-nowrap">
                            {formatCurrency(comparativeData.y1DeductionBalance)}
                          </td>
                          <td className={cn(
                            "px-3 py-3 text-right font-bold whitespace-nowrap",
                            comparativeData.deductionBalanceDiff >= 0 ? "text-amber-900" : "text-amber-700"
                          )}>
                            {comparativeData.deductionBalanceDiff >= 0 ? '+' : ''}{formatCurrency(comparativeData.deductionBalanceDiff)}
                          </td>
                        </tr>
                      )}

                      {/* Linha 3: (=) Total Consolidado (Recursos Próprios da Igreja) */}
                      {comparativeData.hasAnyDeductions && (
                        <tr className="bg-zinc-900 text-white font-bold border-t-2 border-zinc-950 text-xs sm:text-sm">
                          <td className="px-3 py-3.5 uppercase tracking-wider text-emerald-400 whitespace-nowrap">
                            (=) TOTAL CONSOLIDADO (RECURSOS DA IGREJA)
                          </td>
                          <td className="px-2.5 py-3.5 text-right text-zinc-300 font-bold whitespace-nowrap">
                            {formatCurrency(comparativeData.consolidatedY2Income)}
                          </td>
                          <td className="px-2.5 py-3.5 text-right text-emerald-400 font-bold text-sm whitespace-nowrap">
                            {formatCurrency(comparativeData.consolidatedY1Income)}
                          </td>
                          <td className={cn(
                            "px-2.5 py-3.5 text-right font-bold whitespace-nowrap",
                            comparativeData.consolidatedIncomeDiff >= 0 ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {comparativeData.consolidatedIncomeDiff >= 0 ? '+' : ''}{formatCurrency(comparativeData.consolidatedIncomeDiff)}
                          </td>
                          <td className="px-2 py-3.5 text-center whitespace-nowrap">
                            {comparativeData.consolidatedIncomeGrowth === null ? (
                              <span className="text-zinc-400 font-bold">-</span>
                            ) : (
                              <span className={cn(
                                "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold",
                                comparativeData.consolidatedIncomeGrowth >= 0 ? "text-emerald-300 bg-emerald-950 border border-emerald-800" : "text-rose-300 bg-rose-950 border border-rose-800"
                              )}>
                                {comparativeData.consolidatedIncomeGrowth >= 0 ? '+' : ''}{comparativeData.consolidatedIncomeGrowth.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-3.5 text-right text-zinc-300 font-bold whitespace-nowrap">
                            {formatCurrency(comparativeData.consolidatedY2Expense)}
                          </td>
                          <td className="px-2.5 py-3.5 text-right text-rose-400 font-bold text-sm whitespace-nowrap">
                            {formatCurrency(comparativeData.consolidatedY1Expense)}
                          </td>
                          <td className={cn(
                            "px-2.5 py-3.5 text-right font-bold whitespace-nowrap",
                            comparativeData.consolidatedExpenseDiff <= 0 ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {comparativeData.consolidatedExpenseDiff >= 0 ? '+' : ''}{formatCurrency(comparativeData.consolidatedExpenseDiff)}
                          </td>
                          <td className="px-2 py-3.5 text-center whitespace-nowrap">
                            {comparativeData.consolidatedExpenseGrowth === null ? (
                              <span className="text-zinc-400 font-bold">-</span>
                            ) : (
                              <span className={cn(
                                "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold",
                                comparativeData.consolidatedExpenseGrowth <= 0 ? "text-emerald-300 bg-emerald-950 border border-emerald-800" : "text-rose-300 bg-rose-950 border border-rose-800"
                              )}>
                                {comparativeData.consolidatedExpenseGrowth >= 0 ? '+' : ''}{comparativeData.consolidatedExpenseGrowth.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-3.5 text-right text-zinc-300 font-bold whitespace-nowrap">
                            {formatCurrency(comparativeData.consolidatedY2Balance)}
                          </td>
                          <td className={cn(
                            "px-2.5 py-3.5 text-right font-bold text-sm whitespace-nowrap",
                            comparativeData.consolidatedY1Balance >= 0 ? "text-indigo-300" : "text-rose-400"
                          )}>
                            {formatCurrency(comparativeData.consolidatedY1Balance)}
                          </td>
                          <td className={cn(
                            "px-3 py-3.5 text-right font-bold whitespace-nowrap",
                            comparativeData.consolidatedBalanceDiff >= 0 ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {comparativeData.consolidatedBalanceDiff >= 0 ? '+' : ''}{formatCurrency(comparativeData.consolidatedBalanceDiff)}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Módulo de Lançamento e Abatimento de Recursos de Terceiros e Repasses */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-2xs space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <Coins size={18} />
                      </div>
                      <div>
                        <h4 className="font-display text-base font-bold text-zinc-900">
                          Ajustes de Recursos de Terceiros e Repasses Não Operacionais
                        </h4>
                        <p className="text-xs text-zinc-500">
                          Recursos transitados pelo CNPJ da igreja que não pertencem à sua contabilidade (ex: ofertas recebidas para repasse a missionários).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ações e Seletor de Exercício */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleAutoImportDeductions(activeDeductionYear)}
                        disabled={isSavingDeduction}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        title={`Importar automaticamente transações da categoria Ofertas Destino Específico do exercício de ${activeDeductionYear}`}
                      >
                        {isSavingDeduction ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                        <span>Puxar Automático ({activeDeductionYear})</span>
                      </button>
                    )}

                    <div className="flex items-center rounded-xl bg-zinc-100 p-1">
                      <button
                        type="button"
                        onClick={() => setActiveDeductionYear(selectedYear)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                          activeDeductionYear === selectedYear
                            ? "bg-white text-zinc-900 shadow-2xs"
                            : "text-zinc-600 hover:text-zinc-900"
                        )}
                      >
                        <span>Exercício {selectedYear}</span>
                        <span className="rounded-full bg-zinc-200 px-1.5 py-0.2 text-[10px] text-zinc-700">
                          {(deductions[selectedYear] || []).length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDeductionYear(compareYear)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                          activeDeductionYear === compareYear
                            ? "bg-white text-zinc-900 shadow-2xs"
                            : "text-zinc-600 hover:text-zinc-900"
                        )}
                      >
                        <span>Exercício {compareYear}</span>
                        <span className="rounded-full bg-zinc-200 px-1.5 py-0.2 text-[10px] text-zinc-700">
                          {(deductions[compareYear] || []).length}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banner de Detecção Automática de Ofertas Destino Específico */}
                {detectedDestinationTransInfo && canEdit && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-900">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-200/80 text-amber-800">
                        <Sparkles size={15} />
                      </div>
                      <div>
                        <span>
                          Encontramos <strong>{detectedDestinationTransInfo.count} lançamentos</strong> na categoria <strong>Ofertas Destino Específico</strong> no exercício de {activeDeductionYear}.
                        </span>
                        <span className="block text-[11px] text-amber-700 font-medium">
                          Entradas: <strong>{formatCurrency(detectedDestinationTransInfo.income)}</strong> | Saídas: <strong>{formatCurrency(detectedDestinationTransInfo.expense)}</strong> | Diferença: <strong>{formatCurrency(detectedDestinationTransInfo.income - detectedDestinationTransInfo.expense)}</strong>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutoImportDeductions(activeDeductionYear)}
                      disabled={isSavingDeduction}
                      className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto shadow-2xs"
                    >
                      <Sparkles size={12} />
                      <span>Sincronizar Repasses</span>
                    </button>
                  </div>
                )}

                {/* Formulário de Inserção de Dedução */}
                {canEdit && (
                  <form onSubmit={handleAddDeduction} className="bg-zinc-50/70 p-4 rounded-xl border border-zinc-200/80">
                    <div className="grid gap-3 sm:grid-cols-12 items-end">
                      <div className="sm:col-span-5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                          Descrição / Motivo do Repasse
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Oferta recebida para missionário A..."
                          value={deductionDesc}
                          onChange={(e) => setDeductionDesc(e.target.value)}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                          Entrada a Abater (R$)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={deductionIncome}
                          onChange={(e) => setDeductionIncome(e.target.value)}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 font-semibold placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-right"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                          Saída a Abater (R$)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={deductionExpense}
                          onChange={(e) => setDeductionExpense(e.target.value)}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 font-semibold placeholder:text-zinc-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-right"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <button
                          type="submit"
                          disabled={isSavingDeduction}
                          className="w-full inline-flex items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-700 text-white p-2.5 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                          title="Adicionar repasse ao exercício selecionado"
                        >
                          {isSavingDeduction ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Tabela de Itens Lançados do Ano Ativo */}
                <div className="overflow-hidden rounded-xl border border-zinc-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-600 border-b border-zinc-200">
                      <tr>
                        <th className="px-3.5 py-2.5">Descrição / Motivo ({activeDeductionYear})</th>
                        <th className="px-3.5 py-2.5 text-right font-bold text-emerald-800">Entrada Abatida (R$)</th>
                        <th className="px-3.5 py-2.5 text-right font-bold text-rose-800">Saída Abatida (R$)</th>
                        <th className="px-3.5 py-2.5 text-right font-bold text-indigo-800">Diferença (Entr - Saíd)</th>
                        {canEdit && <th className="px-3 py-2.5 text-center w-14">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {(deductions[activeDeductionYear] || []).length === 0 ? (
                        <tr>
                          <td colSpan={canEdit ? 5 : 4} className="px-4 py-6 text-center text-zinc-400 text-xs">
                            Nenhum repasse ou recurso de terceiro lançado para o exercício de {activeDeductionYear}.
                          </td>
                        </tr>
                      ) : (
                        (deductions[activeDeductionYear] || []).map((item) => {
                          const diff = (item.income || 0) - (item.expense || 0);
                          return (
                            <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                              <td className="px-3.5 py-2.5 font-medium text-zinc-800">{item.description}</td>
                              <td className="px-3.5 py-2.5 text-right font-semibold text-emerald-700">
                                {formatCurrency(item.income || 0)}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-semibold text-rose-700">
                                {formatCurrency(item.expense || 0)}
                              </td>
                              <td className={cn(
                                "px-3.5 py-2.5 text-right font-bold",
                                diff > 0 ? "text-emerald-700" : diff < 0 ? "text-rose-700" : "text-zinc-500"
                              )}>
                                {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                              </td>
                              {canEdit && (
                                <td className="px-3 py-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDeduction(activeDeductionYear, item.id)}
                                    className="inline-flex items-center justify-center text-zinc-400 hover:text-rose-600 transition-colors p-1 cursor-pointer rounded"
                                    title="Excluir repasse"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {(deductions[activeDeductionYear] || []).length > 0 && (
                      <tfoot className="bg-amber-50/60 font-bold border-t border-amber-200 text-xs">
                        <tr>
                          <td className="px-3.5 py-2.5 uppercase tracking-wider text-amber-900">
                            Total a Abater em {activeDeductionYear}
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-emerald-800">
                            {formatCurrency((deductions[activeDeductionYear] || []).reduce((acc, d) => acc + (d.income || 0), 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-rose-800">
                            {formatCurrency((deductions[activeDeductionYear] || []).reduce((acc, d) => acc + (d.expense || 0), 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-indigo-900">
                            {formatCurrency(
                              (deductions[activeDeductionYear] || []).reduce((acc, d) => acc + (d.income || 0), 0) -
                              (deductions[activeDeductionYear] || []).reduce((acc, d) => acc + (d.expense || 0), 0)
                            )}
                          </td>
                          <td className="px-3 py-2.5"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Informação explicativa adicional */}
                <div className="flex items-start gap-2 rounded-xl bg-indigo-50/60 p-3 text-xs text-indigo-900 border border-indigo-100">
                  <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <p>
                    Os valores cadastrados acima são deduzidos automaticamente das linhas do comparativo anual e dos totais consolidados da igreja. Eles também são apresentados em destaque e discriminados na exportação do relatório em PDF.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VISÃO 2: MODO MENSAL / EXERCÍCIO FISCAL REGULAR           */}
        {/* ========================================================= */}
        {periodMode !== 'compare' && (
          <>
            {/* Resumo Financeiro / Indicadores */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="rounded-2xl bg-emerald-50/50 p-4 sm:p-6 border border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      {periodMode === 'year' ? (isFiscalDec ? 'Entradas do Exercício' : 'Entradas do Ano') : 'Entradas'}
                    </span>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-700 truncate">{formatCurrency(income)}</p>
                {periodMode === 'year' && (
                  <p className="mt-1 text-[11px] text-emerald-600 font-medium">
                    Média mensal: {formatCurrency(income / 12)}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-rose-50/50 p-4 sm:p-6 border border-rose-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-rose-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-rose-700">
                      {periodMode === 'year' ? (isFiscalDec ? 'Saídas do Exercício' : 'Saídas do Ano') : 'Saídas'}
                    </span>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-rose-700 truncate">{formatCurrency(expenses)}</p>
                {periodMode === 'year' && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">
                    Média mensal: {formatCurrency(expenses / 12)}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-indigo-50/50 p-4 sm:p-6 border border-indigo-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-indigo-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">
                      {periodMode === 'year' ? (isFiscalDec ? 'Saldo do Exercício' : 'Saldo Anual') : 'Saldo'}
                    </span>
                  </div>
                </div>
                <p className={cn(
                  "text-xl sm:text-2xl font-bold truncate",
                  balance >= 0 ? "text-indigo-700" : "text-rose-600"
                )}>
                  {formatCurrency(balance)}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500 font-medium">
                  {balance >= 0 ? 'Resultado positivo (superávit)' : 'Resultado negativo (déficit)'}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-4 sm:p-6 border border-zinc-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-zinc-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Lançamentos</span>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-800 truncate">
                  {filteredTransactions.length}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500 truncate">
                  Corrente: {accountSummary.corrente.count} | Poupança: {accountSummary.poupanca.count}
                </p>
              </div>
            </div>

            {/* Módulo Especial: Visão Anual Consolidada (Mês a Mês e Outros Dados) */}
            {periodMode === 'year' && (
              <div className="mb-10 space-y-8 animate-in fade-in duration-300">
                {/* Grid Mês a Mês */}
                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-5 sm:p-6">
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="font-display text-lg font-bold text-zinc-900">
                        {isFiscalDec ? `Resumo Mês a Mês (Exercício ${selectedYear})` : `Resumo Mês a Mês (${selectedYear})`}
                      </h4>
                      <p className="text-xs text-zinc-500">
                        {isFiscalDec
                          ? `Consolidado de 12 meses: de 01/Dez/${Number(selectedYear) - 1} a 30/Nov/${selectedYear}.`
                          : 'Entradas, saídas e resultado consolidado de cada mês do ano.'}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-zinc-400">
                      12 meses fiscais
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {monthlySummary.map(m => {
                      const hasData = m.count > 0;
                      return (
                        <div
                          key={m.monthIndex}
                          className={cn(
                            "rounded-xl border p-3.5 transition-all bg-white",
                            hasData ? "border-zinc-200 shadow-2xs hover:border-indigo-200" : "border-dashed border-zinc-200/70 bg-white/60 opacity-60"
                          )}
                        >
                          <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-zinc-800">{m.name}</span>
                              {m.isHistorical && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded" title="Total consolidado do exercício anterior">
                                  Histórico
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setMonth(m.monthStr);
                                setPeriodMode('month');
                              }}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                              title={`Filtrar somente o mês de ${m.name}`}
                            >
                              Ver mês <ArrowRight size={10} />
                            </button>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-500">Entradas:</span>
                              <span className="font-semibold text-emerald-600">+{formatCurrency(m.income)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-500">Saídas:</span>
                              <span className="font-semibold text-rose-600">-{formatCurrency(m.expenses)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-zinc-100 font-bold">
                              <span className="text-zinc-700">Saldo:</span>
                              <span className={m.balance >= 0 ? "text-indigo-700" : "text-rose-600"}>
                                {formatCurrency(m.balance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Outros Dados: Divisão por Contas e Principais Categorias no Ano */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Resumo por Contas */}
                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-2xs">
                    <div className="flex items-center gap-2 mb-4">
                      <Wallet className="h-5 w-5 text-indigo-600" />
                      <h4 className="font-bold text-sm text-zinc-900 uppercase tracking-wider">
                        {isFiscalDec ? `Movimentação por Conta (Exercício ${selectedYear})` : `Movimentação por Conta (${selectedYear})`}
                      </h4>
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-xl bg-zinc-50 p-4 border border-zinc-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-zinc-800 text-sm">Conta Corrente</span>
                          <span className="text-xs text-zinc-500">{accountSummary.corrente.count} lançamentos</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-zinc-400 block text-[10px] uppercase font-bold">Entradas</span>
                            <span className="font-semibold text-emerald-600">+{formatCurrency(accountSummary.corrente.income)}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px] uppercase font-bold">Saídas</span>
                            <span className="font-semibold text-rose-600">-{formatCurrency(accountSummary.corrente.expenses)}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px] uppercase font-bold">Resultado</span>
                            <span className={cn("font-bold", accountSummary.corrente.balance >= 0 ? "text-indigo-700" : "text-rose-600")}>
                              {formatCurrency(accountSummary.corrente.balance)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-4 border border-zinc-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-zinc-800 text-sm">Conta Poupança</span>
                          <span className="text-xs text-zinc-500">{accountSummary.poupanca.count} lançamentos</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-zinc-400 block text-[10px] uppercase font-bold">Entradas</span>
                            <span className="font-semibold text-emerald-600">+{formatCurrency(accountSummary.poupanca.income)}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px] uppercase font-bold">Saídas</span>
                            <span className="font-semibold text-rose-600">-{formatCurrency(accountSummary.poupanca.expenses)}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px] uppercase font-bold">Resultado</span>
                            <span className={cn("font-bold", accountSummary.poupanca.balance >= 0 ? "text-indigo-700" : "text-rose-600")}>
                              {formatCurrency(accountSummary.poupanca.balance)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Principais Categorias no Ano */}
                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-2xs">
                    <div className="flex items-center gap-2 mb-4">
                      <PieChart className="h-5 w-5 text-indigo-600" />
                      <h4 className="font-bold text-sm text-zinc-900 uppercase tracking-wider">
                        {isFiscalDec ? `Principais Despesas do Exercício` : `Principais Despesas no Ano`}
                      </h4>
                    </div>

                    {topCategories.topExpenses.length === 0 ? (
                      <p className="text-xs text-zinc-400 py-6 text-center">Nenhuma saída registrada no período.</p>
                    ) : (
                      <div className="space-y-3">
                        {topCategories.topExpenses.map((cat, idx) => {
                          const percentage = expenses > 0 ? (cat.total / expenses) * 100 : 0;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-medium text-zinc-700 truncate">{cat.name}</span>
                                <span className="font-bold text-zinc-900">{formatCurrency(cat.total)} ({percentage.toFixed(1)}%)</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                                <div
                                  className="h-full bg-rose-500 rounded-full"
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tabela de Lançamentos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-zinc-800 uppercase tracking-wider">
                  {periodMode === 'year'
                    ? (isFiscalDec
                      ? `Lançamentos do Exercício Fiscal (${filteredTransactions.length})`
                      : `Todos os Lançamentos do Ano (${filteredTransactions.length})`)
                    : `Lançamentos do Mês (${filteredTransactions.length})`}
                </h4>
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
                                {t.category?.name || '-'}
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
          </>
        )}
      </div>

      {/* Modal para Lançamento de Totais Históricos */}
      <HistoricalTotalsModal
        isOpen={isHistoricalModalOpen}
        onClose={() => setIsHistoricalModalOpen(false)}
        onSaved={fetchReportData}
        initialYear={compareYear}
      />
    </div>
  );
};
