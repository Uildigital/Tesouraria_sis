import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Category } from '../types';
import { useCategories } from '../hooks/useCategories';
import { CategoryForm } from './categories/CategoryForm';
import { CategoryList } from './categories/CategoryList';

export const CategoryManager: React.FC = () => {
  const { organization, canEdit } = useAuth();
  const { 
    categories, 
    isLoading, 
    isSubmitting, 
    saveCategory, 
    deleteCategory, 
    clearAll, 
    importPremium 
  } = useCategories(organization?.id);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const parentCategories = useMemo(() => 
    categories.filter(c => !c.parent_id), 
    [categories]
  );

  const handleSave = useCallback(async (data: any) => {
    const success = await saveCategory(data);
    if (success) {
      setEditingCategory(null);
    }
    return success;
  }, [saveCategory]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria? Subcategorias também podem ser afetadas.')) return;
    await deleteCategory(id);
  }, [deleteCategory]);

  const handleClearAll = useCallback(async () => {
    if (!confirm('PERIGO: Isso excluirá TODAS as suas categorias atuais. Esta ação não pode ser desfeita. Deseja continuar?')) return;
    await clearAll();
  }, [clearAll]);

  const handleImportPremium = useCallback(async () => {
    if (!confirm('ATENÇÃO: Isso criará um Plano de Contas Profissional (Padrão Contábil para Igrejas). Deseja continuar?')) return;
    
    const structure = [
      { name: '1. RECEITAS COM ATIVIDADES', type: 'income', sub: ['1.1. Dízimos', '1.2. Ofertas de Cultos', '1.3. Ofertas Especiais / Campanhas', '1.4. Contribuições de Membros'] },
      { name: '2. RECEITAS FINANCEIRAS E OUTRAS', type: 'income', sub: ['2.1. Rendimentos de Aplicações', '2.2. Aluguéis Recebidos', '2.3. Cantina / Bazar / Eventos', '2.4. Venda de Materiais'] },
      { name: '3. DESPESAS COM PESSOAL E MINISTROS', type: 'expense', sub: ['3.1. Côngruas / Sustento Pastoral', '3.2. Salários de Funcionários', '3.3. Encargos Sociais (INSS/FGTS)', '3.4. Benefícios e Pró-Labore'] },
      { name: '4. DESPESAS OPERACIONAIS (CONTAS FIXAS)', type: 'expense', sub: ['4.1. Energia Elétrica', '4.2. Água e Esgoto', '4.3. Telefone e Internet', '4.4. Aluguel do Templo', '4.5. Gás e Combustível'] },
      { name: '5. MANUTENÇÃO, REFORMAS E PATRIMÔNIO', type: 'expense', sub: ['5.1. Manutenção Predial', '5.2. Limpeza e Conservação', '5.3. Equipamentos de Som e Vídeo', '5.4. Móveis e Utensílios'] },
      { name: '6. MINISTÉRIOS, MISSÕES E AÇÃO SOCIAL', type: 'expense', sub: ['6.1. Missões Nacionais/Estrangeiras', '6.2. Ação Social / Cestas Básicas', '6.3. Ministério Infantil (EBD)', '6.4. Ministério de Louvor', '6.5. Eventos e Congressos'] },
      { name: '7. DESPESAS ADM, BANCÁRIAS E TAXAS', type: 'expense', sub: ['7.1. Tarifas Bancárias', '7.2. Material de Escritório', '7.3. Assessoria Contábil / Jurídica', '7.4. Impostos e Taxas Municipais'] }
    ];

    await importPremium(structure);
  }, [importPremium]);

  return (
    <div className="space-y-8">
      <CategoryForm 
        editingCategory={editingCategory}
        parentCategories={parentCategories}
        isSubmitting={isSubmitting}
        canEdit={canEdit}
        onSave={handleSave}
        onCancel={() => setEditingCategory(null)}
        onClearAll={handleClearAll}
        onImportPremium={handleImportPremium}
      />

      <CategoryList 
        categories={categories}
        isLoading={isLoading}
        canEdit={canEdit}
        onDelete={handleDelete}
        onEdit={setEditingCategory}
      />
    </div>
  );
};
