'use client';

import { useState } from 'react';
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
import { Trash2, Plus, FileSpreadsheet, MessageSquare, ListPlus, X, Info } from 'lucide-react';
import { JastipOrder, JastipItem } from '@/lib/types';
import { updateUnitPrice, updateTotalPrice, updateQuantity } from '@/lib/pricing';
import { toast } from 'sonner';
import { ExcelUpload } from './excel-upload';
import { WhatsAppPaste } from './whatsapp-paste';
import { LocationAutocomplete } from './location-autocomplete';
import { TagAutocomplete } from './tag-autocomplete';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { getParserConfig } from '@/lib/config-actions';

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

  // Filter tags that have active (unassigned) orders
  const activeTags = allTagsData
    .filter((t) => t.unassigned > 0)
    .map((t) => t.name); // Returns string[] for autocomplete

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
      toast.error('Minimal 1 barang diperlukan');
      return;
    }

    try {
      await onSave({ ...formData, tag: finalTag, createdAt: Date.now() });
      toast.success('Pesanan berhasil ditambahkan');
      setFormData(createEmptyOrder());
      // Suggest: Don't auto close if user wants to add multiple? 
      // User requested "friendly", maybe clear and stay open or close? 
      // For now, let's keep common behavior: close on success.
      onOpenChange(false);
    } catch (err) {
      toast.error('Gagal menyimpan pesanan');
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
        className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-background border-l overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        {/* ── Compact Header ── */}
        <div className="flex items-center justify-between px-6 py-2 border-b bg-background/95 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Plus className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Tambah Pesanan Baru</h2>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider opacity-70">
                Input batch atau manual
              </p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 bg-muted/40 hover:bg-destructive hover:text-white transition-all duration-200 border border-transparent active:scale-95 flex items-center justify-center p-0 rounded-full"
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
                      {tabValue === 'excel' && <FileSpreadsheet className="h-3.5 w-3.5" />}
                      {tabValue === 'whatsapp' && <MessageSquare className="h-3.5 w-3.5" />}
                      {tabValue.charAt(0).toUpperCase() + tabValue.slice(1)}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          )}

          {/* ── Content Area ── */}
          {methods.includes('manual') && (
            <TabsContent value="manual" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden">
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pt-4 pb-2 bg-muted/5">
                <div className="animate-in fade-in duration-200 space-y-4">
                  <div className="relative bg-white dark:bg-muted/10 p-3 rounded-md space-y-2 border border-border">
                     <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
                      <Label htmlFor="tag-panel" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        Tag / Nama Event
                        <Popover>
                          <PopoverTrigger asChild>
                             <button type="button" className="opacity-40 hover:opacity-100 transition-opacity focus:outline-hidden">
                               <Info className="h-3 w-3" />
                             </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" side="right" align="center">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Jika dikosongkan, pesanan akan otomatis diberi tag <span className="font-semibold text-foreground">"General"</span>.
                            </p>
                          </PopoverContent>
                        </Popover>
                      </Label>
                    </div>
                    <TagAutocomplete 
                      value={formData.tag}
                      onChange={updateTag}
                      activeTags={activeTags}
                    />
                  </div>

                <Separator className="opacity-40" />

                {/* Recipient Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[13px] font-bold flex items-center gap-2">
                       <span className="p-1 rounded bg-primary/10 text-primary"><ListPlus className="h-3.5 w-3.5" /></span>
                       Informasi Penerima
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nama Penerima</Label>
                      <Input
                        value={formData.recipient.name}
                        onChange={(e) => updateRecipient('name', e.target.value)}
                        placeholder="Nama"
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">No. WhatsApp</Label>
                      <Input
                        value={formData.recipient.phone}
                        onChange={(e) => updateRecipient('phone', e.target.value)}
                        placeholder="08..."
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Alamat (Jalan, No Rumah, RT/RW)</Label>
                    <Textarea
                      value={formData.recipient.addressRaw}
                      onChange={(e) => updateRecipient('addressRaw', e.target.value)}
                      placeholder="Tulis detail alamat (cth: Jl. Melati No. 5)"
                      rows={2}
                      className="rounded-md resize-none bg-background border-border text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Cari Area / Kode Pos</Label>
                    <LocationAutocomplete 
                      onSelect={(loc) => {
                        setFormData(prev => ({
                          ...prev,
                          recipient: {
                            ...prev.recipient,
                            provinsi: loc.province_name,
                            kota: loc.city_name,
                            kecamatan: loc.district_name,
                            kelurahan: loc.subdistrict_name,
                            kodepos: loc.postal_code
                          }
                        }));
                      }}
                      defaultValue={formData.recipient.kelurahan ? `${formData.recipient.kelurahan}, ${formData.recipient.kodepos}` : ''}
                    />
                  </div>

                  {formData.recipient.provinsi && (
                    <div className="p-3 rounded-md bg-muted/20 border border-border/40 animate-in fade-in slide-in-from-top-1">
                       <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                         <div className="flex flex-col">
                            <span className="text-muted-foreground uppercase font-bold text-[9px]">Provinsi</span>
                            <span className="font-medium">{formData.recipient.provinsi}</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-muted-foreground uppercase font-bold text-[9px]">Kota/Kabupaten</span>
                            <span className="font-medium">{formData.recipient.kota}</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-muted-foreground uppercase font-bold text-[9px]">Kecamatan</span>
                            <span className="font-medium">{formData.recipient.kecamatan}</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-muted-foreground uppercase font-bold text-[9px]">Kelurahan</span>
                            <span className="font-medium">{formData.recipient.kelurahan}</span>
                         </div>
                       </div>
                       <div className="mt-2 pt-2 border-t border-border/20 flex items-baseline gap-1.5">
                         <span className="text-muted-foreground uppercase font-bold text-[9px]">Kode Pos</span>
                         <span className="font-mono font-bold text-primary">{formData.recipient.kodepos}</span>
                       </div>
                    </div>
                  )}
                </div>

                <Separator className="opacity-40" />

                {/* Items Section */}
                <div className="space-y-5 pb-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[13px] font-bold flex items-center gap-2">
                       <span className="p-1 rounded bg-primary/10 text-primary"><Plus className="h-3.5 w-3.5" /></span>
                       Daftar Barang
                    </h4>
                    <Badge variant="secondary" className="font-mono text-[9px] px-1.5 h-4.5 rounded bg-primary/5 text-primary border-primary/10">
                      {formData.items.length} {formData.items.length === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>

                  <div className="space-y-5">
                    {formData.items.map((item, index) => (
                      <div key={item.id} className="group relative rounded-md border border-border bg-white dark:bg-muted/10 p-4 transition-all hover:border-primary/40">
                        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-7 w-7 rounded-md active:scale-90"
                            onClick={() => removeItem(index)}
                            disabled={formData.items.length <= 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight ml-0.5">Deskripsi Barang</Label>
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(index, { ...item, name: e.target.value })}
                              placeholder="Contoh: Starbucks Tumbler"
                              className="bg-muted/5 font-medium mt-1 h-9 border-transparent rounded-lg text-sm"
                            />
                          </div>
                          
                          <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase text-muted-foreground font-bold text-center block">Qty</Label>
                              <Input
                                type="number"
                                className="h-8 px-1.5 text-xs bg-background border-border/60 rounded-lg text-center"
                                value={item.qty}
                                onChange={(e) => updateItem(index, updateQuantity(item, parseInt(e.target.value) || 1))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase text-muted-foreground font-bold text-center block">Harga</Label>
                              <Input
                                type="number"
                                className="h-8 px-2 text-xs bg-background border-border/60 rounded-lg text-center"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, updateUnitPrice(item, parseFloat(e.target.value) || 0))}
                              />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] uppercase text-muted-foreground font-bold text-center block">Total Harga</Label>
                              <Input
                                type="number"
                                className="h-8 px-1.5 text-xs bg-muted/20 border-border/60 rounded-lg text-center"
                                value={item.totalPrice}
                                onChange={(e) => updateItem(index, updateTotalPrice(item, parseFloat(e.target.value) || 0))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase text-muted-foreground font-bold text-center block">Berat</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  step={0.1}
                                  className="h-8 pl-1.5 pr-6 text-xs bg-background border-border/60 rounded-lg text-center"
                                  value={item.rawWeightKg}
                                  onChange={(e) => updateItem(index, { ...item, rawWeightKg: parseFloat(e.target.value) || 0 })}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium pointer-events-none">
                                  kg
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button 
                      variant="ghost" 
                      onClick={addItem} 
                      className="w-full border border-dashed border-muted-foreground/20 rounded-md py-8 text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/40 transition-all group active:scale-[0.99]"
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <Plus className="h-5 w-5 group-hover:scale-110 transition-transform p-1 rounded-full bg-muted/40 group-hover:bg-primary/10" /> 
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Tambah Item Baru</span>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* ── Action Footer ── */}
            <div className="shrink-0 p-5 bg-background border-t flex gap-3 z-30">
              <Button variant="outline" className="flex-1 h-10 rounded-lg text-xs font-bold border-border/80 hover:bg-muted/50" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button className="flex-[2] h-10 rounded-md text-xs font-bold bg-primary hover:bg-primary/95 transition-all active:scale-98" onClick={handleSaveManual}>
                Simpan Pesanan
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
