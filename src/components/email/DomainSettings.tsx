import { useState, useEffect } from 'react';
import { Plus, Globe, Check, Copy, Trash2, AlertCircle, Mail, ChevronRight, Search, RefreshCw, EyeOff, Eye, RotateCcw, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useDomains, useEmailAddresses } from '@/hooks/useDomains';
import { useHiddenAddresses } from '@/hooks/useHiddenAddresses';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

          {/* Important Notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Strict Address Control</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                শুধুমাত্র এখান থেকে create করা email addresses-এই mail receive হবে।
                Random/unknown addresses এ mail reject হবে।
              </p>
              <p className="text-sm text-muted-foreground">
                Status: <strong>Pending</strong> = address তৈরি হয়েছে, কিন্তু এখনো mail আসেনি।
                <strong> Active</strong> = প্রথম mail receive হয়েছে।
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
  const { addresses, loading, refetch, addAddress, deleteAddress } = useEmailAddresses(domain.id);
  const { 
    hiddenAddresses, 
    hideAddress, 
    restoreAddress, 
    isHidden, 
  } = useHiddenAddresses(domain.domain);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'hidden'>('active');
  const [newLocalPart, setNewLocalPart] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);

  // Filter visible addresses (not hidden)
  const visibleAddresses = addresses.filter(addr => !isHidden(addr.local_part));
  
  const filteredAddresses = visibleAddresses.filter(addr => {
    if (!searchQuery) return true;
    return addr.local_part.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredHidden = hiddenAddresses.filter(addr => {
    if (!searchQuery) return true;
    return addr.localPart.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAddAddress = async () => {
    if (!newLocalPart.trim()) return;

    setAddingAddress(true);
    const { error } = await addAddress(newLocalPart.trim().toLowerCase());
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
        description: `${newLocalPart}@${domain.domain} is now ready to receive emails.`,
      });
      setNewLocalPart('');
    }
  };

  const handleDeleteAddress = async (id: string, localPart: string) => {
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
        description: `${localPart}@${domain.domain} has been permanently removed.`,
      });
    }
  };

  const handleHide = (localPart: string) => {
    hideAddress(localPart);
    toast({
      title: 'Address hidden',
      description: `${localPart}@${domain.domain} is now hidden from view.`,
    });
  };

  const handleRestore = (localPart: string) => {
    restoreAddress(localPart);
    toast({
      title: 'Address restored',
      description: `${localPart}@${domain.domain} is now visible again.`,
    });
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
                @{domain.domain}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Create and manage email addresses for this domain. Only registered addresses will receive emails.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Back</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create New Address */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex-1 flex items-center gap-2">
            <Input
              placeholder="username"
              value={newLocalPart}
              onChange={(e) => setNewLocalPart(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAddress()}
              className="flex-1"
            />
            <span className="text-muted-foreground font-mono text-sm">@{domain.domain}</span>
          </div>
          <Button onClick={handleAddAddress} disabled={addingAddress || !newLocalPart.trim()} size="sm" className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Create Address
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'hidden')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Active ({visibleAddresses.length})
            </TabsTrigger>
            <TabsTrigger value="hidden" className="flex items-center gap-2">
              <EyeOff className="w-4 h-4" />
              Hidden ({hiddenAddresses.length})
            </TabsTrigger>
          </TabsList>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4">
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

          {/* Active Addresses Tab */}
          <TabsContent value="active" className="mt-4">
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
                <p className="text-sm">No active addresses</p>
                <p className="text-xs mt-1">
                  {visibleAddresses.length === 0 && hiddenAddresses.length > 0 
                    ? "All addresses are hidden. Check the Hidden tab." 
                    : "Create an email address above to get started."}
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-medium">Email Address</TableHead>
                      <TableHead className="font-medium text-center">Status</TableHead>
                      <TableHead className="font-medium hidden sm:table-cell">First Received</TableHead>
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
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
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
                          {addr.first_received_at 
                            ? new Date(addr.first_received_at).toLocaleDateString()
                            : '—'
                          }
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleHide(addr.local_part)}
                            title="Hide address"
                          >
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteAddress(addr.id, addr.local_part)}
                            title="Delete permanently"
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
          </TabsContent>

          {/* Hidden Addresses Tab */}
          <TabsContent value="hidden" className="mt-4">
            <Alert className="mb-4">
              <EyeOff className="h-4 w-4" />
              <AlertDescription>
                Hidden addresses এখানে দেখা যায়। Restore করলে আবার Active tab এ দেখাবে।
              </AlertDescription>
            </Alert>

            {filteredHidden.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                <EyeOff className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hidden addresses</p>
                <p className="text-xs mt-1">Hidden addresses will appear here</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-medium">Email Address</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium hidden sm:table-cell">Hidden At</TableHead>
                      <TableHead className="font-medium text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHidden.map((addr) => (
                      <TableRow key={addr.localPart}>
                        <TableCell className="font-mono text-sm">
                          {addr.localPart}@{domain.domain}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <EyeOff className="w-3 h-3" />
                            Hidden
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {new Date(addr.hiddenAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(addr.localPart)}
                            className="h-8"
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
