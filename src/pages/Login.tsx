import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Church, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export const Login: React.FC = () => {
  const { session, organization } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [churchName, setChurchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isInvited, setIsInvited] = useState(false);
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const navigate = useNavigate();

  // Handle invitation from URL
  useEffect(() => {
    const invite = searchParams.get('invite');
    const emailParam = searchParams.get('email');
    
    if (invite && emailParam) {
      setInviteId(invite);
      setEmail(emailParam);
      setIsSignUp(true);
      setIsInvited(true);
    }
  }, [searchParams]);

  // Se já estiver logado, redireciona para fora da tela de login
  useEffect(() => {
    if (!loading && session) {
      if (organization) {
        navigate(`/${organization.slug}/dashboard`);
      }
    }
  }, [session, organization, loading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Check for invitation
        let inviteData = null;
        if (isInvited || inviteId) {
          const query = supabase
            .from('invitations')
            .select('*')
            .eq('status', 'pending');
          
          if (inviteId) {
            query.eq('id', inviteId);
          } else {
            query.eq('email', normalizedEmail);
          }

          const { data, error: inviteError } = await query.maybeSingle();
          
          if (inviteError) throw inviteError;
          if (!data) {
            throw new Error('Nenhum convite pendente encontrado para este e-mail. Verifique com seu Administrador.');
          }
          inviteData = data;
        } else if (!churchName) {
          throw new Error('Por favor, informe o nome da igreja para criar sua conta.');
        }

        // 2. Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email: normalizedEmail, 
          password,
        });
        
        if (authError) throw authError;
        if (!authData.user) throw new Error('Erro ao criar usuário');

        // 3. Handle Linking (Invited vs New Owner)
        if (inviteData) {
          // Link to existing church
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: authData.user.id,
              organization_id: inviteData.organization_id,
              role: inviteData.role,
              full_name: normalizedEmail.split('@')[0],
              email: normalizedEmail
            }]);
          
          if (profileError) throw profileError;

          // Mark the invitation as accepted
          const { error: inviteUpdateError } = await supabase
            .from('invitations')
            .update({ status: 'accepted' })
            .eq('id', inviteData.id);
          
          if (inviteUpdateError) {
            console.error('Error updating invitation status:', inviteUpdateError);
            // We don't throw here to avoid breaking the login flow if the profile was already created
          }
          
          toast.success('Bem-vindo! Você foi vinculado à sua igreja.');
        } else {
          // Create new church (SaaS flow)
          const slug = churchName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
          const { error: rpcError } = await supabase.rpc('create_new_church', {
            church_name: churchName,
            church_slug: slug,
            user_id: authData.user.id,
            user_email: normalizedEmail
          });

          if (rpcError) throw rpcError;
          toast.success('Igreja cadastrada com sucesso!');
        }
        
        // Auto-login
        await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Login realizado com sucesso!');
        navigate('/'); // Redireciona para a raiz, onde o ProtectedRoute decidirá o destino
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setFormKey(prev => prev + 1); // Force form reset on error
      const errorMessage = err.message || 'Erro na autenticação';
      alert(`Erro: ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-xl">
            <Church size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-display">ChurchFinance</h1>
          <p className="mt-2 text-zinc-600">Gestão financeira eclesiástica moderna</p>
        </div>

        <div className="premium-card p-8">
          <h2 className="text-xl font-bold text-zinc-900 mb-6">
            {isSignUp ? 'Criar nova conta' : 'Entrar na sua conta'}
          </h2>

          <form 
            key={formKey}
            onSubmit={handleAuth} 
            className="space-y-6"
          >
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  required
                  disabled={isInvited}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm transition-all focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {isSignUp && !isInvited && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Nome da Igreja</label>
                  <div className="relative">
                    <Church className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      required={!isInvited}
                      value={churchName}
                      onChange={(e) => setChurchName(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm transition-all focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="Ex: Igreja Central"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm transition-all focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-zinc-900 py-4 text-sm font-bold text-white transition-all hover:bg-zinc-800 shadow-lg shadow-zinc-200 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  {isSignUp ? (isInvited ? 'Ativar Minha Conta' : 'Criar Conta') : 'Entrar'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-100 text-center">
            <button 
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
            >
              {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Cadastre sua igreja'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
