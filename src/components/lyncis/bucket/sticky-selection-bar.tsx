'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, Package, ArrowRight, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '@/components/providers/language-provider';

interface StickySelectionBarProps {
  totalSelected: number;
  unassignedSelected: number;
  stagedSelected: number;
  onMoveToStaged: () => void;
  onRemoveFromStaged: () => void;
  onDelete: () => void;
  onDeselect: () => void;
}

export function StickySelectionBar({
  totalSelected,
  unassignedSelected,
  stagedSelected,
  onMoveToStaged,
  onRemoveFromStaged,
  onDelete,
  onDeselect,
}: StickySelectionBarProps) {
  const { dict } = useLanguage();
  const visible = totalSelected > 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: 100, opacity: 0, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            "fixed bottom-6 left-1/2 z-40 flex items-center gap-4",
            "px-6 py-3 rounded-2xl shadow-2xl border border-white/10",
            "bg-foreground/95 backdrop-blur-md text-background",
            "w-[calc(100%-2rem)] sm:w-auto sm:min-w-[400px] justify-between"
          )}
        >
          <div className="flex items-center gap-2.5 pr-3 md:pr-4 border-r border-white/10 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onDeselect}
              className="h-7 w-7 md:h-8 md:w-8 hover:bg-white/10 text-white rounded-full transition-colors"
            >
              <X className="h-4 w-4 opacity-70" />
            </Button>
            <div className="flex flex-col justify-center">
              <span className="text-[11px] md:text-sm font-black leading-tight tracking-tight">
                {dict.orders.selected_count.replace('{count}', totalSelected.toString())}
              </span>
              <span className="text-[8px] md:text-[9px] text-white/40 uppercase font-black tracking-[0.1em] leading-none mt-0.5">
                {dict.orders.bulk_actions}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Action 1: Add to Batch */}
            {unassignedSelected > 0 && (
              <Button 
                size="sm" 
                onClick={onMoveToStaged}
                className="h-8 md:h-9 px-3 md:px-4 gap-1.5 md:gap-2 bg-green-600 hover:bg-green-700 text-white border-0 font-bold text-[10px] md:text-xs rounded-full shadow-lg shadow-green-500/20 active:scale-95 transition-all"
              >
                <Package className="h-3.5 w-3.5" />
                <span className="truncate">{dict.orders.move_to_batch}</span>
              </Button>
            )}

            {/* Action 2: Remove from Batch */}
            {stagedSelected > 0 && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={onRemoveFromStaged}
                className="h-8 md:h-9 px-3 md:px-4 gap-1.5 md:gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] md:text-xs rounded-full active:scale-95 transition-all"
              >
                <MinusCircle className="h-3.5 w-3.5" />
                <span className="truncate">{dict.orders.remove_from_batch}</span>
              </Button>
            )}

            <div className="w-px h-6 bg-white/10 mx-0.5 md:mx-1 shrink-0" />

            <Button 
              size="icon" 
              variant="ghost"
              onClick={onDelete}
              className="h-8 w-8 md:h-9 md:w-9 text-red-500 hover:text-white hover:bg-destructive rounded-full transition-all shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
