import { useState, useEffect } from 'react';
import { Search, RefreshCw, Moon, Sun } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/email/Sidebar';
import { EmailList } from '@/components/email/EmailList';
import { EmailView } from '@/components/email/EmailView';
import { ComposeModal } from '@/components/email/ComposeModal';
import { DomainSettings } from '@/components/email/DomainSettings';
import { useEmails } from '@/hooks/useEmails';
import { Email } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(true);
  
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

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/receive-email`;

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
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
              <div className={`w-full md:w-96 border-r border-border flex flex-col ${selectedEmail ? 'hidden md:flex' : ''}`}>
                <div className="px-4 py-3 border-b border-border">
                  <h1 className="text-lg font-semibold capitalize">{activeFolder}</h1>
                  <p className="text-sm text-muted-foreground">
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
              <div className={`flex-1 ${!selectedEmail ? 'hidden md:flex' : 'flex'}`}>
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
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <Search className="w-10 h-10 opacity-50" />
                      </div>
                      <p className="text-lg font-medium">Select an email to read</p>
                      <p className="text-sm mt-1">Choose an email from the list</p>
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
