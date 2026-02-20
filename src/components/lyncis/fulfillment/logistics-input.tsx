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
import { Package, Scale, ChevronDown, ChevronUp, User, ShoppingBag, Info, MapPin } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface OrderLogisticsForm {
    serviceType: ServiceType;
    weight: number;
    l: number;
    w: number;
    h: number;
    volumetric: number;
    chargeable: number;
    estimatedCost: number;
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
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
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

    // Calculate validity for proceed button
    const isValid = useMemo(() => {
        return orders.every(order => {
            const form = logisticsState[order.id];
            return form && form.weight > 0 && form.chargeable > 0;
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
        return Object.values(logisticsState).reduce((acc, curr) => acc + (curr?.estimatedCost || 0), 0);
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
                    const rate = getShippingRate(originZone, destZone, newForm.serviceType);
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

                // If current service not available on this route, pick a fallback
                if (!availableServices.includes(currentService)) {
                    currentService = availableServices[0] || 'regular';
                    updates.serviceType = currentService;
                }

                const rate = getShippingRate(originZone, destZone, currentService);
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
                    const rate = getShippingRate(originZone, destZone, newForm.serviceType);
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

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-background">
            {/* Header / Summary */}
            <div className="p-4 border-b bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">Input Logistik</h2>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/5 border border-primary/10">
                            <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">Auto-save</span>
                        </div>
                    </div>
                    <Badge variant="outline" className="h-5 px-2 text-[9px] font-black uppercase tracking-widest border-muted-foreground/30">
                        Step 3 / 4
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
                        <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1">Pesanan</div>
                        <div className="font-bold text-sm leading-tight">{orders.length}</div>
                    </div>
                    <div className="bg-background border rounded-lg p-2 text-center">
                        <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1">Berat</div>
                        <div className="font-bold text-sm leading-tight">{formatWeight(totalWeight)}</div>
                    </div>
                    <div className="bg-background border rounded-lg p-2 text-center border-green-600 dark:border-green-400">
                        <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1">Ongkir</div>
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
                                            <span className="text-[9px] text-muted-foreground mt-0.5">{order.items.length} Barang</span>
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
                                                        <span>Detail Penerima</span>
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
                                                        <span>Daftar Barang</span>
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
                                    <div className="grid gap-1.5 text-left">
                                        <Label className="text-[9px] font-bold uppercase text-muted-foreground/80 tracking-widest pl-0.5">Layanan</Label>
                                        <Select 
                                            value={form.serviceType} 
                                            onValueChange={(val) => handleInputChange(order.id, 'serviceType', val as ServiceType)}
                                        >
                                            <SelectTrigger 
                                                className="h-8.5 border-muted-foreground/15 font-bold text-xs bg-muted/5 group-hover:bg-background transition-colors"
                                                onFocus={() => handleFocus(order.id)}
                                            >
                                                <SelectValue />
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
                                                            {label} {!available.includes(key as ServiceType) && "(Tidak tersedia)"}
                                                        </SelectItem>
                                                    ));
                                                })()}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Weight & Dims Row */}
                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] font-bold uppercase text-muted-foreground/80 tracking-widest pl-0.5">Berat (kg)</Label>
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
                                            <Label className="text-[9px] font-bold uppercase text-muted-foreground/80 tracking-widest pl-0.5">Dimensi (cm)</Label>
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

                                    {/* Calculated Details */}
                                    <div className="flex items-center justify-between text-xs bg-muted/20 px-3 py-2 rounded-lg border border-border/50">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter leading-none mb-0.5">Volumetric</span>
                                                <span className="font-bold text-[11px]">{formatWeight(form.volumetric)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter leading-none">Charge</span>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <button className="h-2.5 w-2.5 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                                                <Info className="h-2 w-2 text-muted-foreground/60" />
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent side="top" className="w-56 p-2 text-[10px] leading-relaxed">
                                                            <p className="font-bold mb-1">Informasi Berat Charge</p>
                                                            <p>Ongkir dihitung dari berat tertinggi antara berat asli dan volume.</p>
                                                            <div className="mt-2 flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                                    <span>Hitung berat asli (Normal)</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                                    <span>Hitung volume (Barang Bulky)</span>
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
                                            <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter leading-none block mb-0.5">Est. Ongkir</span>
                                            <span className="font-black text-xs text-foreground">
                                                {formatCurrency(form.estimatedCost)}
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
                    Kembali
                </Button>
                <Button 
                    className="flex-[2]" 
                    disabled={!isValid}
                    onClick={onProceed}
                >
                    Lanjutkan
                </Button>
            </div>
        </div>
    );
}
