'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Check, Search, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';

interface LocationItem {
  province_name: string;
  city_name: string;
  district_name: string;
  subdistrict_name: string;
  postal_code: string;
}

interface LocationAutocompleteProps {
  onSelect: (location: LocationItem) => void;
  defaultValue?: string;
}

export function LocationAutocomplete({ onSelect, defaultValue = '' }: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    async function loadLocations() {
      setIsLoading(true);
      try {
        const res = await fetch('/data/location.json');
        const data = await res.json();
        setLocations(data);
      } catch (err) {
        console.error('Failed to load locations', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadLocations();
  }, []);

  const filteredLocations = useMemo(() => {
    if (!search || search.length < 3) return [];
    
    const searchLower = search.toLowerCase();
    return locations
      .filter((loc) => {
        return (
          loc.province_name.toLowerCase().includes(searchLower) ||
          loc.city_name.toLowerCase().includes(searchLower) ||
          loc.district_name.toLowerCase().includes(searchLower) ||
          loc.subdistrict_name.toLowerCase().includes(searchLower) ||
          loc.postal_code.includes(searchLower)
        );
      })
      .slice(0, 10);
  }, [search, locations]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Scroll into view logic
  useEffect(() => {
    if (open && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex, open]);

  // Control popover based on focus state and search length
  useEffect(() => {
    if (isFocused && search.length >= 3) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isFocused, search]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (search.length >= 3) setOpen(true);
      }
      return;
    }

    if (filteredLocations.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredLocations.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredLocations.length) % filteredLocations.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const loc = filteredLocations[selectedIndex];
      onSelect(loc);
      setSearch(`${loc.subdistrict_name}, ${loc.postal_code}`);
      setIsFocused(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-1.5 w-full">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverAnchor asChild>
          <div className="relative group cursor-pointer w-full">
            <Input
              value={search || defaultValue}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setIsFocused(true);
              }}
              onBlur={() => {
                // Delay to allow click events on items to fire
                setTimeout(() => setIsFocused(false), 150);
              }}
              placeholder="Cari Kelurahan, Kecamatan, Kota, atau Kodepos..."
              className="h-9 pr-10 rounded-md text-sm bg-background border-border/60 transition-all focus:ring-1 focus:ring-primary/20 w-full"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors pointer-events-none">
              <Search className="h-4 w-4" />
            </div>
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
          <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
            {isLoading && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground animate-pulse bg-muted/5">
                Memuat data lokasi...
              </div>
            )}
            {!isLoading && search.length < 3 && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground italic bg-muted/5">
                Ketik minimal 3 karakter untuk mencari...
              </div>
            )}
            {!isLoading && search.length >= 3 && filteredLocations.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground italic bg-muted/5">
                Lokasi tidak ditemukan
              </div>
            )}
            {search.length >= 3 && filteredLocations.length > 0 && (
              <div className="py-1">
                {filteredLocations.map((loc, i) => (
                  <button
                    key={i}
                    ref={(el) => { itemRefs.current[i] = el; }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 transition-colors group flex items-start gap-3 border-b last:border-0 border-border/10",
                      selectedIndex === i ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur
                      onSelect(loc);
                      setSearch(`${loc.subdistrict_name}, ${loc.postal_code}`);
                      setIsFocused(false);
                    }}
                  >
                    <MapPin className={cn(
                      "h-4 w-4 mt-0.5 transition-colors flex-shrink-0",
                      selectedIndex === i ? "text-primary" : "text-muted-foreground/50"
                    )} />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[13px] font-semibold leading-none truncate">
                        {loc.subdistrict_name}
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-relaxed truncate">
                        {loc.district_name}, {loc.city_name}, {loc.province_name}
                      </span>
                      <span className={cn(
                        "text-[10px] font-mono font-semibold tracking-wider transition-colors",
                        selectedIndex === i ? "text-primary" : "text-primary/70"
                      )}>
                        {loc.postal_code}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {search.length >= 3 && filteredLocations.length > 0 && (
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
