import { JastipItem } from './types';

/**
 * Circular Pricing Controller — Pure utility functions
 * Implements requirement.md §3A exactly.
 * All functions are immutable (return new objects).
 */

/**
 * Rule 1 (Unit Focus): When unitPrice is edited.
 * - Sets unitPrice = newUnitPrice
 * - Recalculates totalPrice = qty * unitPrice
 * - Sets isManualTotal = false
 */
export function updateUnitPrice(
    item: JastipItem,
    newUnitPrice: number
): JastipItem {
    const qty = Math.max(1, item.qty);
    return {
        ...item,
        unitPrice: newUnitPrice,
        totalPrice: qty * newUnitPrice,
        isManualTotal: false,
    };
}

/**
 * Rule 2 (Total Focus): When totalPrice is edited.
 * - Sets totalPrice = newTotalPrice
 * - Recalculates unitPrice = totalPrice / qty
 * - Sets isManualTotal = true
 */
export function updateTotalPrice(
    item: JastipItem,
    newTotalPrice: number
): JastipItem {
    const qty = Math.max(1, item.qty);
    return {
        ...item,
        totalPrice: newTotalPrice,
        unitPrice: newTotalPrice / qty,
        isManualTotal: true,
    };
}

/**
 * Rule 3 (Quantity Update): When qty changes.
 * - Guards qty with Math.max(1, newQty)
 * - If isManualTotal is true: keep totalPrice, recalc unitPrice
 * - If isManualTotal is false: keep unitPrice, recalc totalPrice
 */
export function updateQuantity(
    item: JastipItem,
    newQty: number
): JastipItem {
    const qty = Math.max(1, newQty);

    if (item.isManualTotal) {
        // Keep totalPrice fixed, recalculate unitPrice
        return {
            ...item,
            qty,
            unitPrice: item.totalPrice / qty,
        };
    } else {
        // Keep unitPrice fixed, recalculate totalPrice
        return {
            ...item,
            qty,
            totalPrice: qty * item.unitPrice,
        };
    }
}
