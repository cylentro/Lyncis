
'use client';

import { useMemo, useState } from 'react';
import { JastipOrder } from '@/lib/types';
import { validateOrderForBatch } from '@/lib/order-validator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, CheckCircle2, AlertCircle, Pencil, Trash2, ShoppingBag, MapPin, AlertTriangle, Phone, FileText, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/providers/language-provider';

interface CompletionGateProps {
    orders: JastipOrder[];
    onProceed: () => void;
    onRemoveOrder: (id: string) => void;
    onRemoveAllOrders: () => void;
    onRemoveSelected: (ids: string[]) => void;
    onEditOrder: (id: string) => void;
}

export function CompletionGate({
    orders,
    onProceed,
    onRemoveOrder,
    onRemoveAllOrders,
    onRemoveSelected,
    onEditOrder,
}: CompletionGateProps) {
    const { dict } = useLanguage();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = (checked: boolean | "indeterminate") => {
        if (checked === true) {
            setSelectedIds(new Set(orders.map(o => o.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    // Validate all orders in real-time
    const validationResults = useMemo(() => {
        return orders.map((order) => ({
            id: order.id,
            ...validateOrderForBatch(order),
        }));
    }, [orders]);

    const completeCount = validationResults.filter((r) => r.isComplete).length;
    const allComplete = completeCount === orders.length && orders.length > 0;

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-background">
            {/* Header Status */}
            <div className="p-6 border-b">
                <div className="flex items-center justify-between gap-4 mb-2">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-3 truncate min-w-0">
                        <Checkbox 
                            checked={selectedIds.size === orders.length && orders.length > 0} 
                            onCheckedChange={handleSelectAll} 
                            className="h-5 w-5 rounded-md data-[state=checked]:bg-primary shrink-0"
                        />
                        <span className="truncate">{dict.wizard.validate_title}</span>
                        <Badge variant={allComplete ? 'default' : 'secondary'} className="text-sm shrink-0">
                            {completeCount} / {orders.length} {dict.wizard.ready}
                        </Badge>
                    </h2>
                    {selectedIds.size > 0 ? (
                        <div className="flex items-center gap-2 shrink-0">
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => {
                                    onRemoveSelected(Array.from(selectedIds));
                                    setSelectedIds(new Set());
                                }} 
                                className="h-8 gap-1.5 px-3 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all font-bold whitespace-nowrap"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                {dict.wizard.remove_selected} ({selectedIds.size})
                            </Button>
                        </div>
                    ) : (
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={onRemoveAllOrders} 
                            className="h-8 gap-1.5 px-3 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all font-bold shrink-0 whitespace-nowrap"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {dict.wizard.empty_batch}
                        </Button>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    {dict.wizard.validate_desc}
                </p>
            </div>

            {/* Scrollable Order List */}
            <div className="flex-1 overflow-y-auto min-h-0 p-6 overscroll-contain">
                <div className="space-y-4">
                    <AnimatePresence>
                        {orders.map((order) => {
                            const result = validationResults.find((r) => r.id === order.id);
                            const isComplete = result?.isComplete;
                            const issues = result?.issues || [];
                            const isExpanded = expandedIds.has(order.id);

                            return (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                >
                                    <div className={cn(
                                        "group relative border rounded-xl overflow-hidden transition-all",
                                        isComplete 
                                            ? "bg-card border-border hover:border-primary/30" 
                                            : "bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-900/50"
                                    )}>
                                        {/* Actions reveal on hover */}
                                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary active:scale-95 transition-all"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditOrder(order.id);
                                                }}
                                                title={dict.common.edit}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive active:scale-95 transition-all"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRemoveOrder(order.id);
                                                }}
                                                title={dict.common.delete}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div 
                                            className={cn("p-4 flex gap-4 cursor-pointer transition-colors", selectedIds.has(order.id) ? "bg-primary/5" : "")}
                                            onClick={() => toggleExpand(order.id)}
                                        >
                                            {/* Item Selector */}
                                            <div className="pt-0.5 flex items-start" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox 
                                                    checked={selectedIds.has(order.id)} 
                                                    onCheckedChange={() => toggleSelect(order.id)} 
                                                    className="h-5 w-5 rounded-md data-[state=checked]:bg-primary" 
                                                />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {isComplete ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 animate-pulse shrink-0">
                                                                <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
                                                                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tighter">{dict.wizard.not_ready}</span>
                                                            </div>
                                                        )}
                                                        {!order.recipient.name ? (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 shrink-0">
                                                                <User className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tighter">{dict.orders.empty_name}</span>
                                                            </div>
                                                        ) : (
                                                            <h3 className="font-bold text-base text-foreground truncate pr-16 group-hover:pr-24 transition-all">
                                                                {order.recipient.name}
                                                            </h3>
                                                        )}
                                                    </div>
                                                    
                                                    {!isComplete && (
                                                        <div className="text-[10px] font-black text-muted-foreground/30 font-mono tracking-widest uppercase shrink-0 group-hover:opacity-0 transition-all">
                                                            MISSING DATA
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Fields with Inline Triage */}
                                                <div className="space-y-2.5">
                                                    {/* Phone Triage */}
                                                    {!order.recipient.phone ? (
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded border border-amber-200 dark:border-amber-900/40 w-fit">
                                                            <Phone className="h-3 w-3 shrink-0" />
                                                            {dict.wizard.phone_missing}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/70">
                                                            <Phone className="h-3 w-3 text-muted-foreground/40" />
                                                            {order.recipient.phone}
                                                        </div>
                                                    )}

                                                    {/* Address & Area Combined */}
                                                    {((!order.recipient.addressRaw) || (!order.recipient.kelurahan || !order.recipient.kodepos) || isExpanded) && (
                                                        <div className="flex flex-col gap-1.5">
                                                            {/* Address Raw */}
                                                            {!order.recipient.addressRaw ? (
                                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded border border-amber-200 dark:border-amber-900/40 w-fit">
                                                                    <FileText className="h-3 w-3 shrink-0" />
                                                                    {dict.wizard.address_missing}
                                                                </div>
                                                            ) : isExpanded ? (
                                                                <div className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                                                                    {order.recipient.addressRaw}
                                                                </div>
                                                            ) : null}

                                                            {/* Area / Shipping Data */}
                                                            {(!order.recipient.kelurahan || !order.recipient.kodepos) ? (
                                                                <div className="flex items-center gap-1.5 text-[10px] text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 w-fit px-2 py-1 rounded border border-red-200 dark:border-red-900/40">
                                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                                    {dict.wizard.location_missing}
                                                                </div>
                                                            ) : isExpanded ? (
                                                                <div className="flex items-center gap-1.5 text-[10px] text-primary/80 font-medium bg-primary/[0.03] w-fit px-2 py-0.5 rounded border border-primary/10">
                                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                                    <span className="truncate">
                                                                        {order.recipient.kelurahan}, {order.recipient.kecamatan}, {order.recipient.kota}, {order.recipient.provinsi} {order.recipient.kodepos}
                                                                    </span>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    )}

                                                    {/* Items Triage */}
                                                    {(!order.items || order.items.length === 0) ? (
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded border border-amber-200 dark:border-amber-900/40 w-fit">
                                                            <ShoppingBag className="h-3 w-3 shrink-0" />
                                                            {dict.wizard.items_empty}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1 items-center">
                                                            <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase tracking-wider font-extrabold shrink-0">
                                                                {order.tag}
                                                            </Badge>
                                                            {order.items.slice(0, 3).map((item, i) => (
                                                                <span key={i} className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/5">
                                                                    {item.qty}x {item.name}
                                                                </span>
                                                            ))}
                                                            {order.items.length > 3 && (
                                                                <span className="text-[9px] text-muted-foreground font-bold px-1">+ {order.items.length - 3} {dict.common.edit === 'Edit' ? 'others' : 'lainnya'}</span>
                                                            )}
                                                            {!isExpanded && (
                                                                <span className="text-[9px] opacity-20 font-medium ml-auto">
                                                                    {dict.common.edit === 'Edit' ? 'Click detail' : 'Klik detail'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div 
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="mt-4 pt-3 border-t border-border/50">
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-muted-foreground font-bold uppercase tracking-tight text-[9px]">{dict.orders.item_list}</span>
                                                                        <span className="text-[10px] text-muted-foreground font-bold">{order.items.length} {order.items.length > 1 ? 'Items' : 'Item'}</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                        {order.items.map((item, idx) => (
                                                                            <div key={idx} className="flex justify-between items-center bg-muted/20 p-2 rounded border border-border/5">
                                                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                                    <span className="text-[11px] font-bold truncate">{item.name}</span>
                                                                                </div>
                                                                                <span className="text-[10px] font-black bg-background px-1.5 py-0.5 rounded border ml-2 shrink-0">
                                                                                    x{item.qty}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                <div className="pt-3 mt-3 border-t border-dashed border-border/30 flex items-center justify-between">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-muted-foreground font-bold uppercase tracking-tight text-[9px]">{dict.wizard.metadata}</span>
                                                                        <span className="text-[10px] italic text-muted-foreground">
                                                                            {dict.wizard.source}: <span className="font-semibold text-foreground/70">{order.metadata?.sourceFileName || (dict.common.edit === 'Edit' ? 'Manual Input' : 'Input Manual')}</span>
                                                                        </span>
                                                                    </div>
                                                                    {isComplete && <Badge className="bg-green-500/10 text-green-600 border-green-500/20 h-5 text-[9px]">{dict.wizard.validated}</Badge>}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-background">
                <Button 
                    className="w-full" 
                    size="lg" 
                    disabled={!allComplete}
                    onClick={onProceed}
                >
                    {dict.wizard.continue_with.replace('{count}', completeCount.toString()).replace('{total}', orders.length.toString())}
                </Button>
            </div>
        </div>
    );
}
