import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Department } from '../types';
import { Plus, Trash2, Loader2, Users, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export const DepartmentManager: React.FC = () => {
  const { organization, canEdit } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (organization) {
      fetchDepartments();
    }
  }, [organization]);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !name) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('departments')
        .insert([{
          name,
          organization_id: organization.id
        }]);

      if (error) throw error;

      setName('');
      fetchDepartments();
      toast.success('Departamento salvo com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar departamento: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteDepartment = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este departamento?')) return;

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchDepartments();
      toast.success('Departamento excluído com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    }
  };

  return (
    <div className="space-y-8">
      {canEdit && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-lg font-semibold text-zinc-900 flex items-center">
            <Plus className="mr-2 h-5 w-5 text-emerald-600" />
            Novo Departamento
          </h3>
          
          <form onSubmit={handleSubmit} className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500 uppercase">Nome do Departamento</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                placeholder="Ex: Ministério de Louvor, Infantil..."
              />
            </div>
            <div className="flex items-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 h-[38px]"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Adicionar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-600 flex items-center">
            <Building2 className="mr-2 h-4 w-4" />
            Departamentos Cadastrados
          </h3>
        </div>
        
        <div className="divide-y divide-zinc-100">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : departments.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">Nenhum departamento cadastrado.</div>
          ) : (
            departments.map(dept => (
              <div key={dept.id} className="flex items-center justify-between p-4 sm:p-6 hover:bg-zinc-50 transition-colors group">
                <div className="flex items-center">
                  <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                    <Users size={20} />
                  </div>
                  <span className="font-bold text-zinc-900">{dept.name}</span>
                </div>
                {canEdit && (
                  <button 
                    onClick={() => deleteDepartment(dept.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 transition-all p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
