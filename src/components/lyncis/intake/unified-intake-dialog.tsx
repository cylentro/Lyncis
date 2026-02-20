'use client';

import { useState, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, FileCheck, MessageSquare, ListPlus, X, Info } from 'lucide-react';
import { JastipOrder, JastipItem } from '@/lib/types';
import { toast } from 'sonner';
import { ExcelUpload } from './excel-upload';
import { WhatsAppPaste } from './whatsapp-paste';
import { LocationAutocomplete } from './location-autocomplete';
import { TagAutocomplete } from './tag-autocomplete';
import { OrderFormContent } from '../bucket/order-form-content';
import { cn } from '@/lib/utils';
import { useActiveTags } from '@/hooks/use-lyncis-db';
import { getParserConfig } from '@/lib/config-actions';
import { useLanguage } from '@/components/providers/language-provider';

// ─── Props ──────────────────────────────────────────────────

interface UnifiedIntakePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: Omit<JastipOrder, 'id'>) => Promise<void>;
  onBatchImport: (orders: Omit<JastipOrder, 'id'>[]) => Promise<void>;
  allTagsData?: TagSummary[];
}

export interface TagSummary {
  name: string;
  unassigned: number;
}

// ─── Helpers ────────────────────────────────────────────────

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

function createEmptyOrder(): Omit<JastipOrder, 'id'> {
  return {
    createdAt: Date.now(),
    tag: '',
    status: 'unassigned',
    recipient: {
      name: '',
      phone: '',
      addressRaw: '',
      provinsi: '',
      kota: '',
      kecamatan: '',
      kelurahan: '',
      kodepos: '',
    },
    items: [createEmptyItem()],
    logistics: {
      originId: '',
      finalPackedWeight: 0,
      dimensions: { l: 0, w: 0, h: 0 },
      volumetricWeight: 0,
      chargeableWeight: 0,
    },
  };
}

// ─── Component ──────────────────────────────────────────────

export function UnifiedIntakePanel({
  open,
  onOpenChange,
  onSave,
  onBatchImport,
  allTagsData = [],
}: UnifiedIntakePanelProps) {
  const { dict } = useLanguage();

  const [formData, setFormData] = useState<Omit<JastipOrder, 'id'>>(
    createEmptyOrder()
  );
  const [isWhatsappEditing, setIsWhatsappEditing] = useState(false);
  const [methods, setMethods] = useState<string[]>(['manual', 'excel', 'whatsapp']);
  const [activeTab, setActiveTab] = useState('manual');

  useEffect(() => {
    getParserConfig().then(config => {
      setMethods(config.intakeMethods);
      setActiveTab(config.intakeMethods[0] || 'manual');
    });
  }, []);

  // Get active tags (those with ongoing orders) from the database
  const dbActiveTags = useActiveTags();
  
  // Combine DB active tags with prop tags that have unassigned items
  const activeTags = useMemo(() => {
    const tags = new Set<string>();
    
    // 1. Add tags from prop ONLY if they have unassigned orders
    allTagsData
      .filter(t => t.unassigned > 0)
      .forEach(t => tags.add(t.name));
    
    // 2. Add tags from direct active DB hook
    if (dbActiveTags) {
      dbActiveTags.forEach(t => tags.add(t));
    }
    
    // 3. Always include "General"
    tags.add('General');
    
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [allTagsData, dbActiveTags]);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setFormData(createEmptyOrder());
      setIsWhatsappEditing(false);
      setActiveTab('manual');
    }
    onOpenChange(isOpen);
  };

  // ─── Manual Handlers ───────────────────────────────────────

  const updateRecipient = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      recipient: { ...prev.recipient, [field]: value },
    }));
  };

  const updateTag = (value: string) => {
    setFormData((prev) => ({ ...prev, tag: value }));
  };

  const updateItem = (index: number, updatedItem: JastipItem) => {
    setFormData((prev) => {
      const items = [...prev.items];
      items[index] = updatedItem;
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });
  };

  const handleSaveManual = async () => {
    const finalTag = formData.tag.trim() || 'General';
    if (formData.items.length === 0) {
      toast.error(dict.intake.min_item_error);
      return;
    }

    try {
      await onSave({ ...formData, tag: finalTag, createdAt: Date.now() });
      toast.success(dict.intake.success_add);
      setFormData(createEmptyOrder());
      // Suggest: Don't auto close if user wants to add multiple? 
      // User requested "friendly", maybe clear and stay open or close? 
      // For now, let's keep common behavior: close on success.
      onOpenChange(false);
    } catch (err) {
      toast.error(dict.intake.error_add);
    }
  };

  const handleBatchImportAndClose = async (orders: Omit<JastipOrder, 'id'>[]) => {
    await onBatchImport(orders);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col h-full bg-background border-l overflow-hidden shadow-none"
        onPointerDownOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        {/* ── Compact Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Plus className="h-5 w-5" />
             </div>
             <div>
               <h2 className="text-base font-bold tracking-tight">{dict.intake.title}</h2>
               <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider opacity-70">
                 {dict.intake.desc}
               </p>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden gap-0">
          {/* ── Proportionally Spaced Tabs with Fluid Animation ── */}
          {!isWhatsappEditing && (
            <div className="px-6 py-2 bg-background z-20 shrink-0 flex items-center justify-center">
              <TabsList className="grid w-full grid-cols-3 bg-secondary/80 p-1 rounded-lg h-9 relative">
                {/* 
                  Note: To make the framer-motion layoutId work purely for the background pill, 
                  we render the triggers transparently and put the animated background behind the active one.
                  However, Shadcn Tabs are uncontrolled by default here unless we lift state.
                  Ideally, we use the value prop on Tabs.
                  
                  Since we are using uncontrolled Tabs (defaultValue="manual"), we can't easily sync the motion div 
                  without controlled state or a custom wrapper.
                  
                  Strategy:
                  We'll switch the Tabs to controlled mode using a new state `activeTab`.
                */}
                
                {methods.map((tabValue) => (
                  <TabsTrigger 
                    key={tabValue}
                    value={tabValue} 
                    onClick={() => setActiveTab(tabValue)}
                    className="relative z-10 rounded-md data-[state=active]:bg-transparent !shadow-none !border-none transition-colors duration-200 font-medium text-xs h-full flex items-center justify-center hover:text-foreground/80 data-[state=active]:text-primary"
                  >
                    {activeTab === tabValue && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute inset-0 bg-white rounded-md border-0 shadow-none"
                        transition={{ type: "spring", bounce: 0.22, duration: 0.5 }}
                        style={{ zIndex: -1 }}
                      />
                    )}
                     <span className="flex items-center gap-1.5 relative z-10">
                       {tabValue === 'manual' && <ListPlus className="h-3.5 w-3.5" />}
                       {tabValue === 'excel' && <FileCheck className="h-3.5 w-3.5" />}
                       {tabValue === 'whatsapp' && <MessageSquare className="h-3.5 w-3.5" />}
                       {tabValue === 'manual' && dict.intake.manual}
                       {tabValue === 'excel' && dict.intake.excel}
                       {tabValue === 'whatsapp' && dict.intake.whatsapp}
                     </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          )}

          {/* ── Content Area ── */}
          {methods.includes('manual') && (
            <TabsContent value="manual" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden">
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pt-6 bg-muted/5">
                <OrderFormContent 
                  formData={formData}
                  setFormData={setFormData}
                  activeTags={activeTags}
                />
              </div>
            
            {/* ── Action Footer ── */}
             <div className="shrink-0 p-5 bg-background border-t flex gap-3 z-30">
               <Button variant="outline" className="flex-1 h-10 rounded-lg text-xs font-bold border-border/80 hover:bg-muted/50" onClick={() => onOpenChange(false)}>
                 {dict.common.cancel}
               </Button>
               <Button className="flex-[2] h-10 rounded-md text-xs font-bold bg-black hover:bg-black/90 text-white transition-all active:scale-98" onClick={handleSaveManual}>
                 {dict.common.save}
               </Button>
             </div>
          </TabsContent>
        )}

          {/* ── Batch Tabs ── */}
          {methods.includes('excel') && (
            <TabsContent value="excel" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden">
              <div className="flex-1 overflow-y-auto p-5">
                <div className="animate-in slide-in-from-right-3 duration-200">
                  <ExcelUpload onImport={handleBatchImportAndClose} activeTags={activeTags} />
                </div>
              </div>
            </TabsContent>
          )}

          {methods.includes('whatsapp') && (
            <TabsContent value="whatsapp" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden">
               <div className={cn(
                 "flex-1 transition-all flex flex-col", 
                 (isWhatsappEditing || activeTab === 'whatsapp') ? "overflow-hidden p-0" : "overflow-y-auto p-5"
               )}>
                  <div className={cn(
                    "animate-in slide-in-from-right-3 duration-200", 
                    (isWhatsappEditing || activeTab === 'whatsapp') && "h-full flex-1 flex flex-col"
                  )}>
                    <WhatsAppPaste 
                      key={open ? "open" : "closed"}
                      onImport={handleBatchImportAndClose} 
                      activeTags={activeTags} 
                      onEditingChange={setIsWhatsappEditing}
                    />
                  </div>
               </div>
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
