'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Tag as TagIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';

interface TagAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  activeTags: string[];
  placeholder?: string;
}

export function TagAutocomplete({ value, onChange, activeTags, placeholder = "Contoh: BKK-MAY-2025" }: TagAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filteredTags = useMemo(() => {
    const searchLower = value.toLowerCase();
    const filtered = activeTags
      .filter(t => t.toLowerCase().includes(searchLower))
      .slice(0, 10);
    return filtered;
  }, [value, activeTags]);

  // Reset selection when search or active tags change
  useEffect(() => {
    setSelectedIndex(0);
  }, [value, activeTags]);

  // Scroll into view logic
  useEffect(() => {
    if (open && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex, open]);

  // Control popover based on focus state
  useEffect(() => {
    if (isFocused) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isFocused]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setOpen(true);
      }
      return;
    }

    if (filteredTags.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredTags.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredTags.length) % filteredTags.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onChange(filteredTags[selectedIndex]);
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative group w-full">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverAnchor asChild>
          <div className="relative w-full">
            <Input
              id="tag-autocomplete"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setIsFocused(true);
              }}
              onBlur={() => {
                // Delay to allow click events on items to fire
                setTimeout(() => setIsFocused(false), 150);
              }}
              placeholder={placeholder}
              className="h-9 w-full bg-background border-border/60 shadow-xs rounded-md text-sm transition-all focus:ring-1 focus:ring-primary/20"
              autoComplete="off"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent 
          className="p-0 shadow-xl border-border/40 overflow-hidden" 
          align="start"
          sideOffset={5}
          style={{ width: 'var(--radix-popover-anchor-width, var(--radix-popover-trigger-width))' }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div ref={scrollAreaRef} className="max-h-[200px] overflow-y-auto">
            {filteredTags.length > 0 ? (
              <div className="py-1">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">
                  Tag Aktif
                </div>
                {filteredTags.map((tag, idx) => (
                  <button
                    key={tag}
                    ref={(el) => { itemRefs.current[idx] = el; }}
                    className={cn(
                      "w-full px-3 py-2 cursor-pointer text-xs flex items-center justify-between transition-colors",
                      selectedIndex === idx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur
                      onChange(tag);
                      setIsFocused(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <TagIcon className={cn("h-3 w-3", selectedIndex === idx ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-medium">{tag}</span>
                    </div>
                    {value === tag && <Check className="h-3 w-3 text-primary" />}
                  </button>
                ))}
              </div>
            ) : value.length > 0 ? (
              <div className="px-3 py-4 text-[10px] text-muted-foreground italic text-center border-b bg-muted/5">
                 Tag baru akan dibuat
              </div>
            ) : (
              <div className="px-3 py-6 text-[10px] text-muted-foreground text-center bg-muted/5">
                Ketik untuk mencari atau membuat tag baru.
              </div>
            )}
          </div>
          {filteredTags.length > 0 && (
            <div className="px-2 py-1.5 border-t bg-muted/20 flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">Navigation</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                  <kbd className="px-1 rounded bg-background border border-border/60 shadow-xs">↑↓</kbd> Pilih
                </span>
                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                  <kbd className="px-1 rounded bg-background border border-border/60 shadow-xs">↵</kbd> Konfirmasi
                </span>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
