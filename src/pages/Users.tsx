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
  Clock,
  UserX,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Profile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { apiService } from '../services/apiService';

interface Invitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export const Users: React.FC = () => {
  const { profile } = useAuth();
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
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // For now, we don't have a list users endpoint that returns all users from Sheets
      // but we can simulate it or just show a message.
      // In a real scenario, we'd add an endpoint to server.ts to list users.
      setUsers([]);
      setInvitations([]);
    } catch (error: any) {
      toast.error('Erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info('Convites desativados temporariamente na migração para Google Sheets.');
  };

  const removeUser = async (userId: string) => {
    toast.info('Remoção de usuários não disponível via interface no momento.');
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    toast.info('Alteração de status não disponível via interface no momento.');
  };

  const cancelInvitation = async (id: string) => {
    toast.info('Cancelamento de convites não disponível no momento.');
  };

  const getInvitationLink = (inv: Invitation) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/login?invite=${inv.id}&email=${encodeURIComponent(inv.email)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado para a área de transferência!');
  };

  const shareWhatsApp = (inv: Invitation) => {
    const link = getInvitationLink(inv);
    const text = encodeURIComponent(`Olá! Você foi convidado para a equipe da Igreja no ChurchFinance.\n\nClique no link abaixo para ativar sua conta:\n${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareEmail = (inv: Invitation) => {
    const link = getInvitationLink(inv);
    const subject = encodeURIComponent(`Convite: Equipe Igreja`);
    const body = encodeURIComponent(`Olá!\n\nVocê foi convidado para participar da gestão financeira da Igreja.\n\nPara ativar seu acesso como ${inv.role === 'admin' ? 'Administrador' : inv.role === 'treasurer' ? 'Tesoureiro' : 'Conferente'}, clique no link abaixo:\n\n${link}`);
    window.location.href = `mailto:${inv.email}?subject=${subject}&body=${body}`;
  };

  const getRoleBadge = (role: string, isActive: boolean = true) => {
    if (!isActive) {
      return <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border border-zinc-200"><UserX size={12} /> Inativo</span>;
    }
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                  <tr>
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Cargo</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-300" />
                      </td>
                    </tr>
                  ) : users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-400">
                            {u.full_name?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-zinc-900">{u.full_name}</p>
                              {!u.is_active && (
                                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 border border-amber-100">Inativo</span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(u.role, u.is_active)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isAdmin ? (
                          u.id !== profile?.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => toggleUserStatus(u.id, u.is_active)}
                                className={cn(
                                  "p-2 rounded-xl transition-all",
                                  u.is_active 
                                    ? "text-zinc-400 hover:text-amber-600 hover:bg-amber-50" 
                                    : "text-amber-600 bg-amber-50 hover:bg-amber-100"
                                )}
                                title={u.is_active ? "Desativar Usuário" : "Ativar Usuário"}
                              >
                                {u.is_active ? <UserX size={20} /> : <UserCheck size={20} />}
                              </button>
                              <button 
                                onClick={() => removeUser(u.id)}
                                className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Remover Permanentemente"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 italic">Você (Admin)</span>
                          )
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                        <div className="mt-1 flex items-center gap-3">
                          {getRoleBadge(inv.role, true)}
                          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Pendente</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <button 
                            onClick={() => shareWhatsApp(inv)}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            WhatsApp
                          </button>
                          <button 
                            onClick={() => shareEmail(inv)}
                            className="flex items-center gap-1.5 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-[10px] font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
                          >
                            E-mail
                          </button>
                          <button 
                            onClick={() => copyToClipboard(getInvitationLink(inv))}
                            className="flex items-center gap-1.5 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-[10px] font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
                          >
                            Copiar Link
                          </button>
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => cancelInvitation(inv.id)}
                        className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <X size={20} />
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
