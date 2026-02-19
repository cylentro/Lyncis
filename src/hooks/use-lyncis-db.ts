'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { JastipOrder, OrderStatus } from '@/lib/types';

// ─── Reactive Queries ───────────────────────────────────────

/**
 * Reactive hook to fetch orders with optional filters.
 * Returns orders sorted by `createdAt` descending (newest first).
 */
export function useOrders(filters?: { tag?: string; status?: OrderStatus }) {
    return useLiveQuery(async () => {
        let collection = db.orders.orderBy('createdAt');

        const orders = await collection.reverse().toArray();

        // Apply client-side filters
        return orders.filter((order) => {
            if (filters?.tag && order.tag !== filters.tag) return false;
            if (filters?.status && order.status !== filters.status) return false;
            return true;
        });
    }, [filters?.tag, filters?.status]);
}

/**
 * Reactive hook to get all tags that have at least one 'unassigned' order.
 */
export function useActiveTags() {
    return useLiveQuery(async () => {
        const orders = await db.orders
            .where('status')
            .equals('unassigned')
            .toArray();
        const tags = new Set(orders.map((o) => o.tag).filter(Boolean));
        return Array.from(tags).sort();
    }, []);
}

/**
 * Reactive hook to get all distinct tags from all orders.
 */
export function useAllTags() {
    return useLiveQuery(async () => {
        const tags = await db.orders.orderBy('tag').uniqueKeys();
        return (tags as string[]).filter(Boolean).sort();
    }, []);
}

/**
 * Reactive hook to get order counts grouped by tag.
 */
export function useTagCounts() {
    return useLiveQuery(async () => {
        const orders = await db.orders.toArray();
        const counts: Record<string, { total: number; unassigned: number }> = {};

        for (const order of orders) {
            if (!order.tag) continue;
            if (!counts[order.tag]) {
                counts[order.tag] = { total: 0, unassigned: 0 };
            }
            counts[order.tag].total++;
            if (order.status === 'unassigned') {
                counts[order.tag].unassigned++;
            }
        }

        return counts;
    }, []);
}

// ─── Mutations ──────────────────────────────────────────────

/**
 * Add a single order with a generated UUID. Returns the new ID.
 */
export async function addOrder(
    order: Omit<JastipOrder, 'id'>
): Promise<string> {
    const id = uuidv4();
    await db.orders.add({ ...order, id } as JastipOrder);
    return id;
}

/**
 * Bulk add orders, each with a generated UUID.
 */
export async function addOrders(
    orders: Omit<JastipOrder, 'id'>[]
): Promise<void> {
    const withIds = orders.map((o) => ({ ...o, id: uuidv4() }) as JastipOrder);
    await db.orders.bulkAdd(withIds);
}

/**
 * Partial update of a single order.
 */
export async function updateOrder(
    id: string,
    changes: Partial<JastipOrder>
): Promise<void> {
    await db.orders.update(id, changes);
}

/**
 * Atomic bulk update of multiple orders with the same changes.
 */
export async function bulkUpdateOrders(
    ids: string[],
    changes: Partial<JastipOrder>
): Promise<void> {
    await db.transaction('rw', db.orders, async () => {
        for (const id of ids) {
            await db.orders.update(id, changes);
        }
    });
}

/**
 * Delete a single order.
 */
export async function deleteOrder(id: string): Promise<void> {
    await db.orders.delete(id);
}

/**
 * Bulk delete multiple orders.
 */
export async function deleteOrders(ids: string[]): Promise<void> {
    await db.orders.bulkDelete(ids);
}

/**
 * Mark a batch of orders as triaged (reviewed).
 * Clears `needsTriage` and sets `isVerified: true` in a single transaction.
 */
export async function markOrdersTriaged(ids: string[]): Promise<void> {
    await db.transaction('rw', db.orders, async () => {
        for (const id of ids) {
            const order = await db.orders.get(id);
            if (!order) continue;
            await db.orders.update(id, {
                metadata: {
                    ...order.metadata,
                    needsTriage: false,
                    isVerified: true,
                },
            });
        }
    });
}
