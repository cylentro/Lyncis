'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  useOrders,
  useAllTags,
  useTagCounts,
  addOrder,
  addOrders,
  updateOrder,
  deleteOrder,
  bulkUpdateOrders,
  deleteOrders,
  markOrdersTriaged,
  useStagedOrders,
  stageOrders,
  unstageOrders,
} from '@/hooks/use-lyncis-db';
import { v4 as uuidv4 } from 'uuid';
import { BatchWizard } from '@/components/lyncis/fulfillment/batch-wizard';
import { StickySelectionBar } from '@/components/lyncis/bucket/sticky-selection-bar';
import { JastipOrder } from '@/lib/types';
import { OrderTable } from '@/components/lyncis/bucket/order-table';
import { TagSidebar } from '@/components/lyncis/bucket/tag-sidebar';
import { OrderEditSheet } from '@/components/lyncis/bucket/order-edit-sheet';
import { UnifiedIntakePanel } from '@/components/lyncis/intake/unified-intake-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Package, Plus, SlidersHorizontal, ChevronDown, Menu, Check, Trash, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/providers/language-provider';
import { LanguageSelector } from '@/components/lyncis/shared/language-selector';

export default function BucketPage() {
  const { dict } = useLanguage();
  // ─── State ──────────────────────────────────────────────────
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingOrder, setEditingOrder] = useState<JastipOrder | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [intakePanelOpen, setIntakePanelOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<JastipOrder | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sheetMode, setSheetMode] = useState<'edit' | 'review'>('edit');
  
  // Batch Wizard State
  const [batchWizardOpen, setBatchWizardOpen] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  // ─── Queries ────────────────────────────────────────────────
  const orders = useOrders(
    selectedTag === '___staged___' 
      ? { status: 'staged' }
      : (selectedTag ? { tag: selectedTag } : undefined)
  );
  const allTags = useAllTags();
  const tagCounts = useTagCounts();
  const stagedOrders = useStagedOrders();

  // ─── Derived ────────────────────────────────────────────────
  const tagInfos = useMemo(() => {
    if (!allTags || !tagCounts) return [];
    return allTags.map((tag) => ({
      name: tag,
      total: tagCounts[tag]?.total ?? 0,
      unassigned: tagCounts[tag]?.unassigned ?? 0,
      processed: tagCounts[tag]?.processed ?? 0,
      staged: tagCounts[tag]?.staged ?? 0,
    }));
  }, [allTags, tagCounts]);

  const totalOrders = useMemo(() => {
    if (!tagCounts) return 0;
    return Object.values(tagCounts).reduce((sum, c) => sum + c.total, 0);
  }, [tagCounts]);

  // Orders that are currently selected
  const selectedOrdersData = useMemo(
    () => (orders ?? []).filter((o) => selectedIds.has(o.id)),
    [orders, selectedIds]
  );

  const selectedUnassignedCount = useMemo(
    () => selectedOrdersData.filter(o => o.status !== 'staged').length,
    [selectedOrdersData]
  );
  
  const selectedStagedCount = useMemo(
    () => selectedOrdersData.filter(o => o.status === 'staged').length,
    [selectedOrdersData]
  );

  // Orders that came from Excel and haven't been reviewed yet
  const triageOrders = useMemo(
    () => (orders ?? []).filter((o) => o.metadata?.needsTriage === true),
    [orders]
  );

  // ─── Handlers ───────────────────────────────────────────────
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleEdit = useCallback((order: JastipOrder) => {
    setEditingOrder(order);
    setIsReadOnly(false);
    setSheetMode('edit');
    setEditDialogOpen(true);
  }, []);

  const handleEditById = useCallback((id: string) => {
    const order = (orders ?? []).find(o => o.id === id) || (stagedOrders ?? []).find(o => o.id === id);
    if (order) handleEdit(order);
  }, [orders, stagedOrders, handleEdit]);

  const handleReview = useCallback((order: JastipOrder) => {
    setEditingOrder(order);
    setIsReadOnly(false);
    setSheetMode('review');
    setEditDialogOpen(true);
  }, []);

  const handleViewDetails = useCallback((order: JastipOrder) => {
    setEditingOrder(order);
    setIsReadOnly(true);
    setEditDialogOpen(true);
  }, []);

  const handleEditSave = useCallback(async (order: JastipOrder) => {
    await updateOrder(order.id, order);
    toast.success(dict.orders.success_update);
  }, [dict.orders.success_update]);

  const handleDelete = useCallback((order: JastipOrder) => {
    setDeletingOrder(order);
  }, []);

  const handleConfirmOrder = useCallback(async (order: JastipOrder) => {
    if (order.metadata?.needsTriage) {
      toast.error(dict.orders.error_triage);
      return;
    }
    await updateOrder(order.id, { status: 'staged' });
    toast.success(dict.orders.success_confirm);
  }, [dict.orders.error_triage, dict.orders.success_confirm]);

  const handleBulkConfirm = useCallback(async () => {
    const selectedOrders = (orders ?? []).filter(o => selectedIds.has(o.id));
    const validIds = selectedOrders.filter(o => !o.metadata?.needsTriage).map(o => o.id);
    const skippedCount = selectedIds.size - validIds.length;

    if (validIds.length > 0) {
      await bulkUpdateOrders(validIds, { status: 'staged' });
      setSelectedIds(new Set());
      toast.success(dict.toast.success_confirm_list.replace('{count}', validIds.length.toString()));
    }

    if (skippedCount > 0) {
      toast.warning(dict.toast.warning_skipped_review.replace('{count}', skippedCount.toString()));
    }
  }, [selectedIds, orders]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    await deleteOrders(ids);
    setSelectedIds(new Set());
    toast.success(dict.toast.success_delete_list.replace('{count}', ids.length.toString()));
  }, [selectedIds, dict.toast.success_delete_list]);

  const handleConfirmDelete = useCallback(async () => {
    if (deletingOrder) {
      await deleteOrder(deletingOrder.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deletingOrder.id);
        return next;
      });
      toast.success(dict.orders.success_delete);
      setDeletingOrder(null);
    }
  }, [deletingOrder, dict.orders.success_delete]);

  const handleCreateSave = useCallback(
    async (order: Omit<JastipOrder, 'id'>) => {
      await addOrder(order);
    },
    []
  );

  const handleBatchImport = useCallback(
    async (newOrders: Omit<JastipOrder, 'id'>[]) => {
      await addOrders(newOrders);
    },
    []
  );

  const handleApproveOne = useCallback(async (id: string) => {
    await markOrdersTriaged([id]);
    toast.success(dict.toast.success_approve);
  }, [dict.toast.success_approve]);

  const handleApproveAll = useCallback(async () => {
    const ids = triageOrders.map((o) => o.id);
    if (ids.length === 0) return;
    await markOrdersTriaged(ids);
    toast.success(dict.toast.success_approve_list.replace('{count}', ids.length.toString()));
  }, [triageOrders, dict.toast.success_approve_list]);

  const handleTagSelect = useCallback((tag: string | null) => {
    setSelectedTag(tag);
    setSelectedIds(new Set());
    setSidebarOpen(false);
  }, []);

  // ─── Batch Handlers ──────────────────────────────────────────
  
  // Create NEW batch with selected orders
  const handleProcessBatch = useCallback(async () => {
    const newBatchId = uuidv4();
    const ids = Array.from(selectedIds);
    await stageOrders(ids, newBatchId);
    
    setActiveBatchId(newBatchId);
    setBatchWizardOpen(true);
    setSelectedIds(new Set());
  }, [selectedIds]);

  // Add selected orders to EXISTING active batch
  const handleAddToBatch = useCallback(async () => {
    // If we have staged orders, use their batch ID
    // If multiple batch IDs exist in staged (unlikely in this flow), pick the first one
    const existingBatchId = stagedOrders?.[0]?.batchId || uuidv4();
    
    const ids = Array.from(selectedIds);
    await stageOrders(ids, existingBatchId);
    
    // setActiveBatchId(existingBatchId); // Optional: switch active context
    setSelectedIds(new Set());
    toast.success(dict.toast.success_add_to_batch);
  }, [selectedIds, stagedOrders, dict.toast.success_add_to_batch]);

  const handleRemoveFromStaged = useCallback(async () => {
    const ids = Array.from(selectedIds);
    await unstageOrders(ids);
    setSelectedIds(new Set());
    toast.success(dict.toast.success_remove_from_batch);
  }, [selectedIds, dict.toast.success_remove_from_batch]);

  // ─── Sidebar Content Renderer ─────────────────────────────
  const renderSidebar = (showMobileClose = false) => (
    <TagSidebar
      tags={tagInfos}
      totalOrders={totalOrders}
      selectedTag={selectedTag}
      onTagSelect={handleTagSelect}
      showMobileClose={showMobileClose}
    />
  );

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/10">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar trigger */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <SlidersHorizontal className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
                {renderSidebar(true)}
              </SheetContent>
            </Sheet>

            {/* Desktop toggle button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex h-9 w-9 text-muted-foreground hover:text-foreground transition-all active:scale-90"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center">
                <img src="/icon.svg" alt="Lyncis" className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">{dict.common.app_name}</h1>
                <p className="hidden text-[10px] font-medium text-muted-foreground sm:block leading-none">
                  {dict.common.app_description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden items-center gap-2 md:flex">
              <span className="h-1 w-1 rounded-full bg-primary/30" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {dict.orders.count.replace('{count}', (orders?.length ?? 0).toString())}
                {selectedTag === '___staged___' ? ` • ${dict.orders.batch_shipping}` : (selectedTag ? ` • ${selectedTag}` : '')}
              </span>
            </div>

            {/* Shopify-style Cart Trigger */}
            {stagedOrders && stagedOrders.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setBatchWizardOpen(true)}
                className="h-8 gap-1.5 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 active:scale-95 transition-all"
              >
                <Package className="h-3.5 w-3.5" />
                {dict.navigation.batch}
                <Badge variant="default" className="h-4 min-w-[1rem] px-1 bg-blue-600 text-white text-[9px] ml-0.5">
                  {stagedOrders.length}
                </Badge>
              </Button>
            )}

            <LanguageSelector />

            <Button size="sm" onClick={() => setIntakePanelOpen(true)} className="h-8 gap-1.5 active:scale-95 transition-transform duration-200 rounded-md">
              <Plus className="h-3.5 w-3.5" />
              {dict.navigation.add_order.split(' ')[0]} <span className="hidden sm:inline">{dict.navigation.add_order.split(' ').slice(1).join(' ')}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Body: Sidebar + Table ──────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar Container */}
        <aside 
          className={cn(
            "relative hidden md:flex flex-col shrink-0 border-r bg-muted/20 transition-all duration-500 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]",
            isSidebarCollapsed ? "w-0 opacity-0 -translate-x-4" : "w-64 opacity-100 translate-x-0"
          )}
        >
          <div className={cn(
            "h-full w-64 transition-opacity duration-300",
            isSidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-100 delay-150"
          )}>
            {renderSidebar(false)}
          </div>
        </aside>

        {/* Floating Toggle Button removed (replaced by burger in header) */}

        <main className="flex-1 overflow-hidden bg-muted/20">
          <div className={cn(
            "w-full p-4 md:p-8 h-full transition-all duration-500 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] mx-auto font-sans",
            isSidebarCollapsed ? "max-w-[99%] 2xl:max-w-[2560px]" : "max-w-[99%] 2xl:max-w-[1920px]"
          )}>
            <div className={cn(
              "transition-all duration-500",
              isSidebarCollapsed && "ring-1 ring-primary/5 rounded-3xl"
            )}>
              <OrderTable
                orders={orders ?? []}
                isLoading={orders === undefined}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetails={handleViewDetails}
                onConfirm={handleConfirmOrder}
                onReview={handleReview}
              />
            </div>
          </div>
        </main>
      </div>

      {/* ── Dialogs ────────────────────────────────────────── */}
      <OrderEditSheet
        order={editingOrder}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleEditSave}
        onApprove={handleApproveOne}
        activeTags={allTags ?? []}
        readOnly={isReadOnly}
        mode={sheetMode}
      />

      <UnifiedIntakePanel
        open={intakePanelOpen}
        onOpenChange={setIntakePanelOpen}
        onSave={handleCreateSave}
        onBatchImport={handleBatchImport}
        allTagsData={tagInfos ?? []}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingOrder}
        onOpenChange={(open) => {
          if (!open) setDeletingOrder(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.orders.delete_confirm_title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.orders.delete_confirm_desc
                .replace('{name}', deletingOrder?.recipient.name || dict.orders.empty_name)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {dict.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <BatchWizard 
        open={batchWizardOpen} 
        onOpenChange={setBatchWizardOpen}
        currentBatchId={activeBatchId}
        onEditOrder={handleEditById}
      />

      <StickySelectionBar 
        totalSelected={selectedIds.size}
        unassignedSelected={selectedUnassignedCount}
        stagedSelected={selectedStagedCount}
        onMoveToStaged={handleAddToBatch}
        onRemoveFromStaged={handleRemoveFromStaged}
        onDelete={handleBulkDelete}
        onDeselect={handleDeselectAll}
      />
    </div>
  );
}

