import React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { session, loading, organization } = useAuth();
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

  const isSetupPath = window.location.pathname.startsWith('/setup');

  // If user is logged in but has no organization, send them to setup
  if (!organization && !isSetupPath) {
    return <Navigate to="/setup" replace />;
  }

  // If user has organization but is on setup, send them to dashboard
  if (organization && isSetupPath) {
    return <Navigate to={`/${organization.slug}/dashboard`} replace />;
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
