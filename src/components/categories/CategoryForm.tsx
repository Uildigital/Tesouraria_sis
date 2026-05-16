import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Loader2, AlertCircle, X } from 'lucide-react';
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
  onCreateParent?: (name: string, type: TransactionType) => Promise<string | null>;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  editingCategory,
  parentCategories,
  isSubmitting,
  canEdit,
  onSave,
  onCancel,
  onClearAll,
  onImportPremium,
  onCreateParent
}) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [parentSearch, setParentSearch] = useState('');
  const [isNewParent, setIsNewParent] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [type, setType] = useState<TransactionType>('income');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name || '');
      setType(editingCategory.type || 'income');
      const pid = editingCategory.parent_id || '';
      setParentId(pid);
      const parentCat = parentCategories.find(c => c.id === pid);
      setParentSearch(parentCat?.name || '');
      setIsNewParent(false);
    } else {
      setName('');
      setParentId('');
      setParentSearch('');
      setIsNewParent(false);
      setType('income');
    }
  }, [editingCategory, parentCategories]);

  const filteredParents = (parentCategories || [])
    .filter(c => c.type === type && c.id !== editingCategory?.id)
    .filter(c => !parentSearch || c.name.toLowerCase().includes(parentSearch.toLowerCase()));

  const hasExactMatch = filteredParents.some(
    c => c.name.toLowerCase() === parentSearch.toLowerCase()
  );

  const handleSelectParent = (id: string, catName: string) => {
    setParentId(id);
    setParentSearch(catName);
    setIsNewParent(false);
    setShowDropdown(false);
  };

  const handleSelectNone = () => {
    setParentId('');
    setParentSearch('');
    setIsNewParent(false);
    setShowDropdown(false);
  };

  const handleSelectNew = () => {
    setParentId('');
    setIsNewParent(true);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    let resolvedParentId: string | null = parentId || null;

    if (isNewParent && parentSearch && onCreateParent) {
      const newId = await onCreateParent(parentSearch, type);
      if (!newId) return;
      resolvedParentId = newId;
    }

    const success = await onSave({
      id: editingCategory?.id,
      name,
      type,
      parent_id: resolvedParentId
    });

    if (success && !editingCategory) {
      setName('');
      setParentId('');
      setParentSearch('');
      setIsNewParent(false);
    }
  };

  return (
    <div
      key={editingCategory?.id || 'new-category-form'}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      translate="no"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {editingCategory ? (
            <Edit2 className="h-5 w-5 text-amber-600" />
          ) : (
            <Plus className="h-5 w-5 text-emerald-600" />
          )}
          <h3 className="text-lg font-semibold text-zinc-900">
            {editingCategory ? `Editando: ${name || 'Categoria'}` : 'Nova Categoria / Subcategoria'}
          </h3>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onClearAll();
              }}
              disabled={isSubmitting}
              className="text-xs font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg px-3 py-1.5 bg-rose-50 transition-colors disabled:opacity-50"
            >
              <span>Limpar Tudo</span>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onImportPremium();
            }}
            disabled={isSubmitting || !canEdit}
            className="text-xs font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg px-3 py-1.5 bg-emerald-50 transition-colors disabled:opacity-50"
          >
            <span>Plano de Contas Profissional</span>
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
            disabled={!canEdit || !!editingCategory}
            onChange={(e) => {
              setType(e.target.value as TransactionType);
              setParentId('');
              setParentSearch('');
              setIsNewParent(false);
            }}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none disabled:opacity-50 disabled:bg-zinc-100"
          >
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>
          {editingCategory && (
            <p className="mt-1 text-[10px] text-zinc-400 italic">O tipo não pode ser alterado após a criação.</p>
          )}
        </div>

        <div ref={dropdownRef} className="relative">
          <label className="mb-1 block text-xs font-medium text-zinc-500 uppercase">Categoria Pai (Opcional)</label>
          <div className="relative">
            <input
              type="text"
              value={parentSearch}
              onChange={(e) => {
                setParentSearch(e.target.value);
                setParentId('');
                setIsNewParent(false);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              disabled={!canEdit}
              placeholder="Selecione ou digite para criar nova..."
              className={cn(
                "w-full rounded-xl border bg-zinc-50 px-3 py-2 pr-8 text-sm focus:outline-none disabled:opacity-50",
                isNewParent
                  ? "border-emerald-400 focus:border-emerald-500 focus:bg-white"
                  : "border-zinc-200 focus:border-emerald-500 focus:bg-white"
              )}
            />
            {parentSearch && canEdit && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSelectNone}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {isNewParent && (
            <p className="mt-1 text-[10px] text-emerald-600 font-medium">
              Nova categoria pai "{parentSearch}" será criada automaticamente.
            </p>
          )}
          {showDropdown && canEdit && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden max-h-52 overflow-y-auto">
              <div
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSelectNone}
                className="px-3 py-2 text-sm text-zinc-400 italic cursor-pointer hover:bg-zinc-50"
              >
                Nenhuma (Será uma Categoria Pai)
              </div>
              {filteredParents.map(c => (
                <div
                  key={c.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectParent(c.id, c.name)}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50",
                    parentId === c.id ? "bg-emerald-50 text-emerald-700 font-medium" : "text-zinc-800"
                  )}
                >
                  {c.name}
                </div>
              ))}
              {parentSearch && !hasExactMatch && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSelectNew}
                  className="px-3 py-2 text-sm text-emerald-700 font-medium cursor-pointer hover:bg-emerald-50 border-t border-zinc-100"
                >
                  + Criar nova categoria pai: "{parentSearch}"
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sm:col-span-3 flex gap-2">
          <button
            key={editingCategory ? "btn-save" : "btn-add"}
            type="submit"
            disabled={isSubmitting || !canEdit}
            className={cn(
              "flex items-center justify-center rounded-xl px-6 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50",
              editingCategory ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : editingCategory ? (
              <Edit2 className="h-4 w-4 mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            <span>{editingCategory ? 'Salvar Alterações' : 'Adicionar Categoria'}</span>
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
