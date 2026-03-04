import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { session, loading, profile, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // If user is inactive, block access
  if (profile && !profile.is_active) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-zinc-50 p-4 text-center">
        <div className="mb-4 rounded-full bg-amber-50 p-4 text-amber-600">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Acesso Suspenso</h2>
        <p className="mt-2 text-zinc-600">Sua credencial foi desativada pelo administrador da instituição.</p>
        <p className="text-sm text-zinc-400 mt-1">Entre em contato com a secretaria da sua igreja para mais informações.</p>
        <button 
          onClick={async () => {
            await signOut();
            window.location.href = '/login';
          }}
          className="mt-6 rounded-xl bg-zinc-900 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-zinc-800"
        >
          Sair da Conta
        </button>
      </div>
    );
  }

  return <Outlet />;
};
