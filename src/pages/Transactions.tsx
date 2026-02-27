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
  X
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Transaction, Category, Department } from '../types';
import { n8nService } from '../services/n8nService';

const transactionSchema = z.object({
  description: z.string().min(3, 'Descrição muito curta'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  date: z.string(),
  type: z.enum(['income', 'expense']),
  category_id: z.string().min(1, 'Selecione uma categoria'),
  department_id: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export const Transactions: React.FC = () => {
  const { organization, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'income',
      date: new Date().toISOString().split('T')[0],
    }
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (organization) {
      fetchData();
    }
  }, [organization]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transRes, catRes, depRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, categories(*), departments(*)')
          .eq('organization_id', organization?.id)
          .order('date', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('organization_id', organization?.id),
        supabase
          .from('departments')
          .select('*')
          .eq('organization_id', organization?.id)
      ]);

      if (transRes.data) setTransactions(transRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (depRes.data) setDepartments(depRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${organization?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const onSubmit = async (data: TransactionFormValues) => {
    if (!organization || !profile) return;
    setIsSubmitting(true);

    try {
      let attachment_url = '';
      if (file) {
        attachment_url = await handleFileUpload(file);
      }

      const { error } = await supabase
        .from('transactions')
        .insert([{
          ...data,
          organization_id: organization.id,
          attachment_url,
          status: data.amount > 500 ? 'pending' : 'conciliated', // Example logic
        }]);

      if (error) throw error;

      reset();
      setFile(null);
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleConciliation = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'conciliated' ? 'pending' : 'conciliated';
    const { error } = await supabase
      .from('transactions')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Lançamentos</h2>
          <p className="text-zinc-500">Gerencie as entradas e saídas da igreja.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
        >
          <Plus className="mr-2 h-5 w-5" />
          Novo Lançamento
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const input = document.createElement('input');
              input.type = 'file';
              input.onchange = async (e: any) => {
                const file = e.target.files[0];
                if (file && organization && profile) {
                  const res = await n8nService.processFile(file, organization.id, profile.id);
                  if (res.success) alert('Arquivo enviado para processamento!');
                  else alert('Erro: ' + res.error);
                }
              };
              input.click();
            }}
            className="flex items-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
          >
            <FileText className="mr-2 h-4 w-4" />
            Processar Extrato (n8n)
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          >
            <option value="all">Todos os Status</option>
            <option value="conciliated">Conciliado</option>
            <option value="pending">Pendente</option>
            <option value="pending_approval">Aguardando Aprovação</option>
          </select>
          <button className="flex items-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
            <tr>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Categoria/Depto</th>
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
                    <span className="text-xs text-zinc-400">{t.department?.name || 'Geral'}</span>
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
                    onClick={() => toggleConciliation(t.id, t.status)}
                    className={cn(
                      "flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                      t.status === 'conciliated' ? "bg-emerald-50 text-emerald-700" : 
                      t.status === 'pending' ? "bg-amber-50 text-amber-700" :
                      "bg-blue-50 text-blue-700"
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
                  <button className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-zinc-900">Novo Lançamento</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-zinc-700">Descrição</label>
                <input 
                  {...register('description')}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10" 
                  placeholder="Ex: Oferta Culto de Domingo" 
                />
                {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
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

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Categoria</label>
                <select 
                  {...register('category_id')}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="">Selecione...</option>
                  {categories
                    .filter(c => c.type === selectedType)
                    .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.category_id && <p className="mt-1 text-xs text-red-600">{errors.category_id.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-zinc-700">Departamento (Opcional)</label>
                <select 
                  {...register('department_id')}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="">Geral</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
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
                  onClick={() => setShowModal(false)} 
                  className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
