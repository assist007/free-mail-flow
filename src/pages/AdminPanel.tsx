import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Shield, User, Globe, Mail, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useDomains } from '@/hooks/useDomains';
import { useAuth } from '@/context/AuthContext';
import { useAdminUsers, useDomainAccess, useSupportEmail } from '@/hooks/usePermissions';

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
] as const;

export default function AdminPanel() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin';
  const { users, loading: usersLoading, updateRole } = useAdminUsers();
  const { domains } = useDomains();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { accessByDomainId, upsertAccess, removeAccess, loading: accessLoading } = useDomainAccess(selectedUserId);
  const { supportEmail, updateSupportEmail } = useSupportEmail();
  const [supportEmailDraft, setSupportEmailDraft] = useState('');
  const [domainLimitDrafts, setDomainLimitDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, users]);

  useEffect(() => {
    setSupportEmailDraft(supportEmail);
  }, [supportEmail]);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    domains.forEach((domain) => {
      const access = accessByDomainId[domain.id];
      if (access) {
        nextDrafts[domain.id] = String(access.mailbox_limit ?? '');
      }
    });
    setDomainLimitDrafts(nextDrafts);
  }, [domains, accessByDomainId]);

  const selectedUser = useMemo(() => users.find((item) => item.id === selectedUserId), [users, selectedUserId]);

  const handleRoleChange = async (userId: string, role: 'owner' | 'admin' | 'user') => {
    const { error } = await updateRole(userId, role);
    if (error) {
      toast({
        title: 'Role update failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Role updated',
        description: `Role updated to ${role}.`,
      });
    }
  };

  const handleToggleDomain = async (domainId: string, enabled: boolean) => {
    if (!selectedUserId) return;

    if (enabled) {
      const draft = domainLimitDrafts[domainId];
      const limit = Number(draft || 5);
      const { error } = await upsertAccess(domainId, Number.isNaN(limit) ? 5 : limit);
      if (error) {
        toast({
          title: 'Failed to grant access',
          description: error.message,
          variant: 'destructive',
        });
      }
      return;
    }

    const { error } = await removeAccess(domainId);
    if (error) {
      toast({
        title: 'Failed to revoke access',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveLimit = async (domainId: string) => {
    const draft = domainLimitDrafts[domainId];
    const limit = Number(draft);
    if (!selectedUserId) return;

    if (!draft || Number.isNaN(limit) || limit < 0) {
      toast({
        title: 'Invalid limit',
        description: 'Please enter a valid number for the mailbox limit.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await upsertAccess(domainId, limit);
    if (error) {
      toast({
        title: 'Failed to update limit',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Limit updated',
        description: `Mailbox limit updated to ${limit}.`,
      });
    }
  };

  const handleSaveSupportEmail = async () => {
    if (!supportEmailDraft) {
      toast({
        title: 'Support email required',
        description: 'Please enter a support email address.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await updateSupportEmail(supportEmailDraft);
    if (error) {
      toast({
        title: 'Failed to update support email',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Support email updated',
        description: 'User profiles will show the updated contact address.',
      });
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <Shield className="w-10 h-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="text-sm text-muted-foreground text-center">
          You do not have permission to access this panel.
        </p>
        <Button onClick={() => window.location.assign('/')}>Return to inbox</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => window.location.assign('/')}
            className="h-9 w-9 p-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground">Manage users, permissions, and mailbox limits.</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4" /> Support email
          </CardTitle>
          <CardDescription>Shown to every user in their profile for limit requests.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Input
            type="email"
            value={supportEmailDraft}
            onChange={(event) => setSupportEmailDraft(event.target.value)}
            placeholder="support@yourdomain.com"
          />
          <Button onClick={handleSaveSupportEmail} className="sm:w-auto w-full">
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4" /> User roles
          </CardTitle>
          <CardDescription>Assign admin or user roles after signup.</CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((item) => (
                  <TableRow key={item.id} className={item.id === selectedUserId ? 'bg-muted/40' : ''}>
                    <TableCell className="font-medium">
                      {item.display_name || '—'}
                    </TableCell>
                    <TableCell>{item.email ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={item.role}
                        onValueChange={(value) => handleRoleChange(item.id, value as 'owner' | 'admin' | 'user')}
                      >
                        <SelectTrigger className="w-32 ml-auto">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-4 h-4" /> Domain access
          </CardTitle>
          <CardDescription>
            Select a user and configure which domains they can access and how many mailboxes they can create.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedUserId ?? undefined} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {users.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.display_name || item.email || item.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!selectedUser ? (
            <p className="text-sm text-muted-foreground">Select a user to manage domain access.</p>
          ) : accessLoading ? (
            <p className="text-sm text-muted-foreground">Loading domain access...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Mailbox limit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => {
                  const domainAccess = accessByDomainId[domain.id];
                  const enabled = Boolean(domainAccess);
                  return (
                    <TableRow key={domain.id}>
                      <TableCell className="font-medium">{domain.domain}</TableCell>
                      <TableCell>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(value) => handleToggleDomain(domain.id, value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          disabled={!enabled}
                          value={domainLimitDrafts[domain.id] ?? ''}
                          onChange={(event) =>
                            setDomainLimitDrafts((prev) => ({
                              ...prev,
                              [domain.id]: event.target.value,
                            }))
                          }
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!enabled}
                          onClick={() => handleSaveLimit(domain.id)}
                        >
                          Save
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
