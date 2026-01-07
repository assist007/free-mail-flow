import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: 'owner' | 'admin' | 'user';
  created_at: string;
};

type AuthContextValue = {
  user: { id: string; email: string | null } | null;
  profile: Profile | null;
  supportEmail: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchSupportEmail() {
  const { data } = await supabase
    .from('app_settings')
    .select('support_email')
    .maybeSingle();

  return data?.support_email ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [supportEmail, setSupportEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (
    userId: string | null,
    email: string | null,
    displayName?: string | null
  ) => {
    if (!userId) {
      setProfile(null);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setProfile(data as Profile);
      return;
    }

    const { data: inserted } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        display_name: displayName ?? null,
        role: 'user',
      })
      .select('*')
      .maybeSingle();

    if (inserted) {
      setProfile(inserted as Profile);
    } else {
      setProfile({
        id: userId,
        email,
        display_name: displayName ?? null,
        role: 'user',
        created_at: new Date().toISOString(),
      });
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadProfile(user.id, user.email ?? null, profile?.display_name ?? null);
    const nextSupportEmail = await fetchSupportEmail();
    setSupportEmail(nextSupportEmail);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;
      if (!mounted) return;

      if (sessionUser) {
        setUser({ id: sessionUser.id, email: sessionUser.email ?? null });
        await loadProfile(
          sessionUser.id,
          sessionUser.email ?? null,
          (sessionUser.user_metadata?.display_name as string | null) ?? null
        );
        const settingsEmail = await fetchSupportEmail();
        setSupportEmail(settingsEmail);
      } else {
        setUser(null);
        setProfile(null);
        setSupportEmail(null);
      }
      if (mounted) {
        setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? null } : null);
      if (sessionUser) {
        await loadProfile(
          sessionUser.id,
          sessionUser.email ?? null,
          (sessionUser.user_metadata?.display_name as string | null) ?? null
        );
        const settingsEmail = await fetchSupportEmail();
        setSupportEmail(settingsEmail);
      } else {
        setProfile(null);
        setSupportEmail(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      supportEmail,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile,
    }),
    [user, profile, supportEmail, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
