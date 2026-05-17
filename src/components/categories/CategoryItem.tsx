import React from 'react';
import { Trash2, Edit2, ChevronRight } from 'lucide-react';
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
  const subcategories = allCategories
    .filter(c => c.parent_id === category.id)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  const hasSubcategories = subcategories.length > 0;

  return (
    <div className={cn(level === 0 ? "border-b border-zinc-100 last:border-b-0" : "")}>
      <div className={cn(
        "flex items-center justify-between group",
        level === 0 ? "px-6 py-4" : "px-6 py-2.5 pl-14"
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          {level === 0 ? (
            <div className={cn(
              "h-2.5 w-2.5 rounded-full flex-shrink-0",
              category.type === 'income' ? "bg-emerald-500" : "bg-rose-500"
            )} />
          ) : (
            <ChevronRight className="h-3 w-3 text-zinc-300 flex-shrink-0" />
          )}
          <span className={cn(
            "truncate",
            level === 0
              ? "text-sm font-semibold text-zinc-800"
              : "text-sm text-zinc-500"
          )}>
            {category.name}
          </span>
          {level === 0 && hasSubcategories && (
            <span className="ml-1 flex-shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
              {subcategories.length}
            </span>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onEdit(category); }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <Edit2 size={12} />
              <span className="hidden sm:inline">Editar</span>
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onDelete(category.id); }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} />
              <span className="hidden sm:inline">Excluir</span>
            </button>
          </div>
        )}
      </div>

      {hasSubcategories && (
        <div className={cn(level === 0 ? "border-t border-zinc-50 bg-zinc-50/50" : "")}>
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
