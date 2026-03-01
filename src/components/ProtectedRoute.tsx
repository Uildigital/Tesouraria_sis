import React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { session, loading, organization, signOut } = useAuth();
  const { slug } = useParams();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // If user is logged in but has no organization, show an error state
  if (!organization) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-zinc-50 p-4 text-center">
        <div className="mb-4 rounded-full bg-rose-50 p-4 text-rose-600">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Igreja não encontrada</h2>
        <p className="mt-2 text-zinc-600">Sua conta não está vinculada a nenhuma igreja ativa.</p>
        <button 
          onClick={() => signOut()}
          className="mt-6 rounded-xl bg-zinc-900 px-6 py-2 text-sm font-bold text-white"
        >
          Sair e tentar novamente
        </button>
      </div>
    );
  }

  // Handle root path redirect
  if (window.location.pathname === '/' && organization) {
    return <Navigate to={`/${organization.slug}/dashboard`} replace />;
  }

  // If there's a slug in the URL, verify it matches the user's organization
  if (slug && organization && organization.slug !== slug) {
    return <Navigate to={`/${organization.slug}/dashboard`} replace />;
  }

  return <Outlet />;
};
