import { useState } from 'react';
import { 
  Inbox, 
  Send, 
  Star, 
  Archive, 
  Trash2, 
  Settings, 
  Mail, 
  Plus,
  ChevronDown,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SidebarProps {
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  onCompose: () => void;
  onSettingsClick: () => void;
  unreadCount?: number;
}

const folders = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export function Sidebar({ 
  activeFolder, 
  onFolderChange, 
  onCompose, 
  onSettingsClick,
  unreadCount = 0 
}: SidebarProps) {
  const [isLabelsOpen, setIsLabelsOpen] = useState(true);

  return (
    <div className="flex flex-col h-full w-64 bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground">FlowMail</span>
      </div>

      {/* Compose Button */}
      <div className="px-3 mb-4">
        <Button 
          onClick={onCompose}
          className="w-full gap-2 shadow-md hover:shadow-lg transition-shadow"
          size="lg"
        >
          <Plus className="w-4 h-4" />
          Compose
        </Button>
      </div>

      {/* Folders */}
      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-1">
          {folders.map((folder) => {
            const Icon = folder.icon;
            const isActive = activeFolder === folder.id;
            const showBadge = folder.id === 'inbox' && unreadCount > 0;

            return (
              <button
                key={folder.id}
                onClick={() => onFolderChange(folder.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                <span className="flex-1 text-left">{folder.label}</span>
                {showBadge && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Labels Section */}
        <Collapsible open={isLabelsOpen} onOpenChange={setIsLabelsOpen} className="mt-6">
          <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full">
            <ChevronDown className={cn("w-4 h-4 transition-transform", !isLabelsOpen && "-rotate-90")} />
            Labels
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
              Work
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              Personal
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
              <div className="w-2.5 h-2.5 rounded-full bg-warning" />
              Important
            </button>
          </CollapsibleContent>
        </Collapsible>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <Globe className="w-5 h-5" />
          Domains
        </button>
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </div>
    </div>
  );
}
