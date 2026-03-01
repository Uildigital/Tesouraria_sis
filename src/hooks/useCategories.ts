import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Category, TransactionType } from '../types';
import { toast } from 'sonner';

export const useCategories = (organizationId?: string) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = useCallback(async (isSilent = false) => {
    if (!organizationId) return;
    if (!isSilent) setIsLoading(true);
    try {
      // Add a timestamp to bypass any potential browser caching
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      
      console.log(`Fetched ${data?.length || 0} categories for org ${organizationId}`);
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Erro ao carregar categorias: ' + error.message);
    } finally {
      if (!isSilent) setIsLoading(false);
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
      
      let result;
      if (data.id) {
        // UPDATE
        result = await supabase
          .from('categories')
          .update({
            name: data.name.trim(),
            type: data.type,
            parent_id: targetParentId,
          })
          .eq('id', data.id)
          .eq('organization_id', organizationId)
          .select(); // Request data back to verify update
      } else {
        // INSERT
        result = await supabase
          .from('categories')
          .insert([{
            name: data.name.trim(),
            type: data.type,
            parent_id: targetParentId,
            organization_id: organizationId
          }])
          .select();
      }
      
      if (result.error) throw result.error;
      
      // Check if any rows were actually affected
      if (!result.data || result.data.length === 0) {
        throw new Error('Nenhuma alteração foi feita. Verifique suas permissões no Supabase (RLS).');
      }

      toast.success(data.id ? 'Alterações salvas!' : 'Categoria criada!');
      
      // Small delay to ensure DB consistency before re-fetching
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchCategories(true);
      return true;
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Erro ao salvar: ' + error.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [organizationId, fetchCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    if (!organizationId) return false;
    try {
      const { data, error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select(); // Request data back to verify deletion

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Não foi possível excluir. O item pode não existir ou você não tem permissão (RLS).');
      }
      
      toast.success('Excluído com sucesso!');
      
      // Small delay to ensure DB consistency before re-fetching
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchCategories(true);
      return true;
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Erro ao excluir: ' + error.message);
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
