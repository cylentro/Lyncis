'use client';

import { useState, useMemo } from 'react';
import { JastipOrder } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Pencil,
  Check,
  Sparkles,
} from 'lucide-react';
import { getParsingConfidence } from '@/lib/whatsapp-parser';

interface ExcelTriagePanelProps {
  orders: JastipOrder[];
  onEdit: (order: JastipOrder) => void;
  onApprove: (id: string) => void;
  onApproveAll: () => void;
}

export function ExcelTriagePanel({
  orders,
  onEdit,
  onApprove,
  onApproveAll,
}: ExcelTriagePanelProps) {
  // Auto-collapse for large batches
  const [isExpanded, setIsExpanded] = useState(orders.length <= 20);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);

  const warningCount = useMemo(() => {
    return orders.filter((o) => {
      const confidence = getParsingConfidence(o);
      const isLocationMissing =
        !o.recipient?.kelurahan ||
        !o.recipient?.kecamatan ||
        !o.recipient?.kota ||
        !o.recipient?.provinsi;
      const isIncomplete =
        !o.recipient?.name ||
        !o.recipient?.phone ||
        !o.recipient?.addressRaw ||
        isLocationMissing ||
        !o.items?.length;
      return confidence < 0.8 || isIncomplete;
    }).length;
  }, [orders]);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    await onApprove(id);
    setApprovingId(null);
  };

  const handleApproveAll = async () => {
    setApprovingAll(true);
    await onApproveAll();
    setApprovingAll(false);
  };

  if (orders.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-200/60 bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-800/30 overflow-hidden shadow-sm">
      {/* ── Banner Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200/50 dark:border-amber-800/20">
        <button
          className="flex items-center gap-2.5 text-left group"
          onClick={() => setIsExpanded((v) => !v)}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/40 border border-amber-200/60 dark:border-amber-700/40">
            <FileSpreadsheet className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                {orders.length} pesanan dari Excel menunggu review
              </span>
              {warningCount > 0 && (
                <Badge className="text-[9px] h-4 px-1.5 bg-destructive/10 text-destructive border-destructive/20 font-black uppercase tracking-tight">
                  {warningCount} perlu perhatian
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60 mt-0.5">
              Klik untuk {isExpanded ? 'sembunyikan' : 'lihat'} detail · Review kapan saja sebelum proses
            </p>
          </div>
          <div className="ml-1 text-amber-500/60 group-hover:text-amber-600 transition-colors">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        <Button
          size="sm"
          onClick={handleApproveAll}
          disabled={approvingAll}
          className="h-8 px-3 text-[11px] font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm shadow-green-500/20 active:scale-95 transition-all shrink-0"
        >
          {approvingAll ? (
            <span className="animate-pulse">Menyetujui...</span>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Setujui Semua
            </>
          )}
        </Button>
      </div>

      {/* ── Expandable Cards ── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[480px] overflow-y-auto">
              {orders.map((order, idx) => {
                const confidence = getParsingConfidence(order);
                const isLocationMissing =
                  !order.recipient?.kelurahan ||
                  !order.recipient?.kecamatan ||
                  !order.recipient?.kota ||
                  !order.recipient?.provinsi ||
                  !order.recipient?.kodepos;
                const isIncomplete =
                  !order.recipient?.name ||
                  !order.recipient?.phone ||
                  !order.recipient?.addressRaw ||
                  isLocationMissing ||
                  !order.items?.length;
                const showWarning = confidence < 0.8 || isIncomplete;
                const isApproving = approvingId === order.id;

                return (
                  <div
                    key={order.id}
                    className={cn(
                      'relative group rounded-xl border bg-white dark:bg-muted/10 p-3 transition-all hover:shadow-sm',
                      showWarning
                        ? 'border-destructive/25 bg-destructive/[0.02] dark:bg-destructive/10'
                        : 'border-border/60 hover:border-primary/20'
                    )}
                  >
                    {/* Action buttons — visible on hover */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md"
                        onClick={() => onEdit(order)}
                        title="Edit pesanan"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"
                        onClick={() => handleApprove(order.id)}
                        disabled={isApproving}
                        title="Setujui pesanan ini"
                      >
                        {isApproving ? (
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-green-500 border-t-transparent animate-spin block" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>

                    {/* Row number + warning/ok indicator */}
                    <div className="flex items-center justify-between mb-2 pr-14">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {showWarning ? (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive/10 border border-destructive/20 shrink-0">
                            <AlertTriangle className="h-2.5 w-2.5 text-destructive" />
                            <span className="text-[9px] font-black text-destructive uppercase tracking-tight">
                              Review
                            </span>
                          </div>
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        )}
                        <span className="text-xs font-bold truncate">
                          {order.recipient?.name || 'Tanpa Nama'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {order.metadata?.isAiParsed && (
                          <Badge
                            variant="outline"
                            className="text-[8px] px-1 h-3.5 bg-amber-50 text-amber-600 border-amber-200 font-black uppercase tracking-tight"
                          >
                            AI
                          </Badge>
                        )}
                        <span className="text-[9px] font-black text-muted-foreground/30 font-mono tracking-widest group-hover:opacity-0 transition-opacity">
                          #{(idx + 1).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="text-[10px] text-muted-foreground mb-1 truncate">
                      {order.recipient?.phone || (
                        <span className="text-destructive/70 font-medium">Tanpa HP</span>
                      )}
                    </div>

                    {/* Address */}
                    <div className="text-[10px] text-muted-foreground/80 leading-snug mb-2 line-clamp-2">
                      {order.recipient?.addressRaw || (
                        <span className="text-destructive/70 font-medium">Tanpa Alamat</span>
                      )}
                    </div>

                    {/* Location pill */}
                    {!isLocationMissing ? (
                      <div className="flex items-center gap-1 text-[9px] text-primary/80 font-medium mb-2 bg-primary/[0.04] w-fit px-1.5 py-0.5 rounded border border-primary/10 max-w-full">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">
                          {order.recipient?.kelurahan}, {order.recipient?.kecamatan},{' '}
                          {order.recipient?.kota} {order.recipient?.kodepos}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[9px] text-destructive/80 font-bold mb-2 bg-destructive/[0.04] w-fit px-1.5 py-0.5 rounded border border-destructive/10">
                        <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                        <span>Lokasi belum terpetakan</span>
                      </div>
                    )}

                    {/* Items */}
                    <div className="flex flex-wrap gap-1">
                      {order.items?.map((item, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[9px] font-normal py-0 h-4 px-1.5 bg-muted/30"
                        >
                          {item.qty}× {item.name}
                        </Badge>
                      ))}
                      {!order.items?.length && (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold py-0 h-4 px-1.5 bg-destructive/5 text-destructive border-destructive/20"
                        >
                          Tanpa Barang
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
