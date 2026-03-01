import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const ProtectedRoute: React.FC = () => {
  const { session, loading, organization, profile, signOut } = useAuth();
  const { slug } = useParams();
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const verifyStatus = async () => {
      if (session?.user?.id) {
        setIsCheckingStatus(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('is_active')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (data && data.is_active === false) {
            setIsBlocked(true);
          }
        } catch (err) {
          console.error('Error verifying status:', err);
        } finally {
          setIsCheckingStatus(false);
        }
      }
    };

    verifyStatus();
  }, [session]);

  if (loading || isCheckingStatus) {
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
  if (isBlocked || (profile && !profile.is_active)) {
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
