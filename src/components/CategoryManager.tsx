import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Category } from '../types';
import { Plus, ChevronRight, Trash2, Loader2, FolderTree } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export const CategoryManager: React.FC = () => {
  const { organization, canEdit } = useAuth();
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
      toast.success('Categoria salva com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar categoria: ' + error.message);
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
      toast.error('Erro ao excluir: ' + error.message);
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
        // 1. RECEITAS
        { 
          name: '1. RECEITAS COM ATIVIDADES', 
          type: 'income', 
          sub: ['1.1. Dízimos', '1.2. Ofertas de Cultos', '1.3. Ofertas Especiais / Campanhas', '1.4. Contribuições de Membros'] 
        },
        { 
          name: '2. RECEITAS FINANCEIRAS E OUTRAS', 
          type: 'income', 
          sub: ['2.1. Rendimentos de Aplicações', '2.2. Aluguéis Recebidos', '2.3. Cantina / Bazar / Eventos', '2.4. Venda de Materiais'] 
        },

        // 3. DESPESAS COM PESSOAL
        { 
          name: '3. DESPESAS COM PESSOAL E MINISTROS', 
          type: 'expense', 
          sub: ['3.1. Côngruas / Sustento Pastoral', '3.2. Salários de Funcionários', '3.3. Encargos Sociais (INSS/FGTS)', '3.4. Benefícios e Pró-Labore'] 
        },
        // 4. DESPESAS OPERACIONAIS (UTILIDADES)
        { 
          name: '4. DESPESAS OPERACIONAIS (CONTAS FIXAS)', 
          type: 'expense', 
          sub: ['4.1. Energia Elétrica', '4.2. Água e Esgoto', '4.3. Telefone e Internet', '4.4. Aluguel do Templo', '4.5. Gás e Combustível'] 
        },
        // 5. MANUTENÇÃO E PATRIMÔNIO
        { 
          name: '5. MANUTENÇÃO, REFORMAS E PATRIMÔNIO', 
          type: 'expense', 
          sub: ['5.1. Manutenção Predial', '5.2. Limpeza e Conservação', '5.3. Equipamentos de Som e Vídeo', '5.4. Móveis e Utensílios'] 
        },
        // 6. MINISTÉRIOS E MISSÕES
        { 
          name: '6. MINISTÉRIOS, MISSÕES E AÇÃO SOCIAL', 
          type: 'expense', 
          sub: ['6.1. Missões Nacionais/Estrangeiras', '6.2. Ação Social / Cestas Básicas', '6.3. Ministério Infantil (EBD)', '6.4. Ministério de Louvor', '6.5. Eventos e Congressos'] 
        },
        // 7. DESPESAS ADMINISTRATIVAS E TAXAS
        { 
          name: '7. DESPESAS ADM, BANCÁRIAS E TAXAS', 
          type: 'expense', 
          sub: ['7.1. Tarifas Bancárias', '7.2. Material de Escritório', '7.3. Assessoria Contábil / Jurídica', '7.4. Impostos e Taxas Municipais'] 
        }
      ];

      for (const item of structure) {
        // Create Parent
        const { data: parent, error: pError } = await supabase
          .from('categories')
          .insert([{
            name: item.name,
            type: item.type,
            organization_id: organization.id
          }])
          .select()
          .single();

        if (pError) throw pError;

        // Create Subs
        if (item.sub.length > 0) {
          const subs = item.sub.map(subName => ({
            name: subName,
            type: item.type,
            parent_id: parent.id,
            organization_id: organization.id
          }));
          const { error: sError } = await supabase.from('categories').insert(subs);
          if (sError) throw sError;
        }
      }

      fetchCategories();
      toast.success('Estrutura Premium importada com sucesso!');
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
      {canEdit && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900 flex items-center">
              <Plus className="mr-2 h-5 w-5 text-emerald-600" />
              Nova Categoria / Subcategoria
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={clearAllCategories}
                disabled={isSubmitting}
                className="text-xs font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg px-3 py-1.5 bg-rose-50 transition-colors"
              >
                Limpar Tudo
              </button>
              <button 
                onClick={importPremiumStructure}
                disabled={isSubmitting}
                className="text-xs font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg px-3 py-1.5 bg-emerald-50 transition-colors"
              >
                Plano de Contas Profissional
              </button>
            </div>
          </div>
          
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
                onChange={(e) => {
                  setType(e.target.value as any);
                  setParentId(''); // Reset parent when type changes
                }}
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
      )}

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
  canEdit: boolean;
}

const CategoryRow: React.FC<CategoryRowProps> = ({ category, subcategories, onDelete, canEdit }) => {
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
        {canEdit && (
          <button 
            onClick={() => onDelete(category.id)}
            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 transition-all"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      
      <div className="mt-3 ml-6 space-y-2">
        {subcategories.map(sub => (
          <div key={sub.id} className="flex items-center justify-between group/sub py-1 border-l-2 border-zinc-100 pl-4">
            <div className="flex items-center text-sm text-zinc-600">
              <ChevronRight size={14} className="mr-1 text-zinc-300" />
              {sub.name}
            </div>
            {canEdit && (
              <button 
                onClick={() => onDelete(sub.id)}
                className="opacity-0 group-hover/sub:opacity-100 text-zinc-400 hover:text-red-600 transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {subcategories.length === 0 && (
          <p className="text-xs text-zinc-400 italic ml-4">Sem subcategorias</p>
        )}
      </div>
    </div>
  );
};
