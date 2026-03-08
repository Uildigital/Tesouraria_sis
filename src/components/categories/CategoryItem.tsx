import React from 'react';
import { ChevronRight, Trash2, Edit2 } from 'lucide-react';
import { Category } from '../../types';
import { cn } from '../../lib/utils';

interface CategoryItemProps {
  category: Category;
  allCategories: Category[];
  onDelete: (id: string) => void;
  onEdit: (category: Category) => void;
  canEdit: boolean;
  level?: number;
}

export const CategoryItem: React.FC<CategoryItemProps> = ({ 
  category, 
  allCategories, 
  onDelete, 
  onEdit, 
  canEdit,
  level = 0
}) => {
  const subcategories = allCategories.filter(c => c.parent_id === category.id);
  const hasSubcategories = subcategories.length > 0;

  return (
    <div className={cn("translate-no", level === 0 ? "p-4 sm:p-6" : "mt-3 ml-6 border-l-2 border-zinc-100 pl-4")} key={`item-${category.id}`}>
      <div className="flex items-center justify-between group">
        <div className="flex items-center">
          <div className={cn(
            "mr-3 h-2 w-2 rounded-full",
            category.type === 'income' ? "bg-emerald-500" : "bg-red-500"
          )} />
          <div className={cn("font-bold text-zinc-900", level > 0 && "text-sm font-medium text-zinc-600")}>
            {category.name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); onEdit(category); }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors bg-amber-50/50 lg:bg-transparent"
          >
            <Edit2 size={level === 0 ? 14 : 12} />
            <span className="hidden sm:inline">Editar</span>
          </button>
          {canEdit && (
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); onDelete(category.id); }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={level === 0 ? 14 : 12} />
              <span className="hidden sm:inline">Excluir</span>
            </button>
          )}
        </div>
      </div>
      
      {hasSubcategories && (
        <div className="space-y-2">
          {subcategories.map(sub => (
            <CategoryItem 
              key={`sub-${sub.id}`}
              category={sub}
              allCategories={allCategories}
              onDelete={onDelete}
              onEdit={onEdit}
              canEdit={canEdit}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
