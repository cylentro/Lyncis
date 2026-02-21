'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus } from 'lucide-react';
import { JastipOrder, JastipItem } from '@/lib/types';
import { updateUnitPrice, updateTotalPrice, updateQuantity } from '@/lib/pricing';

// ─── Props ──────────────────────────────────────────────────

interface OrderEditDialogProps {
  order: JastipOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: JastipOrder) => void;
  activeTags?: string[];
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

// ─── Component ──────────────────────────────────────────────

export function OrderEditDialog({
  order,
  open,
  onOpenChange,
  onSave,
  activeTags = [],
}: OrderEditDialogProps) {
  const [formData, setFormData] = useState<JastipOrder | null>(null);

  // Sync form data when dialog opens with new order
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

  if (!formData) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  // ─── Recipient Handlers ───────────────────────────────────

  const updateRecipient = (field: string, value: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        recipient: { ...prev.recipient, [field]: value },
      };
    });
  };

  // ─── Tag Handler ──────────────────────────────────────────

  const updateTag = (value: string) => {
    setFormData((prev) => (prev ? { ...prev, tag: value } : prev));
  };

  // ─── Item Handlers (with Circular Pricing) ────────────────

  const updateItem = (index: number, updatedItem: JastipItem) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[index] = updatedItem;
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, items: [...prev.items, createEmptyItem()] };
    });
  };

  const removeItem = (index: number) => {
    setFormData((prev) => {
      if (!prev) return prev;
      if (prev.items.length <= 1) return prev; // Minimum 1 item
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items };
    });
  };

  const handleItemNameChange = (index: number, value: string) => {
    const item = formData.items[index];
    updateItem(index, { ...item, name: value });
  };

  const handleQtyChange = (index: number, value: number) => {
    const item = formData.items[index];
    updateItem(index, updateQuantity(item, value));
  };

  const handleUnitPriceChange = (index: number, value: number) => {
    const item = formData.items[index];
    updateItem(index, updateUnitPrice(item, value));
  };

  const handleTotalPriceChange = (index: number, value: number) => {
    const item = formData.items[index];
    updateItem(index, updateTotalPrice(item, value));
  };

  const handleWeightChange = (index: number, value: number) => {
    const item = formData.items[index];
    updateItem(index, { ...item, rawWeightKg: value });
  };

  // ─── Save Handler ─────────────────────────────────────────

  const handleSave = () => {
    if (formData) {
      onSave(formData);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Pesanan</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] pr-4">
          <div className="space-y-6 pb-4">
            {/* ── Section: Tag ─────────────────────────────── */}
            <div>
              <Label htmlFor="tag" className="text-sm font-semibold">
                Tag / Nama Event
              </Label>
              <Input
                id="tag"
                value={formData.tag}
                onChange={(e) => updateTag(e.target.value)}
                placeholder="Contoh: BKK-MAY-2025"
                className="mt-1.5"
              />
              {activeTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {activeTags
                    .filter(
                      (t) =>
                        t !== formData.tag &&
                        t.toLowerCase().includes(formData.tag.toLowerCase())
                    )
                    .map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateTag(t)}
                        className="rounded-md border bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <Separator />

            {/* ── Section: Penerima (Recipient) ───────────── */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Penerima</h4>
              <div className="grid gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="name" className="text-xs">
                      Nama Penerima
                    </Label>
                    <Input
                      id="name"
                      value={formData.recipient.name}
                      onChange={(e) => updateRecipient('name', e.target.value)}
                      placeholder="Nama lengkap"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-xs">
                      No. Telepon
                    </Label>
                    <Input
                      id="phone"
                      value={formData.recipient.phone}
                      onChange={(e) => updateRecipient('phone', e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address" className="text-xs">
                    Alamat Lengkap
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.recipient.addressRaw}
                    onChange={(e) =>
                      updateRecipient('addressRaw', e.target.value)
                    }
                    placeholder="Alamat lengkap penerima"
                    rows={2}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Provinsi</Label>
                    <Input
                      value={formData.recipient.provinsi}
                      onChange={(e) =>
                        updateRecipient('provinsi', e.target.value)
                      }
                      placeholder="Provinsi"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Kota / Kabupaten</Label>
                    <Input
                      value={formData.recipient.kota}
                      onChange={(e) => updateRecipient('kota', e.target.value)}
                      placeholder="Kota"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Kecamatan</Label>
                    <Input
                      value={formData.recipient.kecamatan}
                      onChange={(e) =>
                        updateRecipient('kecamatan', e.target.value)
                      }
                      placeholder="Kecamatan"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Kelurahan</Label>
                    <Input
                      value={formData.recipient.kelurahan}
                      onChange={(e) =>
                        updateRecipient('kelurahan', e.target.value)
                      }
                      placeholder="Kelurahan"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="w-32">
                  <Label className="text-xs">Kode Pos</Label>
                  <Input
                    value={formData.recipient.kodepos}
                    onChange={(e) =>
                      updateRecipient('kodepos', e.target.value)
                    }
                    placeholder="Kode pos"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Section: Barang (Items) ─────────────────── */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Barang</h4>
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-md border bg-muted/20 p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Item #{index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive hover:text-white transition-all shadow-none"
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div>
                      <Label className="text-xs">Nama Barang</Label>
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          handleItemNameChange(index, e.target.value)
                        }
                        placeholder="Nama barang"
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) =>
                            handleQtyChange(index, parseInt(e.target.value) || 1)
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Harga Satuan</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUnitPriceChange(
                              index,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Total Harga</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.totalPrice}
                          onChange={(e) =>
                            handleTotalPriceChange(
                              index,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Berat (kg)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={item.rawWeightKg}
                          onChange={(e) =>
                            handleWeightChange(
                              index,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Barang
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
