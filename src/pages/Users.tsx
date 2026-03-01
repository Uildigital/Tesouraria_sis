import React, { useEffect, useState } from 'react';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  Eye, 
  Trash2, 
  Mail,
  Loader2,
  X,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface Invitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export const Users: React.FC = () => {
  const { organization, profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'treasurer' | 'viewer'>('viewer');

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (organization) {
      fetchData();
    }
  }, [organization]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, invitesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('organization_id', organization?.id),
        supabase
          .from('invitations')
          .select('*')
          .eq('organization_id', organization?.id)
      ]);

      if (profilesRes.data) setUsers(profilesRes.data);
      if (invitesRes.data) setInvitations(invitesRes.data);
    } catch (error: any) {
      toast.error('Erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('invitations')
        .insert([{
          organization_id: organization?.id,
          email,
          role
        }]);

      if (error) {
        if (error.code === '23505') throw new Error('Já existe um convite pendente para este email.');
        throw error;
      }

      toast.success('Convite enviado! O usuário deve se cadastrar com este email.');
      setShowModal(false);
      setEmail('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário da equipe?')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      toast.success('Usuário removido');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao remover: ' + error.message);
    }
  };

  const cancelInvitation = async (id: string) => {
    try {
      const { error } = await supabase.from('invitations').delete().eq('id', id);
      if (error) throw error;
      toast.success('Convite cancelado');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao cancelar');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"><ShieldCheck size={12} /> Administrador</span>;
      case 'treasurer':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700"><Shield size={12} /> Tesoureiro</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600"><Eye size={12} /> Conferente</span>;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-12"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-zinc-900">Equipe</h2>
          <p className="mt-1 text-zinc-500">Gerencie quem tem acesso às finanças da igreja.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
          >
            <UserPlus className="h-5 w-5" />
            Convidar Membro
          </button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="premium-card p-0 overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Usuários Ativos
              </h3>
            </div>
            <div className="divide-y divide-zinc-100">
              {loading ? (
                <div className="p-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-300" /></div>
              ) : users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-6 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-lg font-bold text-zinc-400">
                      {u.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{u.full_name}</p>
                      <div className="mt-1">{getRoleBadge(u.role)}</div>
                    </div>
                  </div>
                  {isAdmin && u.id !== profile?.id && (
                    <button 
                      onClick={() => removeUser(u.id)}
                      className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {invitations.length > 0 && (
            <div className="premium-card p-0 overflow-hidden border-amber-100">
              <div className="p-6 border-b border-amber-100 bg-amber-50/30">
                <h3 className="font-bold text-amber-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Convites Pendentes
                </h3>
              </div>
              <div className="divide-y divide-zinc-100">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Mail size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">{inv.email}</p>
                        <div className="mt-1">{getRoleBadge(inv.role)}</div>
                      </div>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => cancelInvitation(inv.id)}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="premium-card p-6 bg-zinc-900 text-white">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" />
              Níveis de Acesso
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Administrador</p>
                <p className="text-xs text-zinc-400">Acesso total, gerencia equipe, configurações e todas as finanças.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Tesoureiro</p>
                <p className="text-xs text-zinc-400">Pode realizar lançamentos, ver relatórios e gerenciar categorias.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Conferente</p>
                <p className="text-xs text-zinc-400">Apenas visualização. Ideal para Conselhos Fiscais, Diáconos e Pastores.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">Convidar Membro</h3>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleInvite} className="space-y-6">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Email do Usuário</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    placeholder="exemplo@email.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Cargo / Nível de Acesso</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  >
                    <option value="viewer">Conferente (Apenas Leitura)</option>
                    <option value="treasurer">Tesoureiro (Lançamentos)</option>
                    <option value="admin">Administrador (Acesso Total)</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center rounded-2xl bg-zinc-900 py-4 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enviar Convite'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
