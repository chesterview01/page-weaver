import { useState, useEffect, useCallback, useRef } from 'react';
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

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  wallet: Wallet | null;
  isLoading: boolean;
  isAdmin: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  wallet: null,
  isLoading: true,
  isAdmin: false,
};

export const useAuth = () => {
  const [state, setState] = useState<AuthState>(() => {
    const isMock = typeof window !== 'undefined' && (localStorage.getItem("mock_auth") === "true" || window.location.search.includes("mock_auth=true"));
    if (isMock) {
      return {
        user: { id: "mock-user-id", email: "mock@example.com" } as any,
        session: { access_token: "mock-token", user: { id: "mock-user-id", email: "mock@example.com" } } as any,
        profile: { id: "mock-profile-id", user_id: "mock-user-id", display_name: "Mock User", avatar_url: null },
        wallet: { id: "mock-wallet-id", user_id: "mock-user-id", credits: 100 },
        isLoading: false,
        isAdmin: false,
      };
    }
    return initialState;
  });
  const mountedRef = useRef(true);

  const safeSetState = useCallback((updates: Partial<AuthState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const [profileRes, walletRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
      ]);

      safeSetState({
        profile: profileRes.data as Profile | null,
        wallet: walletRes.data as Wallet | null,
        isAdmin: !!roleRes.data,
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, [safeSetState]);

  const saveGitHubToken = useCallback(async (userId: string, providerToken: string, fallbackUsername?: string) => {
    const isMock = typeof window !== 'undefined' && (localStorage.getItem("mock_auth") === "true" || window.location.search.includes("mock_auth=true"));
    if (isMock) return;

    try {
      let githubUsername = fallbackUsername || '';

      // Fetch exact username if not provided in metadata
      if (!githubUsername) {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${providerToken}`,
            'User-Agent': 'Chester-Code-IA'
          }
        });
        if (res.ok) {
          const data = await res.json();
          githubUsername = data.login;
        }
      }

      if (!githubUsername) {
        githubUsername = 'github-user';
      }

      const { data: existing } = await supabase
        .from('github_connections')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('github_connections')
          .update({
            personal_access_token: providerToken,
            github_username: githubUsername,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('github_connections')
          .insert({
            user_id: userId,
            personal_access_token: providerToken,
            github_username: githubUsername,
          });
      }

      await supabase.from('audit_logs').insert({
        action: 'github_token_sync',
        entity_type: 'github_connection',
        entity_id: userId,
        details: { github_username: githubUsername },
      });
    } catch (error) {
      console.error('Error saving GitHub token:', error);
    }
  }, []);

  useEffect(() => {
    const isMock = typeof window !== 'undefined' && (localStorage.getItem("mock_auth") === "true" || window.location.search.includes("mock_auth=true"));
    if (isMock) {
      return;
    }
    mountedRef.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        safeSetState({
          session,
          user: session?.user ?? null,
        });
        
        if (session?.user) {
          if (session.provider_token) {
            const username = session.user.user_metadata?.preferred_username || session.user.user_metadata?.user_name;
            saveGitHubToken(session.user.id, session.provider_token, username);
          }

          setTimeout(() => {
            if (mountedRef.current) {
              loadUserData(session.user.id);
            }
          }, 0);
        } else {
          safeSetState({
            profile: null,
            wallet: null,
            isAdmin: false,
          });
        }
        safeSetState({ isLoading: false });
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      safeSetState({
        session,
        user: session?.user ?? null,
      });
      if (session?.user) {
        if (session.provider_token) {
          const username = session.user.user_metadata?.preferred_username || session.user.user_metadata?.user_name;
          saveGitHubToken(session.user.id, session.provider_token, username);
        }
        loadUserData(session.user.id);
      }
      safeSetState({ isLoading: false });
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadUserData, safeSetState, saveGitHubToken]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    safeSetState({ isLoading: true });
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
      safeSetState({ isLoading: false });
    }
  }, [safeSetState]);

  const signIn = useCallback(async (email: string, password: string) => {
    safeSetState({ isLoading: true });
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
      safeSetState({ isLoading: false });
    }
  }, [safeSetState]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      safeSetState({
        user: null,
        session: null,
        profile: null,
        wallet: null,
        isAdmin: false,
      });
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
  }, [safeSetState]);

  const refreshWallet = useCallback(async () => {
    if (!state.user) return;
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', state.user.id)
      .maybeSingle();
    if (data) {
      safeSetState({ wallet: data as Wallet });
    }
  }, [state.user, safeSetState]);

  const deductCredit = useCallback(async (amount: number = 1, description?: string): Promise<boolean> => {
    if (!state.user || !state.wallet) return false;
    
    if (state.wallet.credits < amount) {
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
        .update({ credits: state.wallet.credits - amount })
        .eq('user_id', state.user.id);

      if (error) throw error;

      await supabase.from('credit_logs').insert({
        user_id: state.user.id,
        amount: -amount,
        action: 'message_sent',
        description: description || 'Mensaje enviado',
      });

      safeSetState({ 
        wallet: state.wallet ? { ...state.wallet, credits: state.wallet.credits - amount } : null 
      });
      return true;
    } catch (error) {
      console.error('Error deducting credit:', error);
      return false;
    }
  }, [state.user, state.wallet, safeSetState]);

  return {
    user: state.user,
    session: state.session,
    profile: state.profile,
    wallet: state.wallet,
    isLoading: state.isLoading,
    isAdmin: state.isAdmin,
    signUp,
    signIn,
    signOut,
    refreshWallet,
    deductCredit,
    isAuthenticated: !!state.session,
  };
};
