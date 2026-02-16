'use client';

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
import { Pencil, Trash2, Package } from 'lucide-react';

// ─── Status Badge Config ────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  unassigned: { label: 'Bucket Baru', variant: 'secondary' },
  staged: { label: 'Siap Kirim', variant: 'default' },
  processed: { label: 'outline', variant: 'outline' },
};

// ─── Helpers ────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function truncate(text: string, maxLength: number = 80): string {
  if (!text) return '—';
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

function getOrderTotal(order: JastipOrder): number {
  return order.items.reduce((sum, item) => sum + item.totalPrice, 0);
}

// ─── Props ──────────────────────────────────────────────────

interface OrderTableProps {
  orders: JastipOrder[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onDeselectAll: () => void;
  onEdit: (order: JastipOrder) => void;
  onDelete: (order: JastipOrder) => void;
}

// ─── Component ──────────────────────────────────────────────

export function OrderTable({
  orders,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onEdit,
  onDelete,
}: OrderTableProps) {
  const allSelected =
    orders.length > 0 && orders.every((o) => selectedIds.has(o.id));

  const handleSelectAllToggle = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll(orders.map((o) => o.id));
    }
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Package className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Belum ada pesanan
          </p>
          <p className="text-xs text-muted-foreground/70">
            Mulai dengan menambahkan data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAllToggle}
                aria-label="Pilih semua"
              />
            </TableHead>
            <TableHead>Nama Penerima</TableHead>
            <TableHead className="hidden md:table-cell">
              Alamat Lengkap
            </TableHead>
            <TableHead>Tag / Nama Event</TableHead>
            <TableHead className="text-center">Items</TableHead>
            <TableHead className="text-right">Total Harga</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px] text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              data-state={selectedIds.has(order.id) ? 'selected' : undefined}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(order.id)}
                  onCheckedChange={() => onToggleSelect(order.id)}
                  aria-label={`Pilih pesanan ${order.recipient.name}`}
                />
              </TableCell>
              <TableCell className="font-medium">
                {order.recipient.name || '—'}
              </TableCell>
              <TableCell className="hidden max-w-[400px] md:table-cell">
                <span className="text-muted-foreground text-sm">
                  {truncate(order.recipient.addressRaw)}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {order.tag || '—'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {order.items.length}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(getOrderTotal(order))}
              </TableCell>
              <TableCell>
                <StatusBadge status={order.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(order)}
                    aria-label="Edit pesanan"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(order)}
                    aria-label="Hapus pesanan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status];
  
  if (status === 'processed') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800 text-xs">
        Selesai / Terkirim
      </Badge>
    );
  }
  
  if (status === 'staged') {
    return (
      <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 text-xs">
        Siap Kirim
      </Badge>
    );
  }

  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}
