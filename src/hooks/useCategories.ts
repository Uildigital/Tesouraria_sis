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
  }) => {
    setIsSubmitting(true);
    try {
      const result = await apiService.createCategory(data);
      
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
    toast.info('Exclusão não implementada para Google Sheets ainda.');
    return false;
  }, []);

  const clearAll = useCallback(async () => {
    toast.info('Limpeza não implementada para Google Sheets ainda.');
  }, []);

  const importPremium = useCallback(async (structure: any[]) => {
    setIsSubmitting(true);
    try {
      for (const item of structure) {
        const res = await apiService.createCategory({ name: item.name, type: item.type });
        if (res.success && item.sub.length > 0) {
          for (const subName of item.sub) {
            await apiService.createCategory({ name: subName, type: item.type, parent_id: res.id });
          }
        }
      }
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
