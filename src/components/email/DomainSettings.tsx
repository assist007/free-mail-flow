import { useState, useEffect } from 'react';
import { Plus, Globe, Check, Copy, Trash2, AlertCircle, Mail, ChevronRight, Search, RefreshCw, EyeOff, Eye, Ban, RotateCcw } from 'lucide-react';
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
import { useAutoAddresses } from '@/hooks/useAutoAddresses';
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

  // Fetch address counts from received emails (auto-detected)
  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      for (const domain of domains) {
        // Count unique addresses from received emails
        const { data: emails } = await supabase
          .from('emails')
          .select('to_email')
          .ilike('to_email', `%@${domain.domain}%`);
        
        // Extract unique local parts
        const uniqueAddresses = new Set<string>();
        emails?.forEach(email => {
          const match = email.to_email?.match(/^([^@]+)@/);
          if (match) uniqueAddresses.add(match[1].toLowerCase());
        });
        
        counts[domain.id] = uniqueAddresses.size;
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

          {/* Email Addresses Section - Cloudflare style */}
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
                Note: this “Verified” badge is a FlowMail status flag (we don’t automatically check DNS here).
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
  const { addresses: autoAddresses, loading: autoLoading, refetch: refetchAuto } = useAutoAddresses(domain.domain);
  const { 
    hiddenAddresses, 
    hideAddress, 
    blockAddress, 
    restoreAddress, 
    isHidden, 
    isBlocked 
  } = useHiddenAddresses(domain.domain);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'hidden'>('active');

  // Filter visible addresses (not hidden)
  const visibleAddresses = autoAddresses.filter(addr => !isHidden(addr.localPart));
  
  const filteredAddresses = visibleAddresses.filter(addr => {
    if (!searchQuery) return true;
    return addr.localPart.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredHidden = hiddenAddresses.filter(addr => {
    if (!searchQuery) return true;
    return addr.localPart.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleHide = (localPart: string) => {
    hideAddress(localPart);
    toast({
      title: 'Address hidden',
      description: `${localPart}@${domain.domain} is now hidden. You can restore it anytime.`,
    });
  };

  const handleBlock = (localPart: string) => {
    blockAddress(localPart);
    toast({
      title: 'Address blocked',
      description: `${localPart}@${domain.domain} is now blocked permanently.`,
      variant: 'destructive',
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
              Active Addresses
              <Badge variant="secondary" className="ml-2">
                Auto-detected
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Addresses detected from received emails. Synced automatically with Cloudflare.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Back</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
              onClick={() => refetchAuto()}
              className="shrink-0"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Active Addresses Tab */}
          <TabsContent value="active" className="mt-4">
            {/* Info Alert */}
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                এই list automatically তৈরি হয় received emails থেকে। Unwanted address hide বা block করতে পারেন।
              </AlertDescription>
            </Alert>

            {/* Addresses Table */}
            {autoLoading ? (
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
                    : `Send an email to any address @${domain.domain} to see it here`}
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-medium">Email Address</TableHead>
                      <TableHead className="font-medium text-center">Emails</TableHead>
                      <TableHead className="font-medium hidden sm:table-cell">Last Received</TableHead>
                      <TableHead className="font-medium text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAddresses.map((addr) => (
                      <TableRow key={addr.localPart}>
                        <TableCell className="font-mono text-sm">
                          {addr.fullAddress}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{addr.emailCount}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {new Date(addr.lastReceived).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleHide(addr.localPart)}
                              title="Hide address"
                            >
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleBlock(addr.localPart)}
                              title="Block address permanently"
                            >
                              <Ban className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
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
                Hidden addresses এখানে দেখা যায়। Blocked addresses নতুন email আসলেও auto-restore হবে না।
              </AlertDescription>
            </Alert>

            {filteredHidden.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                <EyeOff className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hidden addresses</p>
                <p className="text-xs mt-1">Hidden or blocked addresses will appear here</p>
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
                          {addr.isBlocked ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <Ban className="w-3 h-3" />
                              Blocked
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <EyeOff className="w-3 h-3" />
                              Hidden
                            </Badge>
                          )}
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
