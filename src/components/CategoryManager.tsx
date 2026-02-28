import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Category } from '../types';
import { Plus, ChevronRight, Trash2, Loader2, FolderTree, Edit2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export const CategoryManager: React.FC = () => {
  const { organization, canEdit } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
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
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Erro ao carregar categorias. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setType(category.type);
    setParentId(category.parent_id || '');
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setParentId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !name) return;

    setIsSubmitting(true);
    try {
      // Ensure parent_id is a valid UUID or null (never an empty string)
      const cleanParentId = parentId && parentId !== "" ? parentId : null;

      if (editingId) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: name.trim(),
            type,
            parent_id: cleanParentId,
          })
          .eq('id', editingId)
          .eq('organization_id', organization.id); // Security: ensure it belongs to the org
        
        if (error) throw error;
        toast.success('Categoria atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([{
            name: name.trim(),
            type,
            parent_id: cleanParentId,
            organization_id: organization.id
          }]);

        if (error) throw error;
        toast.success('Categoria criada com sucesso!');
      }

      resetForm();
      fetchCategories();
    } catch (error: any) {
      const msg = error.code === '42501' ? 'Você não tem permissão para realizar esta ação.' : error.message;
      toast.error('Erro na operação: ' + msg);
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
      toast.success('Categoria excluída com sucesso!');
    } catch (error: any) {
      const msg = error.code === '42501' ? 'Você não tem permissão para excluir.' : error.message;
      toast.error('Erro ao excluir: ' + msg);
    }
  };

  const clearAllCategories = async () => {
    if (!organization) return;
    if (!confirm('PERIGO: Isso excluirá TODAS as suas categorias atuais. Esta ação não pode ser desfeita. Deseja continuar?')) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('organization_id', organization.id);

      if (error) throw error;

      toast.success('Todas as categorias foram removidas.');
      fetchCategories();
    } catch (error: any) {
      toast.error('Erro ao limpar categorias: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const importPremiumStructure = async () => {
    if (!organization) return;
    if (!confirm('ATENÇÃO: Isso criará um Plano de Contas Profissional (Padrão Contábil para Igrejas). Deseja continuar?')) return;

    setIsSubmitting(true);
    try {
      const structure = [
        { name: '1. RECEITAS COM ATIVIDADES', type: 'income', sub: ['1.1. Dízimos', '1.2. Ofertas de Cultos', '1.3. Ofertas Especiais / Campanhas', '1.4. Contribuições de Membros'] },
        { name: '2. RECEITAS FINANCEIRAS E OUTRAS', type: 'income', sub: ['2.1. Rendimentos de Aplicações', '2.2. Aluguéis Recebidos', '2.3. Cantina / Bazar / Eventos', '2.4. Venda de Materiais'] },
        { name: '3. DESPESAS COM PESSOAL E MINISTROS', type: 'expense', sub: ['3.1. Côngruas / Sustento Pastoral', '3.2. Salários de Funcionários', '3.3. Encargos Sociais (INSS/FGTS)', '3.4. Benefícios e Pró-Labore'] },
        { name: '4. DESPESAS OPERACIONAIS (CONTAS FIXAS)', type: 'expense', sub: ['4.1. Energia Elétrica', '4.2. Água e Esgoto', '4.3. Telefone e Internet', '4.4. Aluguel do Templo', '4.5. Gás e Combustível'] },
        { name: '5. MANUTENÇÃO, REFORMAS E PATRIMÔNIO', type: 'expense', sub: ['5.1. Manutenção Predial', '5.2. Limpeza e Conservação', '5.3. Equipamentos de Som e Vídeo', '5.4. Móveis e Utensílios'] },
        { name: '6. MINISTÉRIOS, MISSÕES E AÇÃO SOCIAL', type: 'expense', sub: ['6.1. Missões Nacionais/Estrangeiras', '6.2. Ação Social / Cestas Básicas', '6.3. Ministério Infantil (EBD)', '6.4. Ministério de Louvor', '6.5. Eventos e Congressos'] },
        { name: '7. DESPESAS ADM, BANCÁRIAS E TAXAS', type: 'expense', sub: ['7.1. Tarifas Bancárias', '7.2. Material de Escritório', '7.3. Assessoria Contábil / Jurídica', '7.4. Impostos e Taxas Municipais'] }
      ];

      // 1. Inserção em Batch dos Pais
      const parentsToInsert = structure.map(item => ({
        name: item.name,
        type: item.type,
        organization_id: organization.id
      }));

      const { data: insertedParents, error: pError } = await supabase
        .from('categories')
        .insert(parentsToInsert)
        .select();

      if (pError) throw pError;

      // 2. Preparação e Inserção em Batch dos Filhos
      const subsToInsert: any[] = [];
      insertedParents?.forEach(parent => {
        const originalItem = structure.find(s => s.name === parent.name);
        if (originalItem && originalItem.sub.length > 0) {
          originalItem.sub.forEach(subName => {
            subsToInsert.push({
              name: subName,
              type: parent.type,
              parent_id: parent.id,
              organization_id: organization.id
            });
          });
        }
      });

      if (subsToInsert.length > 0) {
        const { error: sError } = await supabase.from('categories').insert(subsToInsert);
        if (sError) throw sError;
      }

      fetchCategories();
      toast.success('Plano de Contas Profissional importado com sucesso!');
    } catch (error: any) {
      toast.error('Erro na importação: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parentCategories = categories.filter(c => !c.parent_id);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 flex items-center">
            {editingId ? (
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
                onClick={clearAllCategories}
                disabled={isSubmitting}
                className="text-xs font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg px-3 py-1.5 bg-rose-50 transition-colors disabled:opacity-50"
              >
                Limpar Tudo
              </button>
            )}
            <button 
              onClick={importPremiumStructure}
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
                setType(e.target.value as any);
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
                .filter(c => c.type === type && c.id !== editingId)
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
                editingId ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editingId ? <Edit2 className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {editingId ? 'Salvar Alterações' : 'Adicionar Categoria'}
            </button>
            {editingId && (
              <button 
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-zinc-200 px-6 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200">
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
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">Nenhuma categoria cadastrada.</div>
          ) : (
            <>
              {/* Income Section */}
              <div className="bg-emerald-50/30 px-6 py-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Receitas</span>
              </div>
              {parentCategories.filter(c => c.type === 'income').length === 0 ? (
                <p className="px-6 py-4 text-xs text-zinc-400 italic">Nenhuma receita cadastrada</p>
              ) : (
                parentCategories.filter(c => c.type === 'income').map(parent => (
                  <CategoryRow 
                    key={parent.id} 
                    category={parent} 
                    subcategories={getSubcategories(parent.id)} 
                    onDelete={deleteCategory}
                    onEdit={handleEdit}
                    canEdit={canEdit}
                  />
                ))
              )}

              {/* Expense Section */}
              <div className="bg-rose-50/30 px-6 py-2 border-t border-zinc-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-700">Despesas</span>
              </div>
              {parentCategories.filter(c => c.type === 'expense').length === 0 ? (
                <p className="px-6 py-4 text-xs text-zinc-400 italic">Nenhuma despesa cadastrada</p>
              ) : (
                parentCategories.filter(c => c.type === 'expense').map(parent => (
                  <CategoryRow 
                    key={parent.id} 
                    category={parent} 
                    subcategories={getSubcategories(parent.id)} 
                    onDelete={deleteCategory}
                    onEdit={handleEdit}
                    canEdit={canEdit}
                  />
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface CategoryRowProps {
  category: Category;
  subcategories: Category[];
  onDelete: (id: string) => void;
  onEdit: (category: Category) => void;
  canEdit: boolean;
}

const CategoryRow: React.FC<CategoryRowProps> = ({ category, subcategories, onDelete, onEdit, canEdit }) => {
  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between group">
        <div className="flex items-center">
          <div className={cn(
            "mr-3 h-2 w-2 rounded-full",
            category.type === 'income' ? "bg-emerald-500" : "bg-red-500"
          )} />
          <span className="font-bold text-zinc-900">{category.name}</span>
        </div>
        <div className="flex items-center gap-2 transition-all">
          <button 
            onClick={() => onEdit(category)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors bg-amber-50/50 lg:bg-transparent lg:opacity-60 lg:hover:opacity-100"
            title="Editar"
          >
            <Edit2 size={14} />
            <span className="hidden sm:inline">Editar</span>
          </button>
          {canEdit && (
            <button 
              onClick={() => onDelete(category.id)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors lg:opacity-60 lg:hover:opacity-100"
              title="Excluir"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Excluir</span>
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-3 ml-6 space-y-2">
        {subcategories.map(sub => (
          <div key={sub.id} className="flex items-center justify-between group/sub py-1 border-l-2 border-zinc-100 pl-4">
            <div className="flex items-center text-sm text-zinc-600">
              <ChevronRight size={14} className="mr-1 text-zinc-300" />
              {sub.name}
            </div>
            <div className="flex items-center gap-2 transition-all">
              <button 
                onClick={() => onEdit(sub)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-amber-600 hover:bg-amber-50 transition-colors bg-amber-50/50 lg:bg-transparent lg:opacity-60 lg:hover:opacity-100"
                title="Editar"
              >
                <Edit2 size={12} />
                <span>Editar</span>
              </button>
              {canEdit && (
                <button 
                  onClick={() => onDelete(sub.id)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors lg:opacity-60 lg:hover:opacity-100"
                  title="Excluir"
                >
                  <Trash2 size={12} />
                  <span>Excluir</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {subcategories.length === 0 && (
          <p className="text-xs text-zinc-400 italic ml-4">Sem subcategorias</p>
        )}
      </div>
    </div>
  );
};
