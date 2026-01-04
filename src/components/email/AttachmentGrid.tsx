import { FileIcon, Download, Image as ImageIcon, FileText, Film, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailAttachment } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface AttachmentGridProps {
  attachments: EmailAttachment[];
  getPublicUrl: (path: string) => string;
  isImage: (type: string) => boolean;
  formatFileSize: (bytes: number) => string;
}

export function AttachmentGrid({ 
  attachments, 
  getPublicUrl, 
  isImage, 
  formatFileSize 
}: AttachmentGridProps) {
  if (attachments.length === 0) return null;

  const images = attachments.filter(a => isImage(a.content_type));
  const files = attachments.filter(a => !isImage(a.content_type));

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('video/')) return Film;
    if (contentType.startsWith('audio/')) return Music;
    if (contentType.includes('pdf') || contentType.includes('document') || contentType.includes('text')) return FileText;
    return FileIcon;
  };

  const handleDownload = (attachment: EmailAttachment) => {
    const url = getPublicUrl(attachment.storage_path);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="px-4 sm:px-6 pb-6">
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <FileIcon className="w-4 h-4" />
          Attachments ({attachments.length})
        </h3>

        {/* Image Grid - Responsive */}
        {images.length > 0 && (
          <div className="mb-4">
            <div className={cn(
              "grid gap-2",
              images.length === 1 && "grid-cols-1",
              images.length === 2 && "grid-cols-2",
              images.length >= 3 && "grid-cols-2 sm:grid-cols-3"
            )}>
              {images.map((attachment) => (
                <div 
                  key={attachment.id}
                  className="group relative aspect-video rounded-lg overflow-hidden bg-muted border border-border"
                >
                  <img
                    src={getPublicUrl(attachment.storage_path)}
                    alt={attachment.filename}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10"
                      onClick={() => handleDownload(attachment)}
                    >
                      <Download className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-xs text-white truncate">{attachment.filename}</p>
                    <p className="text-xs text-white/70">{formatFileSize(attachment.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Files Grid */}
        {files.length > 0 && (
          <div className={cn(
            "grid gap-2",
            files.length === 1 && "grid-cols-1",
            files.length >= 2 && "grid-cols-1 sm:grid-cols-2"
          )}>
            {files.map((attachment) => {
              const Icon = getFileIcon(attachment.content_type);
              return (
                <div 
                  key={attachment.id}
                  className="group flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleDownload(attachment)}
                >
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{attachment.filename}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
