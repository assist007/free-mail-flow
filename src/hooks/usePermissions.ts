import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: 'owner' | 'admin' | 'user';
  created_at: string;
};

export type DomainAccess = {
  id: string;
  user_id: string;
  domain_id: string;
  mailbox_limit: number;
  email_domains: {
    id: string;
    domain: string;
  };
};

export function useAdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    setUsers((data as UserProfile[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateRole = async (userId: string, role: UserProfile['role']) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (!error) {
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)));
    }

    return { error };
  };

  return { users, loading, refresh: fetchUsers, updateRole };
}

export function useDomainAccess(userId?: string | null) {
  const [access, setAccess] = useState<DomainAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccess = useCallback(async () => {
    if (!userId) {
      setAccess([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('domain_access')
      .select('id,user_id,domain_id,mailbox_limit,email_domains(id,domain)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setAccess((data as DomainAccess[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  const upsertAccess = async (domainId: string, mailboxLimit: number) => {
    if (!userId) return { error: new Error('No user selected') };

    const { data, error } = await supabase
      .from('domain_access')
      .upsert({
        user_id: userId,
        domain_id: domainId,
        mailbox_limit: mailboxLimit,
      })
      .select('id,user_id,domain_id,mailbox_limit,email_domains(id,domain)')
      .single();

    if (!error && data) {
      setAccess((prev) => {
        const exists = prev.find((item) => item.domain_id === domainId);
        if (exists) {
          return prev.map((item) => (item.domain_id === domainId ? (data as DomainAccess) : item));
        }
        return [data as DomainAccess, ...prev];
      });
    }

    return { data: data as DomainAccess | null, error };
  };

  const removeAccess = async (domainId: string) => {
    if (!userId) return { error: new Error('No user selected') };

    const { error } = await supabase
      .from('domain_access')
      .delete()
      .eq('user_id', userId)
      .eq('domain_id', domainId);

    if (!error) {
      setAccess((prev) => prev.filter((item) => item.domain_id !== domainId));
    }

    return { error };
  };

  const accessByDomainId = useMemo(() => {
    return access.reduce<Record<string, DomainAccess>>((acc, item) => {
      acc[item.domain_id] = item;
      return acc;
    }, {});
  }, [access]);

  return { access, accessByDomainId, loading, refresh: fetchAccess, upsertAccess, removeAccess };
}

export function useSupportEmail() {
  const [supportEmail, setSupportEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchSupportEmail = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('app_settings')
      .select('support_email')
      .maybeSingle();

    setSupportEmail(data?.support_email ?? '');
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSupportEmail();
  }, [fetchSupportEmail]);

  const updateSupportEmail = async (email: string) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ support_email: email })
      .select('support_email')
      .single();

    if (!error) {
      setSupportEmail(email);
    }

    return { error };
  };

  return { supportEmail, loading, refresh: fetchSupportEmail, updateSupportEmail };
}

export function useUserDomainAccess(userId?: string | null) {
  const { access, accessByDomainId, loading, refresh } = useDomainAccess(userId);
  const domainIds = useMemo(() => access.map((item) => item.domain_id), [access]);
  const domainNames = useMemo(() => access.map((item) => item.email_domains?.domain).filter(Boolean) as string[], [access]);

  return { access, accessByDomainId, domainIds, domainNames, loading, refresh };
}
