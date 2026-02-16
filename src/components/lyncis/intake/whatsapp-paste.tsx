'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Sparkles,
  Zap,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { parseWhatsAppText, getParsingConfidence } from '@/lib/whatsapp-parser';
import { parseWithLLM } from '@/lib/llm-parser';
import { JastipOrder } from '@/lib/types';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WhatsAppPasteProps {
  onImport: (orders: Omit<JastipOrder, 'id'>[]) => Promise<void>;
}

export function WhatsAppPaste({ onImport }: WhatsAppPasteProps) {
  const [text, setText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedOrders, setParsedOrders] = useState<Partial<JastipOrder>[]>([]);
  const [defaultTag, setDefaultTag] = useState('General');

  const handleSmartParse = async () => {
    if (!text.trim()) return;
    setIsParsing(true);
    
    try {
      // 1. Try Regex First (Fast & Free)
      const regexResults = parseWhatsAppText(text);
      const regexConfidence = regexResults.length > 0 
        ? regexResults.reduce((sum, o) => sum + getParsingConfidence(o), 0) / regexResults.length
        : 0;

      // If Regex is very confident (> 0.85), use it immediately
      if (regexResults.length > 0 && regexConfidence >= 0.85) {
        setParsedOrders(regexResults);
        toast.success(`Berhasil mengenali ${regexResults.length} pesanan.`);
        return;
      }

      // 2. If Regex is weak/empty, Try AI (Smart)
      try {
        const llmResults = await parseWithLLM(text);
        if (llmResults.length > 0) {
          setParsedOrders(llmResults);
          toast.success(`AI berhasil mengekstrak ${llmResults.length} pesanan.`);
          return;
        }
      } catch (err) {
        console.error("AI Parse Error:", err);
        // Fallthrough to regex fallback if AI fails
      }

      // 3. Fallback: Use Regex results if present (even if low confidence)
      if (regexResults.length > 0) {
        setParsedOrders(regexResults);
        toast.warning(`Format kurang jelas, namun berhasil mengenali ${regexResults.length} pesanan. Mohon periksa kembali.`);
      } else {
        toast.error('Gagal mengenali format. Silakan tulis ulang atau gunakan format yang lebih jelas.');
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    // Validate that we have at least name and items for each
    const validOrders = parsedOrders.filter(o => o.recipient?.name && o.items && o.items.length > 0);
    
    if (validOrders.length === 0) {
      toast.error('Tidak ada data valid untuk diimpor. Pastikan nama dan barang terisi.');
      return;
    }

    try {
      // Map back to default tag if empty
      const finalOrders = validOrders.map(o => ({
        ...o,
        tag: o.tag || defaultTag,
      })) as Omit<JastipOrder, 'id'>[];

      await onImport(finalOrders);
      setText('');
      setParsedOrders([]);
      toast.success(`Berhasil mengimpor ${finalOrders.length} pesanan ke Bucket.`);
    } catch (err) {
      toast.error('Gagal mengimpor ke database.');
    }
  };

  const removeOrder = (index: number) => {
    setParsedOrders(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="wa-text" className="text-sm font-semibold">
          Raw Text WhatsApp
        </Label>
        <Textarea
          id="wa-text"
          placeholder="Paste teks dari WhatsApp di sini...
Contoh:
Nama: Budi
HP: 08123456789
Alamat: Jl. Sudirman No. 1
Pesanan: 
2x Pocky Matcha @30000"
          className="min-h-[150px] font-mono text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md transition-all active:scale-[0.98]"
          onClick={handleSmartParse}
          disabled={isParsing || !text.trim()}
        >
          {isParsing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2 text-yellow-300" />
          )}
          Proses Teks
        </Button>
      </div>

      {parsedOrders.length > 0 && (
        <div className="space-y-4 pt-2 border-t mt-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold flex items-center gap-2">
              Preview Hasil Ekstraksi
              <Badge variant="secondary">{parsedOrders.length}</Badge>
            </h4>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive h-7"
              onClick={() => setParsedOrders([])}
            >
              Reset
            </Button>
          </div>

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3 pr-4">
              {parsedOrders.map((order, idx) => {
                const confidence = getParsingConfidence(order);
                return (
                  <div key={idx} className="p-3 border rounded-lg bg-background relative group">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeOrder(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    
                    <div className="flex items-center gap-2 mb-2">
                      {confidence >= 0.8 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="text-sm font-bold">{order.recipient?.name || 'Tanpa Nama'}</span>
                      <span className="text-xs text-muted-foreground">• {order.recipient?.phone || 'Tanpa HP'}</span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {order.recipient?.addressRaw || 'Tanpa Alamat'}
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      {order.items?.map((item, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] font-normal">
                          {item.qty}x {item.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="bg-muted/30 p-4 rounded-lg space-y-3">
             <div>
                <Label className="text-xs font-semibold mb-1.5 block">
                  Assign Tag ke Pesanan Ini
                </Label>
                <Input
                  value={defaultTag}
                  onChange={(e) => setDefaultTag(e.target.value)}
                  placeholder="Contoh: WA-BLAST-2025"
                  className="h-9"
                />
              </div>
              <Button className="w-full font-bold" onClick={handleImport}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Impor {parsedOrders.length} Pesanan
              </Button>
          </div>
        </div>
      )}
    </div>
  );
}
