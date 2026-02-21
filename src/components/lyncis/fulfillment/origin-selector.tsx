
'use client';

import { useState } from 'react';
import { SenderAddress } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { LocationAutocomplete } from '@/components/lyncis/intake/location-autocomplete';
import { 
    updateSenderAddress, 
    deleteSenderAddress, 
    setDefaultSenderAddress,
    addSenderAddress 
} from '@/hooks/use-lyncis-db';
import { MapPin, Plus, Check, Pencil, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '@/components/providers/language-provider';

interface OriginSelectorProps {
    senderAddresses: SenderAddress[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onProceed: () => void;
    onBack: () => void;
}

export function OriginSelector({
    senderAddresses,
    selectedId,
    onSelect,
    onProceed,
    onBack,
}: OriginSelectorProps) {
    const { dict } = useLanguage();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Form State (used for both Add and Edit)
    const [formState, setFormState] = useState<Omit<SenderAddress, 'id' | 'isDefault'>>({
        label: '',
        name: '',
        phone: '',
        addressRaw: '',
        provinsi: '',
        kota: '',
        kecamatan: '',
        kelurahan: '',
        kodepos: '',
    });

    const sortedAddresses = [...senderAddresses].sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return a.label.localeCompare(b.label);
    });

    const handleSave = async () => {
        if (!formState.label || !formState.provinsi) {
            toast.error(dict.toast.required_origin_fields);
            return;
        }

        try {
            if (editingId) {
                await updateSenderAddress(editingId, formState);
                toast.success(dict.toast.success_update_origin);
            } else {
                const id = await addSenderAddress({
                    ...formState,
                    isDefault: senderAddresses.length === 0,
                });
                onSelect(id);
                toast.success(dict.toast.success_update_origin);
            }
            closeForm();
        } catch (error) {
            console.error(error);
            toast.error(dict.toast.error_save_origin);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm(dict.toast.confirm_delete_origin)) return;
        try {
            await deleteSenderAddress(id);
            if (selectedId === id) onSelect('');
            toast.success(dict.toast.success_delete_origin);
        } catch (error) {
            toast.error(dict.toast.error_delete_origin);
        }
    };

    const handleSetDefault = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await setDefaultSenderAddress(id);
            toast.success(dict.toast.success_set_default_origin);
        } catch (error) {
            toast.error(dict.toast.error_save_origin); // generic error
        }
    };

    const startEdit = (e: React.MouseEvent, addr: SenderAddress) => {
        e.stopPropagation();
        setEditingId(addr.id);
        setFormState({
            label: addr.label,
            name: addr.name,
            phone: addr.phone,
            addressRaw: addr.addressRaw,
            provinsi: addr.provinsi,
            kota: addr.kota,
            kecamatan: addr.kecamatan,
            kelurahan: addr.kelurahan,
            kodepos: addr.kodepos,
        });
        setIsAdding(true);
    };

    const closeForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormState({
            label: '',
            name: '',
            phone: '',
            addressRaw: '',
            provinsi: '',
            kota: '',
            kecamatan: '',
            kelurahan: '',
            kodepos: '',
        });
    };

    if (isAdding) {
        return (
            <div className="flex flex-col flex-1 min-h-0 bg-background">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold">{dict.wizard.add_origin}</h2>
                    <p className="text-sm text-muted-foreground">{dict.wizard.origin_desc}</p>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    <div className="space-y-2">
                        <Label>{dict.wizard.label}</Label>
                        <Input 
                            value={formState.label}
                            onChange={(e) => setFormState(prev => ({ ...prev, label: e.target.value }))}
                            placeholder={dict.common.edit === 'Edit' ? 'Example: Head Office, Warehouse' : 'Contoh: Kantor Pusat, Gudang'}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.wizard.sender_name}</Label>
                            <Input 
                                value={formState.name}
                                onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={dict.common.edit === 'Edit' ? 'Shop Name / Personal' : 'Nama Toko / Personal'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.wizard.phone}</Label>
                            <Input 
                                value={formState.phone}
                                onChange={(e) => setFormState(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="081234567890"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{dict.orders.address}</Label>
                        <Textarea 
                            value={formState.addressRaw}
                            onChange={(e) => setFormState(prev => ({ ...prev, addressRaw: e.target.value }))}
                            placeholder={dict.orders.address_placeholder}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{dict.wizard.search_location}</Label>
                        <LocationAutocomplete 
                            onSelect={(loc) => setFormState(prev => ({
                                ...prev,
                                provinsi: loc.province_name,
                                kota: loc.city_name,
                                kecamatan: loc.district_name,
                                kelurahan: loc.subdistrict_name,
                                kodepos: loc.postal_code,
                            }))}
                            defaultValue={editingId ? `${formState.kelurahan}, ${formState.kodepos}` : ''}
                        />
                    </div>

                    {formState.provinsi && (
                        <div className="p-3 rounded-md bg-muted/20 border border-border/40 animate-in fade-in slide-in-from-top-1">
                            <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground uppercase font-bold text-[9px]">{dict.orders.province}</span>
                                    <span className="font-medium truncate">{formState.provinsi}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground uppercase font-bold text-[9px]">{dict.orders.city}</span>
                                    <span className="font-medium truncate">{formState.kota}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground uppercase font-bold text-[9px]">{dict.orders.district}</span>
                                    <span className="font-medium truncate">{formState.kecamatan}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground uppercase font-bold text-[9px]">{dict.orders.subdistrict}</span>
                                    <span className="font-medium truncate">{formState.kelurahan}</span>
                                </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-border/20 flex items-baseline gap-1.5">
                                <span className="text-muted-foreground uppercase font-bold text-[9px]">{dict.orders.postal_code}</span>
                                <span className="font-mono font-bold text-primary">{formState.kodepos}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-background flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={closeForm}>
                        {dict.common.cancel}
                    </Button>
                    <Button className="flex-1" onClick={handleSave}>
                        {editingId ? dict.wizard.edit_origin : dict.wizard.save_origin}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-background">
            <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">{dict.wizard.origin_title}</h2>
                <p className="text-sm text-muted-foreground">{dict.wizard.origin_desc}</p>
            </div>

            <div className="flex-1 p-6 space-y-4 overflow-y-auto min-h-0 overscroll-contain">
                {senderAddresses.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground space-y-4">
                        <MapPin className="h-12 w-12 mx-auto opacity-20" />
                        <p>{dict.wizard.no_origin}</p>
                        <Button onClick={() => setIsAdding(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            {dict.wizard.add_origin}
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-2.5">
                            {sortedAddresses.map((addr) => (
                                <div 
                                    key={addr.id}
                                    className={cn(
                                        "group relative border rounded-xl overflow-hidden transition-all cursor-pointer",
                                        selectedId === addr.id 
                                            ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                            : "border-border hover:border-primary/40 hover:bg-muted/5"
                                    )}
                                    onClick={() => onSelect(addr.id)}
                                >
                                    {/* Hover Actions */}
                                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                                        {!addr.isDefault && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-amber-500 hover:bg-amber-50"
                                                onClick={(e) => handleSetDefault(e, addr.id)}
                                                title="Set as Default"
                                            >
                                                <Star className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5"
                                            onClick={(e) => startEdit(e, addr)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:bg-destructive hover:text-white transition-all shadow-none"
                                            onClick={(e) => handleDelete(e, addr.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    <div className="p-3.5 flex items-start gap-4">
                                        <div className={cn(
                                            "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                            selectedId === addr.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                        )}>
                                            <MapPin className="h-4.5 w-4.5" />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="font-bold text-sm truncate">{addr.label}</span>
                                                    {addr.isDefault && (
                                                        <Badge variant="secondary" className="h-3.5 px-1 text-[8px] uppercase font-black bg-primary/10 text-primary border-none">
                                                            {dict.common.edit === 'Edit' ? 'Default' : 'Utama'}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {selectedId === addr.id && (
                                                    <div className="shrink-0 animate-in fade-in zoom-in duration-200 mr-2 group-hover:opacity-0">
                                                        <Check className="h-4 w-4 text-primary" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                <p className="text-[11px] font-bold text-foreground/70 leading-none mb-0.5">
                                                    {addr.name} • {addr.phone}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground leading-snug">
                                                    {addr.addressRaw}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground italic">
                                                    {addr.kelurahan && `${addr.kelurahan}, `}{addr.kecamatan && `${addr.kecamatan}, `}{addr.kota}, {addr.provinsi} {addr.kodepos}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            {dict.wizard.add_origin}
                        </Button>
                    </>
                )}
            </div>

            <div className="p-4 border-t bg-background flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onBack}>
                    {dict.wizard.back}
                </Button>
                <Button 
                    className="flex-[2]" 
                    disabled={!selectedId}
                    onClick={onProceed}
                >
                    {dict.wizard.continue}
                </Button>
            </div>
        </div>
    );
}
