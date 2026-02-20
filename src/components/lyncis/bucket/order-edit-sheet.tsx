'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, User, Package, MapPin, Tag as TagIcon, X, Info, Truck, Scale, Maximize2, AlertTriangle } from 'lucide-react';
import { JastipOrder, JastipItem } from '@/lib/types';
import { updateUnitPrice, updateTotalPrice, updateQuantity } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { OrderFormContent } from './order-form-content';

interface OrderEditSheetProps {
  order: JastipOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: JastipOrder) => void;
  onApprove?: (id: string) => void;
  activeTags?: string[];
  readOnly?: boolean;
  mode?: 'edit' | 'review';
}

function createEmptyItem(): JastipItem {
  return {
    id: uuidv4(),
    name: '',
    qty: 1,
    unitPrice: 0,
    totalPrice: 0,
    rawWeightKg: 0,
    isManualTotal: false,
  };
}

export function OrderEditSheet({
  order,
  open,
  onOpenChange,
  onSave,
  onApprove,
  activeTags = [],
  readOnly = false,
  mode = 'edit',
}: OrderEditSheetProps) {
  const [formData, setFormData] = useState<JastipOrder | null>(null);

  // Sync form data when sheet opens or order changes
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen && order) {
        setFormData(JSON.parse(JSON.stringify(order)));
      }
      if (!isOpen) {
        setFormData(null);
      }
      onOpenChange(isOpen);
    },
    [order, onOpenChange]
  );

  // Additional sync if order prop updates while open
  useEffect(() => {
    if (open && order && (!formData || formData.id !== order.id)) {
      setFormData(JSON.parse(JSON.stringify(order)));
    }
  }, [open, order, formData]);

  if (!formData) return <Sheet open={open} onOpenChange={handleOpenChange}><SheetContent /></Sheet>;

  const updateRecipient = (field: string, value: string) => {
    setFormData((prev) => prev ? ({
      ...prev,
      recipient: { ...prev.recipient, [field]: value },
    }) : prev);
  };

  const updateTag = (value: string) => {
    setFormData((prev) => (prev ? { ...prev, tag: value } : prev));
  };

  const updateItem = (index: number, updatedItem: JastipItem) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[index] = updatedItem;
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setFormData((prev) => prev ? ({ ...prev, items: [...prev.items, createEmptyItem()] }) : prev);
  };

  const removeItem = (index: number) => {
    setFormData((prev) => {
      if (!prev || prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });
  };

  const handleSave = () => {
    if (formData) {
      onSave(formData as JastipOrder);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-background border-l shadow-2xl overflow-hidden"
        onPointerDownOutside={(e) => {
          if (mode === 'review' || !readOnly) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (mode === 'review' || !readOnly) {
            e.preventDefault();
          }
        }}
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-3">
             <div className={cn(
               "flex h-10 w-10 items-center justify-center rounded-xl",
               formData.metadata?.needsTriage ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
             )}>
                {formData.metadata?.needsTriage ? <AlertTriangle className="h-5 w-5" /> : <User className="h-5 w-5" />}
             </div>
             <div>
                <SheetTitle className="text-base font-bold tracking-tight">
                  {readOnly ? 'Detail Pesanan' : 'Edit Pesanan'}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-0.5">
                   <Badge 
                     variant="outline" 
                     className={cn(
                       "text-[9px] font-bold uppercase tracking-widest border-none px-1.5 h-4",
                       formData.metadata?.needsTriage 
                         ? "bg-amber-100 text-amber-700" 
                         : formData.status === 'unassigned' ? "bg-muted/50 text-muted-foreground" : "bg-blue-50 text-blue-700"
                     )}
                   >
                      {formData.metadata?.needsTriage ? 'Perlu Review' : formData.status === 'unassigned' ? 'Bucket Baru' : 'Siap Kirim'}
                   </Badge>
                   <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider opacity-50">
                      ID: {formData.id.slice(0, 8)}
                   </span>
                </div>
             </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(false)} 
            className="h-9 w-9 bg-muted/70 hover:bg-destructive hover:text-white transition-all duration-200 border border-transparent active:scale-95 flex items-center justify-center p-0 rounded-full"
          >
             <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-6 bg-muted/5 min-h-full">
            <OrderFormContent 
              formData={formData as JastipOrder}
              setFormData={setFormData as any}
              activeTags={activeTags}
              readOnly={readOnly}
            />
          </div>
        </div>

        {/* Footer */}
        {!readOnly && (
          <div className="shrink-0 p-6 border-t bg-background shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40">
             <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-11 font-bold rounded-lg border-border/80 hover:bg-muted/50 transition-all">Batal</Button>
                {mode === 'review' ? (
                  <Button 
                    onClick={async () => {
                      if (formData) {
                        // Mark as triaged in the copy we're saving
                        const updatedOrder = {
                          ...formData,
                          metadata: { ...formData.metadata, needsTriage: false, parseWarning: false }
                        };
                        onSave(updatedOrder);
                        onApprove?.(updatedOrder.id);
                        onOpenChange(false);
                      }
                    }} 
                    className="flex-[2] h-11 font-bold bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 rounded-md transition-all active:scale-98"
                  >
                    Verifikasi & Simpan
                  </Button>
                ) : (
                  <Button onClick={handleSave} className="flex-[2] h-11 font-bold bg-black hover:bg-black/90 text-white rounded-md transition-all active:scale-98">Simpan</Button>
                )}
             </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
