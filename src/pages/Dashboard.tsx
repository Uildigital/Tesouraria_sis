import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { Transaction } from '../types';

export const Dashboard: React.FC = () => {
  const { organization } = useAuth();
  const [stats, setStats] = useState({
    balance: 0,
    income: 0,
    expenses: 0,
    pending: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (organization) {
      fetchDashboardData();
    }
  }, [organization]);

  const fetchDashboardData = async () => {
    if (!organization) return;

    // Fetch transactions for the current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('organization_id', organization.id)
      .order('date', { ascending: false });

    if (transactions) {
      const currentMonthTransactions = transactions.filter(t => new Date(t.date) >= startOfMonth);
      
      const income = currentMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);
      
      const expenses = currentMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);
      
      const balance = transactions
        .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
      
      const pending = transactions
        .filter(t => t.status === 'pending')
        .reduce((acc, t) => acc + t.amount, 0);

      setStats({ balance, income, expenses, pending });
      setRecentTransactions(transactions.slice(0, 5));

      // Mock chart data based on last 6 months
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
      setChartData(months.map(m => ({
        name: m,
        receita: Math.floor(Math.random() * 5000) + 2000,
        despesa: Math.floor(Math.random() * 3000) + 1000
      })));
    }
  };

  const kpis = [
    { name: 'Saldo Atual', value: stats.balance, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Entradas (Mês)', value: stats.income, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Saídas (Mês)', value: stats.expenses, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    { name: 'Pendente Conciliação', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard</h2>
        <p className="text-zinc-500">Visão geral das finanças da sua igreja.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.name} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={cn("rounded-xl p-2", kpi.bg)}>
                <kpi.icon className={cn("h-6 w-6", kpi.color)} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-zinc-500">{kpi.name}</p>
              <h3 className="text-2xl font-bold text-zinc-900">{formatCurrency(kpi.value)}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-lg font-semibold text-zinc-900">Comparativo Mensal</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} tickFormatter={(v) => `R$ ${v}`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-lg font-semibold text-zinc-900">Últimas Transações</h3>
          <div className="space-y-4">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-zinc-50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center">
                  <div className={cn(
                    "mr-3 flex h-10 w-10 items-center justify-center rounded-full",
                    t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  )}>
                    {t.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{t.description}</p>
                    <p className="text-xs text-zinc-500">{t.category?.name}</p>
                  </div>
                </div>
                <p className={cn(
                  "text-sm font-bold",
                  t.type === 'income' ? "text-emerald-600" : "text-red-600"
                )}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </p>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <p className="py-10 text-center text-sm text-zinc-500">Nenhuma transação recente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for conditional classes (since I'm using it in multiple places)
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
