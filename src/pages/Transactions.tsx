import React, { useEffect, useState, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock,
  FileText,
  Download,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Edit2,
  Upload
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Transaction, Category } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const transactionSchema = z.object({
  description: z.string().min(3, 'Descrição muito curta'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  date: z.string(),
  type: z.enum(['income', 'expense']),
  category_id: z.string().min(1, 'Selecione uma subcategoria'),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export const Transactions: React.FC = () => {
  const { profile, canEdit } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [file, setFile] = useState<File | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showFilters, setShowFilters] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'income',
      date: new Date().toISOString().split('T')[0],
    }
  });

  const handleDelete = async (id: string) => {
    toast.info('Exclusão não implementada para Google Sheets ainda.');
  };

  const selectedType = watch('type');
  const description = watch('description');

  const handleSuggestCategory = async () => {
    // AI Suggestion removed
  };

  // Reset subcategory when type changes
  useEffect(() => {
    setValue('category_id', '');
  }, [selectedType, setValue]);

  const groupedCategories = categories
    .filter(c => !c.parent_id && c.type === selectedType)
    .map(parent => ({
      ...parent,
      children: categories.filter(c => c.parent_id === parent.id)
    }));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transRes, catRes] = await Promise.all([
        apiService.getTransactions(),
        apiService.getCategories()
      ]);

      setTransactions(transRes || []);
      setCategories(catRes || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setValue('description', transaction.description);
    setValue('amount', transaction.amount);
    setValue('date', transaction.date);
    setValue('type', transaction.type);
    setValue('category_id', transaction.category_id);
    
    setShowModal(true);
  };

  const handleFileUpload = async (file: File) => {
    toast.info('Upload de arquivos não disponível para Google Sheets.');
    return '';
  };

  const handleAuthError = (error: any) => {
    if (!profile) {
      toast.error('Sessão inválida ou perfil não encontrado. Por favor, faça login novamente.');
      return;
    }
    toast.error('Erro ao salvar: ' + error.message);
  };

  const onSubmit = async (data: TransactionFormValues) => {
    if (!profile) {
      toast.error('Você precisa estar logado para realizar lançamentos.');
      return;
    }
    setIsSubmitting(true);

    try {
      let attachment_url = editingTransaction?.attachment_url || '';
      if (file) {
        attachment_url = await handleFileUpload(file);
      }

      // Prepare data for Google Sheets
      const payload = {
        description: data.description,
        amount: data.amount,
        date: data.date,
        type: data.type,
        category_id: data.category_id,
        user_id: profile.id
      };

      if (editingTransaction) {
        toast.info('Edição não implementada para Google Sheets ainda.');
      } else {
        const res = await apiService.createTransaction(payload);
        if (!res.success) throw new Error('Erro ao salvar');
        toast.success('Lançamento salvo com sucesso!');
      }

      reset();
      setFile(null);
      setEditingTransaction(null);
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleConciliation = async (id: string, currentStatus: string) => {
    toast.info('Conciliação não implementada para Google Sheets ainda.');
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-12"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-zinc-900">Lançamentos</h2>
          <p className="mt-1 text-zinc-500">Gerencie entradas e saídas com precisão.</p>
        </div>
        <div className="flex gap-3">
          {canEdit && (
            <>
              <button 
                onClick={() => setShowModal(true)}
                className="flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
              >
                <Plus className="mr-2 h-5 w-5" />
                Novo Lançamento
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="premium-card p-6 flex items-center gap-4">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <ArrowUpRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Total Entradas</p>
            <p className="text-xl font-bold text-zinc-900">
              {formatCurrency(transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0))}
            </p>
          </div>
        </div>
        <div className="premium-card p-6 flex items-center gap-4">
          <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
            <ArrowDownRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Total Saídas</p>
            <p className="text-xl font-bold text-zinc-900">
              {formatCurrency(transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0))}
            </p>
          </div>
        </div>
        <div className="premium-card p-6 flex items-center gap-4">
          <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Lançamentos</p>
            <p className="text-xl font-bold text-zinc-900">{transactions.length}</p>
          </div>
        </div>
      </div>

      <div className="premium-card p-8">
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 py-3 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
            >
              <option value="all">Todos os Status</option>
              <option value="conciliated">Conciliado</option>
              <option value="pending">Pendente</option>
              <option value="pending_approval">Aprovação</option>
            </select>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium transition-all",
                showFilters ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"
              )}
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-6 border-t border-zinc-100 grid gap-4 sm:grid-cols-3">
                {/* Add more filters here if needed */}
                <p className="text-xs text-zinc-400 italic">Filtros avançados em desenvolvimento...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="min-w-[800px]">
          <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
            <tr>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                </td>
              </tr>
            ) : filteredTransactions.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-zinc-600 font-medium">{formatDate(t.date)}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-zinc-900">{t.description}</span>
                    {t.attachment_url && (
                      <a href={t.attachment_url} target="_blank" rel="noreferrer" className="mt-1 flex items-center text-xs text-emerald-600 hover:underline">
                        <FileText className="mr-1 h-3 w-3" /> Ver comprovante
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-zinc-700">{t.category?.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "font-bold",
                    t.type === 'income' ? "text-emerald-600" : "text-red-600"
                  )}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => canEdit && toggleConciliation(t.id, t.status)}
                    disabled={!canEdit}
                    className={cn(
                      "flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                      t.status === 'conciliated' ? "bg-emerald-50 text-emerald-700" : 
                      t.status === 'pending' ? "bg-amber-50 text-amber-700" :
                      "bg-blue-50 text-blue-700",
                      !canEdit && "cursor-default"
                    )}
                  >
                    {t.status === 'conciliated' ? (
                      <><CheckCircle2 className="mr-1 h-3 w-3" /> Conciliado</>
                    ) : t.status === 'pending' ? (
                      <><Clock className="mr-1 h-3 w-3" /> Pendente</>
                    ) : (
                      <><AlertCircle className="mr-1 h-3 w-3" /> Aprovação</>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {canEdit && (
                      <>
                        <button 
                          onClick={() => handleEdit(t)}
                          className="rounded-lg p-1 text-zinc-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="rounded-lg p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-4 rounded-full bg-zinc-50 p-4">
                      <FileText className="h-10 w-10 text-zinc-300" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">Nenhum lançamento encontrado</h3>
                    <p className="mt-1 text-sm text-zinc-500">Comece registrando a primeira movimentação da igreja.</p>
                    {canEdit && (
                      <button 
                        onClick={() => setShowModal(true)}
                        className="mt-6 flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Lançamento
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-zinc-900">
                {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setEditingTransaction(null);
                  reset();
                }} 
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Descrição</label>
                <div className="relative">
                  <input 
                    {...register('description')}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                    placeholder="Ex: Oferta Culto de Domingo" 
                  />
                </div>
                {errors.description && <p className="mt-1 text-xs font-bold text-rose-600">{errors.description.message}</p>}
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Valor</label>
                <input 
                  type="number" 
                  step="0.01" 
                  {...register('amount', { valueAsNumber: true })}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10" 
                  placeholder="0,00" 
                />
                {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Data</label>
                <input 
                  type="date" 
                  {...register('date')}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10" 
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Tipo</label>
                <select 
                  {...register('type')}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="income">Entrada</option>
                  <option value="expense">Saída</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-zinc-700">Categoria</label>
                <select 
                  {...register('category_id')}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="">Selecione uma subcategoria...</option>
                  {groupedCategories.map(parent => (
                    <optgroup key={parent.id} label={parent.name}>
                      {parent.children.map(child => (
                        <option key={child.id} value={child.id}>{child.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.category_id && <p className="mt-1 text-xs text-red-600">{errors.category_id.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-zinc-700">Comprovante</label>
                <div className="relative flex w-full items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 p-6 transition-colors hover:border-emerald-500 hover:bg-emerald-50/30">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <div className="text-center">
                    <Download className="mx-auto mb-2 h-8 w-8 text-zinc-400" />
                    <p className="text-sm text-zinc-600">{file ? file.name : 'Clique para upload ou arraste o arquivo'}</p>
                    <p className="text-xs text-zinc-400">PDF, PNG, JPG até 5MB</p>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 mt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowModal(false);
                    setEditingTransaction(null);
                    reset();
                  }} 
                  className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 flex items-center justify-center rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50",
                    editingTransaction ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : editingTransaction ? 'Salvar Alterações' : 'Salvar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};
