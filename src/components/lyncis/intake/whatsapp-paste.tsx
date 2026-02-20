'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Sparkles,
  Zap,
  Trash2,
  AlertTriangle,
  Loader2,
  Info,
  Pencil,
  Plus,
  X,
  Check,
  CheckCircle2,
  ListPlus,
  MapPin,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { parseWhatsAppText, getParsingConfidence, countPotentialItems } from '@/lib/whatsapp-parser';
import { parseWithLLM } from '@/lib/llm-parser';
import { JastipOrder } from '@/lib/types';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LocationAutocomplete } from './location-autocomplete';
import { TagAutocomplete } from './tag-autocomplete';
import { cn } from '@/lib/utils';
import { getParserConfig } from '@/lib/config-actions';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/providers/language-provider';

interface WhatsAppPasteProps {
  onImport: (orders: Omit<JastipOrder, 'id'>[]) => Promise<void>;
  activeTags?: string[];
  onEditingChange?: (isEditing: boolean) => void;
}

export function WhatsAppPaste({ onImport, activeTags = [], onEditingChange }: WhatsAppPasteProps) {
  const { dict } = useLanguage();
  const [text, setText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedOrders, setParsedOrders] = useState<Partial<JastipOrder>[]>([]);
  const [defaultTag, setDefaultTag] = useState('');
  const [isWarningBatch, setIsWarningBatch] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editOrder, setEditOrder] = useState<Partial<JastipOrder> | null>(null);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);

  /* 
   * Sync editing state with parent to enable focus mode 
   */
  useEffect(() => {
    onEditingChange?.(editingIndex !== null);
  }, [editingIndex, onEditingChange]);

  const [config, setConfig] = useState<{
    enableAI: boolean;
    enableRegex: boolean;
    regexThreshold: number;
    hasApiKey: boolean;
  } | null>(null);

  useEffect(() => {
    getParserConfig().then(setConfig);
  }, []);

  // Auto-reset when all parsed items are deleted manually
  useEffect(() => {
    if (parsedOrders.length === 0 && isInputCollapsed) {
      setIsInputCollapsed(false);
    }
  }, [parsedOrders.length, isInputCollapsed]);

  // Helper to format numbers with thousand separators
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const handleSmartParse = async () => {
    if (!text.trim() || isParsing) return;
    setIsParsing(true);
    setIsWarningBatch(false);
    setEditingIndex(null);
    setEditOrder(null);
    
    // Config from server action
    const enableAI = config?.enableAI !== false;
    const enableRegex = config?.enableRegex !== false;
    const threshold = config?.regexThreshold || 0.85;

    try {
      let regexResults: Partial<JastipOrder>[] = [];
      let regexConfidence = 0;

      // 1. Try Regex First if enabled
      if (enableRegex) {
        regexResults = await parseWhatsAppText(text);
        regexConfidence = regexResults.length > 0 
          ? regexResults.reduce((sum, o) => sum + getParsingConfidence(o), 0) / regexResults.length
          : 0;

        // Check if items count matches potential items count
        const totalRawItems = countPotentialItems(text);
        const totalExtractedItems = regexResults.reduce((sum, o) => sum + (o.items?.length || 0), 0);
        const hasMissingItems = totalRawItems > totalExtractedItems;

        // Accept regex results if we found at least one item,
        // OR if regex found a valid order with contact info but genuinely no items in the text.
        // Missing contact info (phone / address) is NOT a reason to use AI —
        // it's shown as a "Review Diperlukan" warning badge on the card instead.
        const regexFoundItems = totalExtractedItems > 0;
        // Genuinely no items: potentialItemCount = 0, so we didn't MISS anything
        const noItemsInText = totalRawItems === 0;
        const hasAnyContact = regexResults.some(
          o => o.recipient?.name || o.recipient?.phone || o.recipient?.addressRaw
        );

        if ((regexFoundItems && !hasMissingItems) || (noItemsInText && hasAnyContact)) {
          setParsedOrders(regexResults);
          setIsInputCollapsed(true);
          // If contact data is incomplete or no items, show a warning toast
          const hasIncompleteContact = regexResults.some(
            o => !o.recipient?.name || !o.recipient?.phone || !o.recipient?.addressRaw
          );
          const hasNoItems = regexResults.some(o => !o.items?.length);
          if (hasIncompleteContact || hasNoItems) {
            setIsWarningBatch(true);
            toast.warning(dict.intake.regex_recognized.replace('{count}', regexResults.length.toString()), {
              description: dict.intake.regex_warning
            });
          } else {
            toast.success(dict.intake.regex_recognized.replace('{count}', regexResults.length.toString()));
          }
          return;
        }

        // Only fall to AI if regex found items but count is incomplete (hasMissingItems),
        // or found zero items at all.
        if (regexResults.length > 0) {
          console.log(`Regex incomplete (found: ${totalExtractedItems}/${totalRawItems} items). Attempting AI fallback.`);
        }
      }

      // 2. If Regex is weak/disabled/empty, Try AI if enabled
      if (enableAI) {
        if (!config?.hasApiKey) {
          console.warn("AI extraction requested but GEMINI_API_KEY is missing.");
          toast.error(dict.intake.ai_error.split('.')[0] + '.');
        } else {
          // Show a subtle toast that AI is kicking in
          const aiToastId = toast.loading(dict.intake.ai_processing);
          
          try {
            const llmResults = await parseWithLLM(text);
            toast.dismiss(aiToastId);
            
            if (llmResults.length > 0) {
              setParsedOrders(llmResults);
              setIsInputCollapsed(true);
              toast.success(dict.intake.ai_success.replace('{count}', llmResults.length.toString()), {
                icon: <Sparkles className="h-4 w-4 text-amber-500" />
              });
              return;
            }
          } catch (err: any) {
            toast.dismiss(aiToastId);
            console.error("AI Parse Error:", err);
            
            // If AI specifically failed, notify the user that we are falling back to regex or standard methods
            const errorMessage = err.message || dict.intake.ai_error;
            toast.error(errorMessage, {
              description: dict.intake.ai_error.split('.')[1].trim()
            });
          }
        }
      } else if (regexResults.length === 0 || regexConfidence < threshold) {
        // Regex failed/weak and AI is explicitly disabled
        toast.info(dict.intake.ai_error.split('.')[1].trim());
      }

      // 3. Last Resort: Use Regex results if present (even if low confidence)
      // Filter out junk results (must have items OR phone/address)
      const validRegexResults = regexResults.filter(o => 
        (o.items && o.items.length > 0) || 
        (o.recipient?.phone && o.recipient.phone.length > 5) || 
        (o.recipient?.addressRaw && o.recipient.addressRaw.length > 5)
      );

      if (validRegexResults.length > 0) {
        setParsedOrders(validRegexResults);
        setIsInputCollapsed(true);
        setIsWarningBatch(true);
        const warningDesc = dict.intake.regex_warning;
          
        toast.warning(dict.intake.regex_recognized.replace('{count}', validRegexResults.length.toString()), {
          description: warningDesc
        });
      } else {
        toast.error(dict.intake.no_recognition, {
          description: dict.intake.no_recognition_desc,
          duration: 5000
        });
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    // Validate that we have at least name and items for each
    const validOrders = parsedOrders.filter(o => o.recipient?.name && o.items && o.items.length > 0);
    
    if (validOrders.length === 0) {
      toast.error(dict.intake.no_recognition + ' ' + dict.intake.no_recognition_desc);
      return;
    }

    try {
      // Map back to default tag if empty, default to "General" if still empty
      const finalOrders = validOrders.map(o => ({
        ...o,
        tag: o.tag || defaultTag || dict.common.general,
      })) as Omit<JastipOrder, 'id'>[];

      await onImport(finalOrders);
      setText('');
      setParsedOrders([]);
      toast.success(dict.intake.success_import.replace('{count}', finalOrders.length.toString()));
    } catch (err) {
      toast.error(dict.intake.error_import);
    }
  };

  const removeOrder = (index: number) => {
    setParsedOrders(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditOrder(null);
    }
  };

  const startEditing = (idx: number) => {
    setEditingIndex(idx);
    setEditOrder(JSON.parse(JSON.stringify(parsedOrders[idx])));
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditOrder(null);
  };

  const saveEditing = () => {
    if (editingIndex !== null && editOrder) {
      const newOrders = [...parsedOrders];
      newOrders[editingIndex] = editOrder;
      setParsedOrders(newOrders);
      setEditingIndex(null);
      setEditOrder(null);
      toast.success(dict.orders.success_update);
    }
  };

  const updateEditRecipient = (field: string, value: string) => {
    if (!editOrder) return;
    setEditOrder({
      ...editOrder,
      recipient: {
        ...(editOrder.recipient || {
          name: '', phone: '', addressRaw: '', provinsi: '', kota: '', kecamatan: '', kelurahan: '', kodepos: ''
        }),
        [field]: value
      }
    });
  };

  const updateEditItem = (idx: number, updatedItem: any) => {
    if (!editOrder || !editOrder.items) return;
    const newItems = [...editOrder.items];
    newItems[idx] = updatedItem;
    setEditOrder({ ...editOrder, items: newItems });
  };

  const removeItemEdit = (idx: number) => {
    if (!editOrder || !editOrder.items) return;
    setEditOrder({
      ...editOrder,
      items: editOrder.items.filter((_, i) => i !== idx)
    });
  };

  const addItemEdit = () => {
    if (!editOrder) return;
    const newItem = {
      id: crypto.randomUUID(),
      name: '',
      qty: 1,
      unitPrice: 0,
      totalPrice: 0,
      rawWeightKg: 0,
      isManualTotal: false
    };
    setEditOrder({
      ...editOrder,
      items: [...(editOrder.items || []), newItem]
    });
  };

  // Helper calculation functions from manual form logic
  const updateQuantity = (item: any, qty: number) => ({
    ...item,
    qty,
    totalPrice: qty * item.unitPrice
  });

  const updateUnitPrice = (item: any, unitPrice: number) => ({
    ...item,
    unitPrice,
    totalPrice: item.qty * unitPrice
  });

  const updateTotalPrice = (item: any, totalPrice: number) => ({
    ...item,
    totalPrice,
    unitPrice: item.qty > 0 ? Math.round(totalPrice / item.qty) : totalPrice
  });

  // ─── Render: Fullscreen Edit Mode ─────────────────────────────────────────
  if (editingIndex !== null && editOrder) {
    return (
      <div className="flex flex-col h-full bg-background animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sticky Header with Back Button */}
        <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-20">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full hover:bg-muted active:scale-95 transition-all" 
            onClick={cancelEditing}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col gap-0.5">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary/80">{dict.intake.edit_detail}</h3>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="font-bold bg-muted px-1.5 py-0.5 rounded text-foreground/70">#{editingIndex + 1}</span>
              <span className="truncate max-w-[150px]">{editOrder?.recipient?.name || dict.orders.empty_name}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Recipient Section */}
          <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
               <h4 className="text-[13px] font-bold flex items-center gap-2">
                 <span className="p-1 rounded bg-primary/10 text-primary"><ListPlus className="h-3.5 w-3.5" /></span>
                 {dict.orders.recipient_info}
               </h4>
             </div>

             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1.5">
                 <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{dict.orders.full_name}</Label>
                 <Input 
                   className="h-9 text-sm rounded-md" 
                   value={editOrder?.recipient?.name || ''} 
                   onChange={(e) => updateEditRecipient('name', e.target.value)}
                   placeholder={dict.common.edit === 'Edit' ? 'Name' : 'Nama'}
                 />
               </div>
               <div className="space-y-1.5">
                 <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{dict.orders.phone_number}</Label>
                 <Input 
                   className="h-9 text-sm rounded-md" 
                   value={editOrder?.recipient?.phone || ''} 
                   onChange={(e) => updateEditRecipient('phone', e.target.value)}
                   placeholder="0812..."
                 />
               </div>
             </div>
             <div className="space-y-3">
               <div className="space-y-1.5">
                 <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{dict.orders.address_detail}</Label>
                 <Textarea 
                   className="text-sm rounded-md bg-background border-border resize-none" 
                   rows={2}
                   value={editOrder?.recipient?.addressRaw || ''} 
                   onChange={(e) => updateEditRecipient('addressRaw', e.target.value)}
                   placeholder={dict.orders.address_placeholder}
                 />
               </div>

               <div className="space-y-1.5">
                 <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{dict.orders.search_location}</Label>
                 <LocationAutocomplete 
                   onSelect={(loc) => {
                     setEditOrder(prev => ({
                       ...prev!,
                       recipient: {
                         ...prev!.recipient!,
                         provinsi: loc.province_name,
                         kota: loc.city_name,
                         kecamatan: loc.district_name,
                         kelurahan: loc.subdistrict_name,
                         kodepos: loc.postal_code
                       }
                     }));
                   }}
                   defaultValue={editOrder?.recipient?.kelurahan ? `${editOrder.recipient!.kelurahan}, ${editOrder.recipient!.kodepos}` : ''}
                 />
               </div>

               {editOrder?.recipient?.provinsi && (
                 <div className="p-3 rounded-md bg-muted/20 border border-border/40 animate-in fade-in slide-in-from-top-1">
                    <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                      <div className="flex flex-col">
                         <span className="text-muted-foreground uppercase font-bold text-[9px]">{dict.orders.province}</span>
                         <span className="font-medium truncate">{editOrder.recipient!.provinsi}</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-muted-foreground uppercase font-bold text-[9px]">{dict.orders.city}</span>
                         <span className="font-medium truncate">{editOrder.recipient!.kota}</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-muted-foreground uppercase font-bold text-[9px]">{dict.orders.district}</span>
                         <span className="font-medium truncate">{editOrder.recipient!.kecamatan}</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-muted-foreground uppercase font-bold text-[9px]">{dict.orders.subdistrict}</span>
                         <span className="font-medium truncate">{editOrder.recipient!.kelurahan}</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border/20 flex items-baseline gap-1.5">
                      <span className="text-muted-foreground uppercase font-bold text-[9px]">{dict.orders.postal_code}</span>
                      <span className="font-mono font-bold text-primary">{editOrder.recipient!.kodepos}</span>
                    </div>
                 </div>
               )}
             </div>
          </div>

          <Separator className="opacity-40" />

          {/* Items Section */}
          <div className="space-y-4 pb-2">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[13px] font-bold flex items-center gap-2">
                <span className="p-1 rounded bg-primary/10 text-primary"><Plus className="h-3.5 w-3.5" /></span>
                {dict.orders.item_list}
              </h4>
              <Badge variant="secondary" className="font-mono text-[9px] px-1.5 h-4.5 rounded bg-primary/5 text-primary border-primary/10">
                {editOrder?.items?.length || 0} {(editOrder?.items?.length || 0) === 1 ? dict.common.items_count.split(' ')[1].toLowerCase() : dict.common.items_count_plural.split(' ')[1].toLowerCase()}
              </Badge>
            </div>

            <div className="space-y-5">
              {editOrder?.items?.map((item, i) => (
                <div key={item.id} className="group relative rounded-md border border-border bg-white dark:bg-muted/10 p-4 transition-all hover:border-primary/40">
                   <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200">
                     <Button 
                       variant="destructive" 
                       size="icon" 
                       className="h-7 w-7 rounded-md active:scale-90" 
                       onClick={() => removeItemEdit(i)}
                       disabled={editOrder.items!.length <= 1}
                     >
                       <Trash2 className="h-3.5 w-3.5" />
                     </Button>
                   </div>
                   
                   <div className="space-y-4">
                     <div>
                       <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight ml-0.5">{dict.intake.edit_item_desc}</Label>
                       <Input
                         value={item.name}
                         onChange={(e) => updateEditItem(i, { ...item, name: e.target.value })}
                         placeholder={dict.orders.item_name}
                         className="bg-muted/5 font-medium mt-1 h-9 border-transparent rounded-md text-sm"
                       />
                     </div>
                     
                     <div className="grid grid-cols-3 gap-3">
                       <div className="space-y-1">
                         <Label className="text-[9px] uppercase text-muted-foreground font-bold text-center block">Qty</Label>
                         <Input 
                           type="number" 
                           className="h-8 px-1.5 text-xs bg-background border-border/60 rounded-md text-center" 
                           value={item.qty}
                           onChange={(e) => updateEditItem(i, updateQuantity(item, parseInt(e.target.value) || 1))}
                         />
                       </div>
                       <div className="space-y-1">
                         <Label className="text-[9px] uppercase text-muted-foreground font-bold text-center block">{dict.intake.unit_price}</Label>
                          <Input 
                            type="text" 
                            className="h-8 px-2 text-xs bg-background border-border/60 rounded-md text-center" 
                            value={item.unitPrice ? formatNumber(item.unitPrice) : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/\./g, '');
                              const numberValue = parseInt(rawValue) || 0;
                              updateEditItem(i, updateUnitPrice(item, numberValue));
                            }}
                          />
                       </div>
                       <div className="space-y-1">
                         <Label className="text-[9px] uppercase text-muted-foreground font-bold text-center block">{dict.intake.total_price}</Label>
                          <Input 
                            type="text" 
                            className="h-8 px-1.5 text-xs bg-muted/20 border-border/60 rounded-md text-center" 
                            value={item.totalPrice ? formatNumber(item.totalPrice) : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/\./g, '');
                              const numberValue = parseInt(rawValue) || 0;
                              updateEditItem(i, updateTotalPrice(item, numberValue));
                            }}
                          />
                       </div>
                     </div>
                   </div>
                </div>
              ))}

              <Button 
                 variant="ghost" 
                 onClick={addItemEdit} 
                 className="w-full border border-dashed border-muted-foreground/20 rounded-md py-8 text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/40 transition-all group active:scale-[0.99]"
               >
                 <div className="flex flex-col items-center gap-1.5">
                   <Plus className="h-5 w-5 group-hover:scale-110 transition-transform p-1 rounded-full bg-muted/40 group-hover:bg-primary/10" /> 
                   <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{dict.intake.add_item}</span>
                 </div>
               </Button>
            </div>
          </div>
        </div>

        {/* Footer Action Bar - Sticky Bottom */}
        <div className="shrink-0 p-4 border-t bg-background flex gap-3 z-10 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
           <Button variant="outline" className="flex-1 h-10 rounded-md text-xs font-bold border-border/80 hover:bg-muted/50" onClick={cancelEditing}>
             {dict.common.cancel}
           </Button>
           <Button className="flex-[2] h-10 rounded-md text-xs font-bold bg-black hover:bg-black/90 text-white transition-all active:scale-98" onClick={saveEditing}>
             {dict.common.save}
           </Button>
        </div>
      </div>
    );
  }

  // ─── Render: List Mode (Input & Overview) ─────────────────────────────────
  // ─── Render: List Mode (Input & Overview) ─────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Sticky Input Header */}
        <div className="py-2 mb-4 px-5 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="wa-text" className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                {dict.intake.raw_text_label}
              </Label>
              {!isInputCollapsed && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="h-6 text-[10px] font-bold px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
                  onClick={handleSmartParse}
                  disabled={isParsing || !text.trim()}
                >
                  {isParsing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                  {dict.intake.process_button} (⌘ + ↵)
                </Button>
              )}
            </div>
            {parsedOrders.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-muted-foreground hover:text-foreground p-0 px-2"
                onClick={() => setIsInputCollapsed(!isInputCollapsed)}
              >
                {isInputCollapsed ? (
                  <><ChevronDown className="h-3 w-3 mr-1" /> {dict.intake.show_text}</>
                ) : (
                  <><ChevronUp className="h-3 w-3 mr-1" /> {dict.intake.hide_text}</>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4 px-5">
          <AnimatePresence initial={false}>
            {!isInputCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-4">
                  <Textarea
                    id="wa-text"
                    placeholder={dict.intake.placeholder}
                    className="min-h-[300px] max-h-[300px] font-mono text-sm w-full overflow-y-auto"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        if (text.trim() && !isParsing) handleSmartParse();
                      }
                    }}
                  />
                  
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-[0.98] rounded-md font-bold disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-500"
                    onClick={handleSmartParse}
                    disabled={isParsing || !text.trim()}
                  >
                    {isParsing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {isParsing ? dict.intake.processing : dict.intake.process_button}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {parsedOrders.length > 0 && (
          <div className="animate-in fade-in slide-in-from-top-2 w-full">
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 flex items-center justify-between py-2.5 px-5 border-b mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <h4 className="text-sm font-bold flex items-center gap-2">
                {dict.intake.preview_title}
                <Badge variant="secondary">{parsedOrders.length}</Badge>
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive h-7 hover:bg-destructive/10"
                onClick={() => {
                  setParsedOrders([]);
                  setIsInputCollapsed(false);
                }}
              >
                {dict.intake.reset}
              </Button>
            </div>

            <div className="space-y-4 px-5 pb-5">
              {parsedOrders.map((order, idx) => {
                const confidence = getParsingConfidence(order);
                const isLocationMissing = !order.recipient?.kelurahan || !order.recipient?.kecamatan || !order.recipient?.kota || !order.recipient?.provinsi || !order.recipient?.kodepos;
                const isMissingPhone = !order.recipient?.phone;
                const isMissingAddress = !order.recipient?.addressRaw;
                const isMissingItems = !order.items?.length;
                const hasUnpricedItems = order.items?.some(item => item.unitPrice === 0) ?? false;
                const isIncomplete = !order.recipient?.name || isMissingPhone || isMissingAddress || isLocationMissing || isMissingItems;
                const isItemMismatch = (order.metadata?.potentialItemCount || 0) > (order.items?.length || 0);
                const showWarning = confidence < 0.8 || isIncomplete || isItemMismatch || hasUnpricedItems;

                return (
                  <div key={idx} className={cn(
                    "border rounded-md bg-background relative transition-all overflow-hidden hover:border-primary/20 p-3 group",
                    showWarning && "bg-destructive/[0.03] border-destructive/20 dark:bg-destructive/10 dark:border-destructive/40 shadow-[inset_0_0_12px_rgba(239,68,68,0.02)]"
                  )}>
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => startEditing(idx)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeOrder(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1 pr-6 group-hover:pr-16 transition-all duration-200">
                            {showWarning ? (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 dark:border-destructive/40 animate-pulse shrink-0">
                                <AlertTriangle className="h-3 w-3 text-destructive" />
                                <span className="text-[10px] font-bold text-destructive uppercase tracking-tighter">{dict.wizard.not_ready}</span>
                              </div>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                            )}
                            <span className="text-sm font-bold break-words truncate">{order.recipient?.name || dict.orders.empty_name}</span>
                            {/* Phone — inline beside name (original position) */}
                            {isMissingPhone ? (
                              <div className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 shrink-0">
                                <AlertCircle className="h-2.5 w-2.5" />
                                {dict.wizard.phone_missing}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground shrink-0 transition-all duration-200">• {order.recipient?.phone}</span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-1 shrink-0 group-hover:opacity-0 transition-all duration-200">
                            {order.metadata?.isAiParsed && (
                              <Badge variant="outline" className="text-[8px] px-1 h-3.5 bg-amber-50 text-amber-600 border-amber-200 uppercase font-black tracking-tighter">AI</Badge>
                            )}
                            <div className="text-[10px] font-black text-muted-foreground/30 font-mono tracking-widest uppercase">
                              #{(idx + 1).toString().padStart(2, '0')}
                            </div>
                          </div>
                        </div>
                        
                        {/* Address — inline warning at field position */}
                        {isMissingAddress ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold mb-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded border border-amber-200 dark:border-amber-900/40">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{dict.intake.regex_warning.split('.')[0]}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground/80 leading-snug mb-2 break-words">
                            {order.recipient?.addressRaw}
                          </div>
                        )}

                        {!isLocationMissing ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-primary/80 font-medium mb-3 bg-primary/[0.03] w-fit px-2 py-0.5 rounded border border-primary/10">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate text-wrap overflow-visible">
                              {order.recipient?.kelurahan}, {order.recipient?.kecamatan}, {order.recipient?.kota}, {order.recipient?.provinsi} {order.recipient?.kodepos}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] text-destructive/80 font-bold mb-3 bg-destructive/[0.03] w-fit px-2 py-0.5 rounded border border-destructive/10">
                            <AlertCircle className="h-3 w-3" />
                          <span>{dict.wizard.location_missing}</span>
                        </div>
                        )}
                        
                        {isItemMismatch && (
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-700 font-bold mb-2 bg-amber-50 dark:bg-amber-900/20 w-fit px-2 py-1 rounded border border-amber-200 dark:border-amber-900/40">
                            <Sparkles className="h-3 w-3 text-amber-600" />
                            <span>{dict.intake.item_mismatch.replace('{found}', (order.items?.length || 0).toString()).replace('{total}', (order.metadata?.potentialItemCount || 0).toString())}</span>
                          </div>
                        )}

                        {/* Items — inline no-items warning or chip list */}
                        {isMissingItems ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded border border-amber-200 dark:border-amber-900/40">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{dict.wizard.items_empty}</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {hasUnpricedItems && (
                              <div className="flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 mb-0.5 w-full">
                                <AlertCircle className="h-2.5 w-2.5" />
                                {dict.intake.unpriced_item}
                              </div>
                            )}
                            {order.items?.map((item, i) => (
                              <Badge key={i} variant="outline" className={cn(
                                "text-[10px] font-normal py-0",
                                item.unitPrice === 0 && "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                              )}>
                                {item.qty}x {item.name}{item.unitPrice > 0 ? ` @${formatNumber(item.unitPrice)}` : ` ${dict.intake.price_query}`}
                              </Badge>
                            ))}
                          </div>
                        )}
                  </div>
                );
              })}
            
              <div className="space-y-4 mt-6">
                <div className="relative bg-white dark:bg-muted/10 p-3 rounded-md space-y-2 border border-border">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
                    <Label htmlFor="tag-paste" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      {dict.orders.tag_event}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="opacity-40 hover:opacity-100 transition-opacity focus:outline-hidden">
                            <Info className="h-3 w-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" side="right" align="center">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {dict.orders.tag_help}
                          </p>
                        </PopoverContent>
                      </Popover>
                    </Label>
                  </div>
                  <TagAutocomplete 
                    id="whatsapp-tag-autocomplete"
                    value={defaultTag}
                    onChange={setDefaultTag}
                    activeTags={activeTags}
                  />
                </div>

                <Button className="w-full font-bold h-10 rounded-md active:scale-[0.99] transition-all bg-foreground hover:bg-foreground/90 text-background" onClick={handleImport}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {dict.intake.import_now} ({parsedOrders.length})
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
