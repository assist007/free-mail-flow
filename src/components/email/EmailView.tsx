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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold truncate max-w-md">{email.subject}</h2>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onToggleStar}>
            <Star className={cn(
              "w-5 h-5",
              email.is_starred ? "fill-warning text-warning" : ""
            )} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onArchive}>
            <Archive className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Mark as unread</DropdownMenuItem>
              <DropdownMenuItem>Add label</DropdownMenuItem>
              <DropdownMenuItem>Report spam</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Email Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Sender Info */}
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {senderInitials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground">{senderName}</h3>
                  <p className="text-sm text-muted-foreground">{email.from_email}</p>
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {formattedDate}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                To: {email.to_email}
              </p>
            </div>
          </div>

          {/* Email Body */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {email.body_html ? (
              <div 
                dangerouslySetInnerHTML={{ __html: email.body_html }}
                className="email-content"
              />
            ) : (
              <div className="whitespace-pre-wrap">{email.body_text}</div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Reply Bar */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2">
          <Button onClick={onReply} className="gap-2">
            <Reply className="w-4 h-4" />
            Reply
          </Button>
          <Button variant="outline" className="gap-2">
            <Forward className="w-4 h-4" />
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
}
