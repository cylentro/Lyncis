'use client';

import { useMemo, useState } from 'react';
import { JastipOrder, SenderAddress } from '@/lib/types';
import { useLanguage } from '@/components/providers/language-provider';
import { OrderLogisticsForm } from './logistics-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Package, MapPin, Truck, Scale, ShoppingBag } from 'lucide-react';
import { SERVICE_LABELS } from '@/lib/shipping-zones';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { formatCurrency, formatWeight } from '@/lib/formatters';

interface BatchSummaryProps {
    orders: JastipOrder[];
    senderAddress: SenderAddress | null;
    logisticsState: Record<string, OrderLogisticsForm>;
    onConfirm: () => void;
    onEditOrder: (id: string) => void;
    onBack: () => void;
}

export function BatchSummary({
    orders,
    senderAddress,
    logisticsState,
    onConfirm,
    onEditOrder,
    onBack,
}: BatchSummaryProps) {
    const { dict } = useLanguage();
    const [isConfirming, setIsConfirming] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const totalWeight = useMemo(() => {
        return Object.values(logisticsState).reduce((acc, curr) => acc + (curr?.chargeable || 0), 0);
    }, [logisticsState]);

    const totalCost = useMemo(() => {
        return Object.values(logisticsState).reduce((acc, curr) => acc + (curr?.estimatedCost || 0), 0);
    }, [logisticsState]);

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-background">
            {/* Header */}
            <div className="p-4 border-b bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">{dict.wizard.summary_title}</h2>
                        <Badge variant="default" className="h-5 px-2 text-[9px] font-black uppercase tracking-widest bg-green-600 hover:bg-green-700">
                            {dict.wizard.ready_to_process}
                        </Badge>
                    </div>
                </div>

                {/* Sender Info Card (Compact Unified) */}
                <div className="bg-background border border-border rounded-xl p-3 flex items-start gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-xs truncate">{senderAddress?.label}</span>
                            <span className="text-[10px] font-bold text-foreground/60">{senderAddress?.name} • {senderAddress?.phone}</span>
                        </div>

                        <div className="flex flex-col">
                            <p className="text-[10px] text-muted-foreground line-clamp-1 leading-tight">
                                {senderAddress?.addressRaw}
                            </p>
                            <p className="text-[9px] text-muted-foreground/70 italic truncate">
                                {senderAddress?.kelurahan && `${senderAddress.kelurahan}, `}{senderAddress?.kecamatan && `${senderAddress.kecamatan}, `}{senderAddress?.kota}, {senderAddress?.provinsi} {senderAddress?.kodepos}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-background border rounded-lg p-2">
                        <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1">{dict.common.edit === 'Edit' ? 'Orders' : 'Pesanan'}</div>
                        <div className="font-bold text-sm leading-tight">{orders.length}</div>
                    </div>
                    <div className="bg-background border rounded-lg p-2">
                        <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1">{dict.wizard.weight}</div>
                        <div className="font-bold text-sm leading-tight">{formatWeight(totalWeight)}</div>
                    </div>
                    <div className="bg-background border rounded-lg p-2 border-green-600 dark:border-green-400">
                        <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1">{dict.wizard.est_shipping}</div>
                        <div className="font-bold text-sm leading-tight text-green-600 dark:text-green-400">
                            {formatCurrency(totalCost)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Order List */}
            <div className="flex-1 overflow-y-auto min-h-0 p-6 overscroll-contain">
                <div className="space-y-4">
                    {orders.map((order) => {
                        const form = logisticsState[order.id];
                        if (!form) return null;
                        const isExpanded = expandedIds.has(order.id);

                        return (
                            <div key={order.id} className="group flex flex-col border rounded-xl bg-card hover:border-primary/30 transition-all overflow-hidden">
                                <div
                                    className="p-4 flex flex-col gap-3 cursor-pointer"
                                    onClick={() => toggleExpand(order.id)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-4 mb-2">
                                            <h3 className="font-bold text-base text-foreground truncate">
                                                {order.recipient.name}
                                            </h3>
                                            <div className="font-black text-foreground text-sm shrink-0">
                                                {formatCurrency(form.estimatedCost)}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex flex-col">
                                                <div className="text-[10px] font-bold text-foreground/70 leading-none mb-1">
                                                    {order.recipient.phone}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground leading-snug">
                                                    {order.recipient.addressRaw}
                                                </div>
                                                <div className="text-[9px] text-muted-foreground/70 italic truncate mt-0.5">
                                                    {order.recipient.kelurahan && `${order.recipient.kelurahan}, `}
                                                    {order.recipient.kecamatan && `${order.recipient.kecamatan}, `}
                                                    {order.recipient.kota}, {order.recipient.provinsi} {order.recipient.kodepos}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 items-center pt-1">
                                                <Badge variant="outline" className="h-4.5 px-1.5 text-[9px] uppercase tracking-wider font-extrabold bg-muted/30 border-muted-foreground/20 shrink-0">
                                                    {SERVICE_LABELS[form.serviceType]}
                                                </Badge>
                                                <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Scale className="h-3 w-3 shrink-0" />
                                                        {formatWeight(form.weight)}
                                                    </span>
                                                    {form.volumetric > form.weight && (
                                                        <span className="text-amber-600 bg-amber-50 px-1 rounded border border-amber-100 shrink-0">
                                                            Vol: {formatWeight(form.volumetric)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[9px] opacity-30 font-bold ml-auto uppercase tracking-tighter">
                                                    {isExpanded ? 'Ringkas ↑' : 'Detail ↓'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden border-t border-border/30 bg-muted/10"
                                        >
                                            <div className="p-4 space-y-5">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <span className="text-muted-foreground font-bold uppercase tracking-tight text-[10px]">{dict.common.dimensions}</span>
                                                        <p className="font-bold text-xs">{form.l} x {form.w} x {form.h} cm</p>
                                                        <p className="text-[10px] text-muted-foreground italic">Volumetric: {form.volumetric} kg</p>
                                                    </div>
                                                    <div className="space-y-1 text-right">
                                                        <span className="text-muted-foreground font-bold uppercase tracking-tight text-[10px]">{dict.common.logistics}</span>
                                                        <p className="font-bold text-xs">Berat: {formatWeight(form.weight)}</p>
                                                        <p className="text-[10px] text-primary font-black uppercase">Chargeable: {formatWeight(form.chargeable)}</p>
                                                    </div>
                                                </div>

                                                {/* Daftar Barang Section */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">{dict.common.item_list}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {order.items.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-center bg-background p-2 rounded-lg border border-border/10">
                                                                <div className="flex flex-col min-w-0 pr-2">
                                                                    <span className="text-xs font-bold truncate">{item.name}</span>
                                                                    {item.unitPrice > 0 && (
                                                                        <span className="text-[9px] text-muted-foreground font-medium">
                                                                            @Rp {item.unitPrice.toLocaleString('id-ID')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] font-black bg-muted/50 px-1.5 py-0.5 rounded border shadow-xs shrink-0">
                                                                    x{item.qty}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Metadata Below */}
                                                <div className="border-t border-border/20 pt-3">
                                                    <span className="text-muted-foreground font-bold uppercase tracking-tight text-[10px]">{dict.wizard.metadata}</span>
                                                    <p className="text-[10px] italic text-muted-foreground mt-0.5">
                                                        {dict.wizard.source}: <span className="font-bold text-foreground/50">{order.metadata?.sourceFileName || (dict.common.edit === 'Edit' ? 'Manual Input' : 'Input Manual')}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-background flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onBack}>
                    {dict.wizard.back}
                </Button>

                <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                    <AlertDialogTrigger asChild>
                        <Button className="flex-[2] bg-green-600 hover:bg-green-700 text-white">
                            <Truck className="h-4 w-4 mr-2" />
                            {dict.wizard.create_shipping}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{dict.wizard.confirm_title}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {dict.wizard.confirm_desc.replace('{count}', orders.length.toString()).replace('{total}', formatCurrency(totalCost))}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setIsConfirming(false)}>{dict.common.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => {
                                    setIsConfirming(false);
                                    onConfirm();
                                }}
                            >
                                {dict.wizard.confirm_action}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
