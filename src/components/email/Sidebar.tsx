import { useState } from 'react';
import { 
  Inbox, 
  Send, 
  Star, 
  Archive, 
  Trash2, 
  Settings, 
  Plus,
  ChevronDown,
  Globe,
  FileText,
  Clock,
  Check,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface Domain {
  id: string;
  domain: string;
  is_verified: boolean;
}

interface SidebarProps {
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  onCompose: () => void;
  onSettingsClick: () => void;
  unreadCount?: number;
  domains?: Domain[];
  activeDomain?: string | null;
  onDomainChange?: (domainId: string | null) => void;
}

const folders = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'snoozed', label: 'Snoozed', icon: Clock },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'archive', label: 'All Mail', icon: Archive },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export function Sidebar({ 
  activeFolder, 
  onFolderChange, 
  onCompose, 
  onSettingsClick,
  unreadCount = 0,
  domains = [],
  activeDomain,
  onDomainChange
}: SidebarProps) {
  const [isLabelsOpen, setIsLabelsOpen] = useState(true);

  const currentDomain = domains.find(d => d.id === activeDomain);

  return (
    <div className="flex flex-col h-full w-64 bg-sidebar">
      {/* Domain Selector */}
      {domains.length > 0 && (
        <div className="px-3 pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {currentDomain ? currentDomain.domain : 'All Domains'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem 
                onClick={() => onDomainChange?.(null)}
                className="flex items-center justify-between"
              >
                <span>All Domains</span>
                {!activeDomain && <Check className="w-4 h-4" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {domains.map((domain) => (
                <DropdownMenuItem 
                  key={domain.id}
                  onClick={() => onDomainChange?.(domain.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{domain.domain}</span>
                    {domain.is_verified && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        verified
                      </Badge>
                    )}
                  </div>
                  {activeDomain === domain.id && <Check className="w-4 h-4 shrink-0" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSettingsClick}>
                <Plus className="w-4 h-4 mr-2" />
                Add Domain
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Compose Button */}
      <div className="px-3 py-4">
        <Button 
          onClick={onCompose}
          className="gap-3 px-6 py-6 rounded-2xl shadow-md hover:shadow-lg transition-all bg-accent hover:bg-accent/80 text-accent-foreground font-medium"
          size="lg"
        >
          <Plus className="w-5 h-5" />
          <span className="font-display">Compose</span>
        </Button>
      </div>

      {/* Folders */}
      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-0.5">
          {folders.map((folder) => {
            const Icon = folder.icon;
            const isActive = activeFolder === folder.id;
            const showBadge = folder.id === 'inbox' && unreadCount > 0;

            return (
              <button
                key={folder.id}
                onClick={() => onFolderChange(folder.id)}
                className={cn(
                  "w-full flex items-center gap-4 pl-6 pr-3 py-2 rounded-r-full text-sm transition-all duration-150",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-secondary"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 shrink-0",
                  isActive ? "text-accent-foreground" : "text-muted-foreground"
                )} />
                <span className="flex-1 text-left truncate">{folder.label}</span>
                {showBadge && (
                  <span className={cn(
                    "text-xs font-medium tabular-nums",
                    isActive ? "text-accent-foreground" : "text-foreground"
                  )}>
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Labels Section */}
        <Collapsible open={isLabelsOpen} onOpenChange={setIsLabelsOpen} className="mt-6">
          <CollapsibleTrigger className="flex items-center gap-3 pl-6 pr-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
            <ChevronDown className={cn("w-4 h-4 transition-transform", !isLabelsOpen && "-rotate-90")} />
            Labels
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-0.5 mt-1">
            <button className="w-full flex items-center gap-4 pl-6 pr-3 py-2 rounded-r-full text-sm text-sidebar-foreground hover:bg-secondary transition-colors">
              <div className="w-3 h-3 rounded-sm bg-success" />
              Work
            </button>
            <button className="w-full flex items-center gap-4 pl-6 pr-3 py-2 rounded-r-full text-sm text-sidebar-foreground hover:bg-secondary transition-colors">
              <div className="w-3 h-3 rounded-sm bg-primary" />
              Personal
            </button>
            <button className="w-full flex items-center gap-4 pl-6 pr-3 py-2 rounded-r-full text-sm text-sidebar-foreground hover:bg-secondary transition-colors">
              <div className="w-3 h-3 rounded-sm bg-warning" />
              Important
            </button>
          </CollapsibleContent>
        </Collapsible>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-sidebar-border space-y-0.5">
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-4 pl-6 pr-3 py-2 rounded-r-full text-sm text-sidebar-foreground hover:bg-secondary transition-colors"
        >
          <Globe className="w-5 h-5 text-muted-foreground" />
          Domains
        </button>
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-4 pl-6 pr-3 py-2 rounded-r-full text-sm text-sidebar-foreground hover:bg-secondary transition-colors"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
          Settings
        </button>
      </div>
    </div>
  );
}
