import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Category, TransactionType } from '../types';
import { toast } from 'sonner';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await apiService.getCategories();
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Erro ao carregar categorias: ' + error.message);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const saveCategory = useCallback(async (data: {
    id?: string;
    name: string;
    type: TransactionType;
    parent_id: string | null;
    organization_id?: string;
  }) => {
    setIsSubmitting(true);
    try {
      let result;
      if (data.id) {
        result = await apiService.updateCategory(data.id, data);
      } else {
        result = await apiService.createCategory(data);
      }
      
      if (!result.success) throw new Error('Erro ao salvar');
      
      toast.success(data.id ? 'Alterações salvas!' : 'Categoria criada!');
      await fetchCategories(true);
      return true;
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    setIsSubmitting(true);
    try {
      const result = await apiService.deleteCategory(id);
      if (result.success) {
        toast.success('Categoria excluída!');
        await fetchCategories(true);
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchCategories]);

  const clearAll = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await apiService.resetCategories();
      await fetchCategories();
      toast.success('Categorias resetadas!');
    } catch (error: any) {
      toast.error('Erro ao resetar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchCategories]);

  const importPremium = useCallback(async (structure: any[]) => {
    setIsSubmitting(true);
    try {
      const createRecursive = async (items: any[], type: TransactionType, parentId: string | null = null) => {
        for (const item of items) {
          const name = typeof item === 'string' ? item : item.name;
          const itemType = typeof item === 'string' ? type : (item.type || type);
          
          const res = await apiService.createCategory({ 
            name, 
            type: itemType, 
            parent_id: parentId 
          });
          
          if (res.success && typeof item === 'object' && item.sub && item.sub.length > 0) {
            await createRecursive(item.sub, itemType, res.id);
          }
        }
      };

      await createRecursive(structure, 'income'); // Default type, will be overridden
      
      await fetchCategories();
      toast.success('Plano de Contas importado!');
    } catch (error: any) {
      toast.error('Erro na importação: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    isSubmitting,
    saveCategory,
    deleteCategory,
    clearAll,
    importPremium,
    refresh: fetchCategories
  };
};
