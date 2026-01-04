import { format } from 'date-fns';
import { 
  Star, 
  Archive, 
  Trash2, 
  Reply, 
  Forward, 
  MoreHorizontal,
  ArrowLeft,
  Paperclip
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Email } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  const senderInitials = senderName.slice(0, 2).toUpperCase();
  const formattedDate = format(new Date(email.received_at), 'MMMM d, yyyy \'at\' h:mm a');

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-border gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={onBack} className="sm:hidden shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-sm sm:text-lg font-semibold truncate">{email.subject}</h2>
        </div>
        
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={onToggleStar} className="h-8 w-8 sm:h-10 sm:w-10">
            <Star className={cn(
              "w-4 h-4 sm:w-5 sm:h-5",
              email.is_starred ? "fill-warning text-warning" : ""
            )} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onArchive} className="h-8 w-8 sm:h-10 sm:w-10 hidden xs:flex">
            <Archive className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 sm:h-10 sm:w-10 hidden xs:flex">
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Mark as unread</DropdownMenuItem>
              <DropdownMenuItem>Add label</DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive} className="xs:hidden">Archive</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="xs:hidden text-destructive">Delete</DropdownMenuItem>
              <DropdownMenuItem>Report spam</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Email Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6">
          {/* Sender Info */}
          <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm sm:text-base">
                {senderInitials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{senderName}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{email.from_email}</p>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {formattedDate}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                To: {email.to_email}
              </p>
            </div>
          </div>

          {/* Email Body */}
          <div className="prose prose-sm max-w-none dark:prose-invert text-sm sm:text-base">
            {email.body_html ? (
              <div 
                dangerouslySetInnerHTML={{ __html: email.body_html }}
                className="email-content overflow-x-auto"
              />
            ) : (
              <div className="whitespace-pre-wrap break-words">{email.body_text}</div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Reply Bar */}
      <div className="border-t border-border p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Button onClick={onReply} className="gap-2 text-sm flex-1 sm:flex-none">
            <Reply className="w-4 h-4" />
            Reply
          </Button>
          <Button variant="outline" className="gap-2 text-sm flex-1 sm:flex-none">
            <Forward className="w-4 h-4" />
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
}
