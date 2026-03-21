import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Wallet, Clock, ArrowUpRight, ArrowDownRight, 
  Calendar, ChevronRight, Plus, Loader2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { formatCurrency, cn, parseAmount, getMonthFilterRange } from '../lib/utils';
import { Transaction } from '../types';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MonthPicker } from '../components/shared/MonthPicker';

export const Dashboard: React.FC = () => {
  const { canEdit, profile } = useAuth();
  const navigate = useNavigate();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: apiService.getTransactions,
  });

  const { stats, recentTransactions, chartData } = useMemo(() => {
    const { startOfMonthStr, endOfMonthStr } = getMonthFilterRange(selectedYear, selectedMonth);

    const previousBalance = transactions
      .filter(t => t.date && t.date < startOfMonthStr)
      .reduce((acc, t) => acc + (t.type === 'income' ? parseAmount(t.amount) : -parseAmount(t.amount)), 0);

    const currentMonthTransactions = transactions.filter(t => t.date && t.date >= startOfMonthStr && t.date <= endOfMonthStr);
    
    const isTransfer = (t: Transaction) => t.category_id?.startsWith('inc_3_2') || t.category_id?.startsWith('exp_7');

    const income = currentMonthTransactions
      .filter(t => t.type === 'income' && !isTransfer(t))
      .reduce((acc, t) => acc + parseAmount(t.amount), 0);
    
    const expenses = currentMonthTransactions
      .filter(t => t.type === 'expense' && !isTransfer(t))
      .reduce((acc, t) => acc + parseAmount(t.amount), 0);
    
    const currentBalance = transactions
      .reduce((acc, t) => acc + (t.type === 'income' ? parseAmount(t.amount) : -parseAmount(t.amount)), 0);

    const correnteBalance = transactions
      .filter(t => t.account === 'Corrente' || !t.account)
      .reduce((acc, t) => acc + (t.type === 'income' ? parseAmount(t.amount) : -parseAmount(t.amount)), 0);

    const poupancaBalance = transactions
      .filter(t => t.account === 'Poupança')
      .reduce((acc, t) => acc + (t.type === 'income' ? parseAmount(t.amount) : -parseAmount(t.amount)), 0);

    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const createA = new Date(a.created_at || 0).getTime();
      const createB = new Date(b.created_at || 0).getTime();
      return createA - createB;
    });

    const recent = sortedTransactions.slice(0, 5);

    const monthsData: any[] = [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      const monthLabel = monthNames[d.getMonth()];
      
      const monthTransactions = transactions.filter(t => t.date && t.date.startsWith(monthStr));
      const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + parseAmount(t.amount), 0);
      const monthExpenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + parseAmount(t.amount), 0);
        
      monthsData.push({ name: monthLabel, receita: monthIncome, despesa: monthExpenses });
    }

    return { 
      stats: { previousBalance, income, expenses, currentBalance, correnteBalance, poupancaBalance },
      recentTransactions: recent,
      chartData: monthsData
    };
  }, [transactions, selectedMonth, selectedYear]);

  const kpis = [
    { name: 'Saldo Anterior', value: stats.previousBalance, icon: Clock, color: 'text-zinc-500', bg: 'bg-zinc-50' },
    { name: 'Entradas (Mês)', value: stats.income, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Saídas (Mês)', value: stats.expenses, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
    { name: 'Saldo em Caixa', value: stats.currentBalance, icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-10 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <motion.h2 variants={itemVariants} className="font-display text-4xl font-bold tracking-tight text-zinc-900">
            Gestão Financeira
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-1 text-zinc-500">
            Bem-vindo ao painel de controle da <span className="font-semibold text-zinc-900">Igreja</span>.
          </motion.p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canEdit && (
            <motion.button 
              variants={itemVariants} onClick={() => navigate(`/lancamentos`)}
              className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
            >
              <Plus className="h-5 w-5" /> Novo Lançamento
            </motion.button>
          )}
          <motion.div variants={itemVariants}>
            <MonthPicker 
              selectedMonth={selectedMonth} 
              selectedYear={selectedYear} 
              onMonthChange={setSelectedMonth} 
              onYearChange={setSelectedYear} 
            />
          </motion.div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <motion.div key={kpi.name} variants={itemVariants} whileHover={{ y: -5 }} className="premium-card p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className={cn("rounded-xl sm:rounded-2xl p-2 sm:p-3", kpi.bg)}>
                <kpi.icon className={cn("h-5 w-5 sm:h-6 sm:h-6", kpi.color)} />
              </div>
            </div>
            <div className="mt-4 sm:mt-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{kpi.name}</p>
              <h3 className="mt-1 text-lg sm:text-3xl font-bold tracking-tight text-zinc-900 truncate">
                {formatCurrency(kpi.value)}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2">
        <div className="premium-card p-6 border-l-4 border-l-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Conta Corrente</p>
            <span className="text-xs font-bold text-zinc-900">{formatCurrency(stats.correnteBalance)}</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-zinc-900" style={{ width: `${Math.min(100, Math.max(0, (stats.correnteBalance / (stats.currentBalance || 1)) * 100))}%` }} />
          </div>
        </div>
        <div className="premium-card p-6 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Poupança</p>
            <span className="text-xs font-bold text-indigo-600">{formatCurrency(stats.poupancaBalance)}</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.min(100, Math.max(0, (stats.poupancaBalance / (stats.currentBalance || 1)) * 100))}%` }} />
          </div>
        </div>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="lg:col-span-2 premium-card p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl font-bold text-zinc-900">Fluxo de Caixa</h3>
              <p className="text-sm text-zinc-500">Comparativo de receitas e despesas nos últimos meses.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-emerald-500" /><span className="text-xs font-medium text-zinc-500">Receitas</span></div>
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-rose-500" /><span className="text-xs font-medium text-zinc-500">Despesas</span></div>
            </div>
          </div>
          <div className="h-[350px] w-full min-h-[350px]">
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => `R$ ${v}`} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                  <Bar dataKey="receita" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="despesa" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="premium-card p-8">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="font-display text-2xl font-bold text-zinc-900">Atividade</h3>
            <button onClick={() => navigate(`/lancamentos`)} className="text-xs font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700">Ver Tudo</button>
          </div>
          <div className="space-y-6">
            <AnimatePresence>
              {recentTransactions.map((t, index) => (
                <motion.div 
                  key={t.id} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * 0.1 }}
                  onClick={() => navigate(`/lancamentos`)} className="flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center">
                    <div className={cn("mr-4 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110", t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                      {t.type === 'income' ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">{t.description}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t.category?.name || 'Sem Categoria'}</p>
                        <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">{t.account || 'Corrente'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-bold", t.type === 'income' ? "text-emerald-600" : "text-rose-600")}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <p className="text-[10px] text-zinc-400">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {recentTransactions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-zinc-50 p-4"><Clock className="h-8 w-8 text-zinc-300" /></div>
                <p className="text-sm font-medium text-zinc-500">Nenhuma transação recente.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
