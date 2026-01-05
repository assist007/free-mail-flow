import { format } from 'date-fns';
import { useMemo, useState, useEffect } from 'react';
import { 
  Star, 
  Archive, 
  Trash2, 
  Reply, 
  Forward, 
  MoreVertical,
  ArrowLeft,
  Printer,
  ExternalLink,
  Check,
  CheckCheck,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseEmailBody } from '@/lib/email-parser';
import { Email } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAttachments } from '@/hooks/useAttachments';
import { AttachmentGrid } from '@/components/email/AttachmentGrid';
import { useThreadEmails } from '@/hooks/useThreadEmails';

interface EmailViewProps {
  email: Email;
  onBack: () => void;
  onToggleStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onReply: () => void;
}

// Get avatar color based on name
function getAvatarColor(name: string): string {
  const colors = [
    'bg-gradient-to-br from-rose-400 to-pink-500', 
    'bg-gradient-to-br from-violet-400 to-purple-500', 
    'bg-gradient-to-br from-blue-400 to-indigo-500', 
    'bg-gradient-to-br from-cyan-400 to-teal-500', 
    'bg-gradient-to-br from-emerald-400 to-green-500',
    'bg-gradient-to-br from-amber-400 to-orange-500'
  ];
  const colorIndex = (name || 'U').charCodeAt(0) % colors.length;
  return colors[colorIndex];
}

// Extract clean message content from email
function getCleanContent(email: Email): string {
  const { text } = parseEmailBody(email.body_text, email.body_html);
  if (!text) return '';
  
  // Remove quoted content (lines starting with > or "On ... wrote:" pattern and everything after)
  const quotedPattern = /On\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\s+at\s+\d{1,2}:\d{2}[\s\S]*$/gi;
  let cleanText = text.replace(quotedPattern, '').trim();
  
  // Also remove lines starting with >
  cleanText = cleanText.split('\n')
    .filter(line => !line.trim().startsWith('>'))
    .join('\n')
    .trim();
  
  return cleanText;
}

// Determine if email is sent by the user (based on common patterns)
function isSentByUser(email: Email, userDomains: string[] = ['aibd']): boolean {
  if (email.is_sent) return true;
  // Check if from_email contains user domain patterns
  return userDomains.some(domain => email.from_email.toLowerCase().includes(domain));
}

// Single message bubble component - Messenger style
function MessageBubble({ 
  email, 
  showAvatar,
  isLast
}: { 
  email: Email; 
  showAvatar: boolean;
  isLast: boolean;
}) {
  const isSent = isSentByUser(email);
  const senderName = email.from_name || email.from_email.split('@')[0];
  const initials = senderName.slice(0, 2).toUpperCase();
  const avatarColor = getAvatarColor(senderName);
  const content = getCleanContent(email);
  const formattedDate = format(new Date(email.received_at), "MMM d, h:mm a");
  
  if (!content) return null;
  
  return (
    <div className={cn(
      "flex gap-2 px-4",
      showAvatar ? "mb-3" : "mb-1",
      isSent ? "justify-end" : "justify-start"
    )}>
      {/* Avatar - Left side for received */}
      {!isSent && (
        <div className="w-9 shrink-0 flex items-end">
          {showAvatar && (
            <Avatar className={cn("w-9 h-9 shadow-lg ring-2 ring-background", avatarColor)}>
              <AvatarFallback className="text-white font-semibold text-xs bg-transparent">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
      
      {/* Message Content */}
      <div className={cn(
        "max-w-[75%] flex flex-col",
        isSent ? "items-end" : "items-start"
      )}>
        {/* Sender name - only show on first message of a group */}
        {showAvatar && (
          <span className={cn(
            "text-xs text-muted-foreground mb-1.5 px-1 font-medium",
            isSent ? "text-right" : "text-left"
          )}>
            {isSent ? 'You' : senderName}
          </span>
        )}
        
        {/* Message Bubble */}
        <div 
          className={cn(
            "px-4 py-3 transition-all relative group",
            isSent 
              ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground rounded-2xl rounded-br-sm shadow-lg shadow-primary/25" 
              : "bg-muted/80 text-foreground rounded-2xl rounded-bl-sm shadow-md border border-border/50",
            "hover:shadow-xl"
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
          
          {/* Timestamp tooltip on hover */}
          <div className={cn(
            "absolute -bottom-5 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap",
            isSent ? "right-0" : "left-0"
          )}>
            {formattedDate}
          </div>
        </div>
        
        {/* Message status for sent messages */}
        {isSent && isLast && (
          <div className="flex items-center gap-1 mt-1.5 px-1">
            <CheckCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
          </div>
        )}
      </div>
      
      {/* Avatar - Right side for sent */}
      {isSent && (
        <div className="w-9 shrink-0 flex items-end">
          {showAvatar && (
            <Avatar className="w-9 h-9 shadow-lg ring-2 ring-background bg-gradient-to-br from-primary to-primary/80">
              <AvatarFallback className="text-primary-foreground font-semibold text-xs bg-transparent">
                Me
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
    </div>
  );
}

export function EmailView({ 
  email, 
  onBack, 
  onToggleStar, 
  onArchive, 
  onDelete,
  onReply 
}: EmailViewProps) {
  // Fetch all emails in this thread
  const { threadEmails, loading, refetch } = useThreadEmails(email.thread_id);
  
  // Use thread emails if available, otherwise just the single email
  const displayEmails = useMemo(() => {
    if (threadEmails.length > 0) {
      return threadEmails;
    }
    return [email];
  }, [threadEmails, email]);
  
  // Fetch attachments for this email
  const { attachments, getPublicUrl, isImage, formatFileSize } = useAttachments(email.id);

  // Refetch when thread_id changes (e.g., after sending a reply)
  useEffect(() => {
    if (email.thread_id) {
      refetch();
    }
  }, [email.thread_id, refetch]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [displayEmails.length]);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-x-hidden box-border">
      {/* Toolbar */}
      <div className="flex items-center px-2 py-2 border-b border-border bg-card/95 backdrop-blur-sm gap-1 w-full box-border shrink-0 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-1 h-9 w-9 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={onArchive} className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
          <Archive className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
          <Trash2 className="w-5 h-5" />
        </Button>
        
        <div className="flex-1 min-w-0" />
        
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hidden sm:flex">
          <Printer className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hidden sm:flex">
          <ExternalLink className="w-5 h-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Mark as unread</DropdownMenuItem>
            <DropdownMenuItem onClick={refetch}>Refresh thread</DropdownMenuItem>
            <DropdownMenuItem>Create filter</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mute</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Report spam</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Email Content */}
      <ScrollArea className="flex-1 w-full overflow-x-hidden">
        <div className="w-full box-border">
          {/* Subject Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-card/50 sticky top-0 backdrop-blur-sm">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground leading-tight truncate">
                {email.subject}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {displayEmails.length} message{displayEmails.length !== 1 ? 's' : ''} in conversation
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleStar}
              className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <Star className={cn(
                "w-5 h-5 transition-all",
                email.is_starred ? "fill-warning text-warning scale-110" : ""
              )} />
            </Button>
          </div>

          {/* Conversation Thread - Messenger Style */}
          <div className="py-6 space-y-1 min-h-[300px] bg-gradient-to-b from-background via-muted/10 to-background">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              displayEmails.map((threadEmail, index) => {
                // Show avatar if it's first message or different sender than previous
                const prevEmail = displayEmails[index - 1];
                const showAvatar = index === 0 || 
                  isSentByUser(threadEmail) !== isSentByUser(prevEmail);
                
                return (
                  <MessageBubble
                    key={threadEmail.id}
                    email={threadEmail}
                    showAvatar={showAvatar}
                    isLast={index === displayEmails.length - 1}
                  />
                );
              })
            )}
          </div>

          {/* Attachments Grid */}
          <div className="px-4 pb-4">
            <AttachmentGrid
              attachments={attachments}
              getPublicUrl={getPublicUrl}
              isImage={isImage}
              formatFileSize={formatFileSize}
            />
          </div>
        </div>
      </ScrollArea>

      {/* Reply Actions */}
      <div className="border-t border-border p-3 bg-card/95 backdrop-blur-sm shrink-0 w-full box-border">
        <div className="flex items-center gap-2 w-full">
          <Button 
            onClick={onReply} 
            className="gap-2 rounded-full px-6 text-sm font-medium flex-1 sm:flex-none bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Reply className="w-4 h-4 shrink-0" />
            <span>Reply</span>
          </Button>
          <Button 
            variant="outline"
            className="gap-2 rounded-full px-6 text-sm font-medium flex-1 sm:flex-none hover:bg-muted transition-colors"
          >
            <Forward className="w-4 h-4 shrink-0" />
            <span>Forward</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
