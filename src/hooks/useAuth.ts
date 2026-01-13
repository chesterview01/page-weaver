import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  credits: number;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile and wallet
  const loadUserData = useCallback(async (userId: string) => {
    try {
      const [profileRes, walletRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data as Profile);
      }
      if (walletRes.data) {
        setWallet(walletRes.data as Wallet);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(() => loadUserData(session.user.id), 0);
        } else {
          setProfile(null);
          setWallet(null);
        }
        setIsLoading(false);
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: displayName },
        },
      });

      if (error) throw error;

      toast({
        title: "¡Registro exitoso!",
        description: "Bienvenido. Recibiste 2 créditos gratis.",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error de registro",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente.",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error de inicio de sesión",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setWallet(null);
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const refreshWallet = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setWallet(data as Wallet);
    }
  }, [user]);

  const deductCredit = useCallback(async (amount: number = 1, description?: string): Promise<boolean> => {
    if (!user || !wallet) return false;
    
    if (wallet.credits < amount) {
      toast({
        title: "Sin créditos",
        description: "No tienes suficientes créditos. Recarga tu wallet.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('wallets')
        .update({ credits: wallet.credits - amount })
        .eq('user_id', user.id);

      if (error) throw error;

      // Log the credit usage
      await supabase.from('credit_logs').insert({
        user_id: user.id,
        amount: -amount,
        action: 'message_sent',
        description: description || 'Mensaje enviado',
      });

      setWallet(prev => prev ? { ...prev, credits: prev.credits - amount } : null);
      return true;
    } catch (error) {
      console.error('Error deducting credit:', error);
      return false;
    }
  }, [user, wallet]);

  return {
    user,
    session,
    profile,
    wallet,
    isLoading,
    signUp,
    signIn,
    signOut,
    refreshWallet,
    deductCredit,
    isAuthenticated: !!session,
  };
};
