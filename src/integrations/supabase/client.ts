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
  created_at: string
}

export type EmailAddressInsert = {
  id?: string
  domain_id: string
  local_part: string
  display_name?: string | null
  is_catch_all?: boolean
  created_at?: string
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
