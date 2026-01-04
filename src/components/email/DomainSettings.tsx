import { useState } from 'react';
import { Plus, Globe, Check, Copy, Trash2, AlertCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useDomains, useEmailAddresses } from '@/hooks/useDomains';

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
        description: 'Configure DNS records to verify your domain.',
      });
      setNewDomain('');
    }
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
                Configure this URL in your email routing service
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
                          <p className="font-medium text-sm sm:text-base truncate">{domain.domain}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Added {new Date(domain.created_at).toLocaleDateString()}
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

          {/* DNS Configuration Help */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>DNS Configuration Required</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>To receive emails, configure your DNS with these records:</p>
              <div className="bg-muted p-3 rounded-md font-mono text-xs space-y-1">
                <p><strong>MX Record:</strong> @ → your-email-service (Priority: 10)</p>
                <p><strong>TXT Record (SPF):</strong> v=spf1 include:your-service ~all</p>
              </div>
              <p className="text-sm">
                Use <strong>Cloudflare Email Routing</strong> (free) or <strong>ImprovMX</strong> for catch-all forwarding.
              </p>
            </AlertDescription>
          </Alert>

          {/* Email Addresses Section */}
          {selectedDomain && (
            <EmailAddressesSection 
              domain={selectedDomain}
              onClose={() => setSelectedDomainId(null)}
            />
          )}
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
  const { addresses, loading, addAddress, deleteAddress } = useEmailAddresses(domain.id);
  const [newLocal, setNewLocal] = useState('');
  const [isCatchAll, setIsCatchAll] = useState(false);

  const handleAdd = async () => {
    if (!newLocal.trim() && !isCatchAll) return;
    
    const { error } = await addAddress(
      isCatchAll ? '*' : newLocal.trim(),
      undefined,
      isCatchAll
    );
    
    if (error) {
      toast({
        title: 'Failed to add address',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setNewLocal('');
      setIsCatchAll(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Addresses for {domain.domain}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>Back</Button>
        </div>
        <CardDescription>
          Create email addresses or enable catch-all for unlimited inboxes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="username"
              value={newLocal}
              onChange={(e) => setNewLocal(e.target.value)}
              disabled={isCatchAll}
              className="flex-1"
            />
            <span className="text-muted-foreground">@{domain.domain}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={isCatchAll}
                onCheckedChange={setIsCatchAll}
              />
              <Label>Catch-all (receive all emails)</Label>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {addresses.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <span className="font-mono text-sm">
                  {addr.is_catch_all ? '*' : addr.local_part}@{domain.domain}
                </span>
                <div className="flex items-center gap-2">
                  {addr.is_catch_all && (
                    <Badge variant="secondary">Catch-all</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAddress(addr.id)}
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
  );
}
