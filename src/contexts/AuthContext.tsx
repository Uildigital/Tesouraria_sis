import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile } from '../types';

interface AuthContextType {
  session: any | null;
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  canEdit: boolean;
  signOut: () => Promise<void>;
  signIn: (user: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const canEdit = profile?.role === 'admin' || profile?.role === 'treasurer';

  useEffect(() => {
    const savedUser = localStorage.getItem('church_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setSession({ user: userData });
      setUser(userData);
      setProfile({
        id: userData.id,
        organization_id: userData.organization_id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        is_active: userData.is_active !== undefined ? userData.is_active : true
      } as Profile);
    }
    setLoading(false);
  }, []);

  const signIn = (userData: any) => {
    localStorage.setItem('church_user', JSON.stringify(userData));
    setSession({ user: userData });
    setUser(userData);
    setProfile({
      id: userData.id,
      organization_id: userData.organization_id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      is_active: userData.is_active !== undefined ? userData.is_active : true
    } as Profile);
  };

  const signOut = async () => {
    localStorage.removeItem('church_user');
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, canEdit, signOut, signIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
