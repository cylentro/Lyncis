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
} from '@/hooks/use-lyncis-db';
import { JastipOrder } from '@/lib/types';
import { OrderTable } from '@/components/lyncis/bucket/order-table';
import { TagSidebar } from '@/components/lyncis/bucket/tag-sidebar';
import { OrderEditDialog } from '@/components/lyncis/bucket/order-edit-dialog';
import { UnifiedIntakePanel } from '@/components/lyncis/intake/unified-intake-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
import { Package, Plus, SlidersHorizontal, ChevronDown, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function BucketPage() {
  // ─── State ──────────────────────────────────────────────────
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingOrder, setEditingOrder] = useState<JastipOrder | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
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
    setEditDialogOpen(true);
  }, []);

  const handleEditSave = useCallback(async (order: JastipOrder) => {
    await updateOrder(order.id, order);
    toast.success('Pesanan berhasil diupdate');
  }, []);

  const handleDelete = useCallback((order: JastipOrder) => {
    setDeletingOrder(order);
  }, []);

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

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background/50">
          <div className={cn(
            "w-full px-4 py-6 md:px-8 transition-all duration-500 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] mx-auto",
            isSidebarCollapsed ? "max-w-[98%] 2xl:max-w-[2560px]" : "max-w-[98%] 2xl:max-w-[1920px]"
          )}>
            <div className={cn(
              "rounded-md border bg-background overflow-hidden transition-all duration-500",
              isSidebarCollapsed && "ring-1 ring-primary/10"
            )}>
              <OrderTable
                orders={orders ?? []}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          </div>
        </main>
      </div>

      {/* ── Dialogs ────────────────────────────────────────── */}
      <OrderEditDialog
        order={editingOrder}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleEditSave}
        activeTags={allTags ?? []}
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
    </div>
  );
}
