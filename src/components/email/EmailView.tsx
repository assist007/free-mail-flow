import { format } from 'date-fns';
import { useMemo } from 'react';
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
  ReplyAll
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

interface EmailViewProps {
  email: Email;
  onBack: () => void;
  onToggleStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onReply: () => void;
}

export function EmailView({ 
  email, 
  onBack, 
  onToggleStar, 
  onArchive, 
  onDelete,
  onReply 
}: EmailViewProps) {
  const senderName = email.from_name || email.from_email.split('@')[0];
  const senderInitials = senderName.slice(0, 1).toUpperCase();
  const formattedDate = format(new Date(email.received_at), 'MMM d, yyyy, h:mm a');

  // Parse email body to extract clean content
  const { text: cleanText, html: cleanHtml } = useMemo(
    () => parseEmailBody(email.body_text, email.body_html),
    [email.body_text, email.body_html]
  );

  // Generate a consistent color based on sender name
  const colors = [
    'bg-red-500', 'bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 
    'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-green-500',
    'bg-orange-500', 'bg-amber-500'
  ];
  const colorIndex = senderName.charCodeAt(0) % colors.length;
  const avatarColor = colors[colorIndex];

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center px-2 sm:px-4 py-2 border-b border-border bg-card gap-1">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-1 h-10 w-10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={onArchive} className="h-10 w-10 text-muted-foreground hover:text-foreground">
          <Archive className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-10 w-10 text-muted-foreground hover:text-foreground">
          <Trash2 className="w-5 h-5" />
        </Button>
        
        <div className="flex-1" />
        
        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground hidden sm:flex">
          <Printer className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground hidden sm:flex">
          <ExternalLink className="w-5 h-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Mark as unread</DropdownMenuItem>
            <DropdownMenuItem>Add star</DropdownMenuItem>
            <DropdownMenuItem>Create filter</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mute</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Report spam</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Email Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto">
          {/* Subject */}
          <div className="flex items-start justify-between gap-4 px-4 sm:px-6 pt-6 pb-4">
            <h1 className="text-xl sm:text-2xl font-display font-normal text-foreground leading-tight">
              {email.subject}
            </h1>
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

          {/* Sender Info */}
          <div className="flex items-start gap-3 sm:gap-4 px-4 sm:px-6 pb-6">
            <Avatar className={cn("w-10 h-10 shrink-0", avatarColor)}>
              <AvatarFallback className="text-white font-medium text-base">
                {senderInitials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm text-foreground truncate">{senderName}</span>
                  <span className="text-sm text-muted-foreground truncate">&lt;{email.from_email}&gt;</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formattedDate}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                to {email.to_email.split('@')[0]}
              </p>
            </div>
          </div>

          {/* Email Body */}
          <div className="px-4 sm:px-6 pb-8 overflow-hidden w-full">
            <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed overflow-hidden break-words w-full">
              {cleanHtml ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: cleanHtml }}
                  className="email-content overflow-x-auto break-words [&_*]:max-w-full [&_*]:overflow-wrap-anywhere [&_*]:word-break-break-word [&_img]:max-w-full [&_img]:h-auto [&_table]:max-w-full [&_table]:table-fixed [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_p]:break-words [&_span]:break-words [&_div]:break-words"
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{cleanText}</div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Reply Actions */}
      <div className="border-t border-border p-4 bg-card">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <Button 
            onClick={onReply} 
            variant="outline"
            className="gap-2 rounded-full px-6 text-sm font-medium"
          >
            <Reply className="w-4 h-4" />
            Reply
          </Button>
          <Button 
            variant="outline"
            className="gap-2 rounded-full px-6 text-sm font-medium"
          >
            <Forward className="w-4 h-4" />
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
}