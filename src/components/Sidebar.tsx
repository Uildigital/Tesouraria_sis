import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  FileText, 
  Settings, 
  LogOut,
  Church,
  X,
  Users as UsersIcon,
  ShieldCheck,
  Lock,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { signOut, profile } = useAuth();
  const { settings } = useSettings();
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem!');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres!');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiService.updateUser(profile.id, {
        password: newPassword
      });
      toast.success('Senha atualizada com sucesso!');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error('Erro ao atualizar senha: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', href: `/dashboard`, icon: LayoutDashboard },
    { name: 'Lançamentos', href: `/lancamentos`, icon: ArrowLeftRight },
    { name: 'Relatórios', href: `/relatorios`, icon: FileText },
    ...(profile?.role === 'admin' || profile?.role === 'conferente' ? [
      { name: 'Conferência', href: `/conferencia`, icon: ShieldCheck },
    ] : []),
    ...(profile?.role === 'admin' ? [
      { name: 'Equipe', href: `/equipe`, icon: UsersIcon },
      { name: 'Configurações', href: `/configuracoes`, icon: Settings },
    ] : []),
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" 
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-64 border-r border-zinc-200 bg-white transition-transform lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col px-3 py-4">
          <div className="mb-10 flex items-center justify-between px-2">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white overflow-hidden">
                {settings.app_logo ? (
                  <img src={settings.app_logo} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Church size={24} />
                )}
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-bold tracking-tight text-zinc-900 leading-tight">{settings.app_name}</h1>
                <p className="text-xs text-zinc-500">Gestão Interna</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 lg:hidden">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-zinc-100 pt-4">
            <div className="mb-4 flex items-center px-3">
              <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="truncate text-sm font-medium text-zinc-900">{profile?.full_name}</p>
                <p className="truncate text-xs text-zinc-500 capitalize">{profile?.role}</p>
              </div>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
            >
              <Lock className="mr-3 h-5 w-5" />
              Alterar Minha Senha
            </button>
            <button
              onClick={() => signOut()}
              className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-zinc-900">Alterar Minha Senha</h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nova Senha</label>
                <input 
                  type="password" 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Confirmar Nova Senha</label>
                <input 
                  type="password" 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center rounded-2xl bg-zinc-900 py-4 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Atualizar Senha'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
    </>
  );
};
