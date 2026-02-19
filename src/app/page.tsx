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
} from '@/hooks/use-lyncis-db';
import { JastipOrder } from '@/lib/types';
import { OrderTable } from '@/components/lyncis/bucket/order-table';
import { TagSidebar } from '@/components/lyncis/bucket/tag-sidebar';
import { OrderEditSheet } from '@/components/lyncis/bucket/order-edit-sheet';
import { UnifiedIntakePanel } from '@/components/lyncis/intake/unified-intake-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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

export default function BucketPage() {
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

  // ─── Queries ────────────────────────────────────────────────
  const orders = useOrders(
    selectedTag ? { tag: selectedTag } : undefined
  );
  const allTags = useAllTags();
  const tagCounts = useTagCounts();

  // ─── Derived ────────────────────────────────────────────────
  const tagInfos = useMemo(() => {
    if (!allTags || !tagCounts) return [];
    return allTags.map((tag) => ({
      name: tag,
      total: tagCounts[tag]?.total ?? 0,
      unassigned: tagCounts[tag]?.unassigned ?? 0,
    }));
  }, [allTags, tagCounts]);

  const totalOrders = useMemo(() => {
    if (!tagCounts) return 0;
    return Object.values(tagCounts).reduce((sum, c) => sum + c.total, 0);
  }, [tagCounts]);

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
    setEditDialogOpen(true);
  }, []);

  const handleViewDetails = useCallback((order: JastipOrder) => {
    setEditingOrder(order);
    setIsReadOnly(true);
    setEditDialogOpen(true);
  }, []);

  const handleEditSave = useCallback(async (order: JastipOrder) => {
    await updateOrder(order.id, order);
    toast.success('Pesanan berhasil diupdate');
  }, []);

  const handleDelete = useCallback((order: JastipOrder) => {
    setDeletingOrder(order);
  }, []);

  const handleConfirmOrder = useCallback(async (order: JastipOrder) => {
    if (order.metadata?.needsTriage) {
      toast.error('Pesanan ini perlu direview manual terlebih dahulu');
      return;
    }
    await updateOrder(order.id, { status: 'staged' });
    toast.success('Pesanan dikonfirmasi ke Siap Kirim');
  }, []);

  const handleBulkConfirm = useCallback(async () => {
    const selectedOrders = (orders ?? []).filter(o => selectedIds.has(o.id));
    const validIds = selectedOrders.filter(o => !o.metadata?.needsTriage).map(o => o.id);
    const skippedCount = selectedIds.size - validIds.length;

    if (validIds.length > 0) {
      await bulkUpdateOrders(validIds, { status: 'staged' });
      setSelectedIds(new Set());
      toast.success(`${validIds.length} pesanan berhasil dikonfirmasi`);
    }

    if (skippedCount > 0) {
      toast.warning(`${skippedCount} pesanan dilewati karena perlu review manual.`);
    }
  }, [selectedIds, orders]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    await deleteOrders(ids);
    setSelectedIds(new Set());
    toast.success(`${ids.length} pesanan berhasil dihapus`);
  }, [selectedIds]);

  const handleConfirmDelete = useCallback(async () => {
    if (deletingOrder) {
      await deleteOrder(deletingOrder.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deletingOrder.id);
        return next;
      });
      toast.success('Pesanan berhasil dihapus');
      setDeletingOrder(null);
    }
  }, [deletingOrder]);

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
    toast.success('Pesanan disetujui');
  }, []);

  const handleApproveAll = useCallback(async () => {
    const ids = triageOrders.map((o) => o.id);
    if (ids.length === 0) return;
    await markOrdersTriaged(ids);
    toast.success(`${ids.length} pesanan Excel telah disetujui`);
  }, [triageOrders]);

  const handleTagSelect = useCallback((tag: string | null) => {
    setSelectedTag(tag);
    setSelectedIds(new Set());
    setSidebarOpen(false);
  }, []);

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
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">Lyncis</h1>
                <p className="hidden text-[10px] font-medium text-muted-foreground sm:block leading-none">
                  Data Cleaning House
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden items-center gap-2 md:flex">
              <span className="h-1 w-1 rounded-full bg-primary/30" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {orders?.length ?? 0} pesanan
                {selectedTag ? ` • ${selectedTag}` : ''}
              </span>
            </div>
            <Button size="sm" onClick={() => setIntakePanelOpen(true)} className="h-8 gap-1.5 active:scale-95 transition-transform duration-200 rounded-md">
              <Plus className="h-3.5 w-3.5" />
              Tambah <span className="hidden sm:inline">Pesanan</span>
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
            "w-full px-4 py-4 md:px-8 h-full transition-all duration-500 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] mx-auto font-sans",
            isSidebarCollapsed ? "max-w-[99%] 2xl:max-w-[2560px]" : "max-w-[99%] 2xl:max-w-[1920px]"
          )}>
            <div className={cn(
              "transition-all duration-500",
              isSidebarCollapsed && "ring-1 ring-primary/5 rounded-3xl"
            )}>
              <OrderTable
                orders={orders ?? []}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetails={handleViewDetails}
                onConfirm={handleConfirmOrder}
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
            <AlertDialogTitle>Hapus Pesanan?</AlertDialogTitle>
            <AlertDialogDescription>
              Pesanan untuk &ldquo;{deletingOrder?.recipient.name || 'Tanpa Nama'}
              &rdquo; akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* ── Bulk Actions Floating Bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60]"
          >
            <div className="flex items-center gap-4 bg-foreground/95 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-white/10 text-background min-w-[320px] justify-between">
              <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleDeselectAll}
                  className="h-8 w-8 hover:bg-white/10 text-white rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-none">{selectedIds.size} terpilih</span>
                  <span className="text-[9px] text-white/50 uppercase font-black tracking-widest mt-0.5">Bulk Actions</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={handleBulkConfirm}
                  className="h-9 px-4 gap-1.5 bg-green-500 hover:bg-green-600 text-white border-0 font-bold text-xs rounded-full shadow-lg shadow-green-500/20 active:scale-95 transition-transform"
                >
                  <Check className="h-3.5 w-3.5" />
                  Konfirmasi
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleBulkDelete}
                  className="h-9 px-4 gap-1.5 bg-destructive hover:bg-destructive/90 text-white border-0 font-bold text-xs rounded-full shadow-lg shadow-destructive/20 active:scale-95 transition-transform"
                >
                  <Trash className="h-3.5 w-3.5" />
                  Hapus
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
