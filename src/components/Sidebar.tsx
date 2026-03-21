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
  Users as UsersIcon
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

  const navItems = [
    { name: 'Dashboard', href: `/dashboard`, icon: LayoutDashboard },
    { name: 'Lançamentos', href: `/lancamentos`, icon: ArrowLeftRight },
    { name: 'Relatórios', href: `/relatorios`, icon: FileText },
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
              onClick={() => signOut()}
              className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
