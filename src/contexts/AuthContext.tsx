import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  canEdit: boolean;
  signOut: () => Promise<void>;
  signIn: (userData: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // We consider admin role as canEdit
  const canEdit = profile?.role === 'admin';

  useEffect(() => {
    let mounted = true;

    // 1. Load custom session from localStorage (Primary for our bcrypt auth)
    const savedUser = localStorage.getItem('church_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (mounted) setProfile(parsedUser);
      } catch (e) {
        localStorage.removeItem('church_user');
      }
    }

    // 2. Initialize Supabase Auth (Secondary/Hybrid)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else if (!savedUser) {
            // Only set loading false if we don't have a custom session either
            setProfile(null);
            setLoading(false);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Erro ao inicializar auth:", error);
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // 3. Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else if (!localStorage.getItem('church_user')) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch (er) {
      console.error("Erro ao buscar perfil:", er);
    } finally {
      setLoading(false);
    }
  };

  const signIn = (userData: any) => {
    const profileData = {
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      is_active: userData.is_active !== undefined ? userData.is_active : true,
      organization_id: userData.organization_id || ''
    } as Profile;

    setProfile(profileData);
    localStorage.setItem('church_user', JSON.stringify(profileData));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    localStorage.removeItem('church_user');
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
