
'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, Package, ArrowRight, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

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
          <div className="flex items-center gap-3 pr-4 border-r border-white/10">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onDeselect}
              className="h-8 w-8 hover:bg-white/10 text-white rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-none">{totalSelected} dipilih</span>
              <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider mt-0.5">Bulk Actions</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Action 1: Add to Batch */}
            {unassignedSelected > 0 && (
              <Button 
                size="sm" 
                onClick={onMoveToStaged}
                className="h-9 px-4 gap-2 bg-green-600 hover:bg-green-700 text-white border-0 font-bold text-xs rounded-full shadow-lg shadow-green-500/20 active:scale-95 transition-all"
              >
                <Package className="h-3.5 w-3.5" />
                Pindah ke Batch
              </Button>
            )}

            {/* Action 2: Remove from Batch */}
            {stagedSelected > 0 && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={onRemoveFromStaged}
                className="h-9 px-4 gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-full active:scale-95 transition-all"
              >
                <MinusCircle className="h-3.5 w-3.5" />
                Hapus dari Batch
              </Button>
            )}

            <div className="w-px h-6 bg-white/10 mx-1" />

            <Button 
              size="icon" 
              variant="ghost"
              onClick={onDelete}
              className="h-9 w-9 text-white/70 hover:text-white hover:bg-destructive rounded-full transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
