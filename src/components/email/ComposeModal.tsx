import { useState, useEffect } from 'react';
import { X, Send, Paperclip, Trash2, ChevronDown, FileIcon, Image, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { format } from 'date-fns';
import { parseEmailBody } from '@/lib/email-parser';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmailDomain, EmailAttachment } from '@/integrations/supabase/client';

const emailSchema = z.object({
  to: z.string().email('Please enter a valid email address'),
  subject: z.string().optional(),
  body: z.string().min(1, 'Message body is required'),
});

interface EmailAddressWithDomain {
  id: string;
  local_part: string;
  domain: string;
  display_name: string | null;
  status: 'pending' | 'active';
}

interface ForwardAttachment {
  filename: string;
  contentType: string;
  size: number;
  url: string;
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: { 
    to_email: string; 
    subject: string; 
    body_text: string; 
    from_email: string; 
    from_name?: string;
    in_reply_to?: string;
    references?: string[];
  }) => Promise<void>;
  replyTo?: {
    to: string;
    subject: string;
    messageId?: string;
    references?: string[];
    originalBody?: string;
    originalDate?: string;
    originalFrom?: string;
  };
  forwardData?: {
    subject: string;
    originalBody?: string;
    originalDate?: string;
    originalFrom?: string;
    originalTo?: string;
    attachments?: ForwardAttachment[];
  };
  defaultFrom?: string;
  emailAddresses?: EmailAddressWithDomain[];
}

export function ComposeModal({ isOpen, onClose, onSend, replyTo, forwardData, defaultFrom, emailAddresses = [] }: ComposeModalProps) {
  const { toast } = useToast();
  const [to, setTo] = useState(replyTo?.to || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [fromEmail, setFromEmail] = useState(defaultFrom || '');
  const [fromName, setFromName] = useState('');
  const [forwardAttachments, setForwardAttachments] = useState<ForwardAttachment[]>([]);

  // Determine if this is a forward or reply
  const isForward = !!forwardData;
  const modalTitle = isForward ? 'Forward Message' : replyTo ? 'Reply' : 'New Message';

  // Build available from addresses from database
  const fromAddresses = emailAddresses.map(addr => ({
    email: `${addr.local_part}@${addr.domain}`,
    label: addr.display_name ? `${addr.display_name} <${addr.local_part}@${addr.domain}>` : `${addr.local_part}@${addr.domain}`,
    displayName: addr.display_name,
  }));

  // Update from email when defaultFrom changes
  useEffect(() => {
    if (defaultFrom) {
      setFromEmail(defaultFrom);
    }
  }, [defaultFrom]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Handle Forward
      if (forwardData) {
        setTo(''); // Forward starts with empty recipient
        const subjectWithFwd = forwardData.subject.startsWith('Fwd:') 
          ? forwardData.subject 
          : `Fwd: ${forwardData.subject}`;
        setSubject(subjectWithFwd);
        
        // Build forwarded message content
        if (forwardData.originalBody && forwardData.originalDate && forwardData.originalFrom) {
          const parsed = parseEmailBody(forwardData.originalBody, null);
          const cleanBody = parsed.text || forwardData.originalBody;
          const formattedDate = format(new Date(forwardData.originalDate), "EEE, MMM d, yyyy 'at' h:mm a");
          
          const forwardedContent = `

---------- Forwarded message ---------
From: ${forwardData.originalFrom}
Date: ${formattedDate}
Subject: ${forwardData.subject}
To: ${forwardData.originalTo || ''}

${cleanBody}`;
          setBody(forwardedContent);
        } else {
          setBody('');
        }
        
        // Set attachments for forward
        setForwardAttachments(forwardData.attachments || []);
      }
      // Handle Reply
      else if (replyTo) {
        setTo(replyTo.to);
        const subjectWithRe = replyTo.subject.startsWith('Re:') 
          ? replyTo.subject 
          : `Re: ${replyTo.subject}`;
        setSubject(subjectWithRe);
        
        if (replyTo.originalBody && replyTo.originalDate && replyTo.originalFrom) {
          const parsed = parseEmailBody(replyTo.originalBody, null);
          const cleanBody = parsed.text || replyTo.originalBody;
          const formattedDate = format(new Date(replyTo.originalDate), "EEE, MMM d, yyyy 'at' h:mm a");
          const quotedLines = cleanBody.trim().split('\n').map(line => `> ${line}`).join('\n');
          const quotedContent = `\n\nOn ${formattedDate}, ${replyTo.originalFrom} wrote:\n${quotedLines}`;
          setBody(quotedContent);
        } else {
          setBody('');
        }
        setForwardAttachments([]);
      }
      // New message
      else {
        setTo('');
        setSubject('');
        setBody('');
        setForwardAttachments([]);
      }
    }
  }, [isOpen, replyTo, forwardData]);

  const removeAttachment = (index: number) => {
    setForwardAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  const handleSend = async () => {
    try {
      const validated = emailSchema.parse({ to, subject, body });
      
      setSending(true);
      
      // Build references array for threading
      const newReferences = replyTo?.messageId 
        ? [...(replyTo.references || []), replyTo.messageId]
        : undefined;
      
      await onSend({
        to_email: validated.to,
        subject: validated.subject || '',
        body_text: validated.body,
        from_email: fromEmail,
        from_name: fromName || undefined,
        in_reply_to: replyTo?.messageId,
        references: newReferences,
      });
      
      toast({
        title: 'Email sent',
        description: 'Your message has been sent successfully.',
      });
      
      onClose();
      setTo('');
      setSubject('');
      setBody('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to send',
          description: 'There was an error sending your email.',
          variant: 'destructive',
        });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-50 w-full max-w-2xl mx-2 sm:mx-4 bg-card border border-border rounded-t-xl sm:rounded-xl shadow-2xl animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-border shrink-0">
          <h3 className="font-semibold text-foreground text-sm sm:text-base">{modalTitle}</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 flex-1 overflow-y-auto">
          {/* From field with dropdown */}
          <div className="flex items-center gap-2 border-b border-border pb-2 sm:pb-3">
            <Label className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 shrink-0">From:</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-0 text-sm font-normal justify-start gap-1 hover:bg-transparent">
                  <span className="text-foreground">{fromEmail}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {fromAddresses.map((addr) => (
                  <DropdownMenuItem
                    key={addr.email}
                    onClick={() => setFromEmail(addr.email)}
                    className={fromEmail === addr.email ? 'bg-accent' : ''}
                  >
                    {addr.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 border-b border-border pb-2 sm:pb-3">
            <Label htmlFor="to" className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 shrink-0">To:</Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 border-b border-border pb-2 sm:pb-3">
            <Label htmlFor="subject" className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 shrink-0">Subject:</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
            />
          </div>

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            className="min-h-[150px] sm:min-h-[200px] border-0 shadow-none focus-visible:ring-0 resize-none text-sm"
          />

          {/* Forward Attachments */}
          {forwardAttachments.length > 0 && (
            <div className="border-t border-border pt-3 mt-2">
              <Label className="text-xs text-muted-foreground mb-2 block">Attachments</Label>
              <div className="flex flex-wrap gap-2">
                {forwardAttachments.map((attachment, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm group"
                  >
                    {attachment.contentType.startsWith('image/') ? (
                      <Image className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <File className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-foreground max-w-[150px] truncate">{attachment.filename}</span>
                    <span className="text-muted-foreground text-xs">({formatFileSize(attachment.size)})</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>
          
          <Button onClick={handleSend} disabled={sending} className="gap-2 text-sm h-9">
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
