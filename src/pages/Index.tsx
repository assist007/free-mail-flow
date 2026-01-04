import { useState, useEffect } from 'react';
import { Search, RefreshCw, Moon, Sun, Menu, X } from 'lucide-react';
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const Index = () => {
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(true);
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
    toast({ title: 'Email archived' });
  };

  const handleDelete = async () => {
    if (!selectedEmail) return;
    await moveToTrash(selectedEmail.id);
    setSelectedEmail(null);
    toast({ title: 'Moved to trash' });
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
    <div className="h-screen flex bg-background">
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
        <SheetContent side="left" className="p-0 w-64">
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
        {/* Top Bar */}
        <header className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-border bg-card gap-2">
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden shrink-0"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background text-sm"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={refetch} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </header>

        {/* Email Area */}
        <div className="flex-1 flex min-h-0">
          {isSettingsOpen ? (
            <DomainSettings 
              onClose={() => setIsSettingsOpen(false)} 
              webhookUrl={webhookUrl}
            />
          ) : (
            <>
              {/* Email List */}
              <div className={`w-full sm:w-80 md:w-96 border-r border-border flex flex-col ${selectedEmail ? 'hidden sm:flex' : ''}`}>
                <div className="px-3 sm:px-4 py-3 border-b border-border">
                  <h1 className="text-base sm:text-lg font-semibold capitalize">{activeFolder}</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {filteredEmails.length} {filteredEmails.length === 1 ? 'email' : 'emails'}
                  </p>
                </div>
                <EmailList
                  emails={filteredEmails}
                  selectedId={selectedEmail?.id}
                  onSelect={handleSelectEmail}
                  onToggleStar={handleToggleStar}
                  loading={loading}
                />
              </div>

              {/* Email View */}
              <div className={`flex-1 ${!selectedEmail ? 'hidden sm:flex' : 'flex'}`}>
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
                  <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
                    <div className="text-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <Search className="w-8 h-8 sm:w-10 sm:h-10 opacity-50" />
                      </div>
                      <p className="text-base sm:text-lg font-medium">Select an email to read</p>
                      <p className="text-xs sm:text-sm mt-1">Choose an email from the list</p>
                    </div>
                  </div>
                )}
              </div>
            </>
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
