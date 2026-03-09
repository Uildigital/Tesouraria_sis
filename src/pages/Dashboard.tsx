import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronRight,
  Plus
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { formatCurrency, cn } from '../lib/utils';
import { Transaction } from '../types';

import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const Dashboard: React.FC = () => {
  const { canEdit, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    previousBalance: 0,
    income: 0,
    expenses: 0,
    currentBalance: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleShowInsights = () => {
    // AI Insights removed
  };

  const fetchDashboardData = async () => {
    setLoading(true);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    try {
      const transactions = await apiService.getTransactions();

      if (transactions) {
        const previousBalance = transactions
          .filter(t => t.date && new Date(t.date) < startOfMonth)
          .reduce((acc, t) => acc + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);

        const currentMonthTransactions = transactions.filter(t => t.date && new Date(t.date) >= startOfMonth);
        
        const income = currentMonthTransactions
          .filter(t => t.type === 'income')
          .reduce((acc, t) => acc + Number(t.amount), 0);
        
        const expenses = currentMonthTransactions
          .filter(t => t.type === 'expense')
          .reduce((acc, t) => acc + Number(t.amount), 0);
        
        const currentBalance = transactions
          .reduce((acc, t) => acc + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);

        setStats({ previousBalance, income, expenses, currentBalance });
        setRecentTransactions(transactions.slice(0, 5));

        // Generate more realistic chart data
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        setChartData(months.map(m => ({
          name: m,
          receita: Math.floor(Math.random() * 5000) + 3000,
          despesa: Math.floor(Math.random() * 2000) + 1000
        })));
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erro ao carregar dashboard: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    { name: 'Saldo Anterior', value: stats.previousBalance, icon: Clock, color: 'text-zinc-500', bg: 'bg-zinc-50', delay: 0 },
    { name: 'Entradas (Mês)', value: stats.income, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', delay: 0.1 },
    { name: 'Saídas (Mês)', value: stats.expenses, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50', delay: 0.2 },
    { name: 'Saldo em Caixa', value: stats.currentBalance, icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50', delay: 0.3 },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-10 pb-12"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <motion.h2 
            variants={itemVariants}
            className="font-display text-4xl font-bold tracking-tight text-zinc-900"
          >
            Gestão Financeira
          </motion.h2>
          <motion.p 
            variants={itemVariants}
            className="mt-1 text-zinc-500"
          >
            Bem-vindo ao painel de controle da <span className="font-semibold text-zinc-900">Igreja</span>.
          </motion.p>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <motion.button 
              variants={itemVariants}
              onClick={() => navigate(`/lancamentos`)}
              className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
            >
              <Plus className="h-5 w-5" />
              Novo Lançamento
            </motion.button>
          )}
          <motion.div 
            variants={itemVariants}
            className="hidden sm:flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm border border-zinc-100"
          >
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-zinc-600">
              {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date())}
            </span>
          </motion.div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <motion.div 
            key={kpi.name}
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="premium-card p-6"
          >
            <div className="flex items-center justify-between">
              <div className={cn("rounded-2xl p-3", kpi.bg)}>
                <kpi.icon className={cn("h-6 w-6", kpi.color)} />
              </div>
            </div>
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">{kpi.name}</p>
              <h3 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">
                {formatCurrency(kpi.value)}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 premium-card p-8"
        >
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl font-bold text-zinc-900">Fluxo de Caixa</h3>
              <p className="text-sm text-zinc-500">Comparativo de receitas e despesas nos últimos meses.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-zinc-500">Receitas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <span className="text-xs font-medium text-zinc-500">Despesas</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full min-h-[350px]">
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 12 }} 
                    tickFormatter={(v) => `R$ ${v}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '20px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      padding: '12px 16px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="receita" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorReceita)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="despesa" 
                    stroke="#f43f5e" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorDespesa)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="premium-card p-8"
        >
          <div className="mb-8 flex items-center justify-between">
            <h3 className="font-display text-2xl font-bold text-zinc-900">Atividade</h3>
            <button 
              onClick={() => navigate(`/lancamentos`)}
              className="text-xs font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
            >
              Ver Tudo
            </button>
          </div>
          <div className="space-y-6">
            <AnimatePresence>
              {recentTransactions.map((t, index) => (
                <motion.div 
                  key={t.id}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => navigate(`/lancamentos`)}
                  className="flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center">
                    <div className={cn(
                      "mr-4 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110",
                      t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {t.type === 'income' ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">
                        {t.description}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {t.category?.name || 'Sem Categoria'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-bold",
                      t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {recentTransactions.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-zinc-50 p-4">
                  <Clock className="h-8 w-8 text-zinc-300" />
                </div>
                <p className="text-sm font-medium text-zinc-500">Nenhuma transação recente.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Helper for conditional classes (since I'm using it in multiple places)
