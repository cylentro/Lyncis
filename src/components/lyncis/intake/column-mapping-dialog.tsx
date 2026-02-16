'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TARGET_FIELDS, saveMappingForHash, loadSavedMapping } from '@/lib/header-mapper';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info } from 'lucide-react';

interface ColumnMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headers: string[];
  rows: Record<string, string>[];
  headerHash: string;
  onConfirm: (mapping: Record<string, string>) => void;
}

export function ColumnMappingDialog({
  open,
  onOpenChange,
  headers,
  rows,
  headerHash,
  onConfirm,
}: ColumnMappingDialogProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Load existing mapping if available
  useEffect(() => {
    if (open && headerHash) {
      const saved = loadSavedMapping(headerHash);
      if (saved) {
        setMapping(saved);
      } else {
        // Simple auto-match based on label substring
        const initial: Record<string, string> = {};
        TARGET_FIELDS.forEach((target) => {
          const match = headers.find(
            (h) =>
              h.toLowerCase().includes(target.label.toLowerCase()) ||
              target.key.toLowerCase().includes(h.toLowerCase())
          );
          if (match) initial[target.key] = match;
        });
        setMapping(initial);
      }
    }
  }, [open, headerHash, headers]);

  const handleConfirm = () => {
    saveMappingForHash(headerHash, mapping);
    onConfirm(mapping);
    onOpenChange(false);
  };

  const previewRows = rows.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Petakan Kolom Excel</DialogTitle>
          <DialogDescription>
            Hubungkan kolom dari file Excel Anda ke data Lyncis. Pilihan ini akan diingat untuk file dengan format yang sama.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <div className="space-y-6 py-4">
            <div className="grid gap-4">
              {TARGET_FIELDS.map((target) => (
                <div key={target.key} className="grid grid-cols-2 items-center gap-4">
                  <Label className="text-sm font-medium">{target.label}</Label>
                  <Select
                    value={mapping[target.key] || 'none'}
                    onValueChange={(val) =>
                      setMapping((prev) => ({ ...prev, [target.key]: val }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih kolom..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Lewati --</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted/50 p-4 border border-dashed">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-3 uppercase">
                <Info className="h-3 w-3" />
                Preview 3 Baris Pertama
              </div>
              <div className="space-y-2">
                {previewRows.map((row, i) => (
                  <div key={i} className="text-[10px] font-mono text-muted-foreground truncate border-b pb-1 last:border-0 last:pb-0">
                    {JSON.stringify(row)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleConfirm} disabled={Object.keys(mapping).length === 0}>
            Simpan & Impor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
