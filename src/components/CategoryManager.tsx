import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Category } from '../types';
import { useCategories } from '../hooks/useCategories';
import { CategoryForm } from './categories/CategoryForm';
import { CategoryList } from './categories/CategoryList';

export const CategoryManager: React.FC = () => {
  const { profile, canEdit } = useAuth();
  const { 
    categories, 
    isLoading, 
    isSubmitting, 
    saveCategory, 
    deleteCategory, 
    clearAll, 
    importPremium 
  } = useCategories();

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const parentCategories = useMemo(() => 
    categories.filter(c => !c.parent_id), 
    [categories]
  );

  const handleSave = useCallback(async (data: any) => {
    // Injetar organization_id se for uma nova categoria
    const categoryData = {
      ...data,
      organization_id: data.organization_id || profile?.organization_id
    };
    
    const success = await saveCategory(categoryData);
    if (success) {
      setEditingCategory(null);
    }
    return success;
  }, [saveCategory, profile]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria? Subcategorias também podem ser afetadas.')) return;
    await deleteCategory(id);
  }, [deleteCategory]);

  const handleClearAll = useCallback(async () => {
    if (!confirm('PERIGO: Isso excluirá TODAS as suas categorias atuais. Esta ação não pode ser desfeita. Deseja continuar?')) return;
    await clearAll();
  }, [clearAll]);

  const handleImportPremium = useCallback(async () => {
    if (!confirm('ATENÇÃO: Isso criará a estrutura hierárquica solicitada. Deseja continuar?')) return;
    
    const structure = [
      { 
        name: '1. ARRECADAÇÃO DIRETA', 
        type: 'income', 
        sub: [
          { name: '1.1. Ofertas', sub: ['1.1.1. Gasofilácio (Dinheiro/Espécie)', '1.1.2. PIX / Transferência'] },
          { name: '1.2. Dízimos', sub: ['1.2.1. PIX / Transferência', '1.2.2. Espécie'] }
        ] 
      },
      { 
        name: '2. DOAÇÕES E OUTROS', 
        type: 'income', 
        sub: ['2.1. Doação Específica (Ex: Campanhas, Construção)', '2.2. Doação Geral'] 
      },
      { 
        name: '3. RENDIMENTOS E RESERVAS', 
        type: 'income', 
        sub: [
          { name: '3.1. Rendimentos', sub: ['3.1.1. Rendimento de Aplicação (CDB/Investimentos)', '3.1.2. Rendimento de Poupança'] },
          { name: '3.2. Transferências Internas', sub: ['3.2.1. Entrada de Transferência p/ Poupança'] }
        ] 
      },
      { 
        name: '4. MANUTENÇÃO E INFRAESTRUTURA', 
        type: 'expense', 
        sub: [
          { name: '4.1. Reparos e Obras', sub: ['4.1.1. Pintura', '4.1.2. Serralharia / Portas', '4.1.3. Elétrica / Hidráulica'] },
          { name: '4.2. Limpeza e Conservação' }
        ] 
      },
      { 
        name: '5. PESSOAL E ENCARGOS', 
        type: 'expense', 
        sub: [
          { name: '5.1. Folha de Pagamento', sub: ['5.1.1. Salários', '5.1.2. Pró-labore / Prebenda Ministerial'] },
          { name: '5.2. Encargos Sociais', sub: ['5.2.1. INSS / FGTS / Impostos'] }
        ] 
      },
      { 
        name: '6. DESPESAS OPERACIONAIS', 
        type: 'expense', 
        sub: [
          { name: '6.1. Taxas Bancárias', sub: ['6.1.1. Tarifas de Conta', '6.1.2. Juros / IOF'] },
          { name: '6.2. Contas de Consumo', sub: ['6.2.1. Energia / Água / Internet'] }
        ] 
      }
    ];

    await importPremium(structure);
  }, [importPremium]);

  return (
    <div className="space-y-8" translate="no">
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
