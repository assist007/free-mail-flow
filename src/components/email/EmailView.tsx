import { format } from 'date-fns';
import { useMemo, useState } from 'react';
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
  ChevronDown,
  ChevronUp
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

interface EmailViewProps {
  email: Email;
  onBack: () => void;
  onToggleStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onReply: () => void;
}

interface ConversationMessage {
  type: 'sent' | 'received';
  from: string;
  fromEmail: string;
  to: string;
  content: string;
  date: string;
  rawDate: Date;
}

// Parse conversation thread from email body
function parseConversation(email: Email): ConversationMessage[] {
  const { text: cleanText } = parseEmailBody(email.body_text, email.body_html);
  const messages: ConversationMessage[] = [];
  
  if (!cleanText) {
    // Just the main email content
    const mainParsed = parseEmailBody(email.body_text, email.body_html);
    messages.push({
      type: 'received',
      from: email.from_name || email.from_email.split('@')[0],
      fromEmail: email.from_email,
      to: email.to_email,
      content: mainParsed.text || '',
      date: format(new Date(email.received_at), "MMM d, yyyy 'at' h:mm a"),
      rawDate: new Date(email.received_at)
    });
    return messages;
  }
  
  // Split by "On ... wrote:" pattern to extract conversation
  const threadPattern = /On\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*(?:AM|PM)?,?\s*([^<\n]+)?(?:<([^>]+)>)?\s*wrote:/gi;
  
  const parts = cleanText.split(threadPattern);
  
  if (parts.length <= 1) {
    // No thread pattern found, just single message
    messages.push({
      type: email.from_email.includes('aibd') ? 'sent' : 'received',
      from: email.from_name || email.from_email.split('@')[0],
      fromEmail: email.from_email,
      to: email.to_email,
      content: cleanText.replace(/^>+\s*/gm, '').trim(),
      date: format(new Date(email.received_at), "MMM d, yyyy 'at' h:mm a"),
      rawDate: new Date(email.received_at)
    });
    return messages;
  }
  
  // First part is the latest message
  const latestContent = parts[0].trim();
  if (latestContent) {
    messages.push({
      type: email.from_email.includes('aibd') ? 'sent' : 'received',
      from: email.from_name || email.from_email.split('@')[0],
      fromEmail: email.from_email,
      to: email.to_email,
      content: latestContent.replace(/^>+\s*/gm, '').trim(),
      date: format(new Date(email.received_at), "MMM d, yyyy 'at' h:mm a"),
      rawDate: new Date(email.received_at)
    });
  }
  
  // Parse quoted messages - look for lines starting with >
  const quotedPattern = /On\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?),?\s*([^<\n]+)?(?:<([^>]+)>)?\s*wrote:\s*\n([\s\S]*?)(?=On\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)|$)/gi;
  
  let match;
  while ((match = quotedPattern.exec(cleanText)) !== null) {
    const dateStr = match[1];
    const timeStr = match[2];
    const senderName = match[3]?.trim() || '';
    const senderEmail = match[4] || '';
    let content = match[5] || '';
    
    // Clean quoted content (remove > prefixes)
    content = content
      .split('\n')
      .map(line => line.replace(/^>+\s*/, ''))
      .filter(line => line.trim())
      .join('\n')
      .trim();
    
    if (content) {
      const isSent = senderEmail.includes('aibd') || senderName.toLowerCase().includes('me');
      messages.push({
        type: isSent ? 'sent' : 'received',
        from: senderName || senderEmail.split('@')[0] || 'Unknown',
        fromEmail: senderEmail,
        to: isSent ? email.from_email : email.to_email,
        content,
        date: `${dateStr} at ${timeStr}`,
        rawDate: new Date(`${dateStr} ${timeStr}`)
      });
    }
  }
  
  // Sort by date ascending (oldest first)
  messages.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  
  return messages;
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

// Single message bubble component - Messenger style
function MessageBubble({ 
  message, 
  isExpanded, 
  onToggle,
  isLast,
  showAvatar
}: { 
  message: ConversationMessage; 
  isExpanded: boolean; 
  onToggle: () => void;
  isLast: boolean;
  showAvatar: boolean;
}) {
  const isSent = message.type === 'sent';
  const initials = message.from.slice(0, 2).toUpperCase();
  const avatarColor = getAvatarColor(message.from);
  
  return (
    <div className={cn(
      "flex gap-2 px-4 mb-1",
      isSent ? "justify-end" : "justify-start"
    )}>
      {/* Avatar - Left side for received */}
      {!isSent && (
        <div className="w-8 shrink-0 flex items-end">
          {showAvatar && (
            <Avatar className={cn("w-8 h-8 shadow-lg", avatarColor)}>
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
            "text-xs text-muted-foreground mb-1 px-3",
            isSent ? "text-right" : "text-left"
          )}>
            {isSent ? 'You' : message.from} • {message.date}
          </span>
        )}
        
        {/* Message Bubble */}
        <div 
          onClick={onToggle}
          className={cn(
            "px-4 py-2.5 cursor-pointer transition-all",
            isSent 
              ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl rounded-br-md shadow-md shadow-primary/20" 
              : "bg-muted text-foreground rounded-2xl rounded-bl-md shadow-sm",
            "hover:shadow-lg"
          )}
        >
          {(isExpanded || isLast) ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/80">
              {message.content.slice(0, 50)}...
            </p>
          )}
        </div>
        
        {/* Time for individual messages when not showing avatar */}
        {!showAvatar && isLast && (
          <span className={cn(
            "text-[10px] text-muted-foreground mt-1 px-3",
            isSent ? "text-right" : "text-left"
          )}>
            {message.date}
          </span>
        )}
      </div>
      
      {/* Avatar - Right side for sent (hidden, just for spacing) */}
      {isSent && <div className="w-8 shrink-0" />}
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
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  
  // Fetch attachments for this email
  const { attachments, getPublicUrl, isImage, formatFileSize } = useAttachments(email.id);

  // Parse conversation thread
  const messages = useMemo(() => parseConversation(email), [email]);
  
  // Toggle message expansion
  const toggleMessage = (index: number) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMessages(newExpanded);
  };
  
  // Expand all messages
  const expandAll = () => {
    setExpandedMessages(new Set(messages.map((_, i) => i)));
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-x-hidden box-border">
      {/* Toolbar */}
      <div className="flex items-center px-2 py-2 border-b border-border bg-card gap-1 w-full box-border shrink-0">
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
            <DropdownMenuItem onClick={expandAll}>Expand all messages</DropdownMenuItem>
            <DropdownMenuItem>Create filter</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mute</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Report spam</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Email Content */}
      <ScrollArea className="flex-1 w-full overflow-x-hidden">
        <div className="w-full box-border px-3 sm:px-4 md:px-6 py-3">
          {/* Subject Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground leading-tight">
                {email.subject}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {messages.length} message{messages.length !== 1 ? 's' : ''} in this conversation
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleStar}
              className="shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground"
            >
              <Star className={cn(
                "w-5 h-5",
                email.is_starred ? "fill-warning text-warning" : ""
              )} />
            </Button>
          </div>

          {/* Conversation Thread - Messenger Style */}
          <div className="py-4 space-y-1 bg-gradient-to-b from-card to-background rounded-2xl border border-border/30 shadow-inner min-h-[200px]">
            {messages.map((message, index) => {
              // Show avatar if it's first message or different sender than previous
              const showAvatar = index === 0 || messages[index - 1].type !== message.type;
              return (
                <MessageBubble
                  key={index}
                  message={message}
                  isExpanded={expandedMessages.has(index)}
                  onToggle={() => toggleMessage(index)}
                  isLast={index === messages.length - 1}
                  showAvatar={showAvatar}
                />
              );
            })}
          </div>

          {/* Attachments Grid */}
          <AttachmentGrid
            attachments={attachments}
            getPublicUrl={getPublicUrl}
            isImage={isImage}
            formatFileSize={formatFileSize}
          />
        </div>
      </ScrollArea>

      {/* Reply Actions */}
      <div className="border-t border-border p-3 bg-card shrink-0 w-full box-border">
        <div className="flex items-center gap-2 w-full">
          <Button 
            onClick={onReply} 
            variant="outline"
            className="gap-2 rounded-full px-4 sm:px-6 text-sm font-medium flex-1 sm:flex-none hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Reply className="w-4 h-4 shrink-0" />
            <span>Reply</span>
          </Button>
          <Button 
            variant="outline"
            className="gap-2 rounded-full px-4 sm:px-6 text-sm font-medium flex-1 sm:flex-none hover:bg-muted transition-colors"
          >
            <Forward className="w-4 h-4 shrink-0" />
            <span>Forward</span>
          </Button>
        </div>
      </div>
    </div>
  );
}