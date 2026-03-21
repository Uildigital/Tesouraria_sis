import React, { useState } from 'react';
import { Plus, Search, Filter, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { Transaction } from '../types';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { TransactionSummaryCards } from '../components/transactions/TransactionSummaryCards';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { TransactionFormModal, TransactionFormValues } from '../components/transactions/TransactionFormModal';
import { MonthPicker } from '../components/shared/MonthPicker';

export const Transactions: React.FC = () => {
  const { profile, canEdit } = useAuth();
  const queryClient = useQueryClient();
  
  // Queries
  const { data: transactions = [], isLoading: isLoadingTrans } = useQuery({
    queryKey: ['transactions'],
    queryFn: apiService.getTransactions,
  });
  
  const { data: categories = [], isLoading: isLoadingCat } = useQuery({
    queryKey: ['categories'],
    queryFn: apiService.getCategories,
  });

  const loading = isLoadingTrans || isLoadingCat;

  // Local State
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Date Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [activeAccountTab, setActiveAccountTab] = useState<'Corrente' | 'Poupança'>('Corrente');

  // Mutations
  const { mutate: deleteTrans } = useMutation({
    mutationFn: apiService.deleteTransaction,
    onSuccess: () => {
      toast.success('Lançamento excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err: any) => toast.error('Erro ao excluir: ' + err.message)
  });

  const { mutate: toggleStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pending' | 'conciliated' | 'pending_approval' }) => apiService.updateTransaction(id, { status }),
    onSuccess: (_, variables) => {
      toast.success(`Status atualizado para ${variables.status === 'conciliated' ? 'Conciliado' : 'Pendente'}`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err: any) => toast.error('Erro ao atualizar status: ' + err.message)
  });

  const { mutate: saveTrans, isPending: isSubmitting } = useMutation({
    mutationFn: (data: TransactionFormValues & { user_id: string }) => {
      if (editingTransaction) {
        return apiService.updateTransaction(editingTransaction.id, data);
      }
      return apiService.createTransaction(data);
    },
    onSuccess: () => {
      toast.success(editingTransaction ? 'Lançamento atualizado com sucesso!' : 'Lançamento salvo com sucesso!');
      setShowModal(false);
      setEditingTransaction(null);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err: any) => {
      if (!profile) toast.error('Sessão inválida. Por favor, faça login novamente.');
      else toast.error('Erro ao salvar: ' + err.message);
    }
  });

  // Handlers
  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lançamento?')) deleteTrans(id);
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    if (!canEdit) return;
    const newStatus = currentStatus === 'conciliated' ? 'pending' : 'conciliated';
    toggleStatus({ id, status: newStatus });
  };

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setShowModal(true);
  };

  const handleSubmit = (data: TransactionFormValues) => {
    if (!profile) {
      toast.error('Você precisa estar logado para realizar lançamentos.');
      return;
    }
    saveTrans({ ...data, user_id: profile.id });
  };

  // Processing Data
  const filteredTransactions = transactions
    .filter(t => {
      let matchesDate = true;
      if (t.date) {
        const [tYear, tMonth] = t.date.split('-');
        matchesDate = parseInt(tYear, 10) === selectedYear && (parseInt(tMonth, 10) - 1) === selectedMonth;
      }

      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesAccount = t.account === activeAccountTab;
      
      return matchesDate && matchesSearch && matchesStatus && matchesAccount;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      if (dateA !== dateB) return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
      const createA = new Date(a.created_at || 0).getTime();
      const createB = new Date(b.created_at || 0).getTime();
      return createA - createB;
    });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-zinc-900">Lançamentos</h2>
          <p className="mt-1 text-zinc-500">Gerencie entradas e saídas com precisão.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker 
            selectedMonth={selectedMonth} 
            selectedYear={selectedYear} 
            onMonthChange={setSelectedMonth} 
            onYearChange={setSelectedYear} 
          />
          {canEdit && (
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
            >
              <Plus className="mr-2 h-5 w-5" /> Novo Lançamento
            </button>
          )}
        </div>
      </div>

      <TransactionSummaryCards transactions={filteredTransactions} activeAccountTab={activeAccountTab} />

      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveAccountTab('Corrente')}
          className={cn("px-6 py-3 text-sm font-bold transition-all border-b-2", activeAccountTab === 'Corrente' ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600")}
        >Conta Corrente</button>
        <button
          onClick={() => setActiveAccountTab('Poupança')}
          className={cn("px-6 py-3 text-sm font-bold transition-all border-b-2", activeAccountTab === 'Poupança' ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600")}
        >Poupança</button>
      </div>

      <div className="premium-card p-8">
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" placeholder="Buscar por descrição..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 py-3 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
            >
              <option value="all">Todos os Status</option>
              <option value="conciliated">Conciliado</option>
              <option value="pending">Pendente</option>
              <option value="pending_approval">Aprovação</option>
            </select>
            <button 
              onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium bg-white text-zinc-600 hover:bg-zinc-50 transition-all"
            >
              {sortDirection === 'desc' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </button>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn("flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium transition-all", showFilters ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50")}
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <TransactionTable 
        transactions={filteredTransactions} loading={loading} canEdit={canEdit}
        onEdit={handleEdit} onDelete={handleDelete} onToggleStatus={handleToggleStatus} onNew={() => setShowModal(true)}
      />

      {showModal && (
        <TransactionFormModal
          editingTransaction={editingTransaction}
          categories={categories}
          isSubmitting={isSubmitting}
          defaultAccount={activeAccountTab}
          onClose={() => { setShowModal(false); setEditingTransaction(null); }}
          onSubmit={handleSubmit}
        />
      )}
    </motion.div>
  );
};
