'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Trash2,
  Plus,
  Package,
  MapPin,
  Tag as TagIcon,
  Info,
  Truck,
  Scale,
  Maximize2
} from 'lucide-react';
import { JastipOrder, JastipItem } from '@/lib/types';
import { updateUnitPrice, updateTotalPrice, updateQuantity } from '@/lib/pricing';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TagAutocomplete } from '@/components/lyncis/intake/tag-autocomplete';
import { LocationAutocomplete } from '@/components/lyncis/intake/location-autocomplete';
import { cn } from '@/lib/utils';

// ─── Props ──────────────────────────────────────────────────

interface OrderFormContentProps<T extends JastipOrder | Omit<JastipOrder, 'id'>> {
  formData: T;
  setFormData: (updater: (prev: T) => T) => void;
  activeTags?: string[];
  readOnly?: boolean;
}

// ─── Component ──────────────────────────────────────────────

export function OrderFormContent<T extends JastipOrder | Omit<JastipOrder, 'id'>>({
  formData,
  setFormData,
  activeTags = [],
  readOnly = false,
}: OrderFormContentProps<T>) {

  // ─── Handlers ──────────────────────────────────────────────

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
      items: [
        ...prev.items,
        {
          id: uuidv4(),
          name: '',
          qty: 1,
          unitPrice: 0,
          totalPrice: 0,
          rawWeightKg: 0,
          isManualTotal: false,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });
  };

  const updateLogistics = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      logistics: { ...prev.logistics, [field]: value },
    }));
  };

  const updateDimensions = (field: 'l' | 'w' | 'h', value: number) => {
    setFormData((prev) => ({
      ...prev,
      logistics: {
        ...prev.logistics,
        dimensions: { ...prev.logistics.dimensions, [field]: value },
      },
    }));
  };

  // ─── Automatic Weight Calculation ───
  useEffect(() => {
    const { l, w, h } = formData.logistics.dimensions;
    const volumetricWeight = (l * w * h) / 6000;
    const itemWeight = formData.items.reduce((sum, item) => sum + (item.rawWeightKg * item.qty), 0);
    const finalPackedWeight = formData.logistics.finalPackedWeight || itemWeight;
    const chargeableWeight = Math.max(finalPackedWeight, volumetricWeight);

    if (
      volumetricWeight !== formData.logistics.volumetricWeight ||
      chargeableWeight !== formData.logistics.chargeableWeight
    ) {
      setFormData(prev => ({
        ...prev,
        logistics: {
          ...prev.logistics,
          volumetricWeight,
          chargeableWeight
        }
      }));
    }
  }, [formData.logistics.dimensions, formData.items, formData.logistics.finalPackedWeight]);

  return (
    <div className={cn("space-y-8", !readOnly && "pb-32")}>
      {/* ── Section: Tag ── */}
      <div className="relative bg-white dark:bg-muted/10 p-4 rounded-xl space-y-3 border border-border/50 shadow-none">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <TagIcon className="h-4 w-4" />
          </div>
          <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Tag / Nama Event</Label>
          {!readOnly && (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="opacity-40 hover:opacity-100 transition-opacity focus:outline-hidden ml-auto">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" side="right" align="center">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tag membantu Anda mengelompokkan pesanan berdasarkan batch pengiriman atau event. 
                  Jika dikosongkan, akan diset ke <span className="font-semibold text-foreground">"General"</span>.
                </p>
              </PopoverContent>
            </Popover>
          )}
        </div>
        {readOnly ? (
            <div className="px-1 text-sm font-black text-primary uppercase tracking-wider">{formData.tag || 'General'}</div>
        ) : (
            <TagAutocomplete
              value={formData.tag}
              onChange={updateTag}
              activeTags={activeTags}
            />
        )}
      </div>

      <Separator className="opacity-50" />

      {/* ── Section: Recipient ── */}
      <div className="space-y-6">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MapPin className="h-4 w-4" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Informasi Penerima</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-5 rounded-2xl border border-border/50">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nama Lengkap</Label>
            {readOnly ? (
               <div className="text-sm font-black px-1">{formData.recipient.name || '—'}</div>
            ) : (
                <Input
                  value={formData.recipient.name}
                  onChange={(e) => updateRecipient('name', e.target.value)}
                  placeholder="Contoh: John Doe"
                  className="h-10 bg-background border-muted-foreground/20 rounded-xl"
                />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">No. WhatsApp</Label>
            {readOnly ? (
                <div className="text-sm font-bold font-mono px-1">{formData.recipient.phone || '—'}</div>
            ) : (
                <Input
                  value={formData.recipient.phone}
                  onChange={(e) => updateRecipient('phone', e.target.value)}
                  placeholder="081234567890"
                  className="h-10 bg-background border-muted-foreground/20 rounded-xl"
                />
            )}
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Alamat (Jalan, No. Rumah, RT/RW)</Label>
            {readOnly ? (
                <div className="text-sm font-medium italic opacity-80 px-1 leading-relaxed">{formData.recipient.addressRaw || '—'}</div>
            ) : (
                <Textarea
                  value={formData.recipient.addressRaw}
                  onChange={(e) => updateRecipient('addressRaw', e.target.value)}
                  placeholder="Tulis detail alamat pengiriman..."
                  rows={2}
                  className="bg-background border-muted-foreground/20 rounded-xl text-sm resize-none"
                />
            )}
          </div>

          {!readOnly && (
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Cari Kelurahan / Area / Kode Pos</Label>
                <LocationAutocomplete
                  onSelect={(loc) => {
                    setFormData((prev) => ({
                      ...prev,
                      recipient: {
                        ...prev.recipient,
                        provinsi: loc.province_name,
                        kota: loc.city_name,
                        kecamatan: loc.district_name,
                        kelurahan: loc.subdistrict_name,
                        kodepos: loc.postal_code,
                      },
                    }));
                  }}
                  defaultValue={formData.recipient.kelurahan ? `${formData.recipient.kelurahan}, ${formData.recipient.kodepos}` : ''}
                />
              </div>
          )}

          {formData.recipient.provinsi && (
            <div className="sm:col-span-2 p-4 rounded-xl bg-background/50 border border-border/50 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-y-3 text-[11px]">
                <div className="flex flex-col">
                  <span className="text-muted-foreground uppercase font-black text-[9px]">Provinsi</span>
                  <span className="font-bold">{formData.recipient.provinsi}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground uppercase font-black text-[9px]">Kota/Kabupaten</span>
                  <span className="font-bold">{formData.recipient.kota}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground uppercase font-black text-[9px]">Kecamatan</span>
                  <span className="font-bold">{formData.recipient.kecamatan}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground uppercase font-black text-[9px]">Kelurahan</span>
                  <span className="font-bold">{formData.recipient.kelurahan}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/20 flex items-center gap-2">
                <Badge variant="outline" className="font-mono font-black text-primary bg-primary/5 border-primary/20">
                  {formData.recipient.kodepos}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* ── Section: Items ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Daftar Barang</span>
          </div>
          <Badge variant="secondary" className="font-black text-[10px] px-2 h-5 bg-primary/5 text-primary border-primary/10 tracking-widest">
            {formData.items.length} ITEM
          </Badge>
        </div>

        <div className="space-y-4">
          {formData.items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                  "group relative rounded-2xl border border-border bg-muted/10 p-5 transition-all",
                  !readOnly && "hover:bg-muted/20 hover:border-primary/30"
              )}
            >
              {!readOnly && (
                  <div className="absolute -top-2 -right-2 z-20 transition-all duration-300">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 rounded-full shadow-lg active:scale-90 bg-destructive opacity-100"
                      onClick={() => removeItem(index)}
                      disabled={formData.items.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Nama Barang</Label>
                  {readOnly ? (
                      <div className="text-sm font-black px-1 mt-1">{item.name}</div>
                  ) : (
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(index, { ...item, name: e.target.value })}
                        placeholder="Contoh: Starbucks Tumbler"
                        className="h-10 bg-background border-muted-foreground/20 rounded-xl font-medium mt-1"
                      />
                  )}
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase font-black text-muted-foreground text-center block">Qty</Label>
                    {readOnly ? (
                        <div className="text-xs font-black text-center mt-1">x{item.qty}</div>
                    ) : (
                        <Input
                          type="number"
                          className="h-9 bg-background border-muted-foreground/20 rounded-xl text-center font-bold"
                          value={item.qty}
                          onChange={(e) => updateItem(index, updateQuantity(item, parseInt(e.target.value) || 1))}
                        />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase font-black text-muted-foreground text-center block">Harga</Label>
                    {readOnly ? (
                        <div className="text-xs font-bold text-center mt-1">{item.unitPrice.toLocaleString('id-ID')}</div>
                    ) : (
                        <Input
                          type="number"
                          className="h-9 bg-background border-muted-foreground/20 rounded-xl text-center font-bold"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, updateUnitPrice(item, parseFloat(e.target.value) || 0))}
                        />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase font-black text-muted-foreground text-center block">Total</Label>
                    {readOnly ? (
                        <div className="text-xs font-black text-center mt-1 text-primary">{item.totalPrice.toLocaleString('id-ID')}</div>
                    ) : (
                        <Input
                          type="number"
                          className="h-9 bg-muted/30 border-muted-foreground/20 rounded-xl text-center font-bold text-primary"
                          value={item.totalPrice}
                          onChange={(e) => updateItem(index, updateTotalPrice(item, parseFloat(e.target.value) || 0))}
                        />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase font-black text-muted-foreground text-center block">Berat (kg)</Label>
                    {readOnly ? (
                        <div className="text-xs font-bold text-center mt-1">{item.rawWeightKg}kg</div>
                    ) : (
                        <Input
                          type="number"
                          step={0.1}
                          className="h-9 bg-background border-muted-foreground/20 rounded-xl text-center font-bold"
                          value={item.rawWeightKg}
                          onChange={(e) => updateItem(index, { ...item, rawWeightKg: parseFloat(e.target.value) || 0 })}
                        />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {!readOnly && (
              <Button
                variant="ghost"
                onClick={addItem}
                className="w-full border-2 border-dashed border-muted-foreground/10 rounded-2xl py-10 transition-all hover:bg-primary/5 hover:border-primary/40 group active:scale-[0.99]"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Tambah Barang</span>
                </div>
              </Button>
          )}
        </div>
      </div>

      {/* 
      <Separator className="opacity-50" />

      // ── Section: Logistics ──
      <div className="space-y-6">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck className="h-4 w-4" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Logistik & Packing</span>
        </div>

        <div className="bg-muted/20 p-6 rounded-2xl border border-border/50 space-y-6">
           // Origin Selection
           <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Asal Pengiriman (Warehouse)</Label>
              {readOnly ? (
                  <div className="text-sm font-black px-1">{formData.logistics.originId || 'Singapore Warehouse (Default)'}</div>
              ) : (
                  <Select 
                    value={formData.logistics.originId || ''} 
                    onValueChange={(val) => updateLogistics('originId', val)}
                  >
                      <SelectTrigger className="h-11 rounded-xl bg-background border-muted-foreground/20">
                          <SelectValue placeholder="Pilih Warehouse Asal" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="SG-WH-01">Singapore Warehouse (Default)</SelectItem>
                          <SelectItem value="TH-WH-01">Thailand Warehouse</SelectItem>
                          <SelectItem value="MY-WH-01">Malaysia Warehouse</SelectItem>
                      </SelectContent>
                  </Select>
              )}
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Berat Packing (KG)</Label>
                {readOnly ? (
                    <div className="text-sm font-black px-1">{formData.logistics.finalPackedWeight || formData.items.reduce((sum, i) => sum + (i.rawWeightKg * i.qty), 0)} KG</div>
                ) : (
                    <div className="relative">
                      <Input 
                        type="number"
                        step={0.1}
                        value={formData.logistics.finalPackedWeight}
                        onChange={(e) => updateLogistics('finalPackedWeight', parseFloat(e.target.value) || 0)}
                        className="h-10 bg-background border-muted-foreground/20 rounded-xl font-bold pr-10"
                      />
                      <Scale className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                    </div>
                )}
                {!readOnly && <p className="text-[9px] text-muted-foreground italic ml-1">* Kosongkan untuk menggunakan berat items</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Dimensi (L x W x H cm)</Label>
                {readOnly ? (
                    <div className="text-sm font-black px-1">
                        {formData.logistics.dimensions.l} x {formData.logistics.dimensions.w} x {formData.logistics.dimensions.h} cm
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-1">
                        <Input 
                          placeholder="L" 
                          type="number" 
                          value={formData.logistics.dimensions.l} 
                          onChange={(e) => updateDimensions('l', parseInt(e.target.value) || 0)}
                          className="h-10 text-center rounded-xl bg-background border-muted-foreground/20 text-xs p-1" 
                        />
                        <Input 
                          placeholder="W" 
                          type="number" 
                          value={formData.logistics.dimensions.w} 
                          onChange={(e) => updateDimensions('w', parseInt(e.target.value) || 0)}
                          className="h-10 text-center rounded-xl bg-background border-muted-foreground/20 text-xs p-1" 
                        />
                        <Input 
                          placeholder="H" 
                          type="number" 
                          value={formData.logistics.dimensions.h} 
                          onChange={(e) => updateDimensions('h', parseInt(e.target.value) || 0)}
                          className="h-10 text-center rounded-xl bg-background border-muted-foreground/20 text-xs p-1" 
                        />
                    </div>
                )}
              </div>
           </div>

           // Metrics
           <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-primary/[0.03] border border-primary/10 flex flex-col justify-center">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Volumetric Weight</span>
                  <div className="flex items-center gap-2">
                      <Maximize2 className="h-3.5 w-3.5 text-primary/60" />
                      <span className="text-sm font-black text-primary">{formData.logistics.volumetricWeight.toFixed(2)} KG</span>
                  </div>
              </div>
              <div className="p-4 rounded-2xl bg-foreground text-background shadow-lg shadow-foreground/10 flex flex-col justify-center">
                  <span className="text-[9px] font-black uppercase opacity-50 tracking-widest leading-none mb-1">Chargeable Weight</span>
                  <div className="flex items-center gap-2">
                      <Scale className="h-3.5 w-3.5 opacity-60" />
                      <span className="text-sm font-black">{formData.logistics.chargeableWeight.toFixed(2)} KG</span>
                  </div>
              </div>
           </div>
        </div>
      </div>
      */}
    </div>
  );
}
