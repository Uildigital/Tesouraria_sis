import React, { useEffect } from 'react';
import { X, Trash2, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '../../lib/utils';
import { Transaction, Category } from '../../types';

const transactionSchema = z.object({
  description: z.string().min(3, 'Descrição muito curta'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  date: z.string(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora inválida'),
  type: z.enum(['income', 'expense']),
  category_id: z.string().min(1, 'Selecione uma subcategoria'),
  account: z.enum(['Corrente', 'Poupança']),
  observation: z.string().optional(),
  attachment_url: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

interface Props {
  editingTransaction: Transaction | null;
  categories: Category[];
  isSubmitting: boolean;
  defaultAccount: 'Corrente' | 'Poupança';
  onClose: () => void;
  onSubmit: (data: TransactionFormValues) => void;
}

export const TransactionFormModal: React.FC<Props> = ({
  editingTransaction,
  categories,
  isSubmitting,
  defaultAccount,
  onClose,
  onSubmit
}) => {
  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'income',
      account: defaultAccount,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (editingTransaction) {
      setValue('description', editingTransaction.description);
      setValue('amount', editingTransaction.amount);
      setValue('date', editingTransaction.date);
      setValue('time', editingTransaction.time || '00:00');
      setValue('type', editingTransaction.type);
      setValue('category_id', editingTransaction.category_id);
      setValue('account', editingTransaction.account || 'Corrente');
      setValue('observation', editingTransaction.observation || '');
      setValue('attachment_url', editingTransaction.attachment_url || '');
    } else {
      setValue('category_id', '');
    }
  }, [editingTransaction, setValue]);

  // Reset category on type change if Not editing
  useEffect(() => {
    if (!editingTransaction) setValue('category_id', '');
  }, [selectedType, setValue, editingTransaction]);

  const groupedCategories = categories
    .filter(c => !c.parent_id && c.type === selectedType)
    .map(parent => ({
      ...parent,
      children: categories.filter(c => c.parent_id === parent.id)
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-zinc-900">
            {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Descrição</label>
            <input 
              {...register('description')}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" 
              placeholder="Ex: Oferta Culto de Domingo" 
            />
            {errors.description && <p className="mt-1 text-xs font-bold text-rose-600">{errors.description.message}</p>}
          </div>
          
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">Valor</label>
            <input 
              type="number" step="0.01" 
              {...register('amount', { valueAsNumber: true })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10" 
            />
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
          </div>
          
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">Data e Hora</label>
            <div className="flex gap-2">
              <input type="date" {...register('date')} className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm" />
              <input type="time" {...register('time')} className="w-28 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm" />
            </div>
            {errors.time && <p className="mt-1 text-xs text-red-600">{errors.time.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">Tipo</label>
            <select {...register('type')} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm">
              <option value="income">Entrada</option>
              <option value="expense">Saída</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">Conta</label>
            <select {...register('account')} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm">
              <option value="Corrente">Conta Corrente</option>
              <option value="Poupança">Poupança</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-zinc-700">Categoria</label>
            <select {...register('category_id')} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm">
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
            <label className="mb-2 block text-sm font-medium text-zinc-700">Observações</label>
            <textarea 
              {...register('observation')}
              rows={3}
              placeholder="Ex: Pagamento em atraso por conta de feriado, doação para pastor visitante..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-zinc-700">URL do Comprovante</label>
            <div className="flex gap-2">
              <input type="text" {...register('attachment_url')} className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm" placeholder="URL do Google Drive ou outro link..." />
              {watch('attachment_url') && (
                <button type="button" onClick={() => setValue('attachment_url', '')} className="rounded-xl bg-rose-50 p-2.5 text-rose-600">
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          
          <div className="sm:col-span-2 mt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className={cn("flex-1 flex justify-center rounded-xl py-3 text-sm font-semibold text-white", editingTransaction ? "bg-amber-600" : "bg-emerald-600", isSubmitting && "opacity-50")}>
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : editingTransaction ? 'Salvar Alterações' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
