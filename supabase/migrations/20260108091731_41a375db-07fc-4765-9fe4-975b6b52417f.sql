-- Create tenant_members table that is referenced by existing functions
CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own memberships
CREATE POLICY "Users can view own tenant memberships"
ON public.tenant_members
FOR SELECT
USING (user_id = auth.uid());

-- Allow admins full access
CREATE POLICY "Admins have full access to tenant_members"
ON public.tenant_members
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));