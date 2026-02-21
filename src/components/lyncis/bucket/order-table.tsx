import { useState, useMemo } from 'react';
import { 
  Pencil, 
  Trash2, 
  Package, 
  CheckCircle2, 
  FileSpreadsheet, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  X,
  ExternalLink,
  ChevronLast,
  ChevronFirst,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';
import { formatCurrency } from '@/lib/formatters';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Status Badge Config ────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  unassigned: { label: 'Bucket Baru', variant: 'secondary' },
  staged: { label: 'Siap Kirim', variant: 'default' },
  processed: { label: 'Selesai', variant: 'outline' },
};

// ─── Helpers ────────────────────────────────────────────────

function getOrderTotal(order: JastipOrder): number {
  return order.items.reduce((sum, item) => sum + item.totalPrice, 0);
}

// ─── Props ──────────────────────────────────────────────────

interface OrderTableProps {
  orders: JastipOrder[];
  isLoading?: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onDeselectAll: () => void;
  onEdit: (order: JastipOrder) => void;
  onDelete: (order: JastipOrder) => void;
  onViewDetails: (order: JastipOrder) => void;
  onConfirm?: (order: JastipOrder) => void;
  onReview?: (order: JastipOrder) => void;
}

// ─── Component ──────────────────────────────────────────────

export function OrderTable({
  orders,
  isLoading = false,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onEdit,
  onDelete,
  onViewDetails,
  onConfirm,
  onReview,
}: OrderTableProps) {
  const { dict } = useLanguage();
  // ── State ──
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus | 'needs-review'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [jumpPage, setJumpPage] = useState('');

  // ── Needs-review count ──
  const needsReviewCount = useMemo(
    () => orders.filter(o => o.metadata?.needsTriage || o.metadata?.parseWarning).length,
    [orders]
  );

  // ── Filtered Data ──
  const filteredOrders = useMemo(() => {
    const result = orders.filter((o) => {
      const matchesSearch = 
        o.recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.recipient.phone && o.recipient.phone.includes(searchTerm)) ||
        o.recipient.addressRaw.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.metadata?.sourceFileName?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (statusFilter === 'needs-review') {
        return matchesSearch && (o.metadata?.needsTriage || o.metadata?.parseWarning);
      }
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      if (statusFilter === 'processed') {
        // Descending by updatedAt (fallback generated at createdAt)
        const aTime = a.updatedAt || a.createdAt;
        const bTime = b.updatedAt || b.createdAt;
        return bTime - aTime;
      }
      if (statusFilter === 'all') {
        // Descending by createdAt
        return b.createdAt - a.createdAt;
      }
      // Ascending by createdAt for everything else (unassigned, staged, needs-review)
      return a.createdAt - b.createdAt;
    });

    return result;
  }, [orders, searchTerm, statusFilter]);

  // ── Pagination ──
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
  const paginatedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, safeCurrentPage, pageSize]);

  const allSelected =
    paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedIds.has(o.id));

  const handleSelectAllToggle = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll(paginatedOrders.map((o) => o.id));
    }
  };

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage);
    if (!isNaN(pageNum)) {
      if (pageNum < 1) {
        setCurrentPage(1);
      } else if (pageNum > totalPages) {
        setCurrentPage(totalPages);
      } else {
        setCurrentPage(pageNum);
      }
      setJumpPage('');
    }
  };

  if (isLoading) {
    return (
      <div className="relative flex flex-col h-[calc(100vh-120px)] min-h-[500px] w-full bg-background border border-border/80 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
        <div className="sticky top-0 z-30 flex items-center gap-4 p-4 border-b bg-background/95">
          <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
          <Skeleton className="h-8 w-48 rounded-lg ml-auto" />
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-3 w-[200px]" />
                </div>
                <Skeleton className="h-4 w-[100px] hidden md:block" />
                <Skeleton className="h-6 w-[80px]" />
                <Skeleton className="h-8 w-8 rounded-full ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center bg-muted/5 rounded-lg border-2 border-dashed">
        <Package className="h-16 w-16 text-muted-foreground/20" />
        <div>
          <p className="text-base font-bold text-muted-foreground/80">{dict.orders.no_orders}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{dict.orders.no_orders_desc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-[calc(100vh-120px)] min-h-[500px] w-full bg-background border border-border/80 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
      {/* ── Filter Bar (Sticky Top) ── */}
      <div className="sticky top-0 z-30 flex flex-col md:flex-row items-center gap-4 p-4 border-b bg-background/95 backdrop-blur-md">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={dict.orders.search_placeholder} 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 bg-muted/50 focus-visible:ring-primary/20 h-10 rounded-xl border-border/50 transition-all focus:bg-background"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/50">
          {(['all', 'unassigned', 'staged', 'processed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-[0.1em]",
                statusFilter === s 
                  ? "bg-background shadow-md text-primary ring-1 ring-border" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s === 'all' ? dict.common.all : dict.status[s]}
            </button>
          ))}
          {/* Needs Review tab — only shown when there are pending orders */}
          {needsReviewCount > 0 && (
            <button
              onClick={() => {
                setStatusFilter('needs-review');
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-[0.1em] flex items-center gap-1.5",
                statusFilter === 'needs-review'
                  ? "bg-amber-500 shadow-md text-white ring-1 ring-amber-400"
                  : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              {dict.orders.needs_review}
              <span className={cn(
                "inline-flex items-center justify-center h-4 w-auto min-w-4 px-1 rounded-full text-[9px] font-black leading-none translate-y-[0.5px]",
                statusFilter === 'needs-review' ? "bg-white/30 text-white" : "bg-amber-100 text-amber-700"
              )}>
                {needsReviewCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Table content Area ── */}
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-muted-foreground/10 hover:scrollbar-thumb-muted-foreground/20 bg-muted/5">
        <Table className="relative w-full border-separate border-spacing-0">
          <TableHeader className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-[48px] px-4">
                <Checkbox checked={allSelected} onCheckedChange={handleSelectAllToggle} />
              </TableHead>
              <TableHead className="min-w-[180px] text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">{dict.orders.recipient_batch}</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[300px] text-[10px] font-black uppercase tracking-widest text-muted-foreground">{dict.orders.address}</TableHead>
              <TableHead className="w-[80px] text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">{dict.orders.items}</TableHead>
              <TableHead className="w-[150px] text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground pr-8">{dict.orders.total}</TableHead>
              <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest text-muted-foreground">{dict.orders.status}</TableHead>
              <TableHead className="w-[140px] text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground pr-6">{dict.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.map((order) => {
              const isSelected = selectedIds.has(order.id);
              const isWarning = !!(order.metadata?.needsTriage || order.metadata?.parseWarning);
              return (
                <TableRow 
                  key={order.id} 
                  className={cn(
                    "group transition-all duration-200 border-b/50",
                    isSelected ? "bg-primary/[0.03]" : "hover:bg-muted/10 active:bg-muted/20",
                    isWarning && "border-l-2 border-l-amber-400 bg-amber-50/30 hover:bg-amber-50/50"
                  )}
                >
                  <TableCell className="px-4">
                    <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(order.id)} />
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-black tracking-tight group-hover:text-primary transition-colors">{order.recipient.name || dict.orders.empty_name}</span>
                      <span className="text-xs text-muted-foreground font-mono font-bold opacity-80 leading-none">{order.recipient.phone || '—'}</span>
                      {order.metadata?.sourceFileName && (
                        <div className="flex items-center gap-1 mt-1 px-1.5 py-0 bg-primary/[0.04] text-primary/70 rounded-full w-fit border border-primary/10">
                          <FileSpreadsheet className="h-2.5 w-2.5 shrink-0" />
                          <span className="text-[8px] font-black uppercase tracking-tight truncate max-w-[120px]">
                            {order.metadata.sourceFileName}
                          </span>
                        </div>
                      )}
                      {isWarning && (
                        <div className="flex items-center gap-1 mt-0.5 px-1.5 py-0 bg-amber-100 text-amber-700 rounded-full w-fit border border-amber-200">
                          <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                          <span className="text-[8px] font-black uppercase tracking-tight">
                            {order.metadata?.parseWarning ? dict.orders.check_items : dict.orders.needs_review}
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell max-w-[400px]">
                    <div className="text-xs text-muted-foreground/90 font-medium leading-relaxed italic line-clamp-2 max-w-[350px]">
                      {order.recipient.addressRaw || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="inline-flex items-center justify-center py-0.5 px-2 bg-muted/40 rounded-md border border-border/40">
                        <span className="font-mono text-[11px] font-black leading-none translate-y-[0.5px]">{order.items.length}</span>
                      </div>
                      <span className="text-[9px] font-black text-muted-foreground opacity-70 leading-none tracking-widest uppercase">
                        {order.items.reduce((sum, item) => sum + (item.qty || 1), 0)} {dict.common.pcs}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-black pr-8 text-foreground/80">
                    {formatCurrency(getOrderTotal(order), dict.common.edit === 'Edit' ? 'en-US' : 'id-ID')}
                  </TableCell>
                  <TableCell>
                    <StatusBadge order={order} />
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      
                      {/* Prioritize Review action if triage is needed, else show Confirm if unassigned */}
                      {order.metadata?.needsTriage ? (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-amber-600 hover:bg-amber-100/60 transition-all border border-transparent hover:border-amber-200" 
                          onClick={() => onReview?.(order)}
                          title={dict.common.edit}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                      ) : (
                        onConfirm && order.status === 'unassigned' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-600 hover:bg-green-100/50 transition-all border border-transparent hover:border-green-200" 
                            onClick={() => onConfirm(order)}
                            title={dict.orders.move_to_batch}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )
                      )}

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground" 
                        onClick={() => onViewDetails(order)}
                        title={dict.orders.view_detail}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-muted text-muted-foreground transition-all" 
                        onClick={() => onEdit(order)}
                        title={dict.common.edit}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white transition-all" 
                        onClick={() => onDelete(order)}
                        title={dict.common.delete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── Action Pagination (Sticky Bottom) ── */}
      <div className="sticky bottom-0 z-30 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-background/95 backdrop-blur-md shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-4">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 rounded-lg">
                <span className="text-foreground">{filteredOrders.length}</span> {filteredOrders.length === 1 ? dict.common.items_count.split(' ')[1] : dict.common.items_count_plural.split(' ')[1]}
            </div>
            
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{dict.orders.show_per_page}</span>
                <Select
                    value={pageSize.toString()}
                    onValueChange={(v) => {
                        setPageSize(parseInt(v));
                        setCurrentPage(1);
                    }}
                >
                    <SelectTrigger className="h-8 w-[70px] text-xs font-bold rounded-lg bg-muted/20 border-border/50">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="flex items-center gap-4">
          <form onSubmit={handleJumpPage} className="flex items-center gap-2">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider whitespace-nowrap">{dict.orders.go_to_page}</span>
            <Input 
                value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value)}
                className="h-8 w-[60px] text-center font-bold text-xs p-1 rounded-lg bg-muted/20 border-border/50"
                placeholder="..."
            />
          </form>

          <div className="flex items-center gap-1.5 border-l pl-4 border-border/50">
            <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 rounded-lg"
            >
                <ChevronFirst className="h-3.5 w-3.5" />
            </Button>
            <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 rounded-lg"
            >
                <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            
            <div className="flex items-center gap-2 mx-2">
                <span className="text-xs font-black px-3 py-1 bg-primary text-primary-foreground rounded-lg shadow-lg shadow-primary/20">{currentPage}</span>
                <span className="text-[10px] font-black text-muted-foreground">{dict.orders.from}</span>
                <span className="text-xs font-black text-muted-foreground">{totalPages}</span>
            </div>

            <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 rounded-lg"
            >
                <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 rounded-lg"
            >
                <ChevronLast className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────

function StatusBadge({ order }: { order: JastipOrder }) {
  const { dict } = useLanguage();
  if (order.metadata?.needsTriage) {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold uppercase tracking-widest py-0.5 px-2.5">
        {dict.orders.needs_review}
      </Badge>
    );
  }

  const { status } = order;

  if (status === 'processed') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800 text-[10px] font-bold uppercase tracking-widest py-0.5 px-2.5">
        {dict.status.processed}
      </Badge>
    );
  }
  
  if (status === 'staged') {
    return (
      <Badge variant="default" className="bg-blue-600 text-white border-transparent hover:bg-blue-700 text-[10px] font-bold uppercase tracking-widest py-0.5 px-2.5 shadow-sm">
        {dict.status.staged}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest py-0.5 px-2.5 bg-muted/50 border-border/50">
      {dict.status.unassigned}
    </Badge>
  );
}

import { JastipOrder, OrderStatus } from '@/lib/types';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
