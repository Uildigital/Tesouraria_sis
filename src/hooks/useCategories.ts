import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Category, TransactionType } from '../types';
import { toast } from 'sonner';

export const useCategories = (organizationId?: string) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Erro ao carregar categorias: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const saveCategory = useCallback(async (data: {
    id?: string;
    name: string;
    type: TransactionType;
    parent_id: string | null;
  }) => {
    if (!organizationId) {
      toast.error('Sessão inválida. Recarregue a página.');
      return false;
    }
    
    setIsSubmitting(true);
    try {
      // Explicitly handle the parent_id to ensure it's either a UUID or NULL
      const targetParentId = (data.parent_id && data.parent_id.trim() !== "") ? data.parent_id : null;
      
      if (data.id) {
        // UPDATE
        const { error } = await supabase
          .from('categories')
          .update({
            name: data.name.trim(),
            type: data.type,
            parent_id: targetParentId,
          })
          .eq('id', data.id)
          .eq('organization_id', organizationId);
        
        if (error) throw error;
        toast.success('Alterações salvas com sucesso!');
      } else {
        // INSERT: Must send organization_id
        const { error } = await supabase
          .from('categories')
          .insert([{
            name: data.name.trim(),
            type: data.type,
            parent_id: targetParentId,
            organization_id: organizationId
          }]);
        
        if (error) throw error;
        toast.success('Categoria criada com sucesso!');
      }
      
      await fetchCategories();
      return true;
    } catch (error: any) {
      console.error('Save error:', error);
      const msg = error.code === '42501' ? 'Você não tem permissão para esta alteração.' : error.message;
      toast.error('Erro ao salvar: ' + msg);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [organizationId, fetchCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    if (!organizationId) return false;
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) throw error;
      toast.success('Categoria excluída!');
      await fetchCategories();
      return true;
    } catch (error: any) {
      const msg = error.code === '42501' ? 'Sem permissão para excluir.' : error.message;
      toast.error('Erro ao excluir: ' + msg);
      return false;
    }
  }, [organizationId, fetchCategories]);

  const clearAll = useCallback(async () => {
    if (!organizationId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('organization_id', organizationId);

      if (error) throw error;
      toast.success('Todas as categorias foram removidas.');
      await fetchCategories();
    } catch (error: any) {
      toast.error('Erro ao limpar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [organizationId, fetchCategories]);

  const importPremium = useCallback(async (structure: any[]) => {
    if (!organizationId) return;
    setIsSubmitting(true);
    try {
      // 1. Batch insert parents
      const parentsToInsert = structure.map(item => ({
        name: item.name,
        type: item.type,
        organization_id: organizationId
      }));

      const { data: insertedParents, error: pError } = await supabase
        .from('categories')
        .insert(parentsToInsert)
        .select();

      if (pError) throw pError;

      // 2. Batch insert children
      const subsToInsert: any[] = [];
      insertedParents?.forEach(parent => {
        const originalItem = structure.find(s => s.name === parent.name);
        if (originalItem && originalItem.sub.length > 0) {
          originalItem.sub.forEach((subName: string) => {
            subsToInsert.push({
              name: subName,
              type: parent.type,
              parent_id: parent.id,
              organization_id: organizationId
            });
          });
        }
      });

      if (subsToInsert.length > 0) {
        const { error: sError } = await supabase.from('categories').insert(subsToInsert);
        if (sError) throw sError;
      }

      await fetchCategories();
      toast.success('Plano de Contas importado!');
    } catch (error: any) {
      toast.error('Erro na importação: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [organizationId, fetchCategories]);

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
