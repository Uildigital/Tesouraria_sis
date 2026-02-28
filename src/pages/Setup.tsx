import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Church, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export const Setup: React.FC = () => {
  const { user, signOut } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name) return;

    setLoading(true);
    try {
      const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      
      // 1. Create Organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{ name, slug }])
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Create Profile as Admin
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          organization_id: org.id,
          role: 'admin',
          full_name: user.email?.split('@')[0] || 'Admin'
        }]);

      if (profileError) throw profileError;

      toast.success('Igreja configurada com sucesso!');
      window.location.href = `/${slug}/dashboard`;
    } catch (error: any) {
      toast.error('Erro ao configurar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-zinc-900 text-white mb-6 shadow-xl">
            <Church size={40} />
          </div>
          <h1 className="font-display text-3xl font-bold text-zinc-900">Bem-vindo ao ChurchFinance</h1>
          <p className="mt-2 text-zinc-500">Vamos configurar o perfil da sua igreja para começar.</p>
        </div>

        <div className="premium-card p-8">
          <form onSubmit={handleCreateOrg} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Nome da Igreja</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Igreja Presbiteriana Central"
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center rounded-2xl bg-zinc-900 py-4 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  Criar Perfil da Igreja
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-zinc-100">
            <div className="flex items-start gap-3 text-zinc-500">
              <div className="rounded-lg bg-emerald-50 p-1.5 mt-0.5">
                <Sparkles className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-xs leading-relaxed">
                Ao criar o perfil, você será definido como <strong>Administrador</strong> e poderá convidar tesoureiros e pastores posteriormente.
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => signOut()}
          className="w-full mt-6 text-sm font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
};
