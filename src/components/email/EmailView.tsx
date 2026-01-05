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
  ExternalLink
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

  // Fetch attachments for this email
  const { attachments, getPublicUrl, isImage, formatFileSize } = useAttachments(email.id);

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
            <DropdownMenuItem>Add star</DropdownMenuItem>
            <DropdownMenuItem>Create filter</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mute</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Report spam</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Email Content - Vertical scroll only */}
      <ScrollArea className="flex-1 w-full overflow-x-hidden">
        <div className="w-full max-w-4xl mx-auto box-border">
          {/* Subject */}
          <div className="flex items-start gap-2 px-3 sm:px-6 pt-4 pb-3 w-full box-border">
            <h1 className="flex-1 min-w-0 text-lg sm:text-xl font-display font-normal text-foreground leading-snug break-words">
              {email.subject}
            </h1>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleStar}
              className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <Star className={cn(
                "w-5 h-5",
                email.is_starred ? "fill-warning text-warning" : ""
              )} />
            </Button>
          </div>

          {/* Sender Info - Mobile optimized */}
          <div className="flex items-start gap-3 px-3 sm:px-6 pb-4 w-full box-border">
            <Avatar className={cn("w-9 h-9 sm:w-10 sm:h-10 shrink-0", avatarColor)}>
              <AvatarFallback className="text-white font-medium text-sm sm:text-base">
                {senderInitials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex flex-col gap-0.5 w-full">
                <div className="flex items-center gap-1 min-w-0 w-full">
                  <span className="font-medium text-sm text-foreground truncate max-w-[40%]">{senderName}</span>
                  <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">&lt;{email.from_email}&gt;</span>
                </div>
                <div className="flex items-center justify-between gap-2 w-full">
                  <p className="text-xs text-muted-foreground truncate">
                    to {email.to_email.split('@')[0]}
                  </p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Email Body - Fully responsive */}
          <div className="px-3 sm:px-6 pb-4 w-full box-border overflow-hidden">
            <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed w-full overflow-hidden">
              {cleanHtml ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: cleanHtml }}
                  className="email-content w-full"
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed break-words w-full">{cleanText}</div>
              )}
            </div>
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

      {/* Reply Actions - Mobile optimized */}
      <div className="border-t border-border p-3 bg-card shrink-0 w-full box-border">
        <div className="flex items-center gap-2 w-full">
          <Button 
            onClick={onReply} 
            variant="outline"
            className="gap-2 rounded-full px-4 sm:px-6 text-sm font-medium flex-1 sm:flex-none"
          >
            <Reply className="w-4 h-4 shrink-0" />
            <span>Reply</span>
          </Button>
          <Button 
            variant="outline"
            className="gap-2 rounded-full px-4 sm:px-6 text-sm font-medium flex-1 sm:flex-none"
          >
            <Forward className="w-4 h-4 shrink-0" />
            <span>Forward</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
