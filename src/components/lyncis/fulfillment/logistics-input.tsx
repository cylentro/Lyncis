'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JastipOrder, SenderAddress, ServiceType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    calculateVolumetricWeight, 
    calculateChargeableWeight 
} from '@/lib/logistics';
import { 
    getZoneForProvince, 
    getShippingRate, 
    calculateShippingCost, 
    getAvailableServices,
    SERVICE_LABELS 
} from '@/lib/shipping-zones';
import { cn } from '@/lib/utils';
import { formatCurrency, formatWeight } from '@/lib/formatters';
import { Package, Scale, ChevronDown, ChevronUp, User, ShoppingBag, Info, MapPin, Plus, Trash2, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/components/providers/language-provider';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { ITEM_CATEGORIES } from '@/lib/constants/item-categories';
import { categorizeOrderItems } from '@/lib/llm-parser';
import { v4 as uuidv4 } from 'uuid';

export interface OrderLogisticsForm {
    serviceType: ServiceType | '';
    weight: number;
    l: number;
    w: number;
    h: number;
    volumetric: number;
    chargeable: number;
    estimatedCost: number;
    isInsured: boolean;
    insuredItems: { id: string; categoryCode: string; price: number }[];
    insuranceFee: number;
}

interface LogisticsInputProps {
    orders: JastipOrder[];
    senderAddress: SenderAddress | null;
    logisticsState: Record<string, OrderLogisticsForm>;
    onUpdate: (orderId: string, updates: Partial<OrderLogisticsForm>) => void;
    onProceed: () => void;
    onBack: () => void;
}

export function LogisticsInput({
    orders,
    senderAddress,
    logisticsState,
    onUpdate,
    onProceed,
    onBack,
}: LogisticsInputProps) {
    const { dict, locale } = useLanguage();
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
    const [serviceError, setServiceError] = useState<Record<string, boolean>>({});
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Toggle details visibility
    const toggleDetails = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedOrders(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const isValid = useMemo(() => {
        return orders.every(order => {
            const form = logisticsState[order.id];
            if (!form) return false;
            
            const hasValidService = !!form.serviceType;
            const hasValidWeights = form.weight > 0 && form.chargeable > 0;
            const hasValidInsurance = form.isInsured 
                ? form.insuredItems.every(i => i.categoryCode && i.categoryCode !== '')
                : true;

            return hasValidService && hasValidWeights && hasValidInsurance;
        });
    }, [orders, logisticsState]);

    // Scroll a specific card into view when focused
    const handleFocus = (id: string) => {
        if (cardRefs.current[id]) {
            cardRefs.current[id]?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    };

    const totalWeight = useMemo(() => {
        return Object.values(logisticsState).reduce((acc, curr) => acc + (curr?.chargeable || 0), 0);
    }, [logisticsState]);

    const totalCost = useMemo(() => {
        return Object.values(logisticsState).reduce((acc, curr) => acc + (curr?.estimatedCost || 0) + (curr?.insuranceFee || 0), 0);
    }, [logisticsState]);

    // Helper to recalculate costs when inputs change
    const calculateCost = (orderId: string, currentForm: OrderLogisticsForm) => {
        const newForm = { ...currentForm };
        
        if (senderAddress) {
            const order = orders.find(o => o.id === orderId);
            if (order) {
                const destZone = getZoneForProvince(order.recipient.provinsi);
                const originZone = getZoneForProvince(senderAddress.provinsi);

                if (destZone && originZone) {
                    const rate = newForm.serviceType ? getShippingRate(originZone, destZone, newForm.serviceType) : null;
                    if (rate) {
                        newForm.estimatedCost = calculateShippingCost(
                            newForm.chargeable, 
                            rate.ratePerKg, 
                            rate.minCharge
                        );
                    } else {
                        newForm.estimatedCost = 0;
                    }
                }
            }
        }
        return newForm.estimatedCost;
    };

    // Initial calculation for orders that have 0 cost but have weight
    // Also recalculates if the sender address changes (e.g. going back and picking another one)
    useEffect(() => {
        if (!senderAddress) return;

        orders.forEach(order => {
            const form = logisticsState[order.id];
            if (!form) return;

            const destZone = getZoneForProvince(order.recipient.provinsi);
            const originZone = getZoneForProvince(senderAddress.provinsi);

            if (destZone && originZone) {
                const availableServices = getAvailableServices(originZone, destZone);
                let currentService = form.serviceType;
                let updates: Partial<OrderLogisticsForm> = {};

                if (currentService && !availableServices.includes(currentService as ServiceType)) {
                    currentService = '';
                    updates.serviceType = '';
                }

                const rate = currentService ? getShippingRate(originZone, destZone, currentService as ServiceType) : null;
                if (rate) {
                    const newCost = calculateShippingCost(
                        form.chargeable, 
                        rate.ratePerKg, 
                        rate.minCharge
                    );
                    // Force update if cost is different OR if it was previously 0 but now has a valid route
                    if (newCost !== form.estimatedCost || (newCost > 0 && form.estimatedCost === 0)) {
                        updates.estimatedCost = newCost;
                    }
                } else if (form.estimatedCost !== 0) {
                    updates.estimatedCost = 0;
                }

                if (Object.keys(updates).length > 0) {
                    onUpdate(order.id, updates);
                }
            }
        });
    }, [senderAddress?.id]); // Recalculate everything if origin changes

    // Helper to recalculate costs when inputs change
    const handleInputChange = (orderId: string, field: keyof OrderLogisticsForm, value: any) => {
        const currentForm = logisticsState[orderId];
        const newForm = { ...currentForm, [field]: value };

        // Wipe category codes if service changes between cold and non-cold
        if (field === 'serviceType') {
            setServiceError(prev => ({ ...prev, [orderId]: false }));
            const wasCold = currentForm.serviceType === 'cold';
            const isCold = value === 'cold';
            if (wasCold !== isCold) {
                newForm.insuredItems = newForm.insuredItems.map(item => ({
                    ...item,
                    categoryCode: '',
                }));
            }
        }

        // Recalculate derived values
        if (field === 'l' || field === 'w' || field === 'h') {
            newForm.volumetric = calculateVolumetricWeight(newForm.l, newForm.w, newForm.h);
        }

        if (field === 'weight' || field === 'l' || field === 'w' || field === 'h') {
             // Ensure volumetric is up to date if weight triggered this, though usually volumetric only depends on dims
             // But simpler logic: recalculate volumetric first, then chargeable
             newForm.volumetric = calculateVolumetricWeight(newForm.l, newForm.w, newForm.h);
             newForm.chargeable = calculateChargeableWeight(newForm.weight, newForm.volumetric);
        }

        // Recalculate cost if weight/dims/service changed AND we have a sender address
        if (senderAddress) {
            const order = orders.find(o => o.id === orderId);
            if (order) {
                const destZone = getZoneForProvince(order.recipient.provinsi);
                const originZone = getZoneForProvince(senderAddress.provinsi);

                if (destZone && originZone) {
                    const rate = newForm.serviceType ? getShippingRate(originZone, destZone, newForm.serviceType) : null;
                    if (rate) {
                        newForm.estimatedCost = calculateShippingCost(
                            newForm.chargeable, 
                            rate.ratePerKg, 
                            rate.minCharge
                        );
                    } else {
                        newForm.estimatedCost = 0; // Rate not found
                    }
                }
            }
        }

        onUpdate(orderId, newForm);
    };



    const handleInsuredItemChange = (orderId: string, itemId: string, field: 'categoryCode', value: any) => {
        const currentForm = logisticsState[orderId];
        const newItems = currentForm.insuredItems.map(item => 
            item.id === itemId ? { ...item, [field]: value } : item
        );
        // We only change the category code, fee is fixed based on order items
        onUpdate(orderId, { ...currentForm, insuredItems: newItems });
    };

    const [isAiParsing, setIsAiParsing] = useState<Record<string, boolean>>({});

    const handleFillWithAi = async (orderId: string, order: JastipOrder) => {
        const currentForm = logisticsState[orderId];
        if (!currentForm?.serviceType) {
            setServiceError(prev => ({ ...prev, [orderId]: true }));
            handleFocus(orderId);
            return;
        }

        if (!order.items || order.items.length === 0) {
            toast.error(dict.wizard.insurance_error_no_items);
            return;
        }

        setIsAiParsing(prev => ({ ...prev, [orderId]: true }));
        try {
            const itemsToCategorize = order.items.map(i => ({ id: i.id, name: i.name }));
            const validCategories = currentForm.serviceType === 'cold'
                ? ITEM_CATEGORIES.filter(c => c.code.startsWith('COLD_'))
                : ITEM_CATEGORIES.filter(c => !c.code.startsWith('COLD_'));

            const result = await categorizeOrderItems(itemsToCategorize, validCategories.map(c => ({ 
                code: c.code, 
                label: locale === 'id' ? c.label_id : c.label_en 
            })));
            
            if (result && result.length > 0) {
                const currentForm = logisticsState[orderId];
                // Map the result back to insuredItems without touching the price
                const newItems = currentForm.insuredItems.map(item => {
                    const aiCategorized = result.find((r: any) => r.id === item.id);
                    return {
                        ...item,
                        categoryCode: aiCategorized?.categoryCode || item.categoryCode
                    };
                });
                
                onUpdate(orderId, { 
                    ...currentForm, 
                    insuredItems: newItems, 
                    isInsured: true
                });
                toast.success("Berhasil mengekstrak data asuransi.");
            } else {
                toast.error("Gagal mengekstrak data asuransi.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Terjadi kesalahan saat mengekstrak data.");
        } finally {
            setIsAiParsing(prev => ({ ...prev, [orderId]: false }));
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-background">
            {/* Header / Summary */}
            <div className="p-4 border-b bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">{dict.wizard.logistics_title}</h2>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/5 border border-primary/10">
                            <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">Auto-save</span>
                        </div>
                    </div>
                    <Badge variant="outline" className="h-5 px-2 text-[9px] font-black uppercase tracking-widest border-muted-foreground/30">
                        {dict.wizard.step_of.replace('{current}', '3').replace('{total}', '4')}
                    </Badge>
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
                
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-background border rounded-lg p-2 text-center">
                        <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1">{dict.common.orders_plural}</div>
                        <div className="font-bold text-sm leading-tight">{orders.length}</div>
                    </div>
                    <div className="bg-background border rounded-lg p-2 text-center">
                        <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1">{dict.wizard.weight}</div>
                        <div className="font-bold text-sm leading-tight">{formatWeight(totalWeight)}</div>
                    </div>
                    <div className="bg-background border rounded-lg p-2 text-center border-green-600 dark:border-green-400">
                        <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1">{dict.wizard.est_shipping}</div>
                        <div className="font-bold text-sm leading-tight text-green-600 dark:text-green-400">
                            {formatCurrency(totalCost)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Order List */}
            <div className="flex-1 overflow-y-auto min-h-0 p-6 overscroll-contain">
                <div className="space-y-4">
                    {orders.map((order) => {
                        const form = logisticsState[order.id];
                        if (!form) return null;

                        return (
                            <div 
                                key={order.id} 
                                ref={el => { cardRefs.current[order.id] = el; }}
                                className="border rounded-xl bg-card overflow-hidden group transition-all duration-300"
                            >
                                <div 
                                    className="bg-muted/30 p-2.5 px-3.5 border-b flex justify-between items-center cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={(e) => toggleDetails(order.id, e)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs leading-none">{order.recipient.name}</span>
                                            <span className="text-[9px] text-muted-foreground mt-0.5">{order.items.length} {order.items.length === 1 ? dict.common.items_count.split(' ')[1] : dict.common.items_count_plural.split(' ')[1]}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 px-1.5 py-0.5 rounded-md bg-muted/50 border border-border/50">
                                            {order.recipient.kota || order.recipient.provinsi}
                                        </span>
                                        {expandedOrders.has(order.id) ? (
                                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>

                                {/* Collapsible Details Section */}
                                <AnimatePresence>
                                    {expandedOrders.has(order.id) && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden bg-muted/5 border-b"
                                        >
                                            <div className="p-3.5 space-y-3 text-[11px]">
                                                {/* Recipient Info */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground font-bold uppercase text-[9px]">
                                                        <User className="h-3 w-3" />
                                                        <span>{dict.orders.recipient_info}</span>
                                                    </div>
                                                    <div className="pl-4.5 space-y-0.5">
                                                        <p className="font-bold">{order.recipient.name} • {order.recipient.phone}</p>
                                                        <p className="text-muted-foreground leading-relaxed">{order.recipient.addressRaw}</p>
                                                        <p className="text-primary font-medium">{order.recipient.kecamatan}, {order.recipient.kota}, {order.recipient.kodepos}</p>
                                                    </div>
                                                </div>

                                                {/* Items List */}
                                                <div className="space-y-1.5 pt-2 border-t border-border/50">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground font-bold uppercase text-[9px]">
                                                        <ShoppingBag className="h-3 w-3" />
                                                        <span>{dict.orders.item_list}</span>
                                                    </div>
                                                    <div className="pl-4.5 space-y-1">
                                                        {order.items.map(item => (
                                                            <div key={item.id} className="flex justify-between items-start gap-4">
                                                                <span className="font-medium text-foreground/80 flex-1">{item.name}</span>
                                                                <span className="font-bold text-muted-foreground shrink-0">x{item.qty}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                
                                <div className="p-3.5 grid gap-3.5">
                                    {/* Service Type */}
                                    <div className="grid gap-1.5 text-left relative">
                                        <Label className={cn("text-[9px] font-bold uppercase tracking-widest pl-0.5", serviceError[order.id] ? "text-destructive" : "text-muted-foreground/80")}>
                                            {dict.wizard.service}
                                        </Label>
                                        <Select 
                                            value={form.serviceType || undefined} 
                                            onValueChange={(val) => handleInputChange(order.id, 'serviceType', val as ServiceType)}
                                        >
                                            <SelectTrigger 
                                                className={cn(
                                                    "h-8.5 font-bold text-xs transition-colors shadow-none",
                                                    serviceError[order.id] 
                                                        ? "border-destructive bg-destructive/5 text-destructive focus:ring-destructive" 
                                                        : "border-muted-foreground/15 bg-muted/5 group-hover:bg-background"
                                                )}
                                                onFocus={() => handleFocus(order.id)}
                                            >
                                                <SelectValue placeholder="Pilih Layanan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(() => {
                                                    const destZone = getZoneForProvince(order.recipient.provinsi);
                                                    const originZone = senderAddress ? getZoneForProvince(senderAddress.provinsi) : null;
                                                    const available = (destZone && originZone) 
                                                        ? getAvailableServices(originZone, destZone) 
                                                        : Object.keys(SERVICE_LABELS);

                                                    return Object.entries(SERVICE_LABELS).map(([key, label]) => (
                                                        <SelectItem 
                                                            key={key} 
                                                            value={key} 
                                                            className="text-xs font-medium"
                                                            disabled={!available.includes(key as ServiceType)}
                                                        >
                                                            {label} {!available.includes(key as ServiceType) && `(${dict.common.not_available})`}
                                                        </SelectItem>
                                                    ));
                                                })()}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Weight & Dims Row */}
                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] font-bold uppercase text-muted-foreground/80 tracking-widest pl-0.5">{dict.wizard.weight} (kg)</Label>
                                            <div className="relative">
                                                <Input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.1"
                                                    className="h-8.5 pr-8 font-bold border-muted-foreground/15 bg-muted/5 group-hover:bg-background transition-colors text-xs"
                                                    value={form.weight || ''}
                                                    onChange={(e) => handleInputChange(order.id, 'weight', parseFloat(e.target.value) || 0)}
                                                    onFocus={() => handleFocus(order.id)}
                                                />
                                                <span className="absolute right-3 top-2 text-[9px] font-black text-muted-foreground/40">KG</span>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] font-bold uppercase text-muted-foreground/80 tracking-widest pl-0.5">{dict.wizard.dimensions} (cm)</Label>
                                            <div className="flex gap-1">
                                                <Input 
                                                    placeholder="P" 
                                                    className="h-8.5 px-1 text-center font-bold border-muted-foreground/15 bg-muted/5 group-hover:bg-background transition-colors text-xs" 
                                                    type="number"
                                                    value={form.l || ''}
                                                    onChange={(e) => handleInputChange(order.id, 'l', parseFloat(e.target.value) || 0)}
                                                    onFocus={() => handleFocus(order.id)}
                                                />
                                                <Input 
                                                    placeholder="L" 
                                                    className="h-8.5 px-1 text-center font-bold border-muted-foreground/15 bg-muted/5 group-hover:bg-background transition-colors text-xs" 
                                                    type="number"
                                                    value={form.w || ''}
                                                    onChange={(e) => handleInputChange(order.id, 'w', parseFloat(e.target.value) || 0)}
                                                    onFocus={() => handleFocus(order.id)}
                                                />
                                                <Input 
                                                    placeholder="T" 
                                                    className="h-8.5 px-1 text-center font-bold border-muted-foreground/15 bg-muted/5 group-hover:bg-background transition-colors text-xs" 
                                                    type="number"
                                                    value={form.h || ''}
                                                    onChange={(e) => handleInputChange(order.id, 'h', parseFloat(e.target.value) || 0)}
                                                    onFocus={() => handleFocus(order.id)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Insurance Section */}
                                    <div className="space-y-2.5 pt-1 border-t border-border/30">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Checkbox 
                                                    id={`insurance-${order.id}`}
                                                    checked={form.isInsured}
                                                    onCheckedChange={(checked) => {
                                                        const isInsured = !!checked;
                                                        const updates: any = { isInsured };
                                                        if (isInsured) {
                                                            if (form.insuredItems.length === 0) {
                                                                updates.insuredItems = order.items.map(i => ({
                                                                    id: i.id,
                                                                    categoryCode: '',
                                                                    price: i.totalPrice
                                                                }));
                                                            }
                                                            const totalInsuredValue = order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
                                                            updates.insuranceFee = Math.round(totalInsuredValue * 0.002);
                                                        } else {
                                                            updates.insuranceFee = 0;
                                                        }
                                                        onUpdate(order.id, { ...form, ...updates });
                                                    }}
                                                />
                                                <Label 
                                                    htmlFor={`insurance-${order.id}`}
                                                    className="text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                                                >
                                                    <ShieldCheck className="h-3 w-3 text-primary" />
                                                    {dict.wizard.add_insurance}
                                                </Label>
                                            </div>

                                            {form.isInsured && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 px-2 text-[9px] font-bold gap-1.5 border-primary/20 hover:bg-primary/5 text-primary"
                                                    onClick={() => handleFillWithAi(order.id, order)}
                                                    disabled={isAiParsing[order.id]}
                                                >
                                                    {isAiParsing[order.id] ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="h-3 w-3" />
                                                    )}
                                                    {dict.wizard.fill_with_ai}
                                                </Button>
                                            )}
                                        </div>

                                        <AnimatePresence>
                                            {form.isInsured && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="space-y-2 overflow-hidden"
                                                >
                                                    {order.items.map((orderItem) => {
                                                        const insuredItem = form.insuredItems.find(i => i.id === orderItem.id) || { categoryCode: '', price: orderItem.totalPrice, id: orderItem.id };
                                                        return (
                                                        <div key={orderItem.id} className="rounded-xl border border-border bg-white dark:bg-muted/10 p-3 flex items-center gap-4 transition-all overflow-hidden relative shadow-none">
                                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                <Label className="text-[11px] font-bold text-foreground truncate mb-1">
                                                                    {orderItem.name}
                                                                </Label>
                                                                <div className="flex items-center gap-3 text-[9px] font-bold text-muted-foreground">
                                                                    <div className="flex items-center gap-1 uppercase tracking-wider">
                                                                        <span>Qty:</span>
                                                                        <span className="text-foreground">{orderItem.qty}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 uppercase tracking-wider">
                                                                        <span>Total:</span>
                                                                        <span className="text-foreground font-mono">{formatCurrency(orderItem.totalPrice)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="w-[200px] shrink-0">
                                                                <Select
                                                                    value={insuredItem.categoryCode || undefined}
                                                                    onValueChange={(val) => handleInsuredItemChange(order.id, orderItem.id, 'categoryCode', val)}
                                                                >
                                                                    <SelectTrigger className="h-8 text-[10px] font-medium bg-muted/5 border-border/60 rounded-md shadow-none">
                                                                        <SelectValue placeholder={dict.wizard.select_category} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {ITEM_CATEGORIES
                                                                             .filter(cat => form.serviceType === 'cold' ? cat.code.startsWith('COLD_') : !cat.code.startsWith('COLD_'))
                                                                             .map(cat => (
                                                                            <SelectItem key={cat.code} value={cat.code} className="text-[10px]">
                                                                                {locale === 'id' ? cat.label_id : cat.label_en}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    )})}

                                                    <div className="flex items-center justify-end pt-1">

                                                        <div className="text-right">
                                                            <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter block leading-none">Total Biaya Asuransi</span>
                                                            <span className="text-[10px] font-black text-primary">
                                                                {formatCurrency(form.insuranceFee)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Calculated Details */}
                                    <div className="flex items-center justify-between text-xs bg-muted/20 px-3 py-2 rounded-lg border border-border/50">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter leading-none mb-0.5">{dict.wizard.volumetric}</span>
                                                <span className="font-bold text-[11px]">{formatWeight(form.volumetric)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter leading-none">{dict.wizard.chargeable.split(' ')[0]}</span>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <button className="h-2.5 w-2.5 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                                                <Info className="h-2 w-2 text-muted-foreground/60" />
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent side="top" className="w-56 p-2 text-[10px] leading-relaxed">
                                                            <p className="font-bold mb-1">{dict.wizard.charge_weight_info}</p>
                                                            <p>{dict.wizard.charge_weight_desc}</p>
                                                            <div className="mt-2 flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                                    <span>{dict.wizard.original_weight_normal}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                                    <span>{dict.wizard.volumetric_bulky}</span>
                                                                </div>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                <span className={cn("font-bold text-[11px]", form.chargeable > form.weight ? "text-amber-600" : "text-primary")}>
                                                    {formatWeight(form.chargeable)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter leading-none block mb-0.5">{dict.wizard.est_shipping}</span>
                                            <span className="font-black text-xs text-foreground">
                                                {formatCurrency(form.estimatedCost + (form.insuranceFee || 0))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-background flex gap-3">
                <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={onBack}
                >
                    {dict.wizard.back}
                </Button>
                <Button 
                    className="flex-[2]" 
                    disabled={!isValid}
                    onClick={onProceed}
                >
                    {dict.wizard.continue}
                </Button>
            </div>
        </div>
    );
}
