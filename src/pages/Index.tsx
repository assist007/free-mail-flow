import { useState, useEffect } from 'react';
import { Search, RefreshCw, Moon, Sun, Menu, Settings, HelpCircle, Pencil, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/email/Sidebar';
import { EmailList } from '@/components/email/EmailList';
import { EmailView } from '@/components/email/EmailView';
import { ComposeModal } from '@/components/email/ComposeModal';
import { DomainSettings } from '@/components/email/DomainSettings';
import { useEmails } from '@/hooks/useEmails';
import { useDomains } from '@/hooks/useDomains';
import { Email, supabaseUrl, supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface EmailAddressWithDomain {
  id: string;
  local_part: string;
  domain: string;
  display_name: string | null;
  status: 'pending' | 'active';
}

const Index = () => {
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [allEmailAddresses, setAllEmailAddresses] = useState<EmailAddressWithDomain[]>([]);
  
  const { toast } = useToast();
  const { domains } = useDomains();
  const { 
    emails, 
    loading, 
    error,
    refetch, 
    markAsRead, 
    toggleStar, 
    moveToTrash, 
    archiveEmail,
    sendEmail 
  } = useEmails(activeFolder);

  // Fetch all email addresses with their domains
  useEffect(() => {
    const fetchAllAddresses = async () => {
      const { data, error } = await supabase
        .from('email_addresses')
        .select(`
          id,
          local_part,
          display_name,
          status,
          email_domains!inner(domain)
        `)
        .eq('status', 'active');
      
      if (!error && data) {
        const addresses = data.map((addr: any) => ({
          id: addr.id,
          local_part: addr.local_part,
          domain: addr.email_domains.domain,
          display_name: addr.display_name,
          status: addr.status,
        }));
        setAllEmailAddresses(addresses);
      }
    };
    
    fetchAllAddresses();
  }, [domains]);

  useEffect(() => {
    if (!error) return;
    toast({
      title: 'Emails load failed',
      description: error,
      variant: 'destructive',
    });
  }, [error, toast]);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Get active domain
  const activeDomain = domains.find(d => d.id === activeDomainId);

  // Calculate unread count
  const unreadCount = emails.filter(e => !e.is_read).length;

  // Filter emails by search and domain
  const filteredEmails = emails.filter(email => {
    // Filter by domain if selected
    if (activeDomainId && activeDomain) {
      if (!email.to_email.endsWith(`@${activeDomain.domain}`)) {
        return false;
      }
    }
    
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(query) ||
      email.from_email.toLowerCase().includes(query) ||
      email.from_name?.toLowerCase().includes(query) ||
      email.body_text?.toLowerCase().includes(query)
    );
  });

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      await markAsRead(email.id);
    }
  };

  const handleToggleStar = async (id: string) => {
    await toggleStar(id);
    if (selectedEmail?.id === id) {
      setSelectedEmail(prev => prev ? { ...prev, is_starred: !prev.is_starred } : null);
    }
  };

  const handleArchive = async () => {
    if (!selectedEmail) return;
    await archiveEmail(selectedEmail.id);
    setSelectedEmail(null);
    toast({ title: 'Conversation archived' });
  };

  const handleDelete = async () => {
    if (!selectedEmail) return;
    await moveToTrash(selectedEmail.id);
    setSelectedEmail(null);
    toast({ title: 'Conversation moved to Trash' });
  };

  const handleSendEmail = async (email: { to_email: string; subject: string; body_text: string; from_email: string }) => {
    const { error } = await sendEmail({
      ...email,
      from_name: 'Me',
    });
    
    if (error) {
      throw error;
    }
  };

  const webhookUrl = `${supabaseUrl}/functions/v1/receive-email`;

  const handleMobileFolderChange = (folder: string) => {
    setActiveFolder(folder);
    setSelectedEmail(null);
    setIsMobileSidebarOpen(false);
  };

  const handleMobileCompose = () => {
    setIsComposeOpen(true);
    setIsMobileSidebarOpen(false);
  };

  const handleMobileSettings = () => {
    setIsSettingsOpen(true);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Header Bar - Gmail style */}
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden h-10 w-10"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          {/* Logo */}
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">F</span>
            </div>
            <span className="text-xl font-display text-foreground hidden sm:block">FlowMail</span>
          </div>

          {/* Mobile Domain Selector */}
          {domains.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden gap-1 text-xs px-2">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="max-w-[80px] truncate">
                    {activeDomain ? activeDomain.domain : 'All'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setActiveDomainId(null)}>
                  All Domains
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {domains.map((domain) => (
                  <DropdownMenuItem 
                    key={domain.id}
                    onClick={() => setActiveDomainId(domain.id)}
                  >
                    {domain.domain}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl mx-2 sm:mx-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search mail"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 h-12 bg-secondary border-0 rounded-full text-sm placeholder:text-muted-foreground focus-visible:bg-card focus-visible:shadow-md focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button variant="ghost" size="icon" onClick={refetch} disabled={loading} className="h-10 w-10 text-muted-foreground hover:text-foreground">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground hidden sm:flex">
            <HelpCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="h-10 w-10 text-muted-foreground hover:text-foreground">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Avatar className="w-8 h-8 ml-2 cursor-pointer">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              U
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            activeFolder={activeFolder}
            onFolderChange={(folder) => {
              setActiveFolder(folder);
              setSelectedEmail(null);
            }}
            onCompose={() => setIsComposeOpen(true)}
            onSettingsClick={() => setIsSettingsOpen(true)}
            unreadCount={unreadCount}
            domains={domains}
            activeDomain={activeDomainId}
            onDomainChange={setActiveDomainId}
          />
        </div>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetContent side="left" className="p-0 w-72">
            <Sidebar
              activeFolder={activeFolder}
              onFolderChange={handleMobileFolderChange}
              onCompose={handleMobileCompose}
              onSettingsClick={handleMobileSettings}
              unreadCount={unreadCount}
              domains={domains}
              activeDomain={activeDomainId}
              onDomainChange={(id) => {
                setActiveDomainId(id);
                setIsMobileSidebarOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {isSettingsOpen ? (
            <DomainSettings 
              onClose={() => setIsSettingsOpen(false)} 
              webhookUrl={webhookUrl}
            />
          ) : (
            <div className="flex-1 flex min-h-0">
              {/* Single Panel Layout - Either Email List OR Email View */}
              {!selectedEmail ? (
                // Full width inbox list when no email selected
                <div className="w-full flex flex-col bg-card">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium capitalize">{activeFolder}</span>
                      {activeDomain && (
                        <Badge variant="secondary" className="text-xs">
                          {activeDomain.domain}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {filteredEmails.length} {filteredEmails.length === 1 ? 'email' : 'emails'}
                    </span>
                  </div>
                  <EmailList
                    emails={filteredEmails}
                    selectedId={selectedEmail?.id}
                    onSelect={handleSelectEmail}
                    onToggleStar={handleToggleStar}
                    loading={loading}
                  />
                </div>
              ) : (
                // Full width email view when email selected
                <div className="w-full flex flex-col">
                  <EmailView
                    email={selectedEmail}
                    onBack={() => setSelectedEmail(null)}
                    onToggleStar={() => handleToggleStar(selectedEmail.id)}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                    onReply={() => setIsComposeOpen(true)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Floating Compose Button */}
      {!selectedEmail && !isSettingsOpen && (
        <Button
          onClick={() => setIsComposeOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90 z-40"
          size="icon"
        >
          <Pencil className="w-6 h-6" />
        </Button>
      )}

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendEmail}
        replyTo={selectedEmail ? {
          to: selectedEmail.from_email,
          subject: selectedEmail.subject,
          originalBody: selectedEmail.body_text || undefined,
        } : undefined}
        defaultFrom={allEmailAddresses.length > 0 ? `${allEmailAddresses[0].local_part}@${allEmailAddresses[0].domain}` : undefined}
        emailAddresses={allEmailAddresses}
      />
    </div>
  );
};

export default Index;
