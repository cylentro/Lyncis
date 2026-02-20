'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TARGET_FIELDS, saveMappingForHash, loadSavedMapping } from '@/lib/header-mapper';
import { Button } from '@/components/ui/button';
import { Info, User, Package, Tag, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/providers/language-provider';

interface ColumnMappingViewProps {
  headers: string[];
  rows: Record<string, string>[];
  headerHash: string;
  onConfirm: (mapping: Record<string, string>) => void;
  onCancel: () => void;
}

export function ColumnMappingView({
  headers,
  rows,
  headerHash,
  onConfirm,
  onCancel,
}: ColumnMappingViewProps) {
  const { dict } = useLanguage();
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (headerHash) {
      const saved = loadSavedMapping(headerHash);
      if (saved) {
        setMapping(saved);
      } else {
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
  }, [headerHash, headers]);

  const handleConfirm = () => {
    saveMappingForHash(headerHash, mapping);
    onConfirm(mapping);
  };

  const previewRows = rows.slice(0, 2);

  const groups = [
    {
      title: dict.orders.recipient_info,
      icon: User,
      fields: TARGET_FIELDS.filter((f) => f.key.startsWith('recipient.')),
    },
    {
      title: dict.orders.item_list,
      icon: Package,
      fields: TARGET_FIELDS.filter((f) => f.key.startsWith('items[0].')),
    },
    {
      title: 'Metadata',
      icon: Tag,
      fields: TARGET_FIELDS.filter((f) => f.key === 'tag'),
    },
  ];

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="text-sm font-bold">{dict.intake.mapping_title}</h3>
          <p className="text-[10px] text-muted-foreground">{dict.intake.mapping_desc}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {groups.map((group) => (
          <div key={group.title} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <group.icon className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </span>
            </div>
            
            <div className="grid gap-3 p-4 rounded-xl border bg-muted/30">
              {group.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium ml-1">
                      {field.key === 'recipient.name' && dict.intake.mapping_recipient_name}
                      {field.key === 'recipient.phone' && dict.intake.mapping_recipient_phone}
                      {field.key === 'recipient.addressRaw' && dict.intake.mapping_recipient_address}
                      {field.key === 'items[0].name' && dict.intake.mapping_item_name}
                      {field.key === 'items[0].qty' && dict.intake.mapping_item_qty}
                      {field.key === 'items[0].unitPrice' && dict.intake.mapping_item_price}
                      {field.key === 'items[0].totalPrice' && dict.intake.mapping_item_total}
                      {field.key === 'tag' && dict.intake.mapping_tag}
                    </Label>
                    {mapping[field.key] && (
                      <CheckCircle2 className="h-3 w-3 text-green-500 animate-in zoom-in" />
                    )}
                  </div>
                  <Select
                    value={mapping[field.key] || 'none'}
                    onValueChange={(val) =>
                      setMapping((prev) => ({ ...prev, [field.key]: val }))
                    }
                  >
                    <SelectTrigger className="w-full h-9 bg-background border-muted-foreground/20 focus:ring-1">
                      <SelectValue placeholder={dict.intake.select_header} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">{dict.intake.select_header}</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Preview Section */}
        <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 px-1">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {dict.intake.preview_data.replace('{count}', '2')}
              </span>
            </div>
            <div className="rounded-xl border border-dashed bg-muted/10 p-4 space-y-3">
              {previewRows.map((row, i) => (
                <div key={i} className="space-y-1.5 overflow-hidden">
                  <div className="text-[9px] font-bold text-muted-foreground/50 uppercase">Baris #{i+1}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(row).slice(0, 6).map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-bold text-muted-foreground truncate uppercase tracking-tighter">{k}</span>
                        <span className="text-[10px] font-medium truncate bg-background/50 px-1.5 py-0.5 rounded border border-border/50">{v || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>

      <div className="pt-6 mt-6 border-t flex gap-3">
        <Button variant="outline" className="flex-1 h-11 text-xs font-bold" onClick={onCancel}>
          {dict.common.back}
        </Button>
        <Button 
          className="flex-[2] h-11 text-xs font-bold shadow-lg shadow-primary/20" 
          onClick={handleConfirm}
          disabled={Object.keys(mapping).length === 0}
        >
          {dict.intake.confirm_import}
        </Button>
      </div>
    </div>
  );
}
