'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// ─── Types ──────────────────────────────────────────────────

interface TagInfo {
  name: string;
  total: number;
  unassigned: number;
}

interface TagSidebarProps {
  tags: TagInfo[];
  totalOrders: number;
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

// ─── Component ──────────────────────────────────────────────

export function TagSidebar({
  tags,
  totalOrders,
  selectedTag,
  onTagSelect,
}: TagSidebarProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);

  // Split into active and archived
  const activeTags = tags.filter((t) => t.unassigned > 0);
  const archivedTags = tags.filter((t) => t.unassigned === 0);

  return (
    <div className="flex flex-col h-full py-2">
      <div className="px-4 py-2">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] opacity-70">
          Filter Tag
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1.5 px-3">
          {/* All Orders */}
          <button
            onClick={() => onTagSelect(null)}
            className={cn(
              'group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-all duration-300 active:scale-[0.98]',
              selectedTag === null
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-accent/50 hover:text-accent-foreground text-muted-foreground'
            )}
          >
            <span className={cn(
              "font-semibold transition-colors duration-300",
              selectedTag === null ? "text-primary" : "text-foreground group-hover:text-primary/80"
            )}>Semua Pesanan</span>
            <Badge
              variant={selectedTag === null ? 'default' : 'outline'}
              className={cn(
                "ml-2 text-[10px] h-5 px-1.5 transition-all duration-300",
                selectedTag === null 
                  ? "bg-primary text-primary-foreground border-transparent" 
                  : "bg-transparent text-muted-foreground group-hover:border-primary/30"
              )}
            >
              {totalOrders}
            </Badge>
          </button>

          <div className="pt-2 pb-1">
             <div className="h-px bg-border/50 mx-1" />
          </div>

          {/* Active Tags */}
          {activeTags.map((tag) => (
            <button
              key={tag.name}
              onClick={() => onTagSelect(tag.name)}
              className={cn(
                'group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-all duration-300 active:scale-[0.98]',
                selectedTag === tag.name
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-accent/50 hover:text-accent-foreground text-muted-foreground'
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className={cn(
                  "h-2 w-2 rounded-full shrink-0 transition-all duration-500 group-hover:scale-125",
                  selectedTag === tag.name ? "bg-primary" : "bg-green-500/60"
                )} />
                <span className={cn(
                  "truncate font-medium transition-colors duration-300",
                  selectedTag === tag.name ? "text-primary" : "text-foreground group-hover:text-primary/80"
                )}>{tag.name}</span>
              </span>
              <Badge
                variant={selectedTag === tag.name ? 'default' : 'outline'}
                className={cn(
                  "ml-2 text-[10px] h-5 px-1.5 transition-all duration-300",
                  selectedTag === tag.name 
                    ? "bg-primary text-primary-foreground border-transparent shadow-sm" 
                    : "bg-transparent text-muted-foreground group-hover:border-primary/30"
                )}
              >
                {tag.total}
              </Badge>
            </button>
          ))}

          {/* Archived Tags (Riwayat) */}
          {archivedTags.length > 0 && (
            <div className="pt-4">
              <button
                onClick={() => setArchiveOpen(!archiveOpen)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] hover:text-foreground transition-colors group"
              >
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform duration-200 opacity-50 group-hover:opacity-100',
                    archiveOpen && 'rotate-180'
                  )}
                />
                Riwayat ({archivedTags.length})
              </button>

              {archiveOpen && (
                <div className="space-y-1 mt-1.5 pl-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  {archivedTags.map((tag) => (
                    <button
                      key={tag.name}
                      onClick={() => onTagSelect(tag.name)}
                      className={cn(
                        'group flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-all duration-200',
                        selectedTag === tag.name
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-accent/50 hover:text-accent-foreground text-muted-foreground'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Tag className={cn(
                          "h-3 w-3 shrink-0 opacity-40 transition-opacity group-hover:opacity-70",
                          selectedTag === tag.name && "opacity-100 text-primary"
                        )} />
                        <span className="truncate">{tag.name}</span>
                      </span>
                      <Badge variant="outline" className="ml-2 text-[9px] h-4 px-1 opacity-60">
                        {tag.total}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
