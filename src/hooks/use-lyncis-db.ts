'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { JastipOrder, OrderStatus, SenderAddress } from '@/lib/types';

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
        const counts: Record<string, { total: number; unassigned: number; processed: number; staged: number }> = {};

        for (const order of orders) {
            if (!order.tag) continue;
            if (!counts[order.tag]) {
                counts[order.tag] = { total: 0, unassigned: 0, processed: 0, staged: 0 };
            }
            counts[order.tag].total++;
            if (order.status === 'unassigned') {
                counts[order.tag].unassigned++;
            } else if (order.status === 'processed') {
                counts[order.tag].processed++;
            } else if (order.status === 'staged') {
                counts[order.tag].staged++;
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
    await db.orders.update(id, { ...changes, updatedAt: Date.now() });
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
            await db.orders.update(id, { ...changes, updatedAt: Date.now() });
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
                updatedAt: Date.now(),
            });
        }
    });
}

// ─── Sender Address Hooks & Mutations ───────────────────────

/**
 * Reactive hook to fetch all sender addresses sorted by label.
 */
export function useSenderAddresses() {
    return useLiveQuery(() => db.senderAddresses.orderBy('label').toArray(), []);
}

/**
 * Add a new sender address.
 */
export async function addSenderAddress(
    address: Omit<SenderAddress, 'id'>
): Promise<string> {
    const id = uuidv4();
    await db.senderAddresses.add({ ...address, id } as SenderAddress);
    return id;
}

/**
 * Update a sender address.
 */
export async function updateSenderAddress(
    id: string,
    changes: Partial<SenderAddress>
): Promise<void> {
    await db.senderAddresses.update(id, changes);
}

/**
 * Delete a sender address.
 */
export async function deleteSenderAddress(id: string): Promise<void> {
    await db.senderAddresses.delete(id);
}

/**
 * Set a sender address as default, clearing others.
 */
export async function setDefaultSenderAddress(id: string): Promise<void> {
    await db.transaction('rw', db.senderAddresses, async () => {
        const addresses = await db.senderAddresses.toArray();
        for (const addr of addresses) {
            // Set isDefault=true for the target, false for everything else
            await db.senderAddresses.update(addr.id, { isDefault: addr.id === id });
        }
    });
}

/**
 * Auto-save single order logistics during input process.
 */
export async function autoSaveLogistics(id: string, logistics: Partial<JastipOrder['logistics']>): Promise<void> {
    const order = await db.orders.get(id);
    if (!order) return;
    await db.orders.update(id, {
        logistics: { ...order.logistics, ...logistics },
        updatedAt: Date.now(),
    });
}

/**
 * Auto-save sender ID to all staged orders in the current batch.
 */
export async function autoSaveSenderId(ids: string[], senderId: string): Promise<void> {
    await db.transaction('rw', db.orders, async () => {
        for (const id of ids) {
            const order = await db.orders.get(id);
            if (!order) continue;
            await db.orders.update(id, {
                logistics: { ...order.logistics, originId: senderId },
                updatedAt: Date.now(),
            });
        }
    });
}

// ─── Batch Mutations ────────────────────────────────────────

/**
 * Reactive hook returning all orders with status === 'staged'.
 */
export function useStagedOrders() {
    return useLiveQuery(() => db.orders.where('status').equals('staged').toArray(), []);
}

/**
 * Stages orders for a batch processing session.
 */
export async function stageOrders(ids: string[], batchId: string): Promise<void> {
    await db.transaction('rw', db.orders, async () => {
        for (const id of ids) {
            await db.orders.update(id, { status: 'staged', batchId, updatedAt: Date.now() });
        }
    });
}

/**
 * Reverts staged orders to 'unassigned', clearing batchId and logistics data.
 */
export async function unstageOrders(ids: string[]): Promise<void> {
    await db.transaction('rw', db.orders, async () => {
        for (const id of ids) {
            const order = await db.orders.get(id);
            if (!order) continue;

            await db.orders.update(id, {
                status: 'unassigned',
                batchId: undefined, // remove batchId
                logistics: {
                    originId: null,
                    finalPackedWeight: 0,
                    dimensions: { l: 0, w: 0, h: 0 },
                    volumetricWeight: 0,
                    chargeableWeight: 0,
                },
                updatedAt: Date.now(),
            });
        }
    });
}

/**
 * Commit a batch: sets status to 'processed' and saves final logistics data.
 */
export async function commitBatch(
    ids: string[],
    logisticsMap: Record<string, Partial<JastipOrder['logistics']>>
): Promise<void> {
    await db.transaction('rw', db.orders, async () => {
        for (const id of ids) {
            const logisticsUpdates = logisticsMap[id] || {};
            const order = await db.orders.get(id);
            if (!order) continue;

            await db.orders.update(id, {
                status: 'processed',
                logistics: { ...order.logistics, ...logisticsUpdates },
                updatedAt: Date.now(),
            });
        }
    });
}

/**
 * Cancel a batch: finds all orders with this batchId and unstages them.
 */
export async function cancelBatch(batchId: string): Promise<void> {
    // Indexes: ++id, tag, status, createdAt, batchId
    const orders = await db.orders.where('batchId').equals(batchId).toArray();
    const ids = orders.map((o) => o.id);
    await unstageOrders(ids);
}
