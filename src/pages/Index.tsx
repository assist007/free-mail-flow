import { useState, useEffect } from 'react';
import { Search, RefreshCw, Moon, Sun, Menu, Settings, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/email/Sidebar';
import { EmailList } from '@/components/email/EmailList';
import { EmailView } from '@/components/email/EmailView';
import { ComposeModal } from '@/components/email/ComposeModal';
import { DomainSettings } from '@/components/email/DomainSettings';
import { useEmails } from '@/hooks/useEmails';
import { Email, supabaseUrl } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const Index = () => {
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const { toast } = useToast();
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

  // Calculate unread count
  const unreadCount = emails.filter(e => !e.is_read).length;

  // Filter emails by search
  const filteredEmails = emails.filter(email => {
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
              {/* Email List - Full width on mobile when no email selected */}
              <div className={`w-full lg:w-80 xl:w-[420px] 2xl:w-[480px] border-r border-border flex flex-col bg-card ${selectedEmail ? 'hidden lg:flex' : 'flex'}`}>
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium capitalize">{activeFolder}</span>
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

              {/* Email View - Full width on mobile when email selected */}
              <div className={`flex-1 ${!selectedEmail ? 'hidden lg:flex' : 'flex'}`}>
                {selectedEmail ? (
                  <EmailView
                    email={selectedEmail}
                    onBack={() => setSelectedEmail(null)}
                    onToggleStar={() => handleToggleStar(selectedEmail.id)}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                    onReply={() => setIsComposeOpen(true)}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 bg-background">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                        <Search className="w-12 h-12 text-muted-foreground/40" />
                      </div>
                      <p className="text-lg font-display font-medium text-foreground">Select an item to read</p>
                      <p className="text-sm mt-2 text-muted-foreground">Nothing is selected</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
      />
    </div>
  );
};

export default Index;