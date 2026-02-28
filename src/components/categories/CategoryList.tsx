import React, { useMemo } from 'react';
import { FolderTree, Loader2 } from 'lucide-react';
import { Category } from '../../types';
import { CategoryItem } from './CategoryItem';

interface CategoryListProps {
  categories: Category[];
  isLoading: boolean;
  canEdit: boolean;
  onDelete: (id: string) => void;
  onEdit: (category: Category) => void;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  isLoading,
  canEdit,
  onDelete,
  onEdit
}) => {
  const parentCategories = useMemo(() => categories.filter(c => !c.parent_id), [categories]);
  
  const getSubcategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-600 flex items-center">
          <FolderTree className="mr-2 h-4 w-4" />
          Hierarquia de Categorias
        </h3>
      </div>
      
      <div className="divide-y divide-zinc-100">
        {categories.length === 0 ? (
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
                <CategoryItem 
                  key={parent.id} 
                  category={parent} 
                  subcategories={getSubcategories(parent.id)} 
                  onDelete={onDelete}
                  onEdit={onEdit}
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
                <CategoryItem 
                  key={parent.id} 
                  category={parent} 
                  subcategories={getSubcategories(parent.id)} 
                  onDelete={onDelete}
                  onEdit={onEdit}
                  canEdit={canEdit}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};
