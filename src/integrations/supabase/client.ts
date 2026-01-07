import { createClient } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Email = {
  id: string
  from_email: string
  from_name: string | null
  to_email: string
  to_name: string | null
  subject: string
  body_text: string | null
  body_html: string | null
  headers: Json | null
  message_id: string | null
  in_reply_to: string | null
  references: string[] | null
  thread_id: string | null
  is_read: boolean
  is_starred: boolean
  is_archived: boolean
  is_trash: boolean
  is_sent: boolean
  folder: string
  received_at: string
  created_at: string
  updated_at: string
}

export type EmailInsert = {
  id?: string
  from_email: string
  from_name?: string | null
  to_email: string
  to_name?: string | null
  subject: string
  body_text?: string | null
  body_html?: string | null
  headers?: Json | null
  message_id?: string | null
  in_reply_to?: string | null
  references?: string[] | null
  thread_id?: string | null
  is_read?: boolean
  is_starred?: boolean
  is_archived?: boolean
  is_trash?: boolean
  is_sent?: boolean
  folder?: string
  received_at?: string
  created_at?: string
  updated_at?: string
}

export type EmailUpdate = {
  id?: string
  from_email?: string
  from_name?: string | null
  to_email?: string
  to_name?: string | null
  subject?: string
  body_text?: string | null
  body_html?: string | null
  headers?: Json | null
  message_id?: string | null
  in_reply_to?: string | null
  references?: string[] | null
  is_read?: boolean
  is_starred?: boolean
  is_archived?: boolean
  is_trash?: boolean
  is_sent?: boolean
  folder?: string
  received_at?: string
  created_at?: string
  updated_at?: string
}

export type EmailAttachment = {
  id: string
  email_id: string
  filename: string
  content_type: string
  size: number
  storage_path: string
  created_at: string
}

export type EmailDomain = {
  id: string
  domain: string
  is_verified: boolean
  mx_record: string | null
  txt_record: string | null
  webhook_secret: string | null
  created_at: string
  updated_at: string
}

export type EmailDomainInsert = {
  id?: string
  domain: string
  is_verified?: boolean
  mx_record?: string | null
  txt_record?: string | null
  webhook_secret?: string | null
  created_at?: string
  updated_at?: string
}

export type EmailAddress = {
  id: string
  domain_id: string
  local_part: string
  display_name: string | null
  is_catch_all: boolean
  status: 'pending' | 'active'
  first_received_at: string | null
  created_at: string
}

export type EmailAddressInsert = {
  id?: string
  domain_id: string
  local_part: string
  display_name?: string | null
  is_catch_all?: boolean
  status?: 'pending' | 'active'
  first_received_at?: string | null
  created_at?: string
}

const DEFAULT_SUPABASE_URL = "https://zlfqfdnkcxfjvwkoxaqa.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZnFmZG5rY3hmanZ3a294YXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjA1MTIsImV4cCI6MjA4MzA5NjUxMn0.t8tqVqokc5fHyyeMjNtddUl_9npUkxGC464p_QaYNn0";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL ??
    (import.meta.env as any).SUPABASE_URL ??
    DEFAULT_SUPABASE_URL) as string;

const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY ??
    (import.meta.env as any).SUPABASE_ANON_KEY ??
    DEFAULT_SUPABASE_ANON_KEY) as string;

export const supabaseUrl = SUPABASE_URL;

const missingEnvMessage =
  'Missing Cloud environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in project secrets.';

type StubResult = { data: null; error: Error };

function createStubQuery(): any {
  const p: Promise<StubResult> = Promise.resolve({
    data: null,
    error: new Error(missingEnvMessage),
  });

  const q: any = {
    select: () => q,
    order: () => q,
    eq: () => q,
    neq: () => q,
    not: () => q,
    or: () => q,
    update: () => q,
    insert: () => q,
    delete: () => q,
    single: () => q,
    maybeSingle: () => q,
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };

  return q;
}

function createStubClient(): any {
  return {
    from: () => createStubQuery(),
    auth: {
      getSession: async () => ({ data: { session: null }, error: new Error(missingEnvMessage) }),
    },
    functions: {
      invoke: async () => ({ data: null, error: new Error(missingEnvMessage) }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error(missingEnvMessage) }),
        download: async () => ({ data: null, error: new Error(missingEnvMessage) }),
      }),
    },
  };
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
