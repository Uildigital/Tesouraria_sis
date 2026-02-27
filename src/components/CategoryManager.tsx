import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Category } from '../types';
import { Plus, ChevronRight, Trash2, Loader2, FolderTree } from 'lucide-react';
import { cn } from '../lib/utils';

export const CategoryManager: React.FC = () => {
  const { organization } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [type, setType] = useState<'income' | 'expense'>('income');

  useEffect(() => {
    if (organization) {
      fetchCategories();
    }
  }, [organization]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !name) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{
          name,
          type,
          parent_id: parentId || null,
          organization_id: organization.id
        }]);

      if (error) throw error;

      setName('');
      setParentId('');
      fetchCategories();
    } catch (error: any) {
      alert('Erro ao salvar categoria: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria? Subcategorias também podem ser afetadas.')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchCategories();
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const parentCategories = categories.filter(c => !c.parent_id);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="mb-6 text-lg font-semibold text-zinc-900 flex items-center">
          <Plus className="mr-2 h-5 w-5 text-emerald-600" />
          Nova Categoria / Subcategoria
        </h3>
        
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-zinc-500 uppercase">Nome</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
              placeholder="Ex: Aluguel, Dízimos..."
            />
          </div>
          
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500 uppercase">Tipo</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
            >
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500 uppercase">Categoria Pai (Opcional)</label>
            <select 
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
            >
              <option value="">Nenhuma (Será uma Categoria Pai)</option>
              {parentCategories
                .filter(c => c.type === type)
                .map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              }
            </select>
          </div>

          <div className="sm:col-span-3">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Adicionar Categoria
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-zinc-50 px-6 py-4 border-bottom border-zinc-200">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-600 flex items-center">
            <FolderTree className="mr-2 h-4 w-4" />
            Hierarquia de Categorias
          </h3>
        </div>
        
        <div className="divide-y divide-zinc-100">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : parentCategories.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">Nenhuma categoria cadastrada.</div>
          ) : (
            parentCategories.map(parent => (
              <div key={parent.id} className="p-4 sm:p-6">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center">
                    <div className={cn(
                      "mr-3 h-2 w-2 rounded-full",
                      parent.type === 'income' ? "bg-emerald-500" : "bg-red-500"
                    )} />
                    <span className="font-bold text-zinc-900">{parent.name}</span>
                    <span className="ml-2 text-[10px] uppercase font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                      {parent.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                  </div>
                  <button 
                    onClick={() => deleteCategory(parent.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="mt-3 ml-6 space-y-2">
                  {getSubcategories(parent.id).map(sub => (
                    <div key={sub.id} className="flex items-center justify-between group/sub py-1 border-l-2 border-zinc-100 pl-4">
                      <div className="flex items-center text-sm text-zinc-600">
                        <ChevronRight size={14} className="mr-1 text-zinc-300" />
                        {sub.name}
                      </div>
                      <button 
                        onClick={() => deleteCategory(sub.id)}
                        className="opacity-0 group-hover/sub:opacity-100 text-zinc-400 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {getSubcategories(parent.id).length === 0 && (
                    <p className="text-xs text-zinc-400 italic ml-4">Sem subcategorias</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
