import React from 'react';
import { ChevronRight, Trash2, Edit2 } from 'lucide-react';
import { Category } from '../../types';
import { cn } from '../../lib/utils';

interface CategoryItemProps {
  category: Category;
  subcategories: Category[];
  onDelete: (id: string) => void;
  onEdit: (category: Category) => void;
  canEdit: boolean;
}

export const CategoryItem: React.FC<CategoryItemProps> = ({ 
  category, 
  subcategories, 
  onDelete, 
  onEdit, 
  canEdit 
}) => {
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
