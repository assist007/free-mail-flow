import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Star } from 'lucide-react';
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

function formatEmailDate(date: Date): string {
  if (isToday(date)) {
    return format(date, 'h:mm a');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else {
    return format(date, 'MMM d');
  }
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
        <div className="animate-pulse space-y-0 w-full">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 border-b border-border bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center px-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Star className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-display font-medium text-foreground">No emails</p>
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
  const formattedDate = formatEmailDate(new Date(email.received_at));

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex items-center px-2 sm:px-3 py-2 cursor-pointer transition-colors min-w-0",
        "hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)]",
        isSelected && "bg-accent",
        !email.is_read ? "bg-card" : "bg-background"
      )}
    >
      {/* Checkbox (desktop only) */}
      <div className="hidden sm:block pr-2 sm:pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Checkbox onClick={(e) => e.stopPropagation()} className="rounded-sm" />
      </div>

      {/* Star */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar();
        }}
        className="pr-2 sm:pr-3 transition-colors shrink-0"
      >
        <Star
          className={cn(
            "w-5 h-5 transition-colors",
            email.is_starred
              ? "fill-warning text-warning"
              : "text-muted-foreground/50 hover:text-muted-foreground"
          )}
        />
      </button>

      {/* Mobile layout */}
      <div className="sm:hidden flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
              !email.is_read ? "font-semibold text-foreground" : "text-foreground/70"
            )}
          >
            {senderName}
          </span>
          <span
            className={cn(
              "text-xs whitespace-nowrap shrink-0",
              !email.is_read ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            {formattedDate}
          </span>
        </div>
        <div className="mt-0.5">
          <span
            className={cn(
              "block truncate text-sm",
              !email.is_read ? "font-semibold text-foreground" : "text-foreground/70"
            )}
          >
            {email.subject}
          </span>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:flex flex-1 min-w-0 items-center">
        {/* Sender */}
        <div
          className={cn(
            "w-48 shrink-0 pr-3 truncate text-sm",
            !email.is_read ? "font-semibold text-foreground" : "text-foreground/70"
          )}
        >
          {senderName}
        </div>

        {/* Subject & Preview */}
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <span
            className={cn(
              "truncate text-sm",
              !email.is_read ? "font-semibold text-foreground" : "text-foreground/70"
            )}
          >
            {email.subject}
          </span>
          <span className="text-muted-foreground mx-1 hidden sm:inline">-</span>
          <span className="text-sm text-muted-foreground truncate hidden sm:block">{preview}</span>
        </div>

        {/* Date */}
        <div
          className={cn(
            "pl-3 text-xs whitespace-nowrap shrink-0",
            !email.is_read ? "font-semibold text-foreground" : "text-muted-foreground"
          )}
        >
          {formattedDate}
        </div>
      </div>
    </div>
  );
}