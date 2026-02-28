import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { Category, TransactionType } from '../../types';
import { cn } from '../../lib/utils';

interface CategoryFormProps {
  editingCategory: Category | null;
  parentCategories: Category[];
  isSubmitting: boolean;
  canEdit: boolean;
  onSave: (data: { id?: string; name: string; type: TransactionType; parent_id: string | null }) => Promise<boolean>;
  onCancel: () => void;
  onClearAll: () => void;
  onImportPremium: () => void;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  editingCategory,
  parentCategories,
  isSubmitting,
  canEdit,
  onSave,
  onCancel,
  onClearAll,
  onImportPremium
}) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [type, setType] = useState<TransactionType>('income');

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setType(editingCategory.type);
      setParentId(editingCategory.parent_id || '');
    } else {
      setName('');
      setParentId('');
    }
  }, [editingCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const success = await onSave({
      id: editingCategory?.id,
      name,
      type,
      parent_id: parentId || null
    });

    if (success && !editingCategory) {
      setName('');
      setParentId('');
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 flex items-center">
          {editingCategory ? (
            <>
              <Edit2 className="mr-2 h-5 w-5 text-amber-600" />
              Editando: <span className="ml-2 text-amber-700">{name || 'Categoria'}</span>
            </>
          ) : (
            <>
              <Plus className="mr-2 h-5 w-5 text-emerald-600" />
              Nova Categoria / Subcategoria
            </>
          )}
        </h3>
        <div className="flex gap-2">
          {canEdit && (
            <button 
              onClick={onClearAll}
              disabled={isSubmitting}
              className="text-xs font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg px-3 py-1.5 bg-rose-50 transition-colors disabled:opacity-50"
            >
              Limpar Tudo
            </button>
          )}
          <button 
            onClick={onImportPremium}
            disabled={isSubmitting || !canEdit}
            className="text-xs font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg px-3 py-1.5 bg-emerald-50 transition-colors disabled:opacity-50"
          >
            Plano de Contas Profissional
          </button>
        </div>
      </div>
      
      {!canEdit && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800 border border-amber-100">
          <AlertCircle className="h-4 w-4" />
          Você está em modo de visualização. Apenas administradores podem salvar alterações.
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-zinc-500 uppercase">Nome</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={!canEdit}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none disabled:opacity-50"
            placeholder="Ex: Aluguel, Dízimos..."
          />
        </div>
        
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 uppercase">Tipo</label>
          <select 
            value={type}
            disabled={!canEdit}
            onChange={(e) => {
              setType(e.target.value as TransactionType);
              setParentId('');
            }}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none disabled:opacity-50"
          >
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 uppercase">Categoria Pai (Opcional)</label>
          <select 
            value={parentId}
            disabled={!canEdit}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none disabled:opacity-50"
          >
            <option value="">Nenhuma (Será uma Categoria Pai)</option>
            {parentCategories
              .filter(c => c.type === type && c.id !== editingCategory?.id)
              .map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))
            }
          </select>
        </div>

        <div className="sm:col-span-3 flex gap-2">
          <button 
            type="submit" 
            disabled={isSubmitting || !canEdit}
            className={cn(
              "flex items-center justify-center rounded-xl px-6 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50",
              editingCategory ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editingCategory ? <Edit2 className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {editingCategory ? 'Salvar Alterações' : 'Adicionar Categoria'}
          </button>
          {editingCategory && (
            <button 
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-zinc-200 px-6 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
