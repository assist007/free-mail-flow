import { useState, useEffect } from 'react';
import { Plus, Globe, Check, Copy, Trash2, AlertCircle, Mail, ChevronRight, Search, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useDomains, useEmailAddresses } from '@/hooks/useDomains';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DomainSettingsProps {
  onClose: () => void;
  webhookUrl: string;
}

export function DomainSettings({ onClose, webhookUrl }: DomainSettingsProps) {
  const { toast } = useToast();
  const { domains, loading, addDomain, verifyDomain, deleteDomain } = useDomains();
  const [newDomain, setNewDomain] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);
  const [addressCounts, setAddressCounts] = useState<Record<string, number>>({});

  // Fetch address counts from email_addresses table
  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      for (const domain of domains) {
        const { count } = await supabase
          .from('email_addresses')
          .select('*', { count: 'exact', head: true })
          .eq('domain_id', domain.id);
        
        counts[domain.id] = count || 0;
      }
      setAddressCounts(counts);
    };
    if (domains.length > 0) {
      fetchCounts();
    }
  }, [domains]);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;

    setAddingDomain(true);
    const { error } = await addDomain(newDomain.trim());
    setAddingDomain(false);

    if (error) {
      toast({
        title: 'Failed to add domain',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Domain added',
        description: 'Configure email routing, then verify the domain here.',
      });
      setNewDomain('');
    }
  };

  const handleVerify = async (id: string, domainName: string) => {
    setVerifyingDomainId(id);

    // Check if any emails have been received for this domain
    const { data: emails, error: emailError } = await supabase
      .from('emails')
      .select('id')
      .ilike('to_email', `%@${domainName}%`)
      .limit(1);

    if (emailError) {
      setVerifyingDomainId(null);
      toast({
        title: 'Verification failed',
        description: emailError.message,
        variant: 'destructive',
      });
      return;
    }

    if (!emails || emails.length === 0) {
      setVerifyingDomainId(null);
      toast({
        title: 'Not verified yet',
        description: `No emails received for @${domainName}. Send a test email first, then try again.`,
        variant: 'destructive',
      });
      return;
    }

    // Emails found - mark as verified
    const { error } = await verifyDomain(id);
    setVerifyingDomainId(null);

    if (error) {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Domain verified!',
      description: 'Cloudflare Email Routing is working correctly.',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Copied to clipboard',
    });
  };

  const selectedDomain = domains.find(d => d.id === selectedDomainId);

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border gap-2">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold truncate">Domain Settings</h2>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your email domains and addresses</p>
        </div>
        <Button variant="ghost" onClick={onClose} size="sm">Close</Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Security Notice */}
          <Alert className="border-primary/50 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Strict Allowlist System</AlertTitle>
            <AlertDescription>
              শুধুমাত্র App থেকে তৈরি করা addresses-এ email receive হবে। 
              Unknown/unauthorized addresses-এ পাঠানো emails automatically reject হবে।
            </AlertDescription>
          </Alert>

          {/* Webhook URL */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Webhook URL</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Configure this URL in your email routing service (Cloudflare Workers)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input 
                  value={webhookUrl} 
                  readOnly 
                  className="font-mono text-xs sm:text-sm bg-muted flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(webhookUrl)}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4 mr-2 sm:mr-0" />
                  <span className="sm:hidden">Copy</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add Domain */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                Add Domain
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Add a custom domain to receive emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                  className="flex-1"
                />
                <Button onClick={handleAddDomain} disabled={addingDomain} size="sm" className="shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Domain List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Your Domains</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : domains.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No domains added yet</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer gap-2 sm:gap-4"
                      onClick={() => setSelectedDomainId(domain.id)}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm sm:text-base truncate">{domain.domain}</p>
                            {addressCounts[domain.id] > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Mail className="w-3 h-3 mr-1" />
                                {addressCounts[domain.id]} address{addressCounts[domain.id] > 1 ? 'es' : ''}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Added {new Date(domain.created_at).toLocaleDateString()} • Click to manage addresses
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 pl-6 sm:pl-0">
                        <Badge variant={domain.is_verified ? 'default' : 'secondary'} className="text-xs">
                          {domain.is_verified ? (
                            <><Check className="w-3 h-3 mr-1" /> Verified</>
                          ) : (
                            'Pending'
                          )}
                        </Badge>

                        {!domain.is_verified && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={verifyingDomainId === domain.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerify(domain.id, domain.domain);
                            }}
                          >
                            {verifyingDomainId === domain.id ? 'Verifying...' : 'Verify'}
                          </Button>
                        )}

                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDomain(domain.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Addresses Section */}
          {selectedDomain && (
            <EmailAddressesSection 
              domain={selectedDomain}
              onClose={() => setSelectedDomainId(null)}
            />
          )}

          {/* DNS Configuration Help */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>How to verify?</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                If your <strong>Cloudflare Email Routing</strong> and Worker are already active, click
                <strong> Verify</strong> next to the domain to change the status from <strong>Pending</strong> to
                <strong> Verified</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Note: this "Verified" badge is a FlowMail status flag (we don't automatically check DNS here).
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </ScrollArea>
    </div>
  );
}

interface EmailAddressesSectionProps {
  domain: { id: string; domain: string };
  onClose: () => void;
}

function EmailAddressesSection({ domain, onClose }: EmailAddressesSectionProps) {
  const { toast } = useToast();
  const { addresses, loading, addAddress, deleteAddress, refetch } = useEmailAddresses(domain.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [newLocalPart, setNewLocalPart] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);
  
  const filteredAddresses = addresses.filter(addr => {
    if (!searchQuery) return true;
    return addr.local_part.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAddAddress = async () => {
    if (!newLocalPart.trim()) return;
    
    // Validate local part
    const localPart = newLocalPart.trim().toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(localPart)) {
      toast({
        title: 'Invalid address',
        description: 'Only letters, numbers, dots, hyphens and underscores allowed',
        variant: 'destructive',
      });
      return;
    }

    setAddingAddress(true);
    const { error } = await addAddress(localPart);
    setAddingAddress(false);

    if (error) {
      toast({
        title: 'Failed to add address',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Address created',
        description: `${localPart}@${domain.domain} is now ready to receive emails.`,
      });
      setNewLocalPart('');
    }
  };

  const handleDelete = async (id: string, localPart: string) => {
    const { error } = await deleteAddress(id);
    if (error) {
      toast({
        title: 'Failed to delete',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Address deleted',
        description: `${localPart}@${domain.domain} has been removed. Future emails will be rejected.`,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Addresses
              <Badge variant="outline" className="ml-2">
                {addresses.length} total
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Create addresses to receive emails. Only these addresses will accept inbound mail.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Back</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Address */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed border-border">
          <div className="flex-1 flex items-center gap-1">
            <Input
              placeholder="new-address"
              value={newLocalPart}
              onChange={(e) => setNewLocalPart(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAddress()}
              className="flex-1"
            />
            <span className="text-muted-foreground font-mono text-sm">@{domain.domain}</span>
          </div>
          <Button onClick={handleAddAddress} disabled={addingAddress} size="sm" className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Create Address
          </Button>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search addresses..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            className="shrink-0"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Pending</strong> = Address তৈরি হয়েছে, কিন্তু email আসেনি। 
            <strong> Active</strong> = প্রথম email সফলভাবে receive হয়েছে।
          </AlertDescription>
        </Alert>

        {/* Addresses Table */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : filteredAddresses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
            <Mail className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No addresses yet</p>
            <p className="text-xs mt-1">
              Create an address above to start receiving emails
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Email Address</TableHead>
                  <TableHead className="font-medium text-center">Status</TableHead>
                  <TableHead className="font-medium hidden sm:table-cell">Created</TableHead>
                  <TableHead className="font-medium hidden md:table-cell">First Email</TableHead>
                  <TableHead className="font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAddresses.map((addr) => (
                  <TableRow key={addr.id}>
                    <TableCell className="font-mono text-sm">
                      {addr.local_part}@{domain.domain}
                    </TableCell>
                    <TableCell className="text-center">
                      {addr.status === 'active' ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {new Date(addr.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {addr.first_received_at 
                        ? new Date(addr.first_received_at).toLocaleDateString()
                        : '—'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(addr.id, addr.local_part)}
                        title="Delete address (hard delete)"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
