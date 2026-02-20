
'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle 
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
    useStagedOrders, 
    useSenderAddresses, 
    unstageOrders, 
    commitBatch,
    autoSaveLogistics,
    autoSaveSenderId
} from '@/hooks/use-lyncis-db';
import { useLanguage } from '@/components/providers/language-provider';
import { JastipOrder, SenderAddress } from '@/lib/types';
import { CompletionGate } from './completion-gate';
import { LogisticsInput, OrderLogisticsForm } from './logistics-input';
import { OriginSelector } from './origin-selector';
import { BatchSummary } from './batch-summary';
import { calculateVolumetricWeight, calculateChargeableWeight } from '@/lib/logistics';
import { getZoneForProvince, getShippingRate, calculateShippingCost } from '@/lib/shipping-zones';
// import { Steps } from '@/components/ui/steps-nav';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface BatchWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentBatchId: string | null;
    onEditOrder: (id: string) => void;
}

type WizardStep = 'validate' | 'origin' | 'logistics' | 'summary';

const STEP_ORDER: WizardStep[] = ['validate', 'origin', 'logistics', 'summary'];

export function BatchWizard({
    open,
    onOpenChange,
    currentBatchId,
    onEditOrder
}: BatchWizardProps) {
    const { dict } = useLanguage();
    const orders = useStagedOrders();
    const senderAddresses = useSenderAddresses();
    
    // UI State
    const [currentStep, setCurrentStep] = useState<WizardStep>('validate');
    const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);
    const [removingOrder, setRemovingOrder] = useState<string | 'all' | string[] | null>(null);

    // Logistics Data State (Temporary per session)
    // Initialize with order data if available
    const [logisticsState, setLogisticsState] = useState<Record<string, OrderLogisticsForm>>({});

    // Sync logistics state when orders or batch changes
    useEffect(() => {
        if (open && orders && orders.length > 0) {
            setLogisticsState(prev => {
                const newState = { ...prev };
                let hasChanges = false;

                orders.forEach(o => {
                    // Only initialize if not already in state OR if data changed significantly?
                    // For now, if it's missing, add it.
                    if (!newState[o.id]) {
                        newState[o.id] = {
                            serviceType: o.logistics.serviceType || 'regular',
                            weight: o.logistics.finalPackedWeight || 0,
                            l: o.logistics.dimensions?.l || 0,
                            w: o.logistics.dimensions?.w || 0,
                            h: o.logistics.dimensions?.h || 0,
                            volumetric: o.logistics.volumetricWeight || 0,
                            chargeable: o.logistics.chargeableWeight || 0,
                            estimatedCost: o.logistics.estimatedCost || 0,
                        };
                        hasChanges = true;
                    }
                });

                return hasChanges ? newState : prev;
            });

            // Set default sender if not set
            if (!selectedSenderId) {
                const defaultSender = senderAddresses?.find(s => s.isDefault);
                if (defaultSender) {
                    setSelectedSenderId(defaultSender.id);
                }
            }
        }
    }, [open, orders, senderAddresses?.length, selectedSenderId]);

    // Helper to get selected sender object
    const selectedSender = useMemo(() => 
        senderAddresses?.find(s => s.id === selectedSenderId) || null, 
    [senderAddresses, selectedSenderId]);

    // Handlers
    const handleSenderSelect = async (id: string) => {
        setSelectedSenderId(id);
        if (orders) {
            const ids = orders.map(o => o.id);
            await autoSaveSenderId(ids, id);
        }
    };

    const confirmRemove = async () => {
        if (!removingOrder) return;
        
        if (removingOrder === 'all') {
            const ids = orders?.map(o => o.id) || [];
            if (ids.length > 0) {
                await unstageOrders(ids);
                toast.success(dict.toast.batch_all_removed);
            }
            onOpenChange(false);
        } else if (Array.isArray(removingOrder)) {
            if (removingOrder.length > 0) {
                await unstageOrders(removingOrder);
                toast.success(dict.toast.batch_selected_removed.replace('{count}', removingOrder.length.toString()));
                if (orders && orders.length === removingOrder.length) {
                    onOpenChange(false);
                }
            }
        } else {
            await unstageOrders([removingOrder]);
            toast.success(dict.toast.batch_order_removed);
            if (orders?.length === 1) { // Was the last one
                onOpenChange(false);
            }
        }
        setRemovingOrder(null);
    };

    const handleUpdateLogistics = (id: string, updates: Partial<OrderLogisticsForm>) => {
        setLogisticsState(prev => ({
            ...prev,
            [id]: { ...prev[id], ...updates }
        }));

        // Fire-and-forget auto-save to database
        const logisticsUpdates: Partial<JastipOrder['logistics']> = {
            serviceType: updates.serviceType,
            finalPackedWeight: updates.weight,
            dimensions: { 
                l: updates.l ?? logisticsState[id].l, 
                w: updates.w ?? logisticsState[id].w, 
                h: updates.h ?? logisticsState[id].h 
            },
            volumetricWeight: updates.volumetric,
            chargeableWeight: updates.chargeable,
            estimatedCost: updates.estimatedCost,
        };
        autoSaveLogistics(id, logisticsUpdates);
    };

    const handleCommitBatch = async () => {
        try {
            // Prepare logistics map
            const logisticsMap: Record<string, Partial<JastipOrder['logistics']>> = {};
            const orderIds: string[] = [];

            orders?.forEach(o => {
                const logistics = logisticsState[o.id];
                if (logistics) {
                    orderIds.push(o.id);
                    logisticsMap[o.id] = {
                        originId: selectedSenderId,
                        serviceType: logistics.serviceType,
                        finalPackedWeight: logistics.weight,
                        dimensions: { l: logistics.l, w: logistics.w, h: logistics.h },
                        volumetricWeight: logistics.volumetric,
                        chargeableWeight: logistics.chargeable,
                        estimatedCost: logistics.estimatedCost,
                    };
                }
            });

            if (orderIds.length > 0) {
                await commitBatch(orderIds, logisticsMap);
                toast.success(dict.toast.batch_processed_success);
                onOpenChange(false);
            }
        } catch (error) {
            console.error(error);
            toast.error(dict.toast.batch_processed_error);
        }
    };

    // calculate progress
    const progress = useMemo(() => {
        const idx = STEP_ORDER.indexOf(currentStep);
        return ((idx + 1) / STEP_ORDER.length) * 100;
    }, [currentStep]);

    if (!orders || orders.length === 0) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent 
                side="right" 
                className="w-full sm:max-w-2xl p-0 flex flex-col h-full bg-background border-l"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <SheetHeader className="px-6 py-4 border-b shrink-0">
                    <SheetTitle className="flex items-center gap-2">
                        <span>{dict.wizard.title}</span>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground opacity-40 ml-2">
                            {dict.wizard.step_of.replace('{current}', (STEP_ORDER.indexOf(currentStep) + 1).toString()).replace('{total}', '4')}
                        </span>
                    </SheetTitle>
                    <Progress value={progress} className="h-1 mt-2" />
                </SheetHeader>

                <div className="flex-1 flex flex-col min-h-0">
                    {/* Render Step Content */}
                    {currentStep === 'validate' && (
                        <CompletionGate 
                            orders={orders}
                            onProceed={() => setCurrentStep('origin')}
                            onRemoveOrder={(id) => setRemovingOrder(id)}
                            onRemoveAllOrders={() => setRemovingOrder('all')}
                            onRemoveSelected={(ids) => setRemovingOrder(ids)}
                            onEditOrder={onEditOrder}
                        />
                    )}

                    {currentStep === 'origin' && (
                        <OriginSelector 
                            senderAddresses={senderAddresses || []}
                            selectedId={selectedSenderId}
                            onSelect={handleSenderSelect}
                            onProceed={() => setCurrentStep('logistics')}
                            onBack={() => setCurrentStep('validate')}
                        />
                    )}

                    {currentStep === 'logistics' && (
                        <LogisticsInput 
                            orders={orders}
                            senderAddress={selectedSender}
                            logisticsState={logisticsState}
                            onUpdate={handleUpdateLogistics}
                            onProceed={() => setCurrentStep('summary')}
                            onBack={() => setCurrentStep('origin')}
                        />
                    )}

                    {currentStep === 'summary' && (
                        <BatchSummary 
                            orders={orders}
                            senderAddress={selectedSender}
                            logisticsState={logisticsState}
                            onConfirm={handleCommitBatch}
                            onEditOrder={onEditOrder}
                            onBack={() => setCurrentStep('logistics')}
                        />
                    )}
                </div>
            </SheetContent>

            <AlertDialog open={!!removingOrder} onOpenChange={(open) => {
                if (!open) setRemovingOrder(null);
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dict.orders.delete_confirm_title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {removingOrder === 'all' 
                                ? dict.orders.delete_confirm_description_all 
                                : Array.isArray(removingOrder)
                                    ? dict.orders.delete_confirm_description_selected.replace('{count}', removingOrder.length.toString())
                                    : dict.orders.delete_confirm_description_single}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRemove}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {removingOrder === 'all' 
                                ? dict.orders.delete_confirm_action_all 
                                : Array.isArray(removingOrder) 
                                    ? dict.orders.delete_confirm_action_selected 
                                    : dict.orders.delete_confirm_action_single}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Sheet>
    );
}
