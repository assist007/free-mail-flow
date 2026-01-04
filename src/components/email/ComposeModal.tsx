import { useState } from 'react';
import { X, Send, Paperclip, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const emailSchema = z.object({
  to: z.string().email('Please enter a valid email address'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Message body is required'),
});

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: { to_email: string; subject: string; body_text: string; from_email: string; from_name?: string }) => Promise<void>;
  replyTo?: {
    to: string;
    subject: string;
    originalBody?: string;
  };
  defaultFrom?: string;
}

export function ComposeModal({ isOpen, onClose, onSend, replyTo, defaultFrom = 'you@example.com' }: ComposeModalProps) {
  const { toast } = useToast();
  const [to, setTo] = useState(replyTo?.to || '');
  const [subject, setSubject] = useState(replyTo?.subject ? `Re: ${replyTo.subject}` : '');
  const [body, setBody] = useState(replyTo?.originalBody ? `\n\n---\n${replyTo.originalBody}` : '');
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    try {
      const validated = emailSchema.parse({ to, subject, body });
      
      setSending(true);
      await onSend({
        to_email: validated.to,
        subject: validated.subject,
        body_text: validated.body,
        from_email: defaultFrom,
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
      <div className="relative z-50 w-full max-w-2xl mx-4 bg-card border border-border rounded-t-xl sm:rounded-xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">New Message</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Label htmlFor="to" className="text-sm text-muted-foreground w-12">To:</Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
            />
          </div>
          
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Label htmlFor="subject" className="text-sm text-muted-foreground w-12">Subject:</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
            />
          </div>

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            className="min-h-[200px] border-0 shadow-none focus-visible:ring-0 resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>
          
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
