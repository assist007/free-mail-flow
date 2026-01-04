import { formatDistanceToNow } from 'date-fns';
import { Star, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Email } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface EmailListProps {
  emails: Email[];
  selectedId?: string;
  onSelect: (email: Email) => void;
  onToggleStar: (id: string) => void;
  loading?: boolean;
}

export function EmailList({ 
  emails, 
  selectedId, 
  onSelect, 
  onToggleStar,
  loading 
}: EmailListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse space-y-3 w-full px-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Star className="w-8 h-8" />
          </div>
          <p className="text-lg font-medium">No emails yet</p>
          <p className="text-sm mt-1">Your inbox is empty</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y divide-border">
        {emails.map((email) => (
          <EmailListItem
            key={email.id}
            email={email}
            isSelected={selectedId === email.id}
            onSelect={() => onSelect(email)}
            onToggleStar={() => onToggleStar(email.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
}

function EmailListItem({ email, isSelected, onSelect, onToggleStar }: EmailListItemProps) {
  const senderName = email.from_name || email.from_email.split('@')[0];
  const preview = email.body_text?.slice(0, 100) || email.body_html?.replace(/<[^>]*>/g, '').slice(0, 100) || '';
  const timeAgo = formatDistanceToNow(new Date(email.received_at), { addSuffix: true });

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group px-4 py-3.5 cursor-pointer transition-all duration-200 hover:bg-accent/50",
        isSelected && "bg-accent",
        !email.is_read && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Checkbox onClick={(e) => e.stopPropagation()} />
        </div>

        {/* Star */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          className="pt-1 transition-colors"
        >
          <Star
            className={cn(
              "w-4 h-4 transition-colors",
              email.is_starred
                ? "fill-warning text-warning"
                : "text-muted-foreground hover:text-foreground"
            )}
          />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={cn(
              "text-sm truncate",
              !email.is_read ? "font-semibold text-foreground" : "text-foreground/80"
            )}>
              {senderName}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {timeAgo}
            </span>
          </div>
          
          <h4 className={cn(
            "text-sm truncate mb-1",
            !email.is_read ? "font-medium text-foreground" : "text-foreground/80"
          )}>
            {email.subject}
          </h4>
          
          <p className="text-xs text-muted-foreground truncate">
            {preview}
          </p>
        </div>

        {/* Attachment indicator */}
        {/* We'll add attachment check later */}
      </div>
    </div>
  );
}
