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
  Clock
} from 'lucide-react';
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

export const Reports: React.FC = () => {
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

  const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0);
  const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0);
  const balance = income - expenses;

  // Monthly breakdown for annual view (follows fiscal year)
  const monthlySummary = useMemo(() => {
    if (periodMode !== 'year') return [];

    let monthsList: Array<{ prefix: string; name: string; shortName: string }> = [];

    if (isFiscalDec) {
      const prevYear = Number(selectedYear) - 1;
      monthsList = [
        { prefix: `${prevYear}-12`, name: `Dezembro/${prevYear}`, shortName: 'Dez' },
        { prefix: `${selectedYear}-01`, name: `Janeiro/${selectedYear}`, shortName: 'Jan' },
        { prefix: `${selectedYear}-02`, name: 'Fevereiro', shortName: 'Fev' },
        { prefix: `${selectedYear}-03`, name: 'Março', shortName: 'Mar' },
        { prefix: `${selectedYear}-04`, name: 'Abril', shortName: 'Abr' },
        { prefix: `${selectedYear}-05`, name: 'Maio', shortName: 'Mai' },
        { prefix: `${selectedYear}-06`, name: 'Junho', shortName: 'Jun' },
        { prefix: `${selectedYear}-07`, name: 'Julho', shortName: 'Jul' },
        { prefix: `${selectedYear}-08`, name: 'Agosto', shortName: 'Ago' },
        { prefix: `${selectedYear}-09`, name: 'Setembro', shortName: 'Set' },
        { prefix: `${selectedYear}-10`, name: 'Outubro', shortName: 'Out' },
        { prefix: `${selectedYear}-11`, name: 'Novembro', shortName: 'Nov' },
      ];
    } else {
      const calNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      monthsList = calNames.map((name, i) => ({
        prefix: `${selectedYear}-${String(i + 1).padStart(2, '0')}`,
        name,
        shortName: name.slice(0, 3)
      }));
    }

    return monthsList.map((m, index) => {
      const monthTrans = filteredTransactions.filter(t => t.date && t.date.startsWith(m.prefix));
      const mIncome = monthTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0);
      const mExpenses = monthTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0);
      const mBalance = mIncome - mExpenses;

      return {
        monthIndex: index + 1,
        monthStr: m.prefix,
        name: m.name,
        shortName: m.shortName,
        count: monthTrans.length,
        income: mIncome,
        expenses: mExpenses,
        balance: mBalance
      };
    });
  }, [periodMode, selectedYear, filteredTransactions, isFiscalDec]);

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
      // 1. Procurar nas transações reais
      const monthTrans = allTransactions.filter(t => t.date && t.date.startsWith(monthPrefix));
      
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
      const histInc = parseAmount(histMonth.income);
      const histExp = parseAmount(histMonth.expense);
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
        { name: 'Dezembro (ano anterior)', shortName: 'Dez', histKey: '12', getPrefix: (y) => `${Number(y) - 1}-12` },
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
      const incomeGrowth = dataY2.income > 0 ? ((dataY1.income - dataY2.income) / dataY2.income) * 100 : (dataY1.income > 0 ? 100 : 0);

      const expenseDiff = dataY1.expense - dataY2.expense;
      const expenseGrowth = dataY2.expense > 0 ? ((dataY1.expense - dataY2.expense) / dataY2.expense) * 100 : (dataY1.expense > 0 ? 100 : 0);

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

    const totalIncomeGrowth = totalY2Income > 0 ? ((totalY1Income - totalY2Income) / totalY2Income) * 100 : (totalY1Income > 0 ? 100 : 0);
    const totalExpenseGrowth = totalY2Expense > 0 ? ((totalY1Expense - totalY2Expense) / totalY2Expense) * 100 : (totalY1Expense > 0 ? 100 : 0);
    const totalBalanceDiff = totalY1Balance - totalY2Balance;

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
      totalBalanceDiff
    };
  }, [periodMode, selectedYear, compareYear, allTransactions, historicalTotals, accountFilter, isFiscalDec]);

  const generatePDF = () => {
    setIsExporting(true);

    try {
      const doc = new jsPDF();

      // MODO COMPARATIVO
      if (periodMode === 'compare' && comparativeData) {
        doc.setFontSize(22);
        doc.setTextColor(26, 34, 56);
        doc.text('Igreja', 14, 22);

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(
          isFiscalDec 
            ? `Relatório Comparativo de Exercício Fiscal (${selectedYear} vs ${compareYear})`
            : `Relatório Comparativo Anual - ${selectedYear} vs ${compareYear}`, 
          14, 30
        );
        doc.setFontSize(9);
        doc.setTextColor(130, 130, 130);
        doc.text(
          isFiscalDec ? 'Período de Apuração: 01 de Dezembro a 30 de Novembro (12 meses)' : 'Período de Apuração: 01 de Janeiro a 31 de Dezembro',
          14, 35
        );
        doc.line(14, 38, 196, 38);

        // Summary Lines
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.text(`Total Entradas: ${selectedYear}: ${formatCurrency(comparativeData.totalY1Income)} | ${compareYear}: ${formatCurrency(comparativeData.totalY2Income)} (${comparativeData.totalIncomeGrowth >= 0 ? '+' : ''}${comparativeData.totalIncomeGrowth.toFixed(1)}%)`, 14, 45);
        doc.text(`Total Saídas: ${selectedYear}: ${formatCurrency(comparativeData.totalY1Expense)} | ${compareYear}: ${formatCurrency(comparativeData.totalY2Expense)} (${comparativeData.totalExpenseGrowth >= 0 ? '+' : ''}${comparativeData.totalExpenseGrowth.toFixed(1)}%)`, 14, 51);
        doc.setFont('helvetica', 'bold');
        doc.text(`Saldo Acumulado: ${selectedYear}: ${formatCurrency(comparativeData.totalY1Balance)} | ${compareYear}: ${formatCurrency(comparativeData.totalY2Balance)} (Diferença: ${formatCurrency(comparativeData.totalBalanceDiff)})`, 14, 57);
        doc.setFont('helvetica', 'normal');

        const compRows = comparativeData.rows.map(r => [
          r.name,
          formatCurrency(r.y2Income),
          formatCurrency(r.y1Income),
          `${r.incomeGrowth >= 0 ? '+' : ''}${r.incomeGrowth.toFixed(1)}%`,
          formatCurrency(r.y2Expense),
          formatCurrency(r.y1Expense),
          `${r.expenseGrowth >= 0 ? '+' : ''}${r.expenseGrowth.toFixed(1)}%`,
          formatCurrency(r.y2Balance),
          formatCurrency(r.y1Balance),
        ]);

        // Add summary row
        compRows.push([
          'TOTAL DO EXERCÍCIO',
          formatCurrency(comparativeData.totalY2Income),
          formatCurrency(comparativeData.totalY1Income),
          `${comparativeData.totalIncomeGrowth >= 0 ? '+' : ''}${comparativeData.totalIncomeGrowth.toFixed(1)}%`,
          formatCurrency(comparativeData.totalY2Expense),
          formatCurrency(comparativeData.totalY1Expense),
          `${comparativeData.totalExpenseGrowth >= 0 ? '+' : ''}${comparativeData.totalExpenseGrowth.toFixed(1)}%`,
          formatCurrency(comparativeData.totalY2Balance),
          formatCurrency(comparativeData.totalY1Balance),
        ]);

        autoTable(doc, {
          startY: 65,
          head: [['Mês', `Entr. ${compareYear}`, `Entr. ${selectedYear}`, 'Var. Entr.', `Saíd. ${compareYear}`, `Saíd. ${selectedYear}`, 'Var. Saíd.', `Saldo ${compareYear}`, `Saldo ${selectedYear}`]],
          body: compRows,
          headStyles: { fillColor: [26, 34, 56], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [248, 249, 250] },
          styles: { fontSize: 7, halign: 'center' },
          columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' }
          }
        });

        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(`Gerado por ChurchFinance em ${new Date().toLocaleString()}`, 14, 285);
          doc.text(`Página ${i} de ${pageCount}`, 180, 285);
        }

        doc.save(`Comparativo_Fiscal_${selectedYear}_vs_${compareYear}.pdf`);
        return;
      }

      // MODO MENSAL OU ANUAL REGULAR
      if (filteredTransactions.length === 0) return;

      let periodLabel = '';
      if (periodMode === 'year') {
        periodLabel = isFiscalDec 
          ? `Exercício Fiscal de ${selectedYear} (01/12/${Number(selectedYear)-1} a 30/11/${selectedYear})`
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
                          ? `Exercício Fiscal de ${selectedYear}: 01/12/${Number(selectedYear)-1} a 30/11/${selectedYear} (12 meses).`
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
                        {isFiscalDec ? `Exercício ${y} (Dez/${Number(y)-1} a Nov/${y})` : `Ano ${y}`}
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

                  <button
                    type="button"
                    onClick={() => setIsHistoricalModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
                    title="Lançar ou editar totais consolidados do ano anterior (ex: 2025)"
                  >
                    <Edit3 size={13} />
                    <span>Lançar Totais ({compareYear})</span>
                  </button>
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
              {/* Entradas Comparadas */}
              <div className="rounded-2xl bg-emerald-50/50 p-5 sm:p-6 border border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      Entradas do Exercício
                    </span>
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-xs font-bold",
                    comparativeData.totalIncomeGrowth >= 0 
                      ? "bg-emerald-100 text-emerald-800" 
                      : "bg-rose-100 text-rose-800"
                  )}>
                    {comparativeData.totalIncomeGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {comparativeData.totalIncomeGrowth >= 0 ? '+' : ''}{comparativeData.totalIncomeGrowth.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Exercício {selectedYear}</span>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-700">{formatCurrency(comparativeData.totalY1Income)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Exercício {compareYear}</span>
                    <p className="text-sm font-semibold text-zinc-500">{formatCurrency(comparativeData.totalY2Income)}</p>
                  </div>
                </div>
              </div>

              {/* Saídas Comparadas */}
              <div className="rounded-2xl bg-rose-50/50 p-5 sm:p-6 border border-rose-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-rose-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-rose-700">
                      Saídas do Exercício
                    </span>
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-xs font-bold",
                    comparativeData.totalExpenseGrowth <= 0 
                      ? "bg-emerald-100 text-emerald-800" 
                      : "bg-rose-100 text-rose-800"
                  )}>
                    {comparativeData.totalExpenseGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {comparativeData.totalExpenseGrowth >= 0 ? '+' : ''}{comparativeData.totalExpenseGrowth.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Exercício {selectedYear}</span>
                    <p className="text-xl sm:text-2xl font-bold text-rose-700">{formatCurrency(comparativeData.totalY1Expense)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Exercício {compareYear}</span>
                    <p className="text-sm font-semibold text-zinc-500">{formatCurrency(comparativeData.totalY2Expense)}</p>
                  </div>
                </div>
              </div>

              {/* Saldo Comparado */}
              <div className="rounded-2xl bg-indigo-50/50 p-5 sm:p-6 border border-indigo-100 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-indigo-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">
                      Saldo do Exercício
                    </span>
                  </div>
                  <span className={cn(
                    "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold",
                    comparativeData.totalBalanceDiff >= 0 
                      ? "bg-emerald-100 text-emerald-800" 
                      : "bg-rose-100 text-rose-800"
                  )}>
                    Dif: {comparativeData.totalBalanceDiff >= 0 ? '+' : ''}{formatCurrency(comparativeData.totalBalanceDiff)}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Exercício {selectedYear}</span>
                    <p className={cn(
                      "text-xl sm:text-2xl font-bold",
                      comparativeData.totalY1Balance >= 0 ? "text-indigo-700" : "text-rose-600"
                    )}>
                      {formatCurrency(comparativeData.totalY1Balance)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Exercício {compareYear}</span>
                    <p className="text-sm font-semibold text-zinc-500">{formatCurrency(comparativeData.totalY2Balance)}</p>
                  </div>
                </div>
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
                      tickFormatter={(val) => `R$ ${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} 
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
                      ? `12 meses: de 01/Dez/${Number(selectedYear)-1} a 30/Nov/${selectedYear} vs 01/Dez/${Number(compareYear)-1} a 30/Nov/${compareYear}` 
                      : 'Valores consolidados e taxa de crescimento percentual.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistoricalModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Edit3 size={13} />
                  <span>Editar valores de {compareYear}</span>
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-zinc-100/80 text-[10px] font-bold uppercase tracking-wider text-zinc-600 border-b border-zinc-200">
                      <tr>
                        <th className="px-4 py-3.5">Mês</th>
                        <th className="px-3 py-3.5 text-right font-bold text-emerald-800">Entr. {compareYear}</th>
                        <th className="px-3 py-3.5 text-right font-bold text-emerald-900">Entr. {selectedYear}</th>
                        <th className="px-3 py-3.5 text-center">Var. Entr.</th>
                        <th className="px-3 py-3.5 text-right font-bold text-rose-800">Saíd. {compareYear}</th>
                        <th className="px-3 py-3.5 text-right font-bold text-rose-900">Saíd. {selectedYear}</th>
                        <th className="px-3 py-3.5 text-center">Var. Saíd.</th>
                        <th className="px-3 py-3.5 text-right font-bold text-indigo-800">Saldo {compareYear}</th>
                        <th className="px-4 py-3.5 text-right font-bold text-indigo-900">Saldo {selectedYear}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {comparativeData.rows.map(row => (
                        <tr key={row.monthIdx} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="px-4 py-3 font-bold text-zinc-800">
                            {row.name}
                          </td>
                          <td className="px-3 py-3 text-right text-zinc-500">
                            {formatCurrency(row.y2Income)}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-emerald-700">
                            {formatCurrency(row.y1Income)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={cn(
                              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                              row.incomeGrowth >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                            )}>
                              {row.incomeGrowth >= 0 ? '+' : ''}{row.incomeGrowth.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-zinc-500">
                            {formatCurrency(row.y2Expense)}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-rose-700">
                            {formatCurrency(row.y1Expense)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={cn(
                              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                              row.expenseGrowth <= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                            )}>
                              {row.expenseGrowth >= 0 ? '+' : ''}{row.expenseGrowth.toFixed(1)}%
                            </span>
                          </td>
                          <td className={cn(
                            "px-3 py-3 text-right font-medium",
                            row.y2Balance >= 0 ? "text-zinc-600" : "text-rose-600"
                          )}>
                            {formatCurrency(row.y2Balance)}
                          </td>
                          <td className={cn(
                            "px-4 py-3 text-right font-bold",
                            row.y1Balance >= 0 ? "text-indigo-700" : "text-rose-600"
                          )}>
                            {formatCurrency(row.y1Balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-100/90 font-bold border-t-2 border-zinc-200 text-xs">
                      <tr>
                        <td className="px-4 py-3.5 uppercase tracking-wider text-zinc-800">TOTAL DO EXERCÍCIO</td>
                        <td className="px-3 py-3.5 text-right text-zinc-600 font-bold">{formatCurrency(comparativeData.totalY2Income)}</td>
                        <td className="px-3 py-3.5 text-right text-emerald-800 font-bold text-sm">{formatCurrency(comparativeData.totalY1Income)}</td>
                        <td className="px-3 py-3.5 text-center">
                          <span className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold",
                            comparativeData.totalIncomeGrowth >= 0 ? "text-emerald-800 bg-emerald-100" : "text-rose-800 bg-rose-100"
                          )}>
                            {comparativeData.totalIncomeGrowth >= 0 ? '+' : ''}{comparativeData.totalIncomeGrowth.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-right text-zinc-600 font-bold">{formatCurrency(comparativeData.totalY2Expense)}</td>
                        <td className="px-3 py-3.5 text-right text-rose-800 font-bold text-sm">{formatCurrency(comparativeData.totalY1Expense)}</td>
                        <td className="px-3 py-3.5 text-center">
                          <span className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold",
                            comparativeData.totalExpenseGrowth <= 0 ? "text-emerald-800 bg-emerald-100" : "text-rose-800 bg-rose-100"
                          )}>
                            {comparativeData.totalExpenseGrowth >= 0 ? '+' : ''}{comparativeData.totalExpenseGrowth.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-right text-zinc-600 font-bold">{formatCurrency(comparativeData.totalY2Balance)}</td>
                        <td className={cn(
                          "px-4 py-3.5 text-right font-bold text-sm",
                          comparativeData.totalY1Balance >= 0 ? "text-indigo-900" : "text-rose-700"
                        )}>
                          {formatCurrency(comparativeData.totalY1Balance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
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
                          ? `Consolidado de 12 meses: de 01/Dez/${Number(selectedYear)-1} a 30/Nov/${selectedYear}.`
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
                            <span className="font-bold text-sm text-zinc-800">{m.name}</span>
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
